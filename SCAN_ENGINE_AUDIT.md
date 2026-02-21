# ProductGuard.ai Scan Engine Audit

**Date:** 2026-02-20
**Focus:** Filtering pipeline analysis — why 12.5% precision and where legitimate results die

---

## Architecture: Current Scan Flow

```
Product + AI Keywords
       │
       ▼
┌──────────────────┐
│ QUERY GENERATOR   │  Generates 25-50 queries across 3 tiers
│ query-generator.ts│  Tier 1: Broad discovery (8-12 queries)
│                   │  Tier 2: Platform-specific (10-20 queries)
│                   │  Tier 3: Signal deep-dive (0-10 queries)
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ SERPER.DEV API    │  Google search, 75-call budget per scan
│ serp-client.ts    │  3 concurrent, 150ms min delay
│                   │  Returns organic results (title, URL, snippet)
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ SCORING ENGINE    │  ◄── FILTER STAGE 1
│ scoring.ts        │  Base: 40 pts, boosts/penalties, 35% threshold
│                   │  Removes: confidence < 35 OR isFalsePositive
└──────┬───────────┘
       │  ~70-80% survive
       ▼
┌──────────────────┐
│ PLATFORM SCANNERS │  Telegram Bot, Discord, Forums, Torrents, Cyberlockers
│ platforms/*.ts     │  Additional results merged into pool
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ DELTA DETECTION   │  Remove already-known URLs (by hash)
│ index.ts:215-240  │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ WHITELIST FILTER  │  Remove user-whitelisted domains
│ index.ts:250-265  │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ AI FILTER         │  ◄── FILTER STAGE 2 (THE KILL ZONE)
│ infringement-     │  GPT-4o-mini, 0.55 confidence threshold
│ filter.ts         │  200 max tokens, temp 0.2
└──────┬───────────┘
       │  ~60-75% survive
       ▼
┌──────────────────┐
│ DEDUPLICATION     │  SHA256 URL hash dedup
│ index.ts:319-327  │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ DB INSERT         │  New infringements stored
│ + EVIDENCE        │  Evidence collected, infrastructure profiled
│ + PRIORITY SCORE  │  P0/P1/P2/P3 assigned
└──────────────────┘
```

---

## The Filtering Funnel (Estimated)

| Stage | Input | Output | Loss | Cumulative Survival |
|-------|:---:|:---:|:---:|:---:|
| Serper raw results | ~200-400 | 200-400 | 0 | 100% |
| Scoring filter (35%) | 200-400 | 140-320 | ~20-30% | 70-80% |
| Delta detection | 140-320 | varies | Known URLs | varies |
| Whitelist filter | varies | varies | Small | varies |
| **AI filter (0.55)** | **~100-250** | **~60-180** | **~25-40%** | **~45-60%** |
| Dedup | 60-180 | 55-170 | ~5% | ~43-57% |
| **Final to user** | — | **55-170** | — | **~45-55% of raw** |

**The AI filter alone kills 25-40% of results that survived scoring.**

---

## Component Ratings

### 1. Query Generator — Rating: B+
**File:** `src/lib/scan-engine/query-generator.ts`

**Strengths:**
- Multi-tiered approach (broad → targeted → deep-dive)
- Product-type-specific piracy vocabulary
- Intelligence feedback loop from verified results
- Smart exclusions (official domain, whitelist, negative keywords)

**Weaknesses:**
- No cross-tier deduplication (wastes API budget)
- "free download" in ALL profiles generates noise
- Heavy reliance on AI-extracted data quality

### 2. Scoring Engine — Rating: C+
**File:** `src/lib/scan-engine/scoring.ts`

**Strengths:**
- Multi-factor scoring with platform weights
- Piracy site detection (+15 boost)
- Official/whitelist domain detection (-50 penalty)

**Critical Issues:**
| Issue | Severity | Line | Detail |
|-------|----------|------|--------|
| Base score too low | HIGH | 204 | Starts at 40/100, needs only -6 to die at 35 threshold |
| Penalty terms too harsh | HIGH | 255 | -5 per "review"/"tutorial" — common in niche product results |
| Mixed-signal recovery too weak | MEDIUM | 264 | ×3 multiplier doesn't offset -5 penalties |
| No product-type scoring | MEDIUM | — | Same weights for all product types |

### 3. AI Filter — Rating: C- (THE PROBLEM)
**File:** `src/lib/ai/infringement-filter.ts`

**Strengths:**
- Product-type-specific instructions
- Category precision context injection
- Uncertain zone (0.30-0.55) passes for human review

**Critical Issues:**
| Issue | Severity | Line | Detail |
|-------|----------|------|--------|
| minConfidence 0.55 too high | CRITICAL | 249 | AI prompt defines "POSSIBLE" as 0.5-0.8, but 0.50-0.54 gets killed |
| Max tokens 200 too low | HIGH | 209 | Truncates AI reasoning, forces shallow decisions |
| Type instructions too cautious | HIGH | 26-86 | Extensive false positive warnings make AI gun-shy |
| GPT-4o-mini limitations | MEDIUM | 207 | Cheapest model — struggles with nuanced piracy detection |

