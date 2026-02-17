'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useRouter } from 'next/navigation';
import { DMCADisclaimer } from './DMCADisclaimer';

interface TakedownActionsProps {
  takedownId: string;
  status: string;
  infringingUrl: string;
  noticeContent: string;
  recipientEmail: string | null;
}

interface WhoisInfo {
  domain: string;
  registrar?: string;
  adminEmail?: string;
  techEmail?: string;
  abuseEmail?: string;
  suggestedRecipient?: string;
}

export function TakedownActions({
  takedownId,
  status,
  infringingUrl,
  noticeContent,
  recipientEmail,
}: TakedownActionsProps) {
  const router = useRouter();
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [whoisInfo, setWhoisInfo] = useState<WhoisInfo | null>(null);
  const [loadingWhois, setLoadingWhois] = useState(false);
  const [customEmail, setCustomEmail] = useState(recipientEmail || '');
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [checkingUrl, setCheckingUrl] = useState(false);

  const extractDomain = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return '';
    }
  };

  const lookupWhois = async () => {
    const domain = extractDomain(infringingUrl);
    if (!domain) return;

    setLoadingWhois(true);
    try {
      const response = await fetch(`/api/whois?domain=${encodeURIComponent(domain)}`);
      if (response.ok) {
        const data = await response.json();
        setWhoisInfo(data);
        if (data.suggestedRecipient && !customEmail) {
          setCustomEmail(data.suggestedRecipient);
        }
      }
    } catch (error) {
      console.error('WHOIS lookup error:', error);
    } finally {
      setLoadingWhois(false);
    }
  };

  useEffect(() => {
    if (showSendDialog && !whoisInfo) {
      lookupWhois();
    }
  }, [showSendDialog]);

  const handleDisclaimerAccept = async () => {
    setShowDisclaimer(false);
    setShowSendDialog(true);
  };

  const handleDisclaimerCancel = () => {
    setShowDisclaimer(false);
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(noticeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async () => {
    if (!customEmail) {
      alert('Please enter a recipient email address');
      return;
    }

    setSending(true);
    try {
      // Log the DMCA submission first
      await fetch('/api/dmca-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          takedownId,
          recipientEmail: customEmail,
          submissionMethod: 'auto_send',
        }),
      });

      // Then send the DMCA notice
      const response = await fetch(`/api/takedowns/${takedownId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientEmail: customEmail }),
      });

      if (response.ok) {
        alert('DMCA notice sent successfully!');
        router.refresh();
        setShowSendDialog(false);
      } else {
        alert('Failed to send DMCA notice');
      }
    } catch (error) {
      console.error('Send error:', error);
      alert('Error sending DMCA notice');
    } finally {
      setSending(false);
    }
  };

  const handleSendButtonClick = () => {
    setShowDisclaimer(true);
  };

  const handleMarkSent = async () => {
    await handleManualMarkSent();
  };

  const handleManualMarkSent = async () => {
    try {
      // Log the manual submission
      await fetch('/api/dmca-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          takedownId,
          recipientEmail: customEmail || 'manual_send',
          submissionMethod: 'manual_send',
        }),
      });

      // Then mark as sent
      const response = await fetch(`/api/takedowns/${takedownId}/mark-sent`, {
        method: 'PUT',
      });

      if (response.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error('Mark sent error:', error);
    }
  };

  const handleCheckUrl = async () => {
    setCheckingUrl(true);
    try {
      const response = await fetch(`/api/takedowns/${takedownId}/check-url`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        alert(`URL Status: ${data.url_status}\n\nThe page will refresh to show updated status.`);
        router.refresh();
      } else {
        alert('Failed to check URL status');
      }
    } catch (error) {
      console.error('URL check error:', error);
      alert('Error checking URL status');
    } finally {
      setCheckingUrl(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full sm:w-auto">
      <Button
        size="sm"
        variant="secondary"
        onClick={handleCopyToClipboard}
        className="w-full"
      >
        {copied ? '✓ Copied!' : '📋 Copy to Clipboard'}
      </Button>

      {status === 'draft' && (
        <Button
          size="sm"
          onClick={handleSendButtonClick}
          className="w-full"
        >
          📧 Send DMCA Notice
        </Button>
      )}

      {status === 'draft' && (
        <Button
          size="sm"
          variant="ghost"
          onClick={handleMarkSent}
          className="w-full text-xs"
        >
          Mark as Sent
        </Button>
      )}

      {(status === 'sent' || status === 'draft') && (
        <Button
          size="sm"
          variant="secondary"
          onClick={handleCheckUrl}
          disabled={checkingUrl}
          className="w-full"
        >
          {checkingUrl ? '⏳ Checking...' : '🔍 Check URL Status'}
        </Button>
      )}

      {/* Legal Disclaimer */}
      {showDisclaimer && (
        <DMCADisclaimer
          onAccept={handleDisclaimerAccept}
          onCancel={handleDisclaimerCancel}
          recipientEmail={customEmail || 'TBD'}
          infringingUrl={infringingUrl}
        />
      )}

      {/* Send Dialog */}
      {showSendDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 sm:p-4">
          <Card className="max-w-2xl w-full max-h-[85vh] sm:max-h-[90vh] overflow-y-auto rounded-b-none sm:rounded-b-2xl">
            <h2 className="text-lg sm:text-xl font-bold mb-4">Send DMCA Notice</h2>

            {/* WHOIS Info */}
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Website Owner Information</h3>
              {loadingWhois ? (
                <p className="text-sm text-pg-text-muted">Looking up domain information...</p>
              ) : whoisInfo ? (
                <div className="bg-pg-surface-light p-4 rounded-lg space-y-2 text-sm">
                  <p>
                    <span className="text-pg-text-muted">Domain:</span>{' '}
                    <span className="font-semibold">{whoisInfo.domain}</span>
                  </p>
                  {whoisInfo.registrar && (
                    <p>
                      <span className="text-pg-text-muted">Registrar:</span> {whoisInfo.registrar}
                    </p>
                  )}
                  {whoisInfo.abuseEmail && (
                    <p>
                      <span className="text-pg-text-muted">Abuse Contact:</span>{' '}
                      <span className="text-pg-accent">{whoisInfo.abuseEmail}</span>
                    </p>
                  )}
                  {whoisInfo.adminEmail && (
                    <p>
                      <span className="text-pg-text-muted">Admin Email:</span> {whoisInfo.adminEmail}
                    </p>
                  )}
                  {whoisInfo.techEmail && (
                    <p>
                      <span className="text-pg-text-muted">Tech Email:</span> {whoisInfo.techEmail}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-pg-text-muted">
                  Unable to retrieve WHOIS information. Please enter the recipient email manually.
                </p>
              )}
            </div>

            {/* Recipient Email */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">
                Recipient Email <span className="text-pg-danger">*</span>
              </label>
              <input
                type="email"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                placeholder="abuse@example.com"
                className="input-field w-full"
              />
              <p className="text-xs text-pg-text-muted mt-1">
                Send to the domain's abuse contact or website administrator
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={handleSend}
                disabled={sending || !customEmail}
                className="flex-1"
              >
                {sending ? 'Sending...' : '📧 Send via Email'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowSendDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>

            <p className="text-xs text-pg-text-muted mt-4">
              💡 <strong>Tip:</strong> You can also copy the notice and send it manually via your own email client.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
