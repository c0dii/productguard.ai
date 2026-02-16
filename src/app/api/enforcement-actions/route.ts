/**
 * Enforcement Actions API
 *
 * POST /api/enforcement-actions - Create new enforcement action (draft DMCA, etc.)
 * GET /api/enforcement-actions?infringement_id=xxx - List actions for an infringement
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { ActionType, NoticeTone } from '@/types';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      infringement_id,
      action_type,
      target_entity,
      target_contact,
      notice_content,
      notice_tone = 'firm',
      escalation_step = 1,
    } = body;

    // Validate required fields
    if (!infringement_id || !action_type) {
      return NextResponse.json(
        { error: 'infringement_id and action_type are required' },
        { status: 400 }
      );
    }

    // Verify user owns the infringement
    const { data: infringement, error: infringementError } = await supabase
      .from('infringements')
      .select('user_id')
      .eq('id', infringement_id)
      .single();

    if (infringementError || !infringement) {
      return NextResponse.json(
        { error: 'Infringement not found' },
        { status: 404 }
      );
    }

    if (infringement.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create enforcement action
    const { data: action, error: insertError } = await supabase
      .from('enforcement_actions')
      .insert({
        infringement_id,
        user_id: user.id,
        action_type,
        target_entity,
        target_contact,
        notice_content,
        notice_tone,
        escalation_step,
        status: 'draft',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Enforcement action insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create enforcement action' },
        { status: 500 }
      );
    }

    return NextResponse.json({ action }, { status: 201 });
  } catch (error) {
    console.error('Enforcement action creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const infringement_id = searchParams.get('infringement_id');

    if (!infringement_id) {
      return NextResponse.json(
        { error: 'infringement_id query parameter is required' },
        { status: 400 }
      );
    }

    // Verify user owns the infringement
    const { data: infringement, error: infringementError } = await supabase
      .from('infringements')
      .select('user_id')
      .eq('id', infringement_id)
      .single();

    if (infringementError || !infringement) {
      return NextResponse.json(
        { error: 'Infringement not found' },
        { status: 404 }
      );
    }

    if (infringement.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch enforcement actions for this infringement
    const { data: actions, error: fetchError } = await supabase
      .from('enforcement_actions')
      .select('*')
      .eq('infringement_id', infringement_id)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Enforcement actions fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch enforcement actions' },
        { status: 500 }
      );
    }

    return NextResponse.json({ actions }, { status: 200 });
  } catch (error) {
    console.error('Enforcement actions fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
