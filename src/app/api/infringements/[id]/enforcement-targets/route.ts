import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { resolveAllTargets } from '@/lib/dmca/provider-database';

/**
 * GET /api/infringements/[id]/enforcement-targets
 * Get the recommended enforcement targets for an infringement.
 * Returns an ordered list of targets (platform → hosting → registrar → Google).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: infringement, error } = await supabase
      .from('infringements')
      .select('source_url, platform, infrastructure, whois_registrar_name, whois_registrar_abuse_email, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !infringement) {
      return NextResponse.json({ error: 'Infringement not found' }, { status: 404 });
    }

    const targets = resolveAllTargets(
      infringement.source_url,
      infringement.platform,
      infringement.infrastructure?.hosting_provider,
      infringement.whois_registrar_name,
      infringement.whois_registrar_abuse_email,
    );

    return NextResponse.json({ targets });
  } catch (error: any) {
    console.error('Error fetching enforcement targets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
