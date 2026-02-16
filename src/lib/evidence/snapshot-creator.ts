/**
 * Immutable Evidence Snapshot System
 * Creates legally-defensible evidence packages when infringements are verified
 *
 * Features:
 * - Screenshot capture with timestamp
 * - HTML archival
 * - Cryptographic hashing
 * - Timestamp anchoring (optional blockchain)
 * - Chain of custody tracking
 */

import crypto from 'crypto';
import type { Infringement, Product } from '@/types';

export interface EvidenceSnapshot {
  snapshot_id: string;
  infringement_id: string;
  created_at: string; // ISO timestamp
  verified_by_user_id: string;

  // Evidence files
  screenshot_url: string | null; // Stored in Supabase Storage
  html_archive_url: string | null; // Archived HTML

  // Metadata
  page_title: string;
  page_url: string;
  captured_at: string;

  // Legal proof
  content_hash: string; // SHA-256 of all evidence
  timestamp_proof: string | null; // Optional: blockchain timestamp

  // Infrastructure snapshot (frozen at verification time)
  infrastructure_snapshot: {
    ip_address: string | null;
    hosting_provider: string | null;
    country: string | null;
    registrar: string | null;
    dns_records: any;
    ssl_certificate: any;
  };

  // Evidence matches (frozen)
  evidence_matches: Array<{
    type: string;
    matched_text: string;
    context: string;
    severity: string;
  }>;

  // Chain of custody
  chain_of_custody: Array<{
    action: string;
    performed_by: string;
    performed_at: string;
    ip_address: string;
    user_agent: string;
  }>;

  // Legal attestation
  attestation: {
    statement: string;
    attested_by: string;
    attested_at: string;
    signature: string; // User ID + timestamp hash
  };
}

/**
 * Create immutable evidence snapshot when user verifies infringement
 */
export async function createEvidenceSnapshot(
  infringement: Infringement,
  product: Product,
  userId: string,
  userIp: string,
  userAgent: string
): Promise<EvidenceSnapshot> {
  const snapshotId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Step 1: Capture screenshot (using Puppeteer or similar)
  const screenshotUrl = await captureScreenshot(infringement.source_url, snapshotId);

  // Step 2: Archive full HTML
  const htmlArchiveUrl = await archiveHTML(infringement.source_url, snapshotId);

  // Step 3: Create cryptographic hash of all evidence
  const evidenceData = JSON.stringify({
    url: infringement.source_url,
    screenshot: screenshotUrl,
    html: htmlArchiveUrl,
    infrastructure: infringement.infrastructure,
    evidence: infringement.evidence,
    timestamp: now,
  });

  const contentHash = crypto.createHash('sha256').update(evidenceData).digest('hex');

  // Step 4: Optional - Anchor hash to blockchain for timestamping
  const timestampProof = await anchorToBlockchain(contentHash);

  // Step 5: Create legal attestation
  const attestation = createAttestation(
    infringement.source_url,
    product.name,
    userId,
    now,
    contentHash
  );

  // Step 6: Build snapshot
  const snapshot: EvidenceSnapshot = {
    snapshot_id: snapshotId,
    infringement_id: infringement.id,
    created_at: now,
    verified_by_user_id: userId,

    screenshot_url: screenshotUrl,
    html_archive_url: htmlArchiveUrl,

    page_title: infringement.evidence?.page_title || '',
    page_url: infringement.source_url,
    captured_at: now,

    content_hash: contentHash,
    timestamp_proof: timestampProof,

    infrastructure_snapshot: {
      ip_address: infringement.infrastructure?.ip_address || null,
      hosting_provider: infringement.infrastructure?.hosting_provider || null,
      country: infringement.infrastructure?.country || null,
      registrar: infringement.infrastructure?.registrar || null,
      dns_records: infringement.infrastructure?.dns_records || null,
      ssl_certificate: infringement.infrastructure?.ssl_certificate || null,
    },

    evidence_matches: (infringement.evidence?.matched_excerpts || []).map((excerpt: string) => ({
      type: 'text_match',
      matched_text: excerpt,
      context: `Found on page: "${excerpt}"`,
      severity: 'high',
    })),

    chain_of_custody: [
      {
        action: 'infringement_detected',
        performed_by: 'system',
        performed_at: infringement.created_at,
        ip_address: 'system',
        user_agent: 'ProductGuard Scanner',
      },
      {
        action: 'evidence_snapshot_created',
        performed_by: userId,
        performed_at: now,
        ip_address: userIp,
        user_agent: userAgent,
      },
    ],

    attestation,
  };

  return snapshot;
}

