/**
 * GHL Event Tracking System
 *
 * Emits user events to GoHighLevel for automation and marketing
 */

import { getGHLClient } from './ghl-client';
import type { GHLEvent, GHLEventType } from './types';
import { GHL_TAGS, GHL_CUSTOM_FIELDS } from './types';

/**
 * Track an event and send to GHL
 */
export async function trackEvent(event: GHLEvent): Promise<void> {
  const client = getGHLClient();

  if (!client) {
    console.log('[GHL Events] Skipping event - GHL not configured:', event.type);
    return;
  }

  try {
    console.log(`[GHL Events] Tracking event: ${event.type} for user ${event.email}`);

    // Upsert contact with basic info
    const contactResponse = await client.upsertContact({
      email: event.email,
      customFields: event.customFields || {},
    });

    const contactId = contactResponse.contact.id;

    // Add event-specific tags
    if (event.tags && event.tags.length > 0) {
      await client.addTags(contactId, event.tags);
    }

    // Handle specific event types
    await handleEventType(client, contactId, event);

    console.log(`[GHL Events] Successfully tracked ${event.type}`);
  } catch (error) {
    console.error(`[GHL Events] Error tracking event ${event.type}:`, error);
    // Don't throw - we don't want to break the main flow if GHL fails
  }
}

/**
 * Handle specific event types with custom logic
 */
async function handleEventType(
  client: any,
  contactId: string,
  event: GHLEvent
): Promise<void> {
  const { type, data } = event;

  switch (type) {
    case 'user.signup':
      await handleUserSignup(client, contactId, data);
      break;

    case 'user.trial_started':
      await handleTrialStarted(client, contactId, data);
      break;

    case 'product.first_scan':
      await handleFirstScan(client, contactId, data);
      break;

    case 'infringement.high_severity':
      await handleHighSeverityInfringement(client, contactId, data);
      break;

    case 'dmca.sent':
      await handleDMCASent(client, contactId, data);
      break;

    case 'infringement.verified':
      await handleInfringementVerified(client, contactId, data);
      break;

    // Add more handlers as needed
  }
}

/**
 * Handle user signup event
 */
async function handleUserSignup(
  client: any,
  contactId: string,
  data: Record<string, any>
): Promise<void> {
  await client.addTags(contactId, [GHL_TAGS.TRIAL_USER, GHL_TAGS.NEEDS_ONBOARDING]);

  // Trigger welcome workflow if webhook URL provided
  const welcomeWebhook = process.env.GHL_WEBHOOK_SIGNUP;
  if (welcomeWebhook) {
    await client.triggerWorkflow(welcomeWebhook, {
      contactId,
      email: data.email,
      name: data.name,
      source: 'ProductGuard.ai Signup',
    });
  }
}

/**
 * Handle trial started event
 */
async function handleTrialStarted(
  client: any,
  contactId: string,
  data: Record<string, any>
): Promise<void> {
  const trialEndDate = data.trialEndDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  await client.updateContact(contactId, {
    customFields: {
      [GHL_CUSTOM_FIELDS.TRIAL_END_DATE]: trialEndDate.toISOString().split('T')[0],
      [GHL_CUSTOM_FIELDS.SUBSCRIPTION_STATUS]: 'trial',
    },
  });
}

/**
 * Handle first scan completion
 */
async function handleFirstScan(
  client: any,
  contactId: string,
  data: Record<string, any>
): Promise<void> {
  // Remove onboarding tag, add engaged tag
  await client.removeTags(contactId, [GHL_TAGS.NEEDS_ONBOARDING]);
  await client.addTags(contactId, [
    GHL_TAGS.FIRST_SCAN_COMPLETE,
    GHL_TAGS.ENGAGED_USER,
    GHL_TAGS.ACTIVE_SCANNER,
  ]);

  // Trigger first scan completion workflow
  const firstScanWebhook = process.env.GHL_WEBHOOK_FIRST_SCAN;
  if (firstScanWebhook) {
    await client.triggerWorkflow(firstScanWebhook, {
      contactId,
      productName: data.productName,
      scanId: data.scanId,
      resultsFound: data.resultsFound || 0,
    });
  }
}

