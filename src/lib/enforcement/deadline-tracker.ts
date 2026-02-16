/**
 * Deadline Tracker
 *
 * Monitors enforcement actions for missed deadlines and triggers:
 * - Status updates (sent → no_response)
 * - Escalation suggestions
 * - User notifications
 *
 * Should be called from a cron job (e.g., /api/cron/check-deadlines)
 */

import { createAdminClient } from '@/lib/supabase/server';
import type { EnforcementAction } from '@/types';

export interface DeadlineCheckResult {
  overdueActions: EnforcementAction[];
  updatedCount: number;
  escalationSuggestions: EscalationSuggestion[];
}

export interface EscalationSuggestion {
  actionId: string;
  infringementId: string;
  userId: string;
  currentActionType: string;
  suggestedNextStep: string;
  reason: string;
}

/**
 * Main deadline tracker class
 */
export class DeadlineTracker {
  /**
   * Check all enforcement actions for missed deadlines
   * Should be called daily via cron
   */
  async checkDeadlines(): Promise<DeadlineCheckResult> {
    const supabase = createAdminClient();
    const now = new Date().toISOString();

    // Find enforcement actions that are "sent" and past their deadline
    const { data: overdueActions, error: fetchError } = await supabase
      .from('enforcement_actions')
      .select('*')
      .eq('status', 'sent')
      .lte('deadline_at', now)
      .order('deadline_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching overdue enforcement actions:', fetchError);
      return {
        overdueActions: [],
        updatedCount: 0,
        escalationSuggestions: [],
      };
    }

    if (!overdueActions || overdueActions.length === 0) {
      console.log('[Deadline Tracker] No overdue actions found');
      return {
        overdueActions: [],
        updatedCount: 0,
        escalationSuggestions: [],
      };
    }

    console.log(`[Deadline Tracker] Found ${overdueActions.length} overdue enforcement actions`);

    // Update status to 'no_response'
    const actionIds = overdueActions.map((action) => action.id);
    const { error: updateError } = await supabase
      .from('enforcement_actions')
      .update({
        status: 'no_response',
        resolved_at: now,
      })
      .in('id', actionIds);

    if (updateError) {
      console.error('Error updating overdue actions:', updateError);
    }

    // Generate escalation suggestions
    const escalationSuggestions = this.generateEscalationSuggestions(overdueActions as EnforcementAction[]);

    // TODO: Send email notifications to users about overdue actions
    // TODO: Create auto-escalation enforcement actions for P0 priorities

    return {
      overdueActions: overdueActions as EnforcementAction[],
      updatedCount: overdueActions.length,
      escalationSuggestions,
    };
  }

  /**
   * Check infringements that need re-checking based on next_check_at
   * Used to re-scan P0/P1/P2 infringements periodically
   */
  async checkInfringementReviews(): Promise<{ reviewedCount: number }> {
    const supabase = createAdminClient();
    const now = new Date().toISOString();

    // Find infringements where next_check_at has passed
    const { data: infringementsToReview, error: fetchError } = await supabase
      .from('infringements')
      .select('id, source_url, status, priority')
      .in('status', ['active', 'takedown_sent']) // Only check active or pending takedowns
      .lte('next_check_at', now)
      .order('priority', { ascending: true }); // P0 first

    if (fetchError) {
      console.error('Error fetching infringements to review:', fetchError);
      return { reviewedCount: 0 };
    }

    if (!infringementsToReview || infringementsToReview.length === 0) {
      console.log('[Deadline Tracker] No infringements due for review');
      return { reviewedCount: 0 };
    }

    console.log(`[Deadline Tracker] ${infringementsToReview.length} infringements due for review`);

    // TODO: For each infringement, re-check if it's still active
    // - Visit the source_url
    // - Check if content is still available
    // - If removed, update status to 'removed'
    // - If still active, calculate new next_check_at

    // For now, just log the infringements that need review
    infringementsToReview.forEach((inf) => {
      console.log(`[Deadline Tracker] Review needed: ${inf.source_url} (${inf.priority})`);
    });

    return { reviewedCount: infringementsToReview.length };
  }

  /**
   * Generate escalation suggestions based on overdue actions
   */
  private generateEscalationSuggestions(overdueActions: EnforcementAction[]): EscalationSuggestion[] {
    const suggestions: EscalationSuggestion[] = [];

    for (const action of overdueActions) {
      const nextStep = this.suggestNextEscalationStep(action);

      if (nextStep) {
        suggestions.push({
          actionId: action.id,
          infringementId: action.infringement_id,
          userId: action.user_id,
          currentActionType: action.action_type,
          suggestedNextStep: nextStep,
          reason: `${action.action_type} sent to ${action.target_entity || 'target'} received no response after ${this.getDaysSinceDeadline(action.deadline_at!)} days`,
        });
      }
    }

    return suggestions;
  }

  /**
   * Suggest next escalation step based on current action type
   *
   * Escalation chain:
   * 1. dmca_platform (to the platform hosting content)
   * 2. dmca_host (to hosting provider)
   * 3. dmca_cdn (to CDN like Cloudflare)
   * 4. google_deindex / bing_deindex (remove from search)
   * 5. payment_complaint (report to payment processor - Pro+ only)
   */
  private suggestNextEscalationStep(action: EnforcementAction): string | null {
    const escalationChain: Record<string, string> = {
      dmca_platform: 'dmca_host',
      dmca_host: 'dmca_cdn',
      dmca_cdn: 'google_deindex',
      google_deindex: 'payment_complaint',
      cease_desist: 'dmca_platform',
    };

    return escalationChain[action.action_type] || null;
  }

  /**
   * Calculate days since deadline passed
   */
  private getDaysSinceDeadline(deadline: string): number {
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const diffMs = now.getTime() - deadlineDate.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Auto-create escalation actions for high-priority infringements
   * This can be called automatically for P0 priorities
   */
  async autoEscalate(suggestion: EscalationSuggestion): Promise<boolean> {
    const supabase = createAdminClient();

    try {
      // Get the original action details
      const { data: originalAction, error: fetchError } = await supabase
        .from('enforcement_actions')
        .select('*')
        .eq('id', suggestion.actionId)
        .single();

      if (fetchError || !originalAction) {
        console.error('Error fetching original action for escalation:', fetchError);
        return false;
      }

      // Create new escalation action
      const { error: insertError } = await supabase
        .from('enforcement_actions')
        .insert({
          infringement_id: suggestion.infringementId,
          user_id: suggestion.userId,
          action_type: suggestion.suggestedNextStep,
          escalation_step: (originalAction.escalation_step || 1) + 1,
          status: 'draft',
          notice_tone: 'firm', // Escalations are always firm or nuclear
        });

      if (insertError) {
        console.error('Error creating escalation action:', insertError);
        return false;
      }

      console.log(`[Deadline Tracker] Auto-escalated ${suggestion.currentActionType} → ${suggestion.suggestedNextStep}`);
      return true;
    } catch (error) {
      console.error('Auto-escalation error:', error);
      return false;
    }
  }
}

// Export singleton instance
export const deadlineTracker = new DeadlineTracker();
