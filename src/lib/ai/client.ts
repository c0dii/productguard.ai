/**
 * AI Client Service
 * Generic wrapper for AI providers (OpenAI, Anthropic, etc.)
 * Provides consistent interface for AI operations across the app
 */

import OpenAI from 'openai';

// Singleton instance
let openaiClient: OpenAI | null = null;

/**
 * Get or create OpenAI client instance
 */
export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    openaiClient = new OpenAI({
      apiKey,
    });
  }

  return openaiClient;
}

/**
 * AI Model configuration
 */
export const AI_MODELS = {
  // Fast and cheap - for routine tasks
  MINI: 'gpt-4o-mini',
  // Balanced - for complex analysis
  STANDARD: 'gpt-4o',
  // Most capable - for critical assessments
  ADVANCED: 'gpt-4o',
} as const;

/**
 * Standard AI request configuration
 */
export interface AIRequest {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
}

/**
 * AI response with metadata
 */
export interface AIResponse<T = any> {
  data: T;
  metadata: {
    model: string;
    tokensUsed: number;
    processingTimeMs: number;
    finishReason: string;
  };
}

/**
 * Generate AI completion with structured output
 */
export async function generateCompletion<T = any>(
  systemPrompt: string,
  userPrompt: string,
  config: AIRequest = {}
): Promise<AIResponse<T>> {
  const client = getOpenAIClient();
  const startTime = Date.now();

  const {
    model = AI_MODELS.MINI,
    temperature = 0.3, // Lower for consistent extractions
    maxTokens = 2000,
    responseFormat = 'json',
  } = config;

  try {
    const response = await client.chat.completions.create({
      model,
      temperature,
      max_tokens: maxTokens,
      response_format: responseFormat === 'json' ? { type: 'json_object' } : { type: 'text' },
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const processingTimeMs = Date.now() - startTime;
    const content = response.choices[0]?.message?.content || '';

    // Parse JSON if response format is JSON
    const data = responseFormat === 'json' ? JSON.parse(content) : content;

    return {
      data: data as T,
      metadata: {
        model,
        tokensUsed: response.usage?.total_tokens || 0,
        processingTimeMs,
        finishReason: response.choices[0]?.finish_reason || 'unknown',
      },
    };
  } catch (error) {
    console.error('AI generation error:', error);
    throw new Error(`AI completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Batch AI requests with rate limiting
 */
export async function generateBatch<T = any>(
  requests: Array<{ systemPrompt: string; userPrompt: string; config?: AIRequest }>,
  delayMs: number = 100
): Promise<AIResponse<T>[]> {
  const results: AIResponse<T>[] = [];

  for (const request of requests) {
    const result = await generateCompletion<T>(
      request.systemPrompt,
      request.userPrompt,
      request.config
    );
    results.push(result);

    // Rate limiting delay
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * Cost estimation helper
 */
export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  model: string = AI_MODELS.MINI
): number {
  // Pricing per 1M tokens (as of 2024)
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4o': { input: 2.50, output: 10.00 },
  };

  const rates = pricing[model] ?? pricing['gpt-4o-mini']!;
  const inputCost = (inputTokens / 1_000_000) * rates.input;
  const outputCost = (outputTokens / 1_000_000) * rates.output;

  return inputCost + outputCost;
}

/**
 * Health check - verify AI service is accessible
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const client = getOpenAIClient();
    await client.models.list();
    return true;
  } catch (error) {
    console.error('AI health check failed:', error);
    return false;
  }
}
