# DMCA Pipeline Audit — ProductGuard.ai

**Auditor:** DMCA Pipeline Engineer Agent
**Date:** Feb 20, 2026
**Scope:** Full path from piracy detection → takedown sent, including generation, delivery, tracking, and batch operations

---

## Legend

| Status | Meaning |
|--------|---------|
| ✅ | Working correctly |
| ❌ | Bug or dead code — now fixed |
| ⚠️ | Works but has caveats or improvement opportunities |

---

## Executive Summary

**The DMCA pipeline is fully functional.** Email sending via Resend is implemented and operational across single, bulk, and draft-resend flows. The initial assumption that "send doesn't actually send" is outdated — the pipeline was completed in a prior sprint. This audit focused on verifying correctness, removing dead code, and closing minor gaps.

### Fixes Applied
1. **Deleted dead code** — `src/lib/dmca/dmca-generator.ts` (legacy AI generator, zero imports)
2. **Fixed column name** — admin infringements commented-out revenue display (`estimated_revenue_loss` → `est_revenue_loss`)
3. **Added missing URL patterns** — Amazon, eBay, Patreon added to provider database

---

## 1. Enforcement Targets & Provider Database

**File:** `src/lib/dmca/provider-database.ts`

### Target Hierarchy

| Priority | Type | Description | Status |
|----------|------|-------------|--------|
| 1 | Platform | Direct DMCA to hosting platform | ✅ |
| 2 | Hosting | Infrastructure provider | ✅ |
| 3 | Registrar | Domain registrar | ✅ |
| 4 | Search Engine | Google/Bing delisting | ✅ |

The `resolveAllTargets()` function returns targets in correct priority order. The `EnforcementTarget` type properly models each step.

### Provider Coverage

| Category | Providers | Status |
|----------|-----------|--------|
| Cloud Storage | Google Drive, Dropbox, Mega, MediaFire | ✅ |
| Social/Messaging | Telegram, Discord, Reddit, Facebook, Twitter/X | ✅ |
| Video | YouTube, Vimeo, Dailymotion | ✅ |
| E-commerce | Gumroad, Shopify, Etsy, Amazon, eBay, Patreon | ✅ (3 added) |
| Torrent | Various torrent sites | ✅ |
| Web Hosting | Cloudflare, Namecheap, GoDaddy, DigitalOcean, AWS, OVH | ✅ |
| File Sharing | WeTransfer, Sendspace, Zippyshare, 1fichier, Uploaded | ✅ |
| Forums/Paste | GitHub, GitLab, Bitbucket, Pastebin, various forums | ✅ |
| Search Engines | Google, Bing | ✅ |

**Total: 40+ providers** with DMCA contact emails, URLs, and methods.

### URL Pattern Matching

| Aspect | Status | Notes |
|--------|--------|-------|
| Pattern → Provider resolution | ✅ | Regex-based, case-insensitive |
| Fallback for unknown URLs | ✅ | Returns generic hosting target |
| Amazon/eBay/Patreon patterns | ❌ **FIXED** | Were missing, now added |

---

## 2. DMCA Notice Generation

### Active Generator: `src/lib/dmca/notice-builder.ts`

| Aspect | Status | Notes |
|--------|--------|-------|
| Legal compliance (§512(c)(3)) | ✅ | All 6 required elements present |
| Template structure | ✅ | 7-section deterministic template |
| No AI hallucination risk | ✅ | Pure string interpolation, no LLM calls |
| Multiple infringement types | ✅ | Supports copyright, trademark, trade secret, counterfeit |
| Comparison items | ✅ | Original vs. infringing URL pairs |
| Perjury statement | ✅ | Required §512(c)(3)(vi) statement included |
| Good faith statement | ✅ | Required §512(c)(3)(v) statement included |
| Sender info | ✅ | Name, company, email, address included |

### Quality Scoring: `src/app/api/dmca/generate/route.ts`

| Quality Level | Criteria | Status |
|---------------|----------|--------|
| Strong | Has address + 2+ comparison items + all types specified | ✅ |
| Standard | Has some optional fields | ✅ |
| Weak | Missing key fields | ✅ |

### Legacy Generator: `src/lib/dmca/dmca-generator.ts`

