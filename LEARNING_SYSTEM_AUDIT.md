# Learning System Audit — ProductGuard.ai

**Auditor:** Learning Loop Architect Agent
**Date:** Feb 20, 2026
**Scope:** All feedback loops from user actions → scan improvement

---

## Legend

| Status | Meaning |
|--------|---------|
| ✅ | Working correctly |
| ❌ | Bug or dead code — now fixed |
| ⚠️ | Works but has caveats |

---

## Executive Summary

**The learning system is largely operational and well-designed.** User verification/rejection feedback actively improves future scans through 5 distinct channels: query enrichment, domain exclusion, AI prompt enhancement, few-shot learning, and category precision context. The main gap was `refreshPiracyKeywords()` — a completed function that regenerates search terms from feedback but was never wired into any code path. This has been connected. Dead code from deprecated functions has been removed.

### Fixes Applied
1. **Wired `refreshPiracyKeywords()`** into verify route — runs after each verify/reject when threshold met (5+ feedback items, 24h cooldown)
2. **Removed deprecated `optimizeSearchQuery()`** — dead code replaced by `optimizeSearchQueryFromIntelligence()`
3. **Removed unused `getSuggestedImprovements()`** — never called, no UI

---

## 1. Feedback Signal Capture

### Verify Route (`/api/infringements/[id]/verify`)

| Signal | On Verify | On Reject | On Whitelist | Status |
|--------|-----------|-----------|-------------|--------|
| Status transition logged | ✅ | ✅ | ✅ | ✅ |
| User ID + action in metadata | ✅ | ✅ | ✅ | ✅ |
| `learnFromFeedback()` called | ✅ | ✅ | ❌ | ⚠️ See §1a |
| Performance metrics recorded | ✅ | ✅ | ✅ | ✅ |
| Evidence snapshot created | ✅ | ❌ | ❌ | ✅ (by design) |
| Blockchain timestamp | ✅ | ❌ | ❌ | ✅ (by design) |
| AI evidence analysis | ✅ | ❌ | ❌ | ✅ (by design) |
| Chain of custody (IP, UA) | ✅ | ❌ | ❌ | ✅ (by design) |
| URL added to product whitelist | ❌ | ❌ | ✅ | ✅ |
| GHL event tracking | ✅ | ❌ | ❌ | ✅ |
| Piracy keyword refresh | ✅ | ✅ | ❌ | ❌ **FIXED** |

#### §1a: Whitelist action doesn't call `learnFromFeedback()`

The whitelist action skips intelligence learning because `learnFromFeedback()` only accepts `'verify' | 'reject'`. The whitelist action sets status to `'archived'`, which the DB function doesn't process as either verified or rejected. This is acceptable — whitelist is semantically "not relevant" rather than "false positive", so learning the wrong pattern would be counterproductive.

### Pattern Extraction (`learn_from_user_feedback` DB function)

| Pattern Type | Extracted From | Status |
|-------------|---------------|--------|
| Keywords | `evidence.matched_excerpts` | ✅ |
| Domains | `url_normalized` | ✅ |
| Platforms | `platform` field | ✅ |
| Hosting providers | `infrastructure.hosting_provider` | ✅ |
| Countries | `infrastructure.country` | ✅ |
| Match types | `match_type` field | ✅ |

Each pattern is upserted into `intelligence_patterns` with confidence calculated as:
```
confidence = verified_count / (verified_count + rejected_count)
```

---

## 2. How Feedback Improves Future Scans

### Channel 1: Query Enrichment ✅

**File:** `query-generator.ts` lines 253-264

Verified keywords (confidence > 0.7) are added to Tier 1 search queries:
```
"verified_keyword" "product_name" -site:fp_domain1 -site:fp_domain2
```

Up to 2 verified keywords and 3 false positive domain exclusions per scan.

### Channel 2: False Positive Domain Exclusion ✅

**File:** `query-generator.ts` lines 255-257

Domains with high false positive confidence (> 0.6) are excluded from search queries via `-site:domain` syntax.

### Channel 3: AI Prompt Enhancement ✅

**File:** `infringement-filter.ts` lines 131-152

The AI filter's system prompt is enriched with learned patterns:
- Verified platforms (e.g., "Telegram, torrent sites have confirmed infringements")
- Verified hosting providers
- Countries frequently hosting infringements
- Reliable detection methods
- False positive domains and hosting

### Channel 4: Few-Shot Learning ✅

**File:** `infringement-filter.ts` lines 154-167

Up to 5 verified infringement examples and 5 false positive examples are injected into the AI prompt, including rich context (URL, platform, severity, match type, confidence, hosting, country, monetization, evidence excerpts).

### Channel 5: Category Precision Context ✅

