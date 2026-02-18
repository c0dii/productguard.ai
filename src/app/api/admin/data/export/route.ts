import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const MAX_ROWS = 10000;

/**
 * GET /api/admin/data/export — Export log data as CSV or JSON
 *
 * Query params:
 * - source: 'scan_logs' | 'system_logs' | 'system_logs_api' | 'system_logs_cron' | etc.
 * - format: 'csv' | 'json'
 * - start: ISO date string (optional)
 * - end: ISO date string (optional)
 * - log_level: filter by level (optional)
 * - status: filter by status (optional)
 */
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source') || 'scan_logs';
    const format = searchParams.get('format') || 'csv';
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const logLevel = searchParams.get('log_level');
    const status = searchParams.get('status');

    // Determine table and filters
    let tableName: string;
    let logSourceFilter: string | null = null;

    if (source === 'scan_logs') {
      tableName = 'scan_logs';
    } else if (source === 'admin_alerts') {
      tableName = 'admin_alerts';
    } else if (source === 'dmca_submission_logs') {
      tableName = 'dmca_submission_logs';
    } else if (source.startsWith('system_logs')) {
      tableName = 'system_logs';
      // Extract sub-source filter
      const subSource = source.replace('system_logs_', '');
      if (subSource !== 'system_logs' && subSource !== source) {
        const sourceMap: Record<string, string> = {
          api: 'api_call',
          cron: 'cron',
          webhook: 'webhook',
          email: 'email',
          scan: 'scan',
          scrape: 'scrape',
          dmca: 'dmca',
        };
        logSourceFilter = sourceMap[subSource] || null;
      }
    } else {
      return NextResponse.json({ error: 'Invalid source' }, { status: 400 });
    }

    // Build query
    let query = supabase
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(MAX_ROWS);

    if (start) {
      query = query.gte('created_at', new Date(start).toISOString());
    }
    if (end) {
      query = query.lte('created_at', new Date(end + 'T23:59:59.999Z').toISOString());
    }
    if (logSourceFilter && tableName === 'system_logs') {
      query = query.eq('log_source', logSourceFilter);
    }
    if (logLevel && logLevel !== 'all' && (tableName === 'system_logs' || tableName === 'scan_logs')) {
      query = query.eq('log_level', logLevel);
    }
    if (status && status !== 'all' && tableName === 'system_logs') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = data || [];

    if (format === 'json') {
      const jsonContent = JSON.stringify(rows, null, 2);
      return new Response(jsonContent, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="productguard-${source}-${new Date().toISOString().slice(0, 10)}.json"`,
        },
      });
    }

    // CSV format
    if (rows.length === 0) {
      return new Response('No data found', {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="productguard-${source}-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    const columns = Object.keys(rows[0]);
    const csvHeader = columns.map(c => `"${c}"`).join(',');
    const csvRows = rows.map(row =>
      columns.map(col => {
        const val = (row as Record<string, unknown>)[col];
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',')
    );

    const csvContent = [csvHeader, ...csvRows].join('\n');

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="productguard-${source}-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
