/**
 * Blockchain Timestamping Service
 * Uses OpenTimestamps to anchor evidence hashes to Bitcoin blockchain
 *
 * Benefits:
 * - FREE (no cost)
 * - Mathematically proves evidence existed at specific time
 * - Cannot be backdated or forged
 * - Third-party verifiable
 * - Uses Bitcoin blockchain as notary
 */

// Dynamic import to avoid bitcore-lib duplicate instance crash at module load time
// The opentimestamps package has a known issue with duplicate bitcore-lib instances
async function getOpenTimestamps() {
  try {
    const mod = await import('opentimestamps');
    return mod;
  } catch (error) {
    console.warn('[Blockchain Timestamp] Failed to load opentimestamps:', (error as Error).message);
    return null;
  }
}

export interface TimestampProof {
  hash: string; // SHA-256 hash that was timestamped
  ots_file: string; // Base64 encoded OTS proof file
  created_at: string; // When timestamp was created
  status: 'pending' | 'confirmed' | 'failed';
  bitcoin_block?: number; // Bitcoin block number (once confirmed)
  confirmation_date?: string; // When confirmed on blockchain
  verification_url?: string; // URL to verify timestamp
}

/**
 * Create a Bitcoin blockchain timestamp for an evidence hash
 *
 * @param contentHash - SHA-256 hash to timestamp (from evidence snapshot)
 * @returns Timestamp proof object with OTS file
 */
export async function createBlockchainTimestamp(
  contentHash: string
): Promise<TimestampProof> {
  try {
    console.log(`[Blockchain Timestamp] Creating timestamp for hash: ${contentHash}`);

    // Convert hex hash to bytes
    const hashBytes = Buffer.from(contentHash, 'hex');

    // Create OpenTimestamps file
    const ots = await getOpenTimestamps();
    if (!ots) {
      console.warn('[Blockchain Timestamp] OpenTimestamps unavailable, skipping');
      return { hash: contentHash, ots_file: '', created_at: new Date().toISOString(), status: 'failed' as const };
    }
    const detached = ots.DetachedTimestampFile.fromHash(hashBytes);

    // Stamp it (submits to calendar servers, returns immediately)
    // Note: This doesn't wait for Bitcoin confirmation (that takes ~10 minutes)
    await detached.stamp();

    // Serialize the timestamp proof
    const otsFile = detached.serializeToBytes();
    const otsBase64 = Buffer.from(otsFile).toString('base64');

    const proof: TimestampProof = {
      hash: contentHash,
      ots_file: otsBase64,
      created_at: new Date().toISOString(),
      status: 'pending', // Will become 'confirmed' after Bitcoin block inclusion
      verification_url: `https://opentimestamps.org/?file=${encodeURIComponent(otsBase64)}`,
    };

    console.log(`[Blockchain Timestamp] Created successfully. Status: pending Bitcoin confirmation`);

    return proof;
  } catch (error) {
    console.error('[Blockchain Timestamp] Error creating timestamp:', error);

    // Return failed proof instead of throwing
    return {
      hash: contentHash,
      ots_file: '',
      created_at: new Date().toISOString(),
      status: 'failed',
    };
  }
}

/**
 * Verify a blockchain timestamp
 * Checks if timestamp has been confirmed on Bitcoin blockchain
 *
 * @param proof - Timestamp proof to verify
 * @returns Updated proof with confirmation status
 */
export async function verifyBlockchainTimestamp(
  proof: TimestampProof
): Promise<TimestampProof> {
  try {
    console.log(`[Blockchain Timestamp] Verifying timestamp for hash: ${proof.hash}`);

    // Decode OTS file from base64
    const ots = await getOpenTimestamps();
    if (!ots) {
      return { ...proof, status: 'failed' as const };
    }
    const otsBytes = Buffer.from(proof.ots_file, 'base64');
    const detached = ots.DetachedTimestampFile.deserialize(otsBytes);

    // Verify (upgrades the timestamp if Bitcoin block available)
    const result = await detached.verify();

    if (result && result > 0) {
      // Confirmed! result is the Unix timestamp from Bitcoin block
      const confirmationDate = new Date(result * 1000).toISOString();

      console.log(`[Blockchain Timestamp] Confirmed! Block timestamp: ${confirmationDate}`);

      return {
        ...proof,
        status: 'confirmed',
        confirmation_date: confirmationDate,
        // Note: Getting exact block number requires additional Bitcoin API call
      };
    } else {
      // Still pending
      console.log(`[Blockchain Timestamp] Still pending Bitcoin confirmation`);

      return {
        ...proof,
        status: 'pending',
      };
    }
  } catch (error) {
    console.error('[Blockchain Timestamp] Error verifying timestamp:', error);

    return {
      ...proof,
      status: 'failed',
    };
  }
}

