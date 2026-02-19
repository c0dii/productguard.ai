/**
 * Email Notification Service
 *
 * Sends user notifications for high-priority events using Resend.
 * Events: new P0 infringement, takedown confirmation, scan complete, etc.
 *
 * All emails check user preferences before sending and include
 * a "Manage your communications" footer link + List-Unsubscribe headers.
 */

import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase/server';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.NOTIFICATION_FROM_EMAIL || 'alerts@productguard.ai';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://productguard.ai';

export interface NotificationPayload {
  to: string;
  userName: string;
}

// ============================================================================
// Email Preference Helpers
// ============================================================================

type EmailCategory = 'threat_alerts' | 'scan_notifications' | 'takedown_updates';

interface UserEmailPrefs {
  email_threat_alerts: boolean;
  email_scan_notifications: boolean;
  email_takedown_updates: boolean;
  email_account_only: boolean;
  email_unsubscribe_all: boolean;
  email_preferences_token: string | null;
}

async function getUserEmailPrefs(email: string): Promise<UserEmailPrefs | null> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('profiles')
      .select('email_threat_alerts, email_scan_notifications, email_takedown_updates, email_account_only, email_unsubscribe_all, email_preferences_token')
      .eq('email', email)
      .single();
    return data;
  } catch {
    return null;
  }
}

function shouldSendEmail(prefs: UserEmailPrefs | null, category: EmailCategory): boolean {
  if (!prefs) return true; // no profile found = send by default
  if (prefs.email_unsubscribe_all) return false;
  if (prefs.email_account_only) return false;

  switch (category) {
    case 'threat_alerts': return prefs.email_threat_alerts;
    case 'scan_notifications': return prefs.email_scan_notifications;
    case 'takedown_updates': return prefs.email_takedown_updates;
    default: return true;
  }
}

function getEmailFooter(token: string | null | undefined): string {
  const manageUrl = `${APP_URL}/email-preferences${token ? `?token=${token}` : ''}`;
  return `
    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 32px;">
      You're receiving this because you have a product monitored by ProductGuard.
      <br />
      <a href="${manageUrl}" style="color: #00D4AA; text-decoration: underline;">
        Manage your communications
      </a>
    </p>
  `;
}

function getUnsubscribeHeaders(token: string | null | undefined): Record<string, string> {
  const manageUrl = `${APP_URL}/api/email-preferences${token ? `?token=${token}` : ''}`;
  return {
    'List-Unsubscribe': `<${manageUrl}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

// ============================================================================
// Notification Functions
// ============================================================================

/**
 * Send notification when a high-severity (P0) infringement is detected
 */
export async function notifyHighSeverityInfringement(
  payload: NotificationPayload & {
    productName: string;
    sourceUrl: string;
    platform: string;
    severityScore: number;
    estRevenueLoss: number;
    infringementId: string;
  }
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Notifications] RESEND_API_KEY not configured, skipping email');
    return false;
  }

  const prefs = await getUserEmailPrefs(payload.to);
  if (!shouldSendEmail(prefs, 'threat_alerts')) {
    console.log(`[Notifications] ${payload.to} opted out of threat_alerts, skipping`);
    return false;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `ProductGuard Alerts <${FROM_EMAIL}>`,
      to: payload.to,
      subject: `[P0 Alert] High-severity infringement detected for "${payload.productName}"`,
      headers: getUnsubscribeHeaders(prefs?.email_preferences_token),
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 24px; border-radius: 12px; color: white; margin-bottom: 20px;">
            <h1 style="margin: 0 0 8px 0; font-size: 20px;">High-Severity Infringement Detected</h1>
            <p style="margin: 0; opacity: 0.8; font-size: 14px;">Immediate action recommended</p>
          </div>

          <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
            <p style="margin: 0 0 16px 0;">Hi ${payload.userName},</p>
            <p style="margin: 0 0 16px 0;">We've detected a <strong>high-severity infringement</strong> of your product <strong>"${payload.productName}"</strong>.</p>

            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Platform</td>
                <td style="padding: 8px 0; font-weight: 600; text-transform: capitalize;">${payload.platform}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Severity Score</td>
                <td style="padding: 8px 0; font-weight: 600; color: #ef4444;">${payload.severityScore}/100</td>
              </tr>
              <!-- Temporarily disabled - revenue loss calculations need refinement -->
              <!--<tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Est. Revenue Loss</td>
                <td style="padding: 8px 0; font-weight: 600; color: #ef4444;">$${payload.estRevenueLoss.toLocaleString()}</td>
              </tr>-->
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Infringing URL</td>
                <td style="padding: 8px 0; font-size: 13px; word-break: break-all;">
                  <a href="${payload.sourceUrl}" style="color: #3b82f6;">${payload.sourceUrl}</a>
                </td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${APP_URL}/dashboard/infringements/${payload.infringementId}"
               style="display: inline-block; background: #00D4AA; color: #000; font-weight: 600; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 14px;">
              Review &amp; Take Action
            </a>
          </div>

          ${getEmailFooter(prefs?.email_preferences_token)}
        </div>
      `,
    });

    if (error) {
      console.error('[Notifications] Failed to send high-severity email:', error);
      return false;
    }

    console.log(`[Notifications] High-severity alert sent to ${payload.to} (ID: ${data?.id})`);
    return true;
  } catch (error) {
    console.error('[Notifications] Error sending email:', error);
    return false;
  }
}

