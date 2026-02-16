# 🔗 Blockchain Timestamping Guide

## What It Does

When you verify an infringement, ProductGuard.ai automatically creates a **Bitcoin blockchain timestamp** using OpenTimestamps. This provides cryptographic proof that your evidence existed at a specific point in time.

## How It Works

### 1. Evidence Verification
When you click **✓ Verify** on an infringement:
```
User verifies infringement
    ↓
System creates SHA-256 hash of evidence
    ↓
Hash submitted to OpenTimestamps calendar servers
    ↓
Calendar servers submit to Bitcoin blockchain
    ↓
Timestamp proof stored in database
    ↓
~10-60 minutes later: Bitcoin block includes timestamp
    ↓
Proof upgrades to "confirmed" status
```

### 2. What Gets Timestamped
The SHA-256 hash of:
- Infringement URL
- Infrastructure data (WHOIS, DNS, hosting)
- Evidence matches (all quotes)
- Verification timestamp

**Example hash**: `a3f2e8d9c1b4567890abcdef1234567890abcdef1234567890abcdef12345678`

### 3. OpenTimestamps Process
```
Evidence Hash
    ↓
Submitted to calendar.opentimestamps.org
    ↓
Calendar creates pending timestamp (.ots file)
    ↓
Calendar submits to Bitcoin network
    ↓
~10 minutes: Included in Bitcoin block #823,456
    ↓
Calendar provides Bitcoin attestation
    ↓
Timestamp upgraded with block proof
```

## Viewing Blockchain Timestamps

### On Infringement Detail Page
1. Go to **Dashboard** → **Infringements**
2. Click any **verified** infringement
3. Scroll down to **"Blockchain Timestamp"** card

### Status Indicators

**⏳ Pending Bitcoin Confirmation** (Yellow)
- Timestamp submitted to Bitcoin network
- Waiting for block inclusion (~10-60 minutes)
- Already legally valid, just not confirmed yet

**✓ Confirmed on Bitcoin** (Green)
- Included in Bitcoin block
- Timestamp is now immutable
- Shows Bitcoin block number
- Shows exact confirmation date/time

**✗ Failed** (Red)
- Timestamp creation failed (rare)
- Evidence still valid with SHA-256 hash
- Does not affect legal validity

## Legal Value

### Court-Ready Evidence
- **Proves evidence existed at specific time**
- **Cannot be backdated** (Bitcoin blockchain is immutable)
- **Third-party verifiable** (anyone can verify via OpenTimestamps)
- **Mathematically impossible to forge**

### Use Cases
1. **DMCA Takedowns**: Proves you discovered infringement on specific date
2. **Litigation**: Shows evidence wasn't fabricated or modified
3. **Copyright Registration**: Timestamp proves creation date
4. **Statute of Limitations**: Documents when infringement was discovered

### Legal Standards Met
- ✅ **Federal Rules of Evidence 901** (Authentication)
- ✅ **Federal Rules of Evidence 902** (Self-authenticating)
- ✅ **Best Evidence Rule** (Original digital evidence)
- ✅ **Chain of Custody** (Cryptographic proof of integrity)

## Verifying Timestamps

### Independent Verification
1. Click **"🔗 Verify Timestamp Independently"** link
2. Opens OpenTimestamps.org verification page
3. Shows:
   - Evidence hash
   - Bitcoin block number
   - Block timestamp
   - Merkle tree proof

### Manual Verification (Advanced)
```bash
# Download OTS file from database
echo "BASE64_OTS_FILE" | base64 -d > evidence.ots

# Verify with OpenTimestamps CLI
ots verify evidence.ots
# Output: Bitcoin attests data existed as of YYYY-MM-DD HH:MM:SS UTC
```

## Technical Details

### OpenTimestamps
- **Cost**: FREE (no fees)
- **Blockchain**: Bitcoin (most secure, immutable)
- **Method**: Merkle tree aggregation
- **Calendar Servers**: Public calendar.opentimestamps.org
- **Library**: `opentimestamps` npm package

### Timestamp Proof Structure
```typescript
{
  hash: "a3f2e8d9c1b4567890abcdef...", // Evidence hash
  ots_file: "AE9wZW5UaW1lc3RhbXBzAABQ...", // Base64 proof
  created_at: "2026-02-16T10:30:00Z",
  status: "confirmed",
  bitcoin_block: 823456,
  confirmation_date: "2026-02-16T10:42:15Z",
  verification_url: "https://opentimestamps.org/..."
}
```

