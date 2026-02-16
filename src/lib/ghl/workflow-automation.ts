/**
 * GHL Workflow Automation Helpers
 *
 * Background jobs and scheduled tasks for triggering GHL workflows
 * These should be called via cron jobs or background workers
 */

import { createAdminClient } from '@/lib/supabase/server';
import {
  trackTrialEndingSoon,
  trackTrialExpired,
  trackUserInactive,
  trackOnboardingIncomplete,
  trackMonthlyReport,
  trackBecamePowerUser,
} from './events';

/**
 * Check for trials ending soon (run daily)
 * Triggers workflow for users with trials expiring in 3 days
 */
export async function checkTrialsEndingSoon() {
  const supabase = createAdminClient();

  try {
    // Get trials ending in 3 days
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    threeDaysFromNow.setHours(0, 0, 0, 0);

    const fourDaysFromNow = new Date(threeDaysFromNow);
    fourDaysFromNow.setDate(fourDaysFromNow.getDate() + 1);

    const { data: users } = await supabase.auth.admin.listUsers();

    if (!users?.users) return;

    for (const user of users.users) {
      // Check if user has trial_end_date in metadata or profile
      const trialEndDate = user.user_metadata?.trial_end_date;

      if (trialEndDate) {
        const endDate = new Date(trialEndDate);

        if (endDate >= threeDaysFromNow && endDate < fourDaysFromNow) {
          const daysRemaining = Math.ceil(
            (endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          );

          await trackTrialEndingSoon(
            user.id,
            user.email || '',
            endDate,
            daysRemaining
          );

          console.log(
            `[Workflow Automation] Trial ending soon tracked for ${user.email} (${daysRemaining} days)`
          );
        }
      }
    }
  } catch (error) {
    console.error('[Workflow Automation] Error checking trials ending soon:', error);
  }
}

/**
 * Check for expired trials (run daily)
 * Triggers workflow for users whose trials just expired
 */
export async function checkExpiredTrials() {
  const supabase = createAdminClient();

  try {
    const { data: users } = await supabase.auth.admin.listUsers();

    if (!users?.users) return;

    for (const user of users.users) {
      const trialEndDate = user.user_metadata?.trial_end_date;

      if (trialEndDate) {
        const endDate = new Date(trialEndDate);
        const now = new Date();

        // Trial expired yesterday (give 1 day grace period)
        if (endDate < now && endDate > new Date(now.getTime() - 24 * 60 * 60 * 1000)) {
          // Get user stats
          const { data: products } = await supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id);

          const { data: scans } = await supabase
            .from('scans')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id);

          const { data: infringements } = await supabase
            .from('infringements')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id);

          await trackTrialExpired(
            user.id,
            user.email || '',
            products?.length || 0,
            scans?.length || 0,
            infringements?.length || 0
          );

          console.log(`[Workflow Automation] Trial expired tracked for ${user.email}`);
        }
      }
    }
  } catch (error) {
    console.error('[Workflow Automation] Error checking expired trials:', error);
  }
}

/**
 * Check for inactive users (run daily)
 * Triggers workflow for users who haven't logged in for 7+ days
 */