/**
 * Capture screenshot of infringing page
 * Returns URL to stored screenshot
 */
async function captureScreenshot(url: string, snapshotId: string): Promise<string | null> {
  try {
    // This will call a separate API route that uses Puppeteer/Playwright
    const response = await fetch('/api/evidence/screenshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, snapshot_id: snapshotId }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.screenshot_url;
    }

    console.error('Screenshot capture failed:', await response.text());
    return null;
  } catch (error) {
    console.error('Screenshot error:', error);
    return null;
  }
}

/**
 * Archive full HTML of page for preservation
 */
async function archiveHTML(url: string, snapshotId: string): Promise<string | null> {
  try {
    const response = await fetch('/api/evidence/archive-html', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, snapshot_id: snapshotId }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.archive_url;
    }

    console.error('HTML archival failed:', await response.text());
    return null;
  } catch (error) {
    console.error('HTML archive error:', error);
    return null;
  }
}

/**
 * Anchor evidence hash to blockchain for tamper-proof timestamping
 * Options: OpenTimestamps (Bitcoin), Ethereum, or centralized timestamp service
 */
async function anchorToBlockchain(hash: string): Promise<string | null> {
  // Option 1: OpenTimestamps (free Bitcoin timestamping)
  // https://opentimestamps.org/

  // Option 2: Use a timestamp service API
  // For MVP, we'll use a simple timestamp record

  try {
    // This would call OpenTimestamps or similar service
    // For now, return a timestamp receipt
    const timestamp = {
      hash,
      anchored_at: new Date().toISOString(),
      service: 'internal', // Would be 'opentimestamps' or 'ethereum' in production
      block_height: null, // Would be actual block number
      transaction_id: null, // Would be actual tx hash
    };

    return JSON.stringify(timestamp);
  } catch (error) {
    console.error('Blockchain anchoring failed:', error);
    return null;
  }
}

/**
 * Create legal attestation statement
 */
function createAttestation(
  url: string,
  productName: string,
  userId: string,
  timestamp: string,
  contentHash: string
): EvidenceSnapshot['attestation'] {
  const statement = `I, the undersigned, hereby attest that on ${new Date(timestamp).toLocaleString()}, I personally reviewed the content located at ${url} and determined it to be an unauthorized copy or infringement of "${productName}". This determination was made in good faith based on my knowledge of the copyrighted work and the content observed at the URL. The evidence captured herein is a true and accurate representation of the content as it appeared at the time of review.`;

  // Create signature (hash of statement + user + timestamp)
  const signature = crypto
    .createHash('sha256')
    .update(`${statement}${userId}${timestamp}${contentHash}`)
    .digest('hex');

  return {
    statement,
    attested_by: userId,
    attested_at: timestamp,
    signature,
  };
}

/**
 * Verify snapshot integrity
 */
export function verifySnapshotIntegrity(snapshot: EvidenceSnapshot): boolean {
  // Recreate content hash
  const evidenceData = JSON.stringify({
    url: snapshot.page_url,
    screenshot: snapshot.screenshot_url,
    html: snapshot.html_archive_url,
    infrastructure: snapshot.infrastructure_snapshot,
    evidence: snapshot.evidence_matches,
    timestamp: snapshot.created_at,
  });

  const computedHash = crypto.createHash('sha256').update(evidenceData).digest('hex');

  return computedHash === snapshot.content_hash;
}

/**
 * Generate legal evidence package (PDF)
 */
export async function generateEvidencePackagePDF(snapshot: EvidenceSnapshot, product: Product): Promise<Buffer> {
  // This would use a PDF generation library (e.g., PDFKit, jsPDF, Puppeteer)
  // to create a comprehensive legal document with:
  // - Cover page with case summary
  // - Screenshot of infringing content
  // - Extracted evidence with highlights
  // - Infrastructure details
  // - Chain of custody log
  // - Legal attestation
  // - Cryptographic verification data

  // For now, return placeholder
  return Buffer.from('PDF generation to be implemented');
}