**File:** `category-precision.ts` + `infringement-filter.ts` lines 170-172

Per-query-category precision rates are computed from user feedback and injected into the AI prompt:
- High-precision strategies (>60%) noted as reliable
- Low-precision strategies (<30%) noted as "be extra skeptical"

### Channel 6: Piracy Keyword Refresh ❌ → ✅ **FIXED**

**File:** `intelligence-engine.ts` `refreshPiracyKeywords()`

Regenerates AI piracy search terms using feedback context. Was fully implemented but **never called**. Now wired into the verify route's `after()` block.

**Guards:**
- Only runs when product has 5+ verified/rejected infringements
- Maximum once per 24 hours per product
- Non-blocking (fire-and-forget with error logging)

---

## 3. Whitelist System

### URL-Level Whitelist ✅

| Aspect | Implementation | Status |
|--------|---------------|--------|
| Storage | `products.whitelist_urls` (TEXT[] with GIN index) | ✅ |
| Population | Verify route adds URL on whitelist action | ✅ |
| Deduplication | Checks `existingUrls.includes()` before adding | ✅ |
| Exclusion point | Post-scan, pre-expensive-processing (scan-engine/index.ts lines 242-262) | ✅ |
| URL normalization | Strips protocol, www, trailing slash | ✅ |
| Prefix matching | `startsWith()` allows domain-level blocking | ✅ |
| Cost savings | Skips WHOIS, DNS, AI filtering for whitelisted URLs | ✅ |

### Domain-Level Whitelist ✅

| Aspect | Implementation | Status |
|--------|---------------|--------|
| Storage | `products.whitelist_domains` | ✅ |
| Exclusion point | During scoring (scoring.ts lines 300-304) | ✅ |
| Confidence penalty | -50 points (effectively kills result) | ✅ |
| Hard false positive | Marks as `isFalsePositive = true` | ✅ |

---

## 4. Query Adaptation

### Query Category Tracking ✅

Every infringement records `query_category` and `query_tier`, enabling per-strategy precision analysis.

| Category | Example | Tracked | Status |
|----------|---------|---------|--------|
| name-only | `"Product Name"` | ✅ | ✅ |
| ai-piracy | AI-generated piracy terms | ✅ | ✅ |
| piracy-core | Core piracy + product name | ✅ | ✅ |
| intelligence | Learned verified keywords | ✅ | ✅ |
| dedicated-site | Known piracy site searches | ✅ | ✅ |
| telegram-ai | Telegram AI-optimized terms | ✅ | ✅ |
| torrent | Torrent site searches | ✅ | ✅ |
| ... (25+ categories) | | ✅ | ✅ |

### Admin Scan Learning Dashboard ✅

**File:** `admin/scans/scan-learning/page.tsx`

Full admin page showing:
- Overall precision rate
- Per-tier precision (Tier 1/2/3)
- Per-category precision breakdown
- Review progress bar
- Learning system status indicators

### Precision-Based AI Calibration ✅

**File:** `category-precision.ts`

The `admin_category_precision` database view computes precision stats per query category. These feed into the AI filter prompt to make it more/less skeptical based on historical category accuracy.

### Bayesian Weight Computation ⚠️

**Status:** Scaffolded but intentionally dormant (noted on admin page).

The admin scan-learning page shows "Bayesian Weight Computation: Scaffolded (Inactive)". This is by design — will be activated when 200+ results have been reviewed, providing enough statistical signal for reliable weight computation. The infrastructure is in place but no code implements the actual Bayesian weight updates yet.

---

## 5. Scoring Calibration

### Current Static Weights ✅

The scoring engine uses static weights per product type from profile configuration:
- Platform weights (e.g., torrent: 0.6-1.0, social: 0.1-0.3)
- Boost terms (+8 per match, capped at 3)
- Penalty terms (-3 per match)
- Dedicated piracy sites (+15)
- Legitimate sites (-15)

### Feedback-Based Calibration ⚠️

Scoring weights do **not** currently adjust based on confirmation rates. The precision data exists (via `admin_category_precision` and `intelligence_patterns`) but is only used by the AI filter, not the confidence scorer.

**Assessment:** This is acceptable for beta. The AI filter already adjusts its decisions based on precision data, which achieves the same outcome (fewer false positives reach the user). Dynamic scoring weight calibration adds complexity and risk of instability. The scaffolded Bayesian system is the right approach when there's enough data.

---

## 6. Data Schema Assessment

### Tables ✅

