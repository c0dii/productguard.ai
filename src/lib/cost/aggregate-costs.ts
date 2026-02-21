/**
 * Time-based cost aggregation.
 *
 * Replaces per-call cost_usd logging. A cron job calls aggregateCosts()
 * every 8 hours. It reads token counts from system_logs (already logged
 * as lightweight metadata), calculates cost using current pricing, and
 * writes a single row to cost_snapshots.
 *
 * Dashboard pages read from cost_snapshots instead of scanning every
 * system_log entry.
 */

import { createAdminClient } from '@/lib/supabase/server';

// Pricing per 1M tokens (keep in sync with client.ts estimateCost)
const PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o': { input: 2.50, output: 10.00 },
};

function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: string
): number {
  const rates = PRICING[model] ?? PRICING['gpt-4o-mini']!;
  return (inputTokens / 1_000_000) * rates.input + (outputTokens / 1_000_000) * rates.output;
}

interface AggregationResult {
  snapshots_created: number;
  total_cost_usd: number;
  total_calls: number;
  period_start: string;
  period_end: string;
}

/**
 * Aggregate OpenAI costs for the given time window.
 *
 * @param periodHours — How many hours back to aggregate (default 8)
 */
export async function aggregateCosts(periodHours: number = 8): Promise<AggregationResult> {
  const supabase = createAdminClient();
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - periodHours * 60 * 60 * 1000);

  // Query system_logs for OpenAI calls in this window.
  // We read token counts from the context JSONB — these are already logged
  // as lightweight metadata on each call (no extra DB writes needed).
  const { data: logs, error } = await supabase
    .from('system_logs')
    .select('operation, context')
    .eq('log_source', 'api_call')
    .like('operation', 'openai.%')
    .gte('created_at', periodStart.toISOString())
    .lt('created_at', periodEnd.toISOString());

  if (error) {
    throw new Error(`Failed to query system_logs: ${error.message}`);
  }

  // Group by model and sum tokens
  const modelStats = new Map<string, {
    inputTokens: number;
    outputTokens: number;
    callCount: number;
  }>();

  for (const log of logs || []) {
    const ctx = log.context as Record<string, unknown> | null;
    if (!ctx) continue;

    // Extract model from operation (e.g. "openai.chat.gpt-4o-mini" → "gpt-4o-mini")
    const model = (ctx.model as string) || log.operation.split('.').pop() || 'gpt-4o-mini';
    const promptTokens = (ctx.prompt_tokens as number) || 0;
    const completionTokens = (ctx.completion_tokens as number) || 0;

    const existing = modelStats.get(model) || { inputTokens: 0, outputTokens: 0, callCount: 0 };
    existing.inputTokens += promptTokens;
    existing.outputTokens += completionTokens;
    existing.callCount += 1;
    modelStats.set(model, existing);
  }

  // Write snapshots (one per model)
  let snapshotsCreated = 0;
  let totalCostUsd = 0;
  let totalCalls = 0;

  for (const [model, stats] of modelStats) {
    const costUsd = calculateCost(stats.inputTokens, stats.outputTokens, model);
    totalCostUsd += costUsd;
    totalCalls += stats.callCount;

    const { error: insertError } = await supabase
      .from('cost_snapshots')
      .upsert(
        {
          provider: 'openai',
          model,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          total_input_tokens: stats.inputTokens,
          total_output_tokens: stats.outputTokens,
          total_cost_usd: parseFloat(costUsd.toFixed(4)),
          call_count: stats.callCount,
        },
        { onConflict: 'provider,model,period_start,period_end' }
      );

    if (insertError) {
      console.error(`[CostAggregation] Failed to write snapshot for ${model}:`, insertError.message);
    } else {
      snapshotsCreated++;
    }
  }

  // If no calls at all, write a zero snapshot so dashboard knows the cron ran
  if (modelStats.size === 0) {
    await supabase
      .from('cost_snapshots')
      .upsert(
        {
          provider: 'openai',
          model: 'gpt-4o-mini',
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          total_input_tokens: 0,
          total_output_tokens: 0,
          total_cost_usd: 0,
          call_count: 0,
        },
        { onConflict: 'provider,model,period_start,period_end' }
      );
    snapshotsCreated = 1;
  }

  return {
    snapshots_created: snapshotsCreated,
    total_cost_usd: parseFloat(totalCostUsd.toFixed(4)),
    total_calls: totalCalls,
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
  };
}
