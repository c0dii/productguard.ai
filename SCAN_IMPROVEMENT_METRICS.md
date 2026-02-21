# Scan Engine Improvements — Change Log & Expected Impact

**Date:** 2026-02-20
**Reference:** SCAN_ENGINE_AUDIT.md

---

## Changes Applied

### 1. Scoring Engine (`scoring.ts`)

| Change | Before | After | Why |
|--------|:---:|:---:|-----|
| Base score | 40 | **50** | Results needed only -6 to die at threshold. Now need -20, preventing accidental kills |
| Penalty per term | -5 | **-3** | "review"/"tutorial" terms appear in most niche product results. -3 still suppresses pure review pages but doesn't massacre mixed-signal results |
| Mixed-signal recovery | ×3 | **×5** | Pages with BOTH piracy terms AND review terms (e.g., "free download indicator review") now recover more effectively |
| Filter threshold | 35 | **30** | Combined with higher base, this creates a wider "survive" band for borderline results |

**Net effect on scoring:** A result with 1 penalty term and 0 boosts:
- Before: 40 - 5 = 35 (barely survives at threshold)
- After: 50 - 3 = 47 (comfortable margin)

A result with 1 penalty and 1 boost:
- Before: 40 + 8 - 5 + 3 = 46
- After: 50 + 8 - 3 + 5 = 60

### 2. AI Filter (`infringement-filter.ts`)

| Change | Before | After | Why |
|--------|:---:|:---:|-----|
| minConfidence | 0.55 | **0.40** | The AI prompt defines "POSSIBLE" infringements as 0.5-0.8 confidence. At 0.55 threshold, results rated 0.40-0.54 were killed — many legitimate finds in the "possible" zone. Now the uncertain band (0.30-0.40) passes for human review |
| maxTokens | 200 | **500** | 200 tokens forced truncated reasoning on edge cases. 500 tokens allows the AI to reason about nuanced scenarios (GPL gray areas, mixed-content pages, ambiguous resale) |
| temperature | 0.2 | **0.3** | Slightly less deterministic, allowing better handling of edge cases without flip-flopping |

**Net effect on AI filter:** ~15-25% more results will pass through for human review. False positives may increase slightly, but users verify all results anyway — better to show a possible infringement than silently kill it.

### 3. Orchestrator (`index.ts`)

| Change | Before | After | Why |
|--------|:---:|:---:|-----|
| AI threshold env default | 0.55 | **0.40** | Both references to `AI_CONFIDENCE_THRESHOLD` env var now fall back to 0.40 instead of 0.55 |

### 4. Platform Scanners — Dead Site Removal

**Cyberlockers** (`platforms/cyberlockers.ts`):
| Removed (dead) | Added (active) |
|-----------------|----------------|
| zippyshare.com (shut down 2023) | 1fichier.com |
| anonfiles.com (shut down 2023) | gofile.io |

**Torrents** (`platforms/torrents.ts`):
| Removed (dead) | Added (active) |
|-----------------|----------------|
| rarbg.to (shut down 2023) | nyaa.si |
| torrentz2.eu (often offline) | btdig.com |
| zooqle.com (unstable/offline) | rutracker.org |

**Net effect:** 5 wasted API calls per scan eliminated. 5 active replacement sites added for better coverage.

### 5. Scan Profiles (`profiles.ts`)

**New piracy terms added:**
- Courses: "zero-cost", "share link"
- Indicators: "EA copy", "MT4 clone", "MT5 clone"
- Software: "license bypass", "no-install"

---

## Expected Impact Summary

| Metric | Before (est.) | After (est.) | Change |
|--------|:---:|:---:|:---:|
| Results surviving scoring | ~70-80% | ~85-90% | +15-20% more pass |
| Results surviving AI filter | ~60-75% | ~75-90% | +15-25% more pass |
| **Total results to user** | ~45-55% of raw | ~65-80% of raw | **+20-30% more results** |
| Wasted API calls (dead sites) | 5 per scan | 0 | -5 calls saved |
| AI cost per result | ~$0.0001 | ~$0.0003 | +$0.0002 (worth it for better reasoning) |
| False positive rate to user | ~12.5% precision | ~25-35% precision (est.) | Better recall, slightly more FPs |

### Key Principle
> **It's better to show a user a possible infringement they can dismiss than to silently kill a real one they never see.**

All results still go through human verification. These changes shift the balance from "aggressive auto-filtering" to "catch more, let humans decide."

---

## Monitoring After Deploy

After the next few scans, check:
1. **Pass rates** in scan logs — `[AI Filter] Results: X passed, Y filtered`
2. **User verification rates** — are users confirming or rejecting the additional results?
3. **Scan duration** — higher token count may add ~1-2s per scan
4. **AI cost** — monitor OpenAI spend, should increase ~2-3x per result but stay well under $0.05/scan
