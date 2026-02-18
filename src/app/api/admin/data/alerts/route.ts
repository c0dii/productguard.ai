import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/admin/data/alerts — Fetch alerts
 * PATCH /api/admin/data/alerts — Acknowledge or resolve an alert/error
 */

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: alerts, error } = await supabase
      .from('admin_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(alerts);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id, type, action, resolution_notes } = body;

    if (!id || !action) {
      return NextResponse.json({ error: 'Missing id or action' }, { status: 400 });
    }

    const now = new Date().toISOString();

    if (type === 'error') {
      // Resolve a system_logs error entry
      const { error } = await supabase
        .from('system_logs')
        .update({
          resolved_at: now,
          resolved_by: user.id,
          resolution_notes: resolution_notes || null,
        })
        .eq('id', id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      // Alert actions
      if (action === 'acknowledge') {
        const { error } = await supabase
          .from('admin_alerts')
          .update({
            acknowledged_at: now,
            acknowledged_by: user.id,
          })
          .eq('id', id);

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
      } else if (action === 'resolve') {
        const { error } = await supabase
          .from('admin_alerts')
          .update({
            resolved_at: now,
            resolved_by: user.id,
            resolution_notes: resolution_notes || null,
          })
          .eq('id', id);

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