| Aspect | Status | Notes |
|--------|--------|-------|
| Usage | ❌ **DELETED** | Zero imports found in codebase |
| Risk | ❌ **DELETED** | Used GPT-4o — risked hallucinating legal content |
| Stale data | ❌ **DELETED** | Contained wrong contact emails (e.g., `dmca-agent@google.com`) |

---

## 3. Send Flow

### Flow A: Single Inline Send

```
InlineDMCASendFlow.tsx (3-step modal)
  → POST /api/dmca/send-inline
    → sendDMCANotice() via Resend
    → Creates takedown record
    → Updates infringement status → 'takedown_sent'
    → Logs communication
    → Sends CC copy to sender
```

| Component | Status | Notes |
|-----------|--------|-------|
| Step 1: Type selection | ✅ | Copyright, trademark, trade secret, counterfeit checkboxes |
| Step 2: Delivery config | ✅ | Auto-resolved recipient, CC, web form link |
| Step 3: Review & sign | ✅ | Notice editor, digital signature, perjury/liability consents |
| Email delivery via Resend | ✅ | Fully implemented with proper headers |
| CC copy to sender | ✅ | Sends confirmation copy |
| Takedown record creation | ✅ | Inserted with all metadata |
| Status transition | ✅ | Infringement → `takedown_sent` |
| Communication logging | ✅ | Logged to `takedown_communications` |
| Error handling | ✅ | Returns detailed error messages |
| Web form fallback | ⚠️ | Shows "Open Web Form" link — requires manual submission |

### Flow B: Bulk Send

```
BulkDMCAReviewModal
  → POST /api/dmca/generate-bulk (generates up to 50 notices)
  → POST /api/dmca/submit-bulk (queues for sending)
  → CRON/POST /api/dmca/process-queue
    → queue-processor.ts
      → Atomic claim → sendDMCANotice() → create takedown → update status
      → 200ms rate limiting between sends
      → 3 retries with 5-min reschedule on failure
```

| Component | Status | Notes |
|-----------|--------|-------|
| Batch generation (50 max) | ✅ | Validates profile completeness |
| Queue submission | ✅ | Creates `dmca_send_queue` entries |
| Queue processing | ✅ | Atomic claiming prevents double-send |
| Rate limiting | ✅ | 200ms between sends |
| Retry logic | ✅ | 3 attempts, 5-min reschedule |
| Cron trigger | ✅ | `CRON_SECRET` auth for automated processing |
| Queue status endpoint | ✅ | GET returns pending/processing/sent/failed counts |
| Web form marking | ✅ | PATCH to mark web_form items as manually submitted |

### Flow C: Draft Resend

```
TakedownActions.tsx ("Send DMCA Notice" for drafts)
  → POST /api/takedowns/[id]/send
    → Resend email
    → Update takedown status → 'sent'
    → Log communication
    → Revert to 'draft' on failure
```

| Component | Status | Notes |
|-----------|--------|-------|
| Draft detection | ✅ | Button only shows for `status = 'draft'` |
| WHOIS lookup | ✅ | Fetches registrant info for targeting |
| Email delivery | ✅ | Via Resend |
| Failure rollback | ✅ | Reverts to draft on send failure |

### Email Infrastructure: `src/lib/dmca/send-email.ts`

| Aspect | Status | Notes |
|--------|--------|-------|
| Resend SDK integration | ✅ | v4.0.1 |
| Email method | ✅ | Sends formatted DMCA via Resend |
| Web form method | ⚠️ | Returns instructions (manual step required) |
| Manual method | ⚠️ | Returns guidance only |
| From address | ✅ | `dmca@productguard.ai` |
| Reply-to | ✅ | Uses sender's email |
| Subject line | ✅ | Includes product name and §512 reference |
| HTML formatting | ✅ | Converts notice text to HTML |

---

## 4. Takedown Tracking & Deadlines

**File:** `src/app/dashboard/takedowns/[id]/page.tsx`

| Feature | Status | Notes |
|---------|--------|-------|
| Status timeline | ✅ | Shows all status transitions with timestamps |
| URL monitoring | ✅ | Checks if infringing content still accessible |
| Priority-based check intervals | ✅ | P0=24h, P1=3d, P2=7d |
| Effectiveness warning | ✅ | Flags takedowns with no response after 14 days |
| Communication log | ✅ | All sent/received messages displayed |
| Status management | ✅ | Draft → Sent → Acknowledged → Removed/Disputed/Ignored |
| Escalation guidance | ⚠️ | No automated escalation — user must manually escalate to next target |

