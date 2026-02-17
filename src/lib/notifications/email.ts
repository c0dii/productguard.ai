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