**WHERE LEGITIMATE INFRINGEMENTS DIE:**
- **Niche forums:** "review" penalty + low platform weight → score 35-50, AI rates 0.45-0.54 → killed
- **Mixed-content pages:** Boost AND penalty terms → score 40-54 → borderline → AI downgrades
- **GPL gray area:** Templates on GPL sites intentionally rated 0.5-0.7, often lands 0.50-0.54 → killed
- **Ambiguous selling intent:** Unauthorized resale without explicit piracy keywords → low score → AI uncertain → killed

### 4. Platform Scanners — Rating: B
**Files:** `src/lib/scan-engine/platforms/*.ts`

**Coverage:**
| Platform | Sites | Method | Gap Assessment |
|----------|:---:|--------|---------------|
| Google | Serper | Keyword + site: search | Good coverage |
| Telegram | 15 known channels | Google + Bot API | Small channel list, no message analysis |
| Cyberlockers | 10 sites | site: search | Includes dead sites (zippyshare, anonfiles) |
| Discord | 5 directory sites | site: search | No channel-level detection |
| Forums | 10 forums | site: search | No private forums |
| Torrents | 10 sites | site: search | Includes dead sites (rarbg, zooqle, torrentz2) |

**Dead sites still being searched (wasted API calls):**
- `zippyshare.com` — Shut down 2023
- `anonfiles.com` — Shut down 2023
- `rarbg.to` — Shut down 2023
- `zooqle.com` — Unstable/offline
- `torrentz2.eu` — Often offline

### 5. Scan Profiles — Rating: B+
**File:** `src/lib/scan-engine/profiles.ts`

**Good piracy vocabulary per type.** Missing some terms:
- Courses: "zero-cost", "share link"
- Software: "license bypass", "no-install"
- Indicators: "EA copy", "MT4 clone"

### 6. Scan Orchestrator — Rating: B+
**File:** `src/lib/scan-engine/index.ts`

**Strengths:**
- Parallel platform scanning
- Delta detection prevents re-processing
- Re-listing detection for removed URLs
- Comprehensive logging at each stage

---

## Specific Recommendations (Priority Order)

### P0 — Critical (Do Now)

1. **Lower AI minConfidence from 0.55 to 0.40**
   - File: `infringement-filter.ts:249`
   - Impact: ~15-25% more results pass through for human review
   - Risk: Slightly more false positives, but humans verify anyway

2. **Raise scoring base from 40 to 50**
   - File: `scoring.ts:204`
   - Impact: Results need -16 instead of -6 to die — much harder to accidentally kill

3. **Reduce penalty term weight from -5 to -3**
   - File: `scoring.ts:255`
   - Impact: "review"/"tutorial" mentions stop killing niche product results

4. **Increase AI max tokens from 200 to 500**
   - File: `infringement-filter.ts:209`
   - Impact: AI can reason about edge cases instead of truncating

### P1 — High (Do Soon)

5. **Increase mixed-signal recovery from ×3 to ×5**
   - File: `scoring.ts:264`
   - Impact: Mixed boost+penalty pages recover better

6. **Remove dead sites from cyberlocker and torrent scanners**
   - Files: `cyberlockers.ts:26-37`, `torrents.ts:24-35`
   - Impact: Saves 5 wasted API calls per scan

7. **Add Reddit and YouTube to platform search**
   - Missing from all scanners — both host significant piracy content

8. **Add more piracy-specific terms to profiles**
   - Expand vocabulary for courses, indicators, software

### P2 — Medium (Future Sprint)

9. **Product-type-specific scoring weights** in scoring.ts
10. **Dynamic site list management** via database instead of hardcoded
11. **Cross-tier query deduplication** in query-generator.ts
12. **Upgrade AI model** for difficult cases (use gpt-4o for low-confidence results)

---

## Key Threshold Reference

| Threshold | File:Line | Before | After | Status |
|-----------|-----------|:---:|:---:|:---:|
| Scoring base | scoring.ts:204 | 40 | **50** | DONE |
| Scoring filter | scoring.ts:369 | 35% | **30%** | DONE |
| Penalty per term | scoring.ts:255 | -5 | **-3** | DONE |
| Mixed-signal recovery | scoring.ts:264 | ×3 | **×5** | DONE |
| AI minConfidence | infringement-filter.ts:249 | 0.55 | **0.40** | DONE |
| AI max tokens | infringement-filter.ts:209 | 200 | **500** | DONE |
| AI temperature | infringement-filter.ts:208 | 0.2 | **0.3** | DONE |
| AI env default | index.ts:151,274 | 0.55 | **0.40** | DONE |
| Piracy site boost | scoring.ts:273 | +15 | +15 (keep) | — |
| Legit site penalty | scoring.ts:282 | -15 | -15 (keep) | — |
| Official domain penalty | scoring.ts:295 | -50 | -50 (keep) | — |
