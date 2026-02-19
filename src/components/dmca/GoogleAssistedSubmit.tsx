'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface GoogleAssistedSubmitProps {
  queueItemId: string;
  noticeBody: string;
  noticeSubject: string;
  formUrl: string;
  providerName: string;
  sourceUrl: string;
  onMarkedSubmitted: () => void;
}

export function GoogleAssistedSubmit({
  queueItemId,
  noticeBody,
  noticeSubject,
  formUrl,
  providerName,
  sourceUrl,
  onMarkedSubmitted,
}: GoogleAssistedSubmitProps) {
  const [copied, setCopied] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const [marked, setMarked] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(noticeBody);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback: select textarea content
      const textarea = document.createElement('textarea');
      textarea.value = noticeBody;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleMarkSubmitted = async () => {
    setIsMarking(true);
    try {
      const res = await fetch(`/api/dmca/process-queue`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queue_item_id: queueItemId,
          action: 'mark_submitted',
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to mark as submitted');
      }

      setMarked(true);
      onMarkedSubmitted();
    } catch (err) {
      console.error('Failed to mark submitted:', err);
    } finally {
      setIsMarking(false);
    }
  };

  if (marked) {
    return (
      <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm text-green-300 font-medium">Marked as submitted</p>
        </div>
        <p className="text-xs text-pg-text-muted mt-1">
          Takedown record created. We&apos;ll track this alongside your email-delivered notices.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-pg-border overflow-hidden">
      {/* Header */}
      <div className="p-3 bg-pg-surface-light border-b border-pg-border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-pg-text">{providerName}</p>
            <p className="text-xs text-pg-text-muted font-mono truncate max-w-md">{sourceUrl}</p>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold">
            WEB FORM
          </span>
        </div>
      </div>

      {/* Notice Preview */}
      <div className="p-3">
        <div className="mb-3">
          <label className="text-xs font-medium text-pg-text-muted">Subject</label>
          <p className="text-xs text-pg-text mt-0.5">{noticeSubject}</p>
        </div>
        <div className="mb-3">
          <label className="text-xs font-medium text-pg-text-muted">Notice (preview)</label>
          <div className="mt-1 p-2 rounded bg-pg-bg border border-pg-border max-h-32 overflow-y-auto">
            <pre className="text-[10px] text-pg-text-muted whitespace-pre-wrap font-mono leading-relaxed">
              {noticeBody.slice(0, 500)}{noticeBody.length > 500 ? '...' : ''}
            </pre>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleCopy}
            className="text-xs"
          >
            {copied ? 'Copied!' : 'Copy Notice'}
          </Button>
          <a
            href={formUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="secondary" className="text-xs">
              Open {providerName} Form
            </Button>
          </a>
          <Button
            onClick={handleMarkSubmitted}
            disabled={isMarking}
            className="text-xs ml-auto"
          >
            {isMarking ? 'Marking...' : "I've Submitted This"}
          </Button>
        </div>
      </div>
    </div>
  );
}