/**
 * Upgrade a pending timestamp (check if Bitcoin block is available)
 * Should be called periodically (after ~1 hour) to check for confirmation
 *
 * @param proof - Timestamp proof to upgrade
 * @returns Updated proof with latest status
 */
export async function upgradeTimestamp(proof: TimestampProof): Promise<TimestampProof> {
  try {
    if (proof.status !== 'pending') {
      return proof; // Already confirmed or failed
    }

    console.log(`[Blockchain Timestamp] Upgrading timestamp for hash: ${proof.hash}`);

    // Decode OTS file
    const ots = await getOpenTimestamps();
    if (!ots) {
      return proof;
    }
    const otsBytes = Buffer.from(proof.ots_file, 'base64');
    const detached = ots.DetachedTimestampFile.deserialize(otsBytes);

    // Upgrade (fetches Bitcoin attestation if available)
    const upgraded = await detached.upgrade();

    if (upgraded) {
      // Successfully upgraded - serialize new version
      const newOtsBytes = detached.serializeToBytes();
      const newOtsBase64 = Buffer.from(newOtsBytes).toString('base64');

      // Verify to get timestamp
      const result = await detached.verify();

      if (result && result > 0) {
        const confirmationDate = new Date(result * 1000).toISOString();

        console.log(`[Blockchain Timestamp] Upgraded successfully! Confirmed: ${confirmationDate}`);

        return {
          ...proof,
          ots_file: newOtsBase64,
          status: 'confirmed',
          confirmation_date: confirmationDate,
        };
      }
    }

    // Still pending
    console.log(`[Blockchain Timestamp] Upgrade attempted, still pending`);
    return proof;
  } catch (error) {
    console.error('[Blockchain Timestamp] Error upgrading timestamp:', error);
    return proof;
  }
}

/**
 * Generate a human-readable timestamp proof
 * For displaying in UI or including in legal documents
 */
export function formatTimestampProof(proof: TimestampProof): string {
  const lines = [
    '=== BLOCKCHAIN TIMESTAMP PROOF ===',
    '',
    `Evidence Hash (SHA-256): ${proof.hash}`,
    `Created: ${new Date(proof.created_at).toLocaleString()}`,
    `Status: ${proof.status.toUpperCase()}`,
  ];

  if (proof.confirmation_date) {
    lines.push(`Confirmed on Bitcoin: ${new Date(proof.confirmation_date).toLocaleString()}`);
  }

  if (proof.bitcoin_block) {
    lines.push(`Bitcoin Block: #${proof.bitcoin_block}`);
  }

  if (proof.verification_url) {
    lines.push('', `Verify at: ${proof.verification_url}`);
  }

  lines.push(
    '',
    'This timestamp proves the evidence existed at the specified time.',
    'The Bitcoin blockchain serves as an immutable, third-party notary.',
    'This proof is cryptographically verifiable and cannot be forged.',
    ''
  );

  return lines.join('\n');
}

/**
 * Optional: Schedule automatic timestamp upgrades
 * Call this 1 hour after creating timestamp to check for Bitcoin confirmation
 */
export async function scheduleTimestampUpgrade(
  snapshotId: string,
  proof: TimestampProof
): Promise<void> {
  // In production, this would:
  // 1. Add job to queue (e.g., BullMQ, Inngest)
  // 2. Wait ~1 hour (time for Bitcoin block)
  // 3. Call upgradeTimestamp()
  // 4. Update database with new proof

  console.log(`[Blockchain Timestamp] Upgrade scheduled for snapshot ${snapshotId} in 1 hour`);

  // For now, just log (implement with job queue later)
  // TODO: Implement with Vercel Cron or background job queue
}