### URL Monitoring States

| State | Detection | Status |
|-------|-----------|--------|
| Removed | HTTP 404/410 or content changed | ✅ |
| Active | Content still accessible | ✅ |
| Redirected | HTTP 301/302 | ✅ |
| Error | Network/timeout errors | ✅ |

---

## 5. Batch Operations

| Operation | Status | Notes |
|-----------|--------|-------|
| Bulk DMCA generation | ✅ | Up to 50 per batch |
| Bulk queue submission | ✅ | Queues all generated notices |
| Staggered sending | ✅ | 200ms between sends, 3-min cron interval |
| Bulk status tracking | ✅ | Queue status endpoint with counts |
| Profile validation | ✅ | Requires name, email, address before bulk send |

---

## 6. Data Integrity

| Check | Status | Notes |
|-------|--------|-------|
| Double-send prevention | ✅ | Atomic queue claiming with `processed_at IS NULL` |
| Idempotent status updates | ✅ | Only transitions valid states |
| Communication audit trail | ✅ | All sends logged to `takedown_communications` |
| Failed send recovery | ✅ | Queue items rescheduled, draft takedowns reverted |
| Orphan prevention | ✅ | Takedown always linked to infringement + user |

---

## Summary of Changes

### Critical Fixes (❌ → ✅)

1. **Deleted dead code `src/lib/dmca/dmca-generator.ts`**
   - Legacy AI-based generator using GPT-4o
   - Contained stale/incorrect provider contact emails
   - Risk of hallucinating legal content
   - Zero imports in codebase — completely unused
   - Replaced by deterministic `notice-builder.ts`

2. **Fixed admin infringements revenue display** (`src/app/admin/infringements/page.tsx`)
   - Commented-out code referenced `inf.estimated_revenue_loss`
   - Corrected to `inf.est_revenue_loss` to match schema

3. **Added missing URL patterns** (`src/lib/dmca/provider-database.ts`)
   - Added: `amazon.com`, `ebay.com`, `patreon.com`
   - These providers existed in the database but had no URL pattern for auto-detection

### Informational (⚠️)

1. **Web form submissions require manual action** — When a platform only accepts web forms (not email), the system shows the form URL but the user must submit manually. This is by design — automating web form submission would be fragile and potentially violate ToS.

2. **No automated escalation** — When a takedown is ineffective after 14 days, the system shows a warning but doesn't auto-escalate to the next enforcement target. This is appropriate — escalation decisions should be user-driven since they may involve different legal strategies.

3. **Bulk send limit of 50** — Reasonable for preventing abuse and staying within Resend rate limits. Can be increased if needed.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│                   User Action                    │
├─────────────┬─────────────────┬─────────────────┤
│  Single Send│   Bulk Send     │  Draft Resend   │
│             │                 │                 │
│ InlineDMCA  │ BulkDMCAReview  │ TakedownActions │
│ SendFlow    │ Modal           │                 │
└──────┬──────┴────────┬────────┴────────┬────────┘
       │               │                 │
       ▼               ▼                 ▼
  /api/dmca/      /api/dmca/        /api/takedowns/
  send-inline     generate-bulk     [id]/send
       │               │                 │
       │               ▼                 │
       │          /api/dmca/             │
       │          submit-bulk            │
       │               │                 │
       │               ▼                 │
       │          /api/dmca/             │
       │          process-queue          │
       │               │                 │
       ▼               ▼                 ▼
  ┌─────────────────────────────────────────┐
  │         sendDMCANotice()                │
  │         (send-email.ts + Resend SDK)    │
  └──────────────────┬──────────────────────┘
                     │
                     ▼
  ┌─────────────────────────────────────────┐
  │  Create takedown record                 │
  │  Update infringement → takedown_sent    │
  │  Log communication                      │
  │  Send CC to sender                      │
  └─────────────────────────────────────────┘
```

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/dmca/dmca-generator.ts` | **DELETED** — dead code, legacy AI generator |
| `src/app/admin/infringements/page.tsx` | Fixed commented-out column name |
| `src/lib/dmca/provider-database.ts` | Added Amazon, eBay, Patreon URL patterns |