/**
 * Handle high severity infringement detected
 */
async function handleHighSeverityInfringement(
  client: any,
  contactId: string,
  data: Record<string, any>
): Promise<void> {
  await client.addTags(contactId, [
    GHL_TAGS.HAS_INFRINGEMENTS,
    GHL_TAGS.HIGH_SEVERITY_INFRINGEMENT,
  ]);

  // Trigger urgent alert workflow
  const alertWebhook = process.env.GHL_WEBHOOK_HIGH_SEVERITY;
  if (alertWebhook) {
    await client.triggerWorkflow(alertWebhook, {
      contactId,
      infringementUrl: data.infringementUrl,
      severityScore: data.severityScore,
      platform: data.platform,
      productName: data.productName,
    });
  }
}

/**
 * Handle DMCA notice sent
 */
async function handleDMCASent(
  client: any,
  contactId: string,
  data: Record<string, any>
): Promise<void> {
  await client.addTags(contactId, [
    GHL_TAGS.DMCA_SENDER,
    GHL_TAGS.PROACTIVE_PROTECTOR,
    GHL_TAGS.POWER_USER,
  ]);

  // Update total DMCA count
  const currentCount = data.totalDMCASent || 1;
  await client.updateContact(contactId, {
    customFields: {
      [GHL_CUSTOM_FIELDS.TOTAL_DMCA_SENT]: currentCount,
    },
  });
}

/**
 * Handle infringement verified
 */
async function handleInfringementVerified(
  client: any,
  contactId: string,
  data: Record<string, any>
): Promise<void> {
  await client.addTags(contactId, [GHL_TAGS.HAS_INFRINGEMENTS, GHL_TAGS.ENGAGED_USER]);

  // Update total infringements count
  const currentCount = data.totalInfringements || 1;
  await client.updateContact(contactId, {
    customFields: {
      [GHL_CUSTOM_FIELDS.TOTAL_INFRINGEMENTS]: currentCount,
    },
  });
}

/**
 * Convenience functions for tracking specific events
 */

export async function trackUserSignup(userId: string, email: string, name?: string) {
  await trackEvent({
    type: 'user.signup',
    userId,
    email,
    data: { name },
    tags: [GHL_TAGS.TRIAL_USER, GHL_TAGS.NEEDS_ONBOARDING],
    customFields: {
      [GHL_CUSTOM_FIELDS.ACCOUNT_CREATED]: new Date().toISOString().split('T')[0],
    },
  });
}

export async function trackTrialStarted(userId: string, email: string, trialEndDate: Date) {
  await trackEvent({
    type: 'user.trial_started',
    userId,
    email,
    data: { trialEndDate },
    tags: [GHL_TAGS.TRIAL_USER],
  });
}

export async function trackFirstScan(
  userId: string,
  email: string,
  scanId: string,
  productName: string,
  resultsFound: number
) {
  await trackEvent({
    type: 'product.first_scan',
    userId,
    email,
    data: { scanId, productName, resultsFound },
    customFields: {
      [GHL_CUSTOM_FIELDS.LAST_SCAN]: new Date().toISOString().split('T')[0],
    },
  });
}

export async function trackScanCompleted(
  userId: string,
  email: string,
  scanId: string,
  totalScans: number
) {
  await trackEvent({
    type: 'scan.completed',
    userId,
    email,
    data: { scanId },
    tags: [GHL_TAGS.ACTIVE_SCANNER],
    customFields: {
      [GHL_CUSTOM_FIELDS.TOTAL_SCANS]: totalScans,
      [GHL_CUSTOM_FIELDS.LAST_SCAN]: new Date().toISOString().split('T')[0],
    },
  });
}

export async function trackHighSeverityInfringement(
  userId: string,
  email: string,
  infringementId: string,
  infringementUrl: string,
  severityScore: number,
  platform: string,
  productName: string
) {
  await trackEvent({
    type: 'infringement.high_severity',
    userId,
    email,
    data: {
      infringementId,
      infringementUrl,
      severityScore,
      platform,
      productName,
    },
    tags: [GHL_TAGS.HIGH_SEVERITY_INFRINGEMENT],
  });
}