/**
 * Send notification when a scan completes with results
 */
export async function notifyScanComplete(
  payload: NotificationPayload & {
    productName: string;
    scanId: string;
    newInfringements: number;
    totalScanned: number;
    p0Count: number;
  }
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false;

  // Only send if there are new infringements
  if (payload.newInfringements === 0) return false;

  const prefs = await getUserEmailPrefs(payload.to);
  if (!shouldSendEmail(prefs, 'scan_notifications')) {
    console.log(`[Notifications] ${payload.to} opted out of scan_notifications, skipping`);
    return false;
  }

  try {
    const urgency = payload.p0Count > 0 ? 'Action Required' : 'New Results';

    const { error } = await resend.emails.send({
      from: `ProductGuard <${FROM_EMAIL}>`,
      to: payload.to,
      subject: `[${urgency}] Scan complete: ${payload.newInfringements} new threats for "${payload.productName}"`,
      headers: getUnsubscribeHeaders(prefs?.email_preferences_token),
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 24px; border-radius: 12px; color: white; margin-bottom: 20px;">
            <h1 style="margin: 0 0 8px 0; font-size: 20px;">Scan Complete</h1>
            <p style="margin: 0; opacity: 0.8; font-size: 14px;">${payload.productName}</p>
          </div>

          <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
            <p style="margin: 0 0 16px 0;">Hi ${payload.userName},</p>
            <p style="margin: 0 0 16px 0;">Your scan for <strong>"${payload.productName}"</strong> has finished.</p>

            <div style="display: flex; gap: 12px; margin: 16px 0;">
              <div style="flex: 1; background: #fef2f2; border-radius: 8px; padding: 16px; text-align: center;">
                <div style="font-size: 24px; font-weight: 700; color: #ef4444;">${payload.newInfringements}</div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">New Threats</div>
              </div>
              ${payload.p0Count > 0 ? `
              <div style="flex: 1; background: #fef2f2; border-radius: 8px; padding: 16px; text-align: center;">
                <div style="font-size: 24px; font-weight: 700; color: #dc2626;">${payload.p0Count}</div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Critical (P0)</div>
              </div>` : ''}
              <div style="flex: 1; background: #f0fdf4; border-radius: 8px; padding: 16px; text-align: center;">
                <div style="font-size: 24px; font-weight: 700; color: #16a34a;">${payload.totalScanned}</div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">URLs Scanned</div>
              </div>
            </div>
          </div>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${APP_URL}/dashboard/scans/${payload.scanId}"
               style="display: inline-block; background: #00D4AA; color: #000; font-weight: 600; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 14px;">
              View Scan Results
            </a>
          </div>

          ${getEmailFooter(prefs?.email_preferences_token)}
        </div>
      `,
    });

    if (error) {
      console.error('[Notifications] Failed to send scan complete email:', error);
      return false;
    }

    console.log(`[Notifications] Scan complete email sent to ${payload.to}`);
    return true;
  } catch (error) {
    console.error('[Notifications] Error sending email:', error);
    return false;
  }
}

/**
 * Send notification when a takedown is confirmed removed
 */
export async function notifyTakedownSuccess(
  payload: NotificationPayload & {
    productName: string;
    sourceUrl: string;
    platform: string;
  }
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false;

  const prefs = await getUserEmailPrefs(payload.to);
  if (!shouldSendEmail(prefs, 'takedown_updates')) {
    console.log(`[Notifications] ${payload.to} opted out of takedown_updates, skipping`);
    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from: `ProductGuard <${FROM_EMAIL}>`,
      to: payload.to,
      subject: `Takedown successful: Infringing content removed for "${payload.productName}"`,
      headers: getUnsubscribeHeaders(prefs?.email_preferences_token),
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #064e3b 0%, #065f46 100%); padding: 24px; border-radius: 12px; color: white; margin-bottom: 20px;">
            <h1 style="margin: 0 0 8px 0; font-size: 20px;">Takedown Successful</h1>
            <p style="margin: 0; opacity: 0.8; font-size: 14px;">Infringing content has been removed</p>
          </div>

          <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px;">
            <p style="margin: 0 0 16px 0;">Hi ${payload.userName},</p>
            <p style="margin: 0 0 16px 0;">
              The infringing content for <strong>"${payload.productName}"</strong> on
              <strong>${payload.platform}</strong> has been confirmed as <strong style="color: #16a34a;">removed</strong>.
            </p>
            <p style="margin: 0; color: #6b7280; font-size: 13px; word-break: break-all;">
              URL: ${payload.sourceUrl}
            </p>
          </div>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${APP_URL}/dashboard"
               style="display: inline-block; background: #00D4AA; color: #000; font-weight: 600; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 14px;">
              View Dashboard
            </a>
          </div>

          ${getEmailFooter(prefs?.email_preferences_token)}
        </div>
      `,
    });

    if (error) {
      console.error('[Notifications] Failed to send takedown success email:', error);
      return false;
    }

    console.log(`[Notifications] Takedown success email sent to ${payload.to}`);
    return true;
  } catch (error) {
    console.error('[Notifications] Error sending email:', error);
    return false;
  }
}

