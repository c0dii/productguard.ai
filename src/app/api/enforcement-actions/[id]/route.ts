/**
 * Enforcement Action Update API
 *
 * PATCH /api/enforcement-actions/[id] - Update enforcement action status, deadlines, etc.
 * DELETE /api/enforcement-actions/[id] - Delete enforcement action (draft only)
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { EnforcementStatus } from '@/types';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const actionId = params.id;
    const body = await request.json();

    // Verify user owns the enforcement action
    const { data: action, error: actionError } = await supabase
      .from('enforcement_actions')
      .select('user_id, status')
      .eq('id', actionId)
      .single();

    if (actionError || !action) {
      return NextResponse.json(
        { error: 'Enforcement action not found' },
        { status: 404 }
      );
    }

    if (action.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build update object (only allow specific fields)
    const updates: any = {};

    if (body.status !== undefined) {
      updates.status = body.status as EnforcementStatus;

      // Auto-set timestamps based on status transitions
      if (body.status === 'sent' && action.status === 'draft') {
        updates.sent_at = new Date().toISOString();
        // Set deadline (e.g., 7 days from now)
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + 7);
        updates.deadline_at = deadline.toISOString();
      }

      if (body.status === 'acknowledged' && !updates.response_at) {
        updates.response_at = new Date().toISOString();
      }

      if (['removed', 'refused', 'no_response', 'failed'].includes(body.status)) {
        updates.resolved_at = new Date().toISOString();
      }
    }

    if (body.notice_content !== undefined) {
      updates.notice_content = body.notice_content;
    }

    if (body.target_entity !== undefined) {
      updates.target_entity = body.target_entity;
    }

    if (body.target_contact !== undefined) {
      updates.target_contact = body.target_contact;
    }

    if (body.deadline_at !== undefined) {
      updates.deadline_at = body.deadline_at;
    }

    if (body.response_at !== undefined) {
      updates.response_at = body.response_at;
    }

    // Update enforcement action
    const { data: updated, error: updateError } = await supabase
      .from('enforcement_actions')
      .update(updates)
      .eq('id', actionId)
      .select()
      .single();

    if (updateError) {
      console.error('Enforcement action update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update enforcement action' },
        { status: 500 }
      );
    }

    return NextResponse.json({ action: updated }, { status: 200 });
  } catch (error) {
    console.error('Enforcement action update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const actionId = params.id;

    // Verify user owns the enforcement action and it's in draft status
    const { data: action, error: actionError } = await supabase
      .from('enforcement_actions')
      .select('user_id, status')
      .eq('id', actionId)
      .single();

    if (actionError || !action) {
      return NextResponse.json(
        { error: 'Enforcement action not found' },
        { status: 404 }
      );
    }

    if (action.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Only allow deletion of draft actions
    if (action.status !== 'draft') {
      return NextResponse.json(
        { error: 'Can only delete draft enforcement actions' },
        { status: 400 }
      );
    }

    // Delete enforcement action
    const { error: deleteError } = await supabase
      .from('enforcement_actions')
      .delete()
      .eq('id', actionId);

    if (deleteError) {
      console.error('Enforcement action delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete enforcement action' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Enforcement action deleted' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Enforcement action delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