export async function trackInfringementVerified(
  userId: string,
  email: string,
  infringementId: string,
  totalInfringements: number
) {
  await trackEvent({
    type: 'infringement.verified',
    userId,
    email,
    data: { infringementId, totalInfringements },
    customFields: {
      [GHL_CUSTOM_FIELDS.TOTAL_INFRINGEMENTS]: totalInfringements,
    },
  });
}

export async function trackDMCASent(
  userId: string,
  email: string,
  infringementId: string,
  totalDMCASent: number
) {
  await trackEvent({
    type: 'dmca.sent',
    userId,
    email,
    data: { infringementId, totalDMCASent },
    tags: [GHL_TAGS.DMCA_SENDER, GHL_TAGS.PROACTIVE_PROTECTOR],
  });
}

export async function trackTrialEndingSoon(
  userId: string,
  email: string,
  trialEndDate: Date,
  daysRemaining: number
) {
  await trackEvent({
    type: 'user.trial_ending_soon',
    userId,
    email,
    data: { trialEndDate, daysRemaining },
    tags: [GHL_TAGS.TRIAL_USER],
  });
}

export async function trackTrialExpired(
  userId: string,
  email: string,
  totalProducts: number,
  totalScans: number,
  totalInfringements: number
) {
  await trackEvent({
    type: 'user.trial_expired',
    userId,
    email,
    data: {
      totalProducts,
      totalScans,
      totalInfringements,
      expiredAt: new Date().toISOString(),
    },
  });
}

export async function trackUserInactive(
  userId: string,
  email: string,
  daysSinceLastLogin: number,
  lastLoginDate: string
) {
  await trackEvent({
    type: 'user.inactive',
    userId,
    email,
    data: {
      daysSinceLastLogin,
      lastLoginDate,
    },
    tags: [GHL_TAGS.INACTIVE_USER],
  });
}

export async function trackUserReEngaged(userId: string, email: string) {
  const client = getGHLClient();
  if (!client) return;

  await trackEvent({
    type: 'user.re_engaged',
    userId,
    email,
    data: { reEngagedAt: new Date().toISOString() },
    tags: [GHL_TAGS.ENGAGED_USER],
  });

  // Remove inactive tag
  try {
    const contactResponse = await client.findContactByEmail(email);
    if (contactResponse) {
      await client.removeTags(contactResponse.contact.id, [GHL_TAGS.INACTIVE_USER]);
    }
  } catch (error) {
    console.error('[GHL Events] Error removing inactive tag:', error);
  }
}

export async function trackOnboardingIncomplete(
  userId: string,
  email: string,
  daysSinceSignup: number,
  hasProducts: boolean,
  hasScans: boolean
) {
  await trackEvent({
    type: 'user.onboarding_incomplete',
    userId,
    email,
    data: {
      daysSinceSignup,
      hasProducts,
      hasScans,
    },
    tags: [GHL_TAGS.NEEDS_ONBOARDING],
  });
}

export async function trackBecamePowerUser(
  userId: string,
  email: string,
  totalProducts: number,
  totalScans: number,
  totalDMCASent: number
) {
  await trackEvent({
    type: 'user.became_power_user',
    userId,
    email,
    data: {
      totalProducts,
      totalScans,
      totalDMCASent,
    },
    tags: [GHL_TAGS.POWER_USER, GHL_TAGS.PROACTIVE_PROTECTOR],
  });
}

export async function trackMonthlyReport(
  userId: string,
  email: string,
  reportData: {
    month: string;
    totalScans: number;
    totalInfringements: number;
    totalDMCASent: number;
    totalResolved: number;
    newProducts: number;
  }
) {
  await trackEvent({
    type: 'user.monthly_report',
    userId,
    email,
    data: reportData,
  });
}

export async function trackInfringementResolved(
  userId: string,
  email: string,
  infringementId: string,
  totalResolved: number
) {
  await trackEvent({
    type: 'infringement.resolved',
    userId,
    email,
    data: {
      infringementId,
      totalResolved,
      resolvedAt: new Date().toISOString(),
    },
  });
}
