/**
 * Automated DMCA Email Submission
 *
 * Sends DMCA notices via Resend for email-based platforms.
 * For web-form-only platforms, returns the form URL instead.
 */

import { Resend } from 'resend';
import type { BuiltNotice } from './notice-builder';
import type { ProviderInfo } from './provider-database';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.DMCA_FROM_EMAIL || 'dmca@productguard.ai';

export interface SendResult {
  success: boolean;
  method: 'email' | 'web_form' | 'manual';
  messageId?: string;
  formUrl?: string;
  error?: string;
}

/**
 * Send a DMCA notice to the resolved provider.
 *
 * - If provider has an email → sends via Resend
 * - If provider only has a web form → returns the form URL
 * - If no contact → returns manual instructions
 */
export async function sendDMCANotice(
  notice: BuiltNotice,
  provider: ProviderInfo,
  senderEmail: string,
  senderName: string
): Promise<SendResult> {
  // Prefer email if available (and Resend is configured)
  if (notice.recipient_email && process.env.RESEND_API_KEY) {
    return sendViaEmail(notice, senderEmail, senderName);
  }

  // Fall back to web form URL
  if (provider.dmcaFormUrl) {
    return {
      success: true,
      method: 'web_form',
      formUrl: provider.dmcaFormUrl,
    };
  }

  // No automated method available
  return {
    success: false,
    method: 'manual',
    error: `No automated delivery method for ${provider.name}. Copy the notice and send it manually.`,
  };
}

/**
 * Send DMCA notice via email using Resend
 */
async function sendViaEmail(
  notice: BuiltNotice,
  senderEmail: string,
  senderName: string
): Promise<SendResult> {
  if (!process.env.RESEND_API_KEY) {
    return {
      success: false,
      method: 'email',
      error: 'RESEND_API_KEY not configured',
    };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${senderName} via ProductGuard <${FROM_EMAIL}>`,
      to: notice.recipient_email,
      replyTo: senderEmail,
      subject: notice.subject,
      text: notice.body,
      headers: {
        'X-DMCA-Notice': 'true',
        'X-ProductGuard-Version': '1.0',
      },
    });

    if (error) {
      console.error('[DMCA Send] Resend error:', error);
      return {
        success: false,
        method: 'email',
        error: `Email delivery failed: ${error.message}`,
      };
    }

    console.log(`[DMCA Send] Notice sent to ${notice.recipient_email} (ID: ${data?.id})`);

    return {
      success: true,
      method: 'email',
      messageId: data?.id,
    };
  } catch (error: any) {
    console.error('[DMCA Send] Exception:', error);
    return {
      success: false,
      method: 'email',
      error: error.message || 'Unknown error sending email',
    };
  }
}

/**
 * Send a batch of DMCA notices (for multiple infringements to the same provider)
 */
export async function sendBatchDMCANotices(
  notices: Array<{ notice: BuiltNotice; provider: ProviderInfo }>,
  senderEmail: string,
  senderName: string
): Promise<SendResult[]> {
  const results: SendResult[] = [];

  for (const { notice, provider } of notices) {
    const result = await sendDMCANotice(notice, provider, senderEmail, senderName);
    results.push(result);

    // Rate limit: 200ms between emails
    if (result.method === 'email') {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return results;
}