| Table | Purpose | Used | Status |
|-------|---------|------|--------|
| `intelligence_patterns` | Learned patterns from feedback | ✅ | ✅ |
| `ai_performance_metrics` | Daily precision/detection stats | ✅ | ✅ |
| `optimized_queries` | Track optimized query performance | ❌ | ⚠️ Unused |
| `evidence_snapshots` | Evidence capture on verification | ✅ | ✅ |
| `status_transitions` | Audit trail for all status changes | ✅ | ✅ |

### Views ✅

| View | Purpose | Used | Status |
|------|---------|------|--------|
| `admin_category_precision` | Per-category precision stats | ✅ | ✅ |
| `admin_tier_precision` | Per-tier precision stats | ✅ | ✅ |

### `optimized_queries` Table ⚠️

Created in migration 00014 but never populated by any active code. The only function that wrote to it (`optimizeSearchQuery`) was deprecated and has been removed. The table exists as dormant infrastructure — could be repurposed for query performance tracking if needed, but isn't worth a migration to drop.

---

## 7. Learning Flow Diagram

```
User Action (Verify/Reject/Whitelist)
    │
    ▼
POST /api/infringements/[id]/verify
    │
    ├─[Fast Path]─► Update infringement status → Response (~1-2s)
    │
    └─[Background via after()]──────────────────────────────────────┐
        │                                                           │
        ├─ learnFromFeedback(id, action)                           │
        │   └─ DB: learn_from_user_feedback()                      │
        │       ├─ Extract keywords, domains, platforms,           │
        │       │   hosting, countries, match types                │
        │       └─ Upsert into intelligence_patterns              │
        │           (confidence = verified / total)                │
        │                                                          │
        ├─ calculatePerformanceMetrics() → recordDailyMetrics()    │
        │                                                          │
        ├─ refreshPiracyKeywords() [NEW - fire-and-forget]        │
        │   └─ Regenerate AI search terms if 5+ feedback items    │
        │                                                          │
        └─ [verify only] Evidence capture, blockchain, AI analysis │

                        ┌──────────────┐
                        │  Next Scan   │
                        └──────┬───────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
 fetchIntelligence    fetchCategoryPrecision    Product data
 ForScan()            Stats()                   (refreshed keywords)
        │                      │                      │
        │    7 parallel RPC    │                      │
        │    calls for all     │                      │
        │    pattern types     │                      │
        │                      │                      │
        ▼                      ▼                      ▼
 ┌─────────────────────────────────────────────────────────┐
 │                    Query Generation                      │
 │  • Verified keywords → Tier 1 intelligence queries      │
 │  • FP domains → -site: exclusions                       │
 │  • Refreshed piracy terms → Tier 1/2 queries            │
 └───────────────────────┬─────────────────────────────────┘
                         │
                         ▼
 ┌─────────────────────────────────────────────────────────┐
 │                     AI Filtering                         │
 │  • Learned platforms/hosting/countries in prompt         │
 │  • Few-shot examples (verified + false positive)        │
 │  • Category precision context per result                │
 └─────────────────────────────────────────────────────────┘
```

---

## Summary of Changes

### Fixes (❌ → ✅)

1. **Wired `refreshPiracyKeywords()` into verify route** (`verify/route.ts`)
   - Called in `after()` block after every verify/reject action
   - Uses admin client (service role) since it updates product data
   - Fire-and-forget with error logging (non-blocking)
   - Internal guards: requires 5+ feedback items and 24h cooldown
   - Regenerates AI piracy search terms using feedback context

2. **Removed deprecated `optimizeSearchQuery()`** (`intelligence-engine.ts`)
   - Was replaced by `optimizeSearchQueryFromIntelligence()` but never deleted
   - Only function that wrote to `optimized_queries` table
   - Zero callers in codebase

3. **Removed unused `getSuggestedImprovements()`** (`intelligence-engine.ts`)
   - Generated optimization suggestions but was never called
   - No UI to display suggestions
   - Removed unused `Product` type import

### Informational (⚠️)

1. **Whitelist action doesn't trigger intelligence learning** — by design, whitelist means "not relevant" rather than "false positive", so learning from it could teach the wrong patterns.

2. **`optimized_queries` table is unused** — dormant infrastructure, not worth a migration to drop.

3. **Bayesian weight computation is scaffolded but inactive** — intentionally dormant until 200+ results are reviewed. The admin scan-learning page tracks this status.

4. **Scoring weights are static** — the AI filter adjusts based on precision data, but the confidence scorer uses fixed weights per product type profile. This is appropriate for beta.

---

## Files Changed

| File | Change |
|------|--------|
| `src/app/api/infringements/[id]/verify/route.ts` | Added `refreshPiracyKeywords()` call + `createAdminClient` import |
| `src/lib/intelligence/intelligence-engine.ts` | Removed deprecated `optimizeSearchQuery()`, removed unused `getSuggestedImprovements()`, removed unused `Product` import |