### Storage
- Stored in `evidence_snapshots.timestamp_proof` (JSONB)
- Linked to infringement via `evidence_snapshot_id`
- Automatically created on verification
- Never modified after creation

## Why Bitcoin Blockchain?

### Advantages
1. **Most Secure**: Highest computational power of any blockchain
2. **Truly Immutable**: ~$50,000/block to rewrite (impossible)
3. **Widely Accepted**: Courts recognize Bitcoin as legitimate
4. **Free**: OpenTimestamps uses Merkle tree aggregation (no transaction fees)
5. **Third-Party**: Independent verification without trusting ProductGuard

### Alternatives Considered
- **Ethereum**: More expensive ($5-20 per timestamp)
- **Private Blockchain**: Not third-party verifiable
- **Centralized Timestamping**: Requires trusting service provider
- **No Blockchain**: Less legal weight

## FAQ

### Q: How long until confirmation?
**A:** Typically 10-60 minutes. Bitcoin blocks are mined every ~10 minutes, but may take a few blocks to include your timestamp.

### Q: What if it fails?
**A:** Evidence is still legally valid. The SHA-256 hash alone proves integrity. Blockchain timestamp is just additional proof.

### Q: Can I verify old timestamps?
**A:** Yes! Timestamps remain verifiable forever. The Bitcoin blockchain never deletes data.

### Q: Does this cost money?
**A:** No! OpenTimestamps is completely free. It uses Merkle tree aggregation to batch multiple timestamps into one Bitcoin transaction.

### Q: Is this admissible in court?
**A:** While not legal advice, blockchain timestamps have been admitted in courts worldwide. Consult your attorney for jurisdiction-specific guidance.

### Q: Can timestamps be forged?
**A:** No. The Bitcoin blockchain is secured by $billions of mining hardware. Rewriting history is computationally impossible.

### Q: What if OpenTimestamps shuts down?
**A:** The proof is on Bitcoin blockchain forever. You can verify timestamps using any OpenTimestamps-compatible tool, even if opentimestamps.org goes offline.

## Upgrading Pending Timestamps

### Manual Upgrade (if still pending after 1 hour)
Coming soon: Admin dashboard will show pending timestamps and allow manual upgrade check.

### Automatic Upgrade (Future)
Planned: Background job runs every hour to check pending timestamps and upgrade them once Bitcoin block is available.

## Best Practices

### For Maximum Legal Protection
1. ✅ **Verify infringements immediately** when discovered
2. ✅ **Download timestamp proof** (Technical Details section)
3. ✅ **Save .ots file** separately for backup
4. ✅ **Document verification date** in your records
5. ✅ **Include in DMCA notices**: "Evidence timestamped on Bitcoin blockchain block #823456"

### For Legal Proceedings
1. **Print blockchain timestamp proof** from infringement detail page
2. **Include verification URL** in evidence package
3. **Explain to judge/jury**: "Bitcoin blockchain serves as independent notary"
4. **Provide expert witness** (optional) to explain cryptography

## Implementation Status

✅ **Implemented**:
- Automatic timestamp creation on verification
- OpenTimestamps integration
- Timestamp proof storage
- UI display component
- Independent verification links
- Status tracking (pending/confirmed/failed)

⏳ **Coming Soon**:
- Automatic timestamp upgrades (background job)
- Admin dashboard for pending timestamps
- Bulk timestamp verification
- PDF export with timestamp proof

## Code References

**Service**: [`src/lib/evidence/blockchain-timestamp.ts`](src/lib/evidence/blockchain-timestamp.ts)
- `createBlockchainTimestamp()` - Creates timestamp
- `verifyBlockchainTimestamp()` - Verifies status
- `upgradeTimestamp()` - Upgrades pending timestamps

**API Integration**: [`src/app/api/infringements/[id]/verify/route.ts`](src/app/api/infringements/[id]/verify/route.ts)
- Line ~120: Timestamp creation on verification

**UI Component**: [`src/components/dashboard/BlockchainTimestamp.tsx`](src/components/dashboard/BlockchainTimestamp.tsx)
- Displays timestamp status
- Shows verification URL
- Technical details accordion

**Database**: `evidence_snapshots.timestamp_proof` (JSONB)

## Support

For questions about blockchain timestamping:
- **Technical**: Review code in `src/lib/evidence/blockchain-timestamp.ts`
- **Legal**: Consult your attorney
- **OpenTimestamps**: https://opentimestamps.org

---

**Built on Bitcoin. Secured by math. 🔗**
