'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { DMCALetterReview } from './DMCALetterReview';

interface DMCAGenerateButtonProps {
  infringementId: string;
  productName: string;
  infringementUrl: string;
  status: string;
}

export function DMCAGenerateButton({
  infringementId,
  productName,
  infringementUrl,
  status,
}: DMCAGenerateButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [notice, setNotice] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (status !== 'active') {
      alert('Please confirm this infringement before generating a DMCA notice');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/dmca/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ infringement_id: infringementId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate DMCA notice');
      }

      setNotice(data.notice);
    } catch (err: any) {
      console.error('Error generating DMCA notice:', err);
      setError(err.message || 'Failed to generate DMCA notice. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setNotice(null);
  };

  const handleCopy = () => {
    // Could trigger analytics or other side effects here
    console.log('DMCA notice copied to clipboard');
  };

  return (
    <>
      <Button
        onClick={handleGenerate}
        disabled={isGenerating || status !== 'active'}
        className="w-full"
      >
        {isGenerating ? (
          <>
            <span className="animate-spin mr-2">⏳</span>
            Generating DMCA Notice...
          </>
        ) : (
          <>
            🤖 Generate DMCA Notice
          </>
        )}
      </Button>

      {status !== 'active' && (
        <p className="text-xs text-pg-text-muted mt-2 text-center">
          Confirm this infringement first to generate a DMCA notice
        </p>
      )}

      {error && (
        <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-xs text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      {notice && (
        <DMCALetterReview
          notice={notice}
          productName={productName}
          infringementUrl={infringementUrl}
          onClose={handleClose}
          onCopy={handleCopy}
        />
      )}
    </>
  );
}