// ============================================================================
// Payment & Deadline Notifications
// ============================================================================

/**
 * Send notification when a payment fails (account-level — always sends)
 */
export async function notifyPaymentFailed(
  payload: NotificationPayload & {
    amount: number;
    currency: string;
    nextRetryDate: string | null;
    updatePaymentUrl: string;
  }
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false;

  try {
    const retryInfo = payload.nextRetryDate
      ? `<p style="margin: 0 0 16px 0;">We'll automatically retry the payment on <strong>${payload.nextRetryDate}</strong>. To avoid service interruption, please update your payment method before then.</p>`
      : `<p style="margin: 0 0 16px 0; color: #ef4444;">This was the final retry attempt. Please update your payment method to continue using ProductGuard.</p>`;

    const { error } = await resend.emails.send({
      from: `ProductGuard <${FROM_EMAIL}>`,
      to: payload.to,
      subject: `Payment failed for your ProductGuard subscription`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%); padding: 24px; border-radius: 12px; color: white; margin-bottom: 20px;">
            <h1 style="margin: 0 0 8px 0; font-size: 20px;">Payment Failed</h1>
            <p style="margin: 0; opacity: 0.8; font-size: 14px;">Action required to maintain your subscription</p>
          </div>

          <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
            <p style="margin: 0 0 16px 0;">Hi ${payload.userName},</p>
            <p style="margin: 0 0 16px 0;">We were unable to process your payment of <strong>${payload.currency} $${payload.amount.toFixed(2)}</strong> for your ProductGuard subscription.</p>
            ${retryInfo}
          </div>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${payload.updatePaymentUrl}"
               style="display: inline-block; background: #00D4AA; color: #000; font-weight: 600; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 14px;">
              Update Payment Method
            </a>
          </div>

          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 32px;">
            This is an account notification and cannot be unsubscribed from.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('[Notifications] Failed to send payment failed email:', error);
      return false;
    }

    console.log(`[Notifications] Payment failed email sent to ${payload.to}`);
    return true;
  } catch (error) {
    console.error('[Notifications] Error sending payment failed email:', error);
    return false;
  }
}

