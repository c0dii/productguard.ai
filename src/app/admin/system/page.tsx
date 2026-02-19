import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import OpenAI from 'openai';

async function testOpenAIConnection(): Promise<{ ok: boolean; error?: string; model?: string; latencyMs?: number }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { ok: false, error: 'OPENAI_API_KEY not set' };

  try {
    const client = new OpenAI({ apiKey });
    const start = Date.now();
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Reply with just the word "ok"' }],
      max_tokens: 5,
      temperature: 0,
    });
    const latencyMs = Date.now() - start;
    return {
      ok: true,
      model: response.model,
      latencyMs,
    };
  } catch (err: any) {
    return {
      ok: false,
      error: err.message || String(err),
    };
  }
}

export default async function AdminSystemPage() {
  const supabase = await createClient();

  // Live test OpenAI connection
  const openaiTest = await testOpenAIConnection();

  // Get system stats
  const [
    { count: totalUsers },
    { count: totalProducts },
    { count: totalScans },
    { count: totalInfringements },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('scans').select('*', { count: 'exact', head: true }),
    supabase.from('infringements').select('*', { count: 'exact', head: true }),
  ]);

  // Get recent errors (failed scans)
  const { data: recentErrors } = await supabase
    .from('scans')
    .select('*, profiles(email)')
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(10);

  // Environment info
  const envVars = [
    { key: 'NEXT_PUBLIC_APP_URL', value: process.env.NEXT_PUBLIC_APP_URL },
    { key: 'NEXT_PUBLIC_SUPABASE_URL', value: process.env.NEXT_PUBLIC_SUPABASE_URL },
    { key: 'OPENAI_API_KEY', value: process.env.OPENAI_API_KEY ? 'Set ✓' : 'Missing ✗' },
    { key: 'STRIPE_SECRET_KEY', value: process.env.STRIPE_SECRET_KEY ? 'Set ✓' : 'Missing ✗' },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', value: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set ✓' : 'Missing ✗' },
    { key: 'SERPER_API_KEY', value: process.env.SERPER_API_KEY ? 'Set ✓' : 'Missing ✗' },
    { key: 'RESEND_API_KEY', value: process.env.RESEND_API_KEY ? 'Set ✓' : 'Missing ✗' },
    { key: 'TELEGRAM_BOT_TOKEN', value: process.env.TELEGRAM_BOT_TOKEN ? 'Set ✓' : 'Missing ✗' },
    { key: 'WHOIS_API_KEY', value: process.env.WHOIS_API_KEY ? 'Set ✓' : 'Missing ✗' },
    { key: 'GHL_API_KEY', value: process.env.GHL_API_KEY ? 'Set ✓' : 'Missing ✗' },
    { key: 'CRON_SECRET', value: process.env.CRON_SECRET ? 'Set ✓' : 'Missing ✗' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">System Information</h1>
        <p className="text-pg-text-muted">Platform health and configuration</p>
      </div>

      {/* Database Stats */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">Database Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <p className="text-sm text-pg-text-muted mb-1">Total Users</p>
            <p className="text-3xl font-bold">{totalUsers || 0}</p>
          </Card>
          <Card>
            <p className="text-sm text-pg-text-muted mb-1">Total Products</p>
            <p className="text-3xl font-bold">{totalProducts || 0}</p>
          </Card>
          <Card>
            <p className="text-sm text-pg-text-muted mb-1">Total Scans</p>
            <p className="text-3xl font-bold">{totalScans || 0}</p>
          </Card>
          <Card>
            <p className="text-sm text-pg-text-muted mb-1">Total Infringements</p>
            <p className="text-3xl font-bold">{totalInfringements || 0}</p>
          </Card>
        </div>
      </div>

      {/* Environment Configuration */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">Environment Configuration</h2>
        <Card>
          <div className="space-y-3">
            {envVars.map((env) => (
              <div
                key={env.key}
                className="flex items-center justify-between p-3 bg-pg-surface-light rounded-lg"
              >
                <span className="font-mono text-sm">{env.key}</span>
                <span className="text-sm text-pg-text-muted">
                  {env.value || 'Not set'}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* System Health */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">System Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <p className="text-sm text-pg-text-muted mb-2">Database</p>
            <Badge
              variant="default"
              className="bg-pg-accent bg-opacity-10 text-pg-accent"
            >
              ✓ Connected
            </Badge>
          </Card>
          <Card>
            <p className="text-sm text-pg-text-muted mb-2">Authentication</p>
            <Badge
              variant="default"
              className="bg-pg-accent bg-opacity-10 text-pg-accent"
            >
              ✓ Active
            </Badge>
          </Card>
          <Card>
            <p className="text-sm text-pg-text-muted mb-2">Scan Engine</p>
            <Badge
              variant="default"
              className={
                process.env.SERPER_API_KEY
                  ? 'bg-pg-accent bg-opacity-10 text-pg-accent'
                  : 'bg-pg-warning bg-opacity-10 text-pg-warning'
              }
            >
              {process.env.SERPER_API_KEY ? '✓ Ready' : '⚠ Serper API Key Missing'}
            </Badge>
          </Card>
          <Card>
            <p className="text-sm text-pg-text-muted mb-2">AI Engine (OpenAI)</p>
            <Badge
              variant="default"
              className={
                openaiTest.ok
                  ? 'bg-pg-accent bg-opacity-10 text-pg-accent'
                  : 'bg-red-500 bg-opacity-10 text-red-400'
              }
            >
              {openaiTest.ok
                ? `✓ Connected (${openaiTest.latencyMs}ms, ${openaiTest.model})`
                : `✗ FAILED: ${openaiTest.error?.slice(0, 80)}`
              }
            </Badge>
          </Card>
        </div>
      </div>

      {/* Recent Errors */}
      <div>
        <h2 className="text-xl font-bold mb-4">Recent Errors</h2>
        {!recentErrors || recentErrors.length === 0 ? (
          <Card>
            <p className="text-center text-pg-text-muted py-8">
              ✓ No recent errors
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {recentErrors.map((error: any) => (
              <Card key={error.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-pg-danger mb-1">
                      Failed Scan
                    </p>
                    <p className="text-sm text-pg-text-muted">
                      User: {error.profiles?.email}
                    </p>
                    <p className="text-xs text-pg-text-muted">
                      Scan ID: {error.id}
                    </p>
                  </div>
                  <div className="text-right text-sm text-pg-text-muted">
                    {new Date(error.created_at).toLocaleString()}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
        <Card>
          <div className="space-y-2">
            <p className="text-sm text-pg-text-muted mb-3">
              Admin tools and maintenance tasks
            </p>
            <button className="w-full px-4 py-2 bg-pg-surface-light rounded-lg hover:bg-pg-border transition-colors text-left">
              🔄 Clear cache (Coming Soon)
            </button>
            <button className="w-full px-4 py-2 bg-pg-surface-light rounded-lg hover:bg-pg-border transition-colors text-left">
              📊 Export analytics (Coming Soon)
            </button>
            <button className="w-full px-4 py-2 bg-pg-surface-light rounded-lg hover:bg-pg-border transition-colors text-left">
              🗄️ Database backup (Coming Soon)
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