export async function checkInactiveUsers() {
  const supabase = createAdminClient();

  try {
    const { data: users } = await supabase.auth.admin.listUsers();

    if (!users?.users) return;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    for (const user of users.users) {
      const lastSignIn = new Date(user.last_sign_in_at || user.created_at);

      if (lastSignIn < sevenDaysAgo) {
        const daysSinceLastLogin = Math.floor(
          (new Date().getTime() - lastSignIn.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Only track if 7, 14, or 30 days (don't spam)
        if ([7, 14, 30].includes(daysSinceLastLogin)) {
          await trackUserInactive(
            user.id,
            user.email || '',
            daysSinceLastLogin,
            lastSignIn.toISOString()
          );

          console.log(
            `[Workflow Automation] Inactive user tracked: ${user.email} (${daysSinceLastLogin} days)`
          );
        }
      }
    }
  } catch (error) {
    console.error('[Workflow Automation] Error checking inactive users:', error);
  }
}

/**
 * Check for incomplete onboarding (run daily)
 * Triggers workflow for users who signed up 3+ days ago but haven't completed onboarding
 */
export async function checkIncompleteOnboarding() {
  const supabase = createAdminClient();

  try {
    const { data: users } = await supabase.auth.admin.listUsers();

    if (!users?.users) return;

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    for (const user of users.users) {
      const createdAt = new Date(user.created_at);

      if (createdAt < threeDaysAgo) {
        const daysSinceSignup = Math.floor(
          (new Date().getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Check if user has products and scans
        const { data: products } = await supabase
          .from('products')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        const { data: scans } = await supabase
          .from('scans')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        const hasProducts = (products?.length || 0) > 0;
        const hasScans = (scans?.length || 0) > 0;

        // Track if onboarding not complete
        if (!hasProducts || !hasScans) {
          // Only track on days 3, 7, 14 (don't spam)
          if ([3, 7, 14].includes(daysSinceSignup)) {
            await trackOnboardingIncomplete(
              user.id,
              user.email || '',
              daysSinceSignup,
              hasProducts,
              hasScans
            );

            console.log(
              `[Workflow Automation] Incomplete onboarding tracked: ${user.email} (${daysSinceSignup} days)`
            );
          }
        }
      }
    }
  } catch (error) {
    console.error('[Workflow Automation] Error checking incomplete onboarding:', error);
  }
}

/**
 * Check for new power users (run daily)
 * Triggers workflow when users cross power user threshold
 */
export async function checkForPowerUsers() {
  const supabase = createAdminClient();

  try {
    const { data: users } = await supabase.auth.admin.listUsers();

    if (!users?.users) return;

    for (const user of users.users) {
      // Get user stats
      const { data: products } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { data: scans } = await supabase
        .from('scans')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { data: dmcaSent } = await supabase
        .from('infringements')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'takedown_sent');

      const totalProducts = products?.length || 0;
      const totalScans = scans?.length || 0;
      const totalDMCASent = dmcaSent?.length || 0;

      // Power user criteria: 3+ products, 5+ scans, or 3+ DMCA sent
      const isPowerUser =
        totalProducts >= 3 || totalScans >= 5 || totalDMCASent >= 3;

      if (isPowerUser) {
        // Check if already tagged as power user (to avoid re-triggering)
        // This would require checking GHL contact tags
        // For now, we'll track and let GHL handle deduplication

        await trackBecamePowerUser(
          user.id,
          user.email || '',
          totalProducts,
          totalScans,
          totalDMCASent
        );

        console.log(`[Workflow Automation] Power user tracked: ${user.email}`);
      }
    }
  } catch (error) {
    console.error('[Workflow Automation] Error checking for power users:', error);
  }
}

/**
 * Generate monthly reports (run monthly on 1st)
 * Sends monthly activity report to all active users
 */
export async function generateMonthlyReports() {
  const supabase = createAdminClient();

  try {
    const { data: users } = await supabase.auth.admin.listUsers();

    if (!users?.users) return;

    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    for (const user of users.users) {
      // Get stats for last month
      const { data: scans } = await supabase
        .from('scans')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', lastMonth.toISOString())
        .lt('created_at', thisMonth.toISOString());

      const { data: infringements } = await supabase
        .from('infringements')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', lastMonth.toISOString())
        .lt('created_at', thisMonth.toISOString());

      const { data: dmcaSent } = await supabase
        .from('infringements')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'takedown_sent')
        .gte('updated_at', lastMonth.toISOString())
        .lt('updated_at', thisMonth.toISOString());

      const { data: resolved } = await supabase
        .from('infringements')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'removed')
        .gte('updated_at', lastMonth.toISOString())
        .lt('updated_at', thisMonth.toISOString());

      const { data: products } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', lastMonth.toISOString())
        .lt('created_at', thisMonth.toISOString());

      const reportData = {
        month: lastMonth.toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
        totalScans: scans?.length || 0,
        totalInfringements: infringements?.length || 0,
        totalDMCASent: dmcaSent?.length || 0,
        totalResolved: resolved?.length || 0,
        newProducts: products?.length || 0,
      };

      // Only send if user had any activity
      if (
        reportData.totalScans > 0 ||
        reportData.totalInfringements > 0 ||
        reportData.newProducts > 0
      ) {
        await trackMonthlyReport(user.id, user.email || '', reportData);

        console.log(`[Workflow Automation] Monthly report sent to ${user.email}`);
      }
    }
  } catch (error) {
    console.error('[Workflow Automation] Error generating monthly reports:', error);
  }
}

/**
 * Run all daily checks
 * Call this from a daily cron job
 */
export async function runDailyWorkflowChecks() {
  console.log('[Workflow Automation] Starting daily workflow checks...');

  await Promise.all([
    checkTrialsEndingSoon(),
    checkExpiredTrials(),
    checkInactiveUsers(),
    checkIncompleteOnboarding(),
    checkForPowerUsers(),
  ]);

  console.log('[Workflow Automation] Daily workflow checks complete');
}

/**
 * Run monthly checks
 * Call this from a monthly cron job (1st of month)
 */
export async function runMonthlyWorkflowChecks() {
  console.log('[Workflow Automation] Starting monthly workflow checks...');

  await generateMonthlyReports();

  console.log('[Workflow Automation] Monthly workflow checks complete');
}