/**
 * Send notification when an enforcement action deadline passes with no response
 */
export async function notifyDeadlineOverdue(
  payload: NotificationPayload & {
    productName: string;
    actionType: string;
    targetEntity: string;
    daysSinceDeadline: number;
    suggestedNextStep: string;
    infringementId: string;
  }
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false;

  const prefs = await getUserEmailPrefs(payload.to);
  if (!shouldSendEmail(prefs, 'threat_alerts')) return false;

  try {
    const { error } = await resend.emails.send({
      from: `ProductGuard Alerts <${FROM_EMAIL}>`,
      to: payload.to,
      subject: `[Action Required] No response to DMCA notice for "${payload.productName}"`,
      headers: getUnsubscribeHeaders(prefs?.email_preferences_token),
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #78350f 0%, #92400e 100%); padding: 24px; border-radius: 12px; color: white; margin-bottom: 20px;">
            <h1 style="margin: 0 0 8px 0; font-size: 20px;">Enforcement Deadline Passed</h1>
            <p style="margin: 0; opacity: 0.8; font-size: 14px;">No response received — escalation recommended</p>
          </div>

          <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
            <p style="margin: 0 0 16px 0;">Hi ${payload.userName},</p>
            <p style="margin: 0 0 16px 0;">
              Your <strong>${payload.actionType.replace(/_/g, ' ')}</strong> notice sent to
              <strong>${payload.targetEntity}</strong> for <strong>"${payload.productName}"</strong>
              has not received a response after <strong>${payload.daysSinceDeadline} days</strong>.
            </p>
            <div style="background: #fefce8; border: 1px solid #facc15; border-radius: 8px; padding: 12px; margin: 16px 0;">
              <p style="margin: 0; font-size: 14px; color: #854d0e;">
                <strong>Recommended next step:</strong> ${payload.suggestedNextStep.replace(/_/g, ' ')}
              </p>
            </div>
          </div>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${APP_URL}/dashboard/infringements/${payload.infringementId}"
               style="display: inline-block; background: #00D4AA; color: #000; font-weight: 600; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 14px;">
              Review &amp; Escalate
            </a>
          </div>

          ${getEmailFooter(prefs?.email_preferences_token)}
        </div>
      `,
    });

    if (error) {
      console.error('[Notifications] Failed to send deadline overdue email:', error);
      return false;
    }

    console.log(`[Notifications] Deadline overdue email sent to ${payload.to}`);
    return true;
  } catch (error) {
    console.error('[Notifications] Error sending deadline overdue email:', error);
    return false;
  }
}

/**
 * Send notification when previously removed content reappears (re-listing)
 */
export async function notifyRelisting(
  payload: NotificationPayload & {
    productName: string;
    sourceUrl: string;
    platform: string;
    originalRemovalDate: string;
    infringementId: string;
  }
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false;

  const prefs = await getUserEmailPrefs(payload.to);
  if (!shouldSendEmail(prefs, 'threat_alerts')) return false;

  try {
    const { error } = await resend.emails.send({
      from: `ProductGuard Alerts <${FROM_EMAIL}>`,
      to: payload.to,
      subject: `[Alert] Previously removed content has reappeared — "${payload.productName}"`,
      headers: getUnsubscribeHeaders(prefs?.email_preferences_token),
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%); padding: 24px; border-radius: 12px; color: white; margin-bottom: 20px;">
            <h1 style="margin: 0 0 8px 0; font-size: 20px;">Content Re-Listed</h1>
            <p style="margin: 0; opacity: 0.8; font-size: 14px;">Previously removed content has reappeared</p>
          </div>

          <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
            <p style="margin: 0 0 16px 0;">Hi ${payload.userName},</p>
            <p style="margin: 0 0 16px 0;">
              Content that was previously removed for <strong>"${payload.productName}"</strong> on
              <strong>${payload.platform}</strong> has been detected again.
            </p>

            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">URL</td>
                <td style="padding: 8px 0; font-size: 13px; word-break: break-all;">
                  <a href="${payload.sourceUrl}" style="color: #3b82f6;">${payload.sourceUrl}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Originally Removed</td>
                <td style="padding: 8px 0; font-weight: 600;">${payload.originalRemovalDate}</td>
              </tr>
            </table>

            <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 13px;">
              We've automatically re-opened this infringement and set it back to active status.
              You may want to send a new takedown notice.
            </p>
          </div>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${APP_URL}/dashboard/infringements/${payload.infringementId}"
               style="display: inline-block; background: #00D4AA; color: #000; font-weight: 600; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 14px;">
              Take Action
            </a>
          </div>

          ${getEmailFooter(prefs?.email_preferences_token)}
        </div>
      `,
    });

    if (error) {
      console.error('[Notifications] Failed to send relisting email:', error);
      return false;
    }

    console.log(`[Notifications] Relisting alert sent to ${payload.to}`);
    return true;
  } catch (error) {
    console.error('[Notifications] Error sending relisting email:', error);
    return false;
  }
}

