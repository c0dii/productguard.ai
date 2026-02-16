'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface DMCADisclaimerProps {
  onAccept: () => void;
  onCancel: () => void;
  recipientEmail: string;
  infringingUrl: string;
}

export function DMCADisclaimer({
  onAccept,
  onCancel,
  recipientEmail,
  infringingUrl,
}: DMCADisclaimerProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  const disclaimerText = `
IMPORTANT LEGAL NOTICE - PLEASE READ CAREFULLY

By checking the box below and proceeding to send this DMCA takedown notice, you acknowledge and agree to the following:

1. VERIFICATION OF INFRINGEMENT
   You confirm that you have personally verified that the content at the specified URL (${infringingUrl}) is infringing on your copyright or intellectual property rights.

2. ACCURACY OF INFORMATION
   You certify, under penalty of perjury, that:
   - You are the copyright owner or authorized to act on behalf of the copyright owner
   - The information in this DMCA notice is accurate
   - You have a good faith belief that the use of the copyrighted material is not authorized

3. LEGAL RESPONSIBILITY
   You understand that filing a false or fraudulent DMCA notice may result in:
   - Civil liability for damages, including costs and attorney's fees
   - Criminal penalties under applicable law
   - Potential counter-claims from the accused party

4. INDEMNIFICATION
   You agree to indemnify, defend, and hold harmless ProductGuard.ai, its officers, directors, employees, and agents from any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorney's fees) arising from:
   - Your use of this DMCA submission service
   - Any false or misleading information provided by you
   - Any violation of applicable laws or third-party rights
   - Any actions taken by recipients of your DMCA notice

5. NO LIABILITY
   ProductGuard.ai is a service provider that facilitates the generation and transmission of DMCA notices. ProductGuard.ai:
   - Does NOT verify the accuracy or validity of your claims
   - Does NOT provide legal advice or representation
   - Is NOT responsible for the outcome of your DMCA notice
   - Is NOT liable for any consequences resulting from your submission

6. LEGAL ADVICE RECOMMENDATION
   ProductGuard.ai strongly recommends consulting with a qualified attorney before sending any DMCA notice, especially if:
   - You are unsure about your copyright ownership
   - The case involves significant monetary value
   - You anticipate legal disputes

7. RECORD KEEPING
   By proceeding, you acknowledge that ProductGuard.ai will maintain records of this submission, including:
   - Your IP address and location
   - Timestamp of submission
   - Content of the DMCA notice
   - Recipient information

   These records are kept for legal compliance and may be disclosed if required by law.

RECIPIENT: ${recipientEmail}
SUBMISSION DATE: ${new Date().toLocaleString()}

BY CHECKING THE BOX BELOW, YOU CERTIFY THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO ALL OF THE ABOVE TERMS.
`.trim();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="max-w-3xl w-full my-8">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-pg-danger mb-2">⚠️ Legal Disclaimer & Acknowledgment</h2>
            <p className="text-sm text-pg-text-muted">
              Please read this carefully before proceeding
            </p>
          </div>

          {/* Scrollable disclaimer text */}
          <div className="bg-pg-surface-light p-6 rounded-lg border-2 border-pg-warning max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">
              {disclaimerText}
            </pre>
          </div>

          {/* Acknowledgment checkbox */}
          <div className="bg-pg-danger bg-opacity-10 border-2 border-pg-danger rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-pg-danger text-pg-danger focus:ring-pg-danger cursor-pointer"
              />
              <span className="text-sm font-semibold">
                I have read and understood the above disclaimer. I verify that I am the copyright owner (or
                authorized to act on their behalf), that the information is accurate, and I accept full
                responsibility for submitting this DMCA notice. I agree to indemnify and hold harmless
                ProductGuard.ai from any consequences arising from this submission.
              </span>
            </label>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              onClick={onAccept}
              disabled={!acknowledged}
              className={`flex-1 ${!acknowledged ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {acknowledged ? '✓ I Agree - Proceed to Send' : '⚠️ You Must Acknowledge First'}
            </Button>
            <Button
              variant="secondary"
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>

          <p className="text-xs text-pg-text-muted text-center">
            💡 <strong>Tip:</strong> Consider consulting with an attorney before sending DMCA notices,
            especially for high-value cases or complex situations.
          </p>
        </div>
      </Card>
    </div>
  );
}
