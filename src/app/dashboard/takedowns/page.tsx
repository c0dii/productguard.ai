import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';

export default async function TakedownsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: takedowns } = await supabase
    .from('takedowns')
    .select('*, infringements(source_url, platform)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-pg-text">DMCA Takedowns</h1>
        <p className="text-pg-text-muted">Track your takedown notices and their status</p>
      </div>

      {/* Takedowns List */}
      {!takedowns || takedowns.length === 0 ? (
        <div className="p-12 rounded-2xl bg-pg-surface backdrop-blur-sm border border-pg-border">
          <div className="text-center">
            <p className="text-xl font-semibold mb-2 text-pg-text">No takedowns yet</p>
            <p className="text-pg-text-muted">
              When you find infringements, you can send DMCA takedown notices from here
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {takedowns.map((takedown: any) => (
            <Link key={takedown.id} href={`/dashboard/takedowns/${takedown.id}`}>
              <div className="group relative p-6 rounded-2xl bg-pg-surface backdrop-blur-sm border border-pg-border hover:bg-pg-surface-light hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Badge variant="default" className="capitalize bg-purple-500/20 text-purple-400 border border-purple-500/30">
                      {takedown.type.replace('_', ' ')}
                    </Badge>
                    <Badge
                      variant="default"
                      className={
                        takedown.status === 'sent'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : takedown.status === 'removed'
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                          : takedown.status === 'failed'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      }
                    >
                      {takedown.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-pg-text-muted">
                    Platform: {takedown.infringements?.platform || 'Unknown'}
                  </p>
                  <p className="text-sm text-pg-text-muted truncate max-w-md">
                    URL: {takedown.infringements?.source_url || 'N/A'}
                  </p>
                </div>
                <div className="text-right text-sm text-pg-text-muted">
                  <p>
                    Created:{' '}
                    {new Date(takedown.created_at).toLocaleDateString()}
                  </p>
                  {takedown.sent_at && (
                    <p>Sent: {new Date(takedown.sent_at).toLocaleDateString()}</p>
                  )}
                  {takedown.resolved_at && (
                    <p className="text-cyan-400">
                      Resolved: {new Date(takedown.resolved_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