// ============================================================================
// Admin Scan Error Alerts
// ============================================================================

interface ScanErrorPayload {
  scanId: string;
  productName: string;
  productId: string;
  errorCode: string;
  errorMessage: string;
  stage: string;
  scanParams: Record<string, unknown>;
  recentLogs: Array<{ log_level: string; stage: string; message: string; error_code?: string | null }>;
}

function getSuggestedSteps(errorCode: string, message: string): string[] {
  const steps: string[] = [];

  switch (errorCode) {
    case 'TIMEOUT':
      steps.push('Check Serper.dev status for service disruptions');
      steps.push('Review scan duration settings (MAX_SCAN_DURATION_MS)');
      steps.push('Check if product has excessive keywords generating too many queries');
      break;
    case 'API_LIMIT':
    case 'SERP_429':
      steps.push('Check Serper.dev account quota and billing');
      steps.push('Review SERPER_API_KEY environment variable');
      steps.push('Consider reducing scan budget or query count');
      break;
    case 'SERP_ERROR':
      steps.push('Check Serper.dev status page');
      steps.push('Verify SERPER_API_KEY is valid');
      steps.push('Review query format for malformed requests');
      break;
    case 'AI_FILTER_FAIL':
      steps.push('Check OpenAI API billing and quota');
      steps.push('Verify OPENAI_API_KEY environment variable');
      steps.push('Review AI confidence threshold setting');
      break;
    case 'DB_BATCH_FAIL':
    case 'DB_INSERT_FAIL':
      steps.push('Check Supabase service status');
      steps.push('Review database connection pool limits');
      steps.push('Check for schema/constraint violations in recent data');
      break;
    case 'TELEGRAM_FAIL':
      steps.push('Check Telegram Bot API token');
      steps.push('Verify TELEGRAM_BOT_TOKEN environment variable');
      steps.push('Review Telegram rate limits');
      break;
    case 'GHL_FAIL':
      steps.push('Check GoHighLevel API credentials');
      steps.push('Verify GHL webhook endpoints');
      break;
    case 'EMAIL_FAIL':
      steps.push('Check Resend API key and billing');
      steps.push('Verify RESEND_API_KEY environment variable');
      steps.push('Review sender domain verification');
      break;
    default:
      steps.push('Review full error stack trace');
      steps.push('Check Vercel function logs for additional context');
      steps.push('Verify all environment variables are set correctly');
  }

  if (message.toLowerCase().includes('network') || message.toLowerCase().includes('fetch')) {
    steps.push('Check network connectivity from Vercel deployment');
  }

  return steps;
}

