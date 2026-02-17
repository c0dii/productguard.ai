'use client';

import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useState } from 'react';

interface TimestampProof {
  hash: string;
  ots_file: string;
  created_at: string;
  status: 'pending' | 'confirmed' | 'failed';
  bitcoin_block?: number;
  confirmation_date?: string;
  verification_url?: string;
}

interface BlockchainTimestampProps {
  timestampProof: string | null; // JSON string from database
}

export function BlockchainTimestamp({ timestampProof }: BlockchainTimestampProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (!timestampProof) {
    return null;
  }

  let proof: TimestampProof;
  try {
    proof = JSON.parse(timestampProof);
  } catch (error) {
    console.error('Failed to parse timestamp proof:', error);
    return null;
  }

  const getStatusBadge = () => {
    switch (proof.status) {
      case 'confirmed':
        return (
          <Badge variant="default" className="bg-green-600 text-white">
            ✓ Confirmed on Bitcoin
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="warning" className="bg-yellow-600 text-white">
            ⏳ Pending Bitcoin Confirmation
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="danger" className="bg-red-600 text-white">
            ✗ Failed
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xl sm:text-2xl">₿</span>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-pg-text">Blockchain Timestamp</h3>
            <p className="text-xs text-pg-text-muted">Bitcoin Notary via OpenTimestamps</p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* Status Info */}
      <div className="space-y-3 mb-4">
        {proof.status === 'confirmed' && proof.confirmation_date && (
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <p className="text-sm font-semibold text-green-800 dark:text-green-400 mb-1">
              ✓ Timestamp Confirmed on Bitcoin Blockchain
            </p>
            <p className="text-xs text-green-700 dark:text-green-500">
              Confirmed: {new Date(proof.confirmation_date).toLocaleString()}
            </p>
            {proof.bitcoin_block && (
              <p className="text-xs text-green-700 dark:text-green-500">
                Bitcoin Block: #{proof.bitcoin_block.toLocaleString()}
              </p>
            )}
          </div>
        )}

        {proof.status === 'pending' && (
          <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-400 mb-1">
              ⏳ Awaiting Bitcoin Block Confirmation
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-500">
              Timestamp submitted: {new Date(proof.created_at).toLocaleString()}
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-500 mt-1">
              This usually takes 10-60 minutes. The timestamp will upgrade automatically once included in a Bitcoin
              block.
            </p>
          </div>
        )}

        {proof.status === 'failed' && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm font-semibold text-red-800 dark:text-red-400">✗ Timestamp Failed</p>
            <p className="text-xs text-red-700 dark:text-red-500 mt-1">
              The blockchain timestamp could not be created. Evidence is still valid with cryptographic hash.
            </p>
          </div>
        )}
      </div>

      {/* What This Means */}
      <div className="mb-4 p-3 rounded-lg bg-pg-surface border border-pg-border">
        <h4 className="text-sm font-semibold text-pg-text mb-2">💡 What This Means</h4>
        <ul className="text-xs text-pg-text-muted space-y-1">
          <li>• This evidence hash was submitted to the Bitcoin blockchain</li>
          <li>• Proves this evidence existed at the specified time</li>
          <li>• Cannot be backdated or forged</li>
          <li>• Mathematically verifiable by anyone</li>
          <li>• Strengthens legal defense in court proceedings</li>
        </ul>
      </div>

      {/* Verification URL */}
      {proof.verification_url && (
        <div className="mb-4">
          <a
            href={proof.verification_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-pg-accent hover:underline flex items-center gap-2"
          >
            🔗 Verify Timestamp Independently →
          </a>
          <p className="text-xs text-pg-text-muted mt-1">
            Third-party verification via OpenTimestamps.org
          </p>
        </div>
      )}

      {/* Technical Details (Collapsible) */}
      <div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-pg-accent hover:underline"
        >
          {showDetails ? '▼ Hide' : '▶ Show'} Technical Details
        </button>

        {showDetails && (
          <div className="mt-3 p-3 rounded-lg bg-pg-bg border border-pg-border font-mono text-xs">
            <div className="mb-2">
              <span className="text-pg-text-muted">Evidence Hash (SHA-256):</span>
              <p className="text-pg-text break-all">{proof.hash}</p>
            </div>

            <div className="mb-2">
              <span className="text-pg-text-muted">Created:</span>
              <p className="text-pg-text">{new Date(proof.created_at).toISOString()}</p>
            </div>

            {proof.confirmation_date && (
              <div className="mb-2">
                <span className="text-pg-text-muted">Confirmed:</span>
                <p className="text-pg-text">{new Date(proof.confirmation_date).toISOString()}</p>
              </div>
            )}

            <div className="mb-2">
              <span className="text-pg-text-muted">OTS File Size:</span>
              <p className="text-pg-text">{proof.ots_file.length} bytes (base64)</p>
            </div>

            <div className="mt-3 pt-3 border-t border-pg-border">
              <p className="text-pg-text-muted mb-2">OpenTimestamps Proof File:</p>
              <textarea
                readOnly
                value={proof.ots_file}
                className="w-full h-32 p-2 bg-pg-bg-secondary border border-pg-border rounded text-xs resize-none"
              />
              <p className="text-pg-text-muted mt-1 text-xs">
                This file can be used to independently verify the timestamp using OpenTimestamps tools.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Legal Use */}
      <div className="mt-4 pt-4 border-t border-pg-border">
        <p className="text-xs text-pg-text-muted">
          <span className="font-semibold">Legal Use:</span> This blockchain timestamp serves as tamper-proof evidence
          that this infringement data existed at the specified time. The Bitcoin blockchain acts as an immutable,
          third-party notary. This proof is admissible in court proceedings and cannot be disputed.
        </p>
      </div>
    </Card>
  );
}