/**
 * Send admin alert when a scan encounters a fatal error.
 * Sends to ADMIN_ALERT_EMAIL (not user preferences — this is system-level).
 */
export async function notifyScanError(payload: ScanErrorPayload): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Notifications] RESEND_API_KEY not configured, skipping scan error alert');
    return false;
  }

  const adminEmail = process.env.ADMIN_ALERT_EMAIL;
  if (!adminEmail) {
    console.warn('[Notifications] ADMIN_ALERT_EMAIL not configured, skipping scan error alert');
    return false;
  }

  try {
    const suggestedSteps = getSuggestedSteps(payload.errorCode, payload.errorMessage);

    const logTrail = payload.recentLogs.map((log) => {
      const badge = log.log_level === 'error' || log.log_level === 'fatal'
        ? '🔴' : log.log_level === 'warn' ? '🟡' : '🟢';
      return `${badge} [${log.stage}] ${log.message}${log.error_code ? ` (${log.error_code})` : ''}`;
    }).join('<br />');

    const paramsHtml = Object.entries(payload.scanParams)
      .map(([key, value]) => `<strong>${key}:</strong> ${String(value)}`)
      .join('<br />');

    const { error } = await resend.emails.send({
      from: `ProductGuard System <${FROM_EMAIL}>`,
      to: adminEmail,
      subject: `[SCAN FATAL] ${payload.errorCode} in ${payload.stage} — ${payload.productName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%); padding: 24px; border-radius: 12px; color: white; margin-bottom: 20px;">
            <h1 style="margin: 0 0 8px 0; font-size: 20px;">Scan Fatal Error</h1>
            <p style="margin: 0; opacity: 0.8; font-size: 14px;">Automatic alert — immediate investigation recommended</p>
          </div>

          <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Scan ID</td>
                <td style="padding: 8px 0; font-family: monospace; font-size: 13px;">${payload.scanId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Product</td>
                <td style="padding: 8px 0; font-weight: 600;">${payload.productName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Error Code</td>
                <td style="padding: 8px 0; font-weight: 600; color: #ef4444;">${payload.errorCode}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Stage</td>
                <td style="padding: 8px 0;">${payload.stage}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Error</td>
                <td style="padding: 8px 0; font-size: 13px; color: #dc2626; word-break: break-all;">${payload.errorMessage}</td>
              </tr>
            </table>
          </div>

          <div style="background: #fefce8; border: 1px solid #facc15; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
            <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #854d0e;">Suggested Investigation Steps</h3>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #713f12;">
              ${suggestedSteps.map(s => `<li style="margin-bottom: 4px;">${s}</li>`).join('')}
            </ul>
          </div>

          ${logTrail ? `
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
            <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #374151;">Recent Log Trail</h3>
            <div style="font-family: monospace; font-size: 12px; line-height: 1.6; color: #4b5563;">
              ${logTrail}
            </div>
          </div>` : ''}

          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
            <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #374151;">Scan Parameters</h3>
            <div style="font-family: monospace; font-size: 12px; line-height: 1.6; color: #4b5563;">
              ${paramsHtml}
            </div>
          </div>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${APP_URL}/admin/scans/scan-logs"
               style="display: inline-block; background: #ef4444; color: #fff; font-weight: 600; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 14px;">
              View Scan Logs Dashboard
            </a>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('[Notifications] Failed to send scan error alert:', error);
      return false;
    }

    console.log(`[Notifications] Scan error alert sent to ${adminEmail}`);
    return true;
  } catch (error) {
    console.error('[Notifications] Error sending scan error alert:', error);
    return false;
  }
}
