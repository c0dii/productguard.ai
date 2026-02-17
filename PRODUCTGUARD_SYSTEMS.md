# ProductGuard.ai — Systems & Tools Reference

Everything we've built, what it does, and how it works.

---

## 1. Scan Engine

**What it does:** Searches the internet for pirated copies of a user's digital products across multiple platforms simultaneously.

**How it works:**
- User adds a product (name, URL, keywords, price)
- Engine generates smart search queries from product metadata
- Searches Google, Telegram, Discord, torrent sites, cyberlockers, and forums in parallel
- Each result goes through AI filtering to remove false positives
- Surviving results get scored by severity (0-100) and assigned priority (P0/P1/P2)
- Infrastructure profiling runs on each URL (IP, hosting provider, country, WHOIS)
- Everything saved to database with status `pending_verification`

**AI Optimization — Delta Detection:**
- On rescans, the engine hashes every URL and checks if we've seen it before
- Known URLs get their `seen_count` incremented and `last_seen_at` updated — no reprocessing
- Only truly new URLs go through the expensive AI filtering + infrastructure profiling pipeline
- Tracks API cost savings per scan

**AI Optimization — False Positive Filtering:**
- Uses GPT-4o-mini to analyze each result before it reaches the user
- Categorizes as: piracy, unauthorized_sale, counterfeit, or legitimate
- Confidence score 0.0-1.0 with reasoning
- Learns from user feedback (see Intelligence Engine below)
- Cost: ~$0.01-0.02 per 100 results

**Platform Scanners:**
| Scanner | Method | What it finds |
|---------|--------|---------------|
| Google | SerpAPI search | Indexed pirate pages, scraped sales pages |
| Telegram | Google search for t.me links | Piracy channels, groups, bots |
| Discord | Google search for discord.gg links | Piracy servers |
| Torrents | Searches PirateBay, 1337x, etc. | Torrent listings with seeder counts |
| Cyberlockers | Searches MEGA, MediaFire, etc. | Direct download links |
| Forums | Searches discussion boards | Unauthorized distribution threads |

**Key files:** `src/lib/scan-engine/index.ts`, `src/lib/scan-engine/platforms/`

---

## 2. Intelligence Engine (Self-Improving AI)

**What it does:** Learns from every user verification and rejection to make future scans smarter and more accurate.

**How it works:**
- When a user clicks "Confirm Threat" or "Mark as Not a Threat," the engine records the decision
- Extracts patterns from verified infringements (which keywords worked, which platforms)
- Extracts patterns from false positives (which domains to avoid, which terms mislead)
- Uses these patterns to:
  - **Optimize search queries** — adds high-confidence keywords, excludes known false positive domains
  - **Improve AI filtering** — feeds verified/rejected examples as few-shot learning into the filter prompt
  - **Track precision rate** — verified / (verified + false positives) per product

**Metrics tracked:**
- Precision rate (what % of detections are real)
- AI pass rate (what % survive filtering)
- Daily metrics per product
- Improvement suggestions (e.g., "precision below 50%, consider raising confidence threshold")

**Key files:** `src/lib/intelligence/intelligence-engine.ts`

---

## 3. Evidence Capture System

**What it does:** When a user confirms an infringement, the system captures everything on the page and locks it down cryptographically so it can never be disputed.

**How it works (triggered on "Confirm Threat"):**

1. **Fetches the live page HTML** — full raw HTML downloaded and stored
2. **Extracts content via Cheerio** — page title, all visible text (up to 50KB), all links (up to 500)
3. **Stores HTML in Supabase Storage** — encrypted bucket, organized by user/infringement
4. **Submits to Wayback Machine** — free third-party archival at web.archive.org
5. **Creates SHA-256 content hash** — fingerprint of all evidence combined
6. **Anchors to Bitcoin blockchain** — via OpenTimestamps (free), creates tamper-proof timestamp
7. **Builds chain of custody** — logs every action with timestamps, IP addresses, user agents
8. **Generates legal attestation** — sworn statement with digital signature hash
9. **Saves immutable evidence snapshot** — all of the above packaged into one database record

**What gets preserved:**
- Full page HTML (stored in secure bucket)
- Page title
- All visible text content
- Every link on the page
- SHA-256 hash of the HTML
- SHA-256 hash of all evidence combined
- Wayback Machine archive URL
- Bitcoin blockchain timestamp proof
- Infrastructure snapshot (IP, hosting, WHOIS frozen at verification time)
- Matched content excerpts
- Chain of custody audit trail
- Legal attestation with digital signature

**Key files:** `src/lib/evidence/capture-page.ts`, `src/lib/evidence/blockchain-timestamp.ts`, `src/lib/evidence/snapshot-creator.ts`, `src/lib/evidence/evidence-extractor.ts`

---

## 4. DMCA Notice Generator

**What it does:** Generates legally complete DMCA takedown notices using structured templates — no AI hallucination risk, every required legal element guaranteed.

**How it works (triggered on "Generate DMCA Notice"):**

1. **Detects infringement profile** — categorizes the type of infringement:
   - `full_reupload` — complete mirror of the product
   - `copied_text` — scraped sales page or blog content
   - `copied_images` — stolen screenshots or graphics
   - `leaked_download` — file on Telegram, MEGA, torrent, etc.
   - `unauthorized_resale` — listed for sale without license
   - `partial_copy` — excerpts or module rips
   - Each profile maps to specific legal rights being violated (17 U.S.C. Section 106)

2. **Resolves the provider** — auto-detects who to send the notice to from a database of 20+ platforms:
   - YouTube, Google, Telegram, Discord, MEGA, MediaFire, Dropbox, Cloudflare, Namecheap, GoDaddy, DigitalOcean, Hostinger, TikTok, Reddit, Facebook, Instagram, X/Twitter, Gumroad, Etsy
   - Each entry has: email, web form URL, agent name, platform-specific requirements
   - Falls back to WHOIS abuse contact if platform not recognized

3. **Builds comparison items** — auto-generates "Original vs. Infringing" side-by-side mappings from evidence matches (the single strongest element in any DMCA notice)

4. **Assembles 7-section notice** — deterministic template, not AI-generated:
   - A) Notifier / Rights Holder identity and contact
   - B) Copyrighted Work identification (title, type, URL, registration)
   - C) Infringing Material with legal basis + comparison items
   - D) Evidence Packet (hashes, Wayback URL, blockchain timestamp, infrastructure)
   - E) Required DMCA Statements (good faith + perjury)
   - F) Requested Action (remove, notify, confirm)
   - G) Electronic Signature

5. **Quality checks the notice** — scores 0-100 with actionable feedback:
   - **Hard errors** (blocks sending): missing name, email, address, URLs, legal statements
   - **Soft warnings** (weaker but sendable): few comparisons, no evidence, no copyright registration, no phone
   - **Strength ratings:** Strong (85+), Standard (60-84), Weak (<60)
   - Each warning includes exactly what the user can do to fix it

**Key difference from old system:** Previous version used GPT-4o ($0.03+ per notice, could hallucinate). New system is instant, free, and deterministic.

**Key files:** `src/lib/dmca/notice-builder.ts`, `src/lib/dmca/infringement-profiles.ts`, `src/lib/dmca/provider-database.ts`, `src/lib/dmca/comparison-builder.ts`, `src/lib/dmca/quality-checker.ts`

---

## 5. Enforcement & Infrastructure Profiling

**What it does:** Identifies who is hosting infringing content and builds a technical profile for enforcement.

**Infrastructure Profiler collects (in parallel):**
- IP address (DNS resolution)
- Hosting provider (reverse DNS + pattern matching)
- CDN detection (Cloudflare, Fastly, Akamai)
- Geolocation (country, region, city, ASN)
- WHOIS data (registrar, registrant, abuse contact, domain age)
- Domain creation/expiration dates
- Nameservers

**Priority Scoring:**
- Severity score 0-100 based on: match confidence, audience size, monetization detected, platform risk, revenue impact, country enforceability
- P0 (Critical): score 75+ or monetization with high confidence or 50K+ audience
- P1 (Standard): score 50+ or monetization or 5K+ audience
- P2 (Watchlist): everything else
- Auto-sets recheck intervals: P0=1 day, P1=3 days, P2=7 days

**Key files:** `src/lib/enforcement/infrastructure-profiler.ts`, `src/lib/enforcement/priority-scorer.ts`

---

## 6. WHOIS Integration

**What it does:** Looks up domain registration details for every infringing URL.

**Data captured:** Domain name, registrant organization, registrant country, registrar name, registrar abuse email/phone, creation date, expiration date, nameservers, domain age.

**Supports:** Single lookups, sequential batch lookups (with rate limiting), async bulk requests for 100+ domains.

**Key files:** `src/lib/whois/whois-client.ts`

---

## 7. Takedown Tracking & URL Monitoring

**What it does:** Tracks every DMCA notice sent and automatically monitors whether the infringing URL gets taken down.

**How it works:**
- When user marks a notice as sent, a takedown record is created
- Weekly cron job (Sundays 2am UTC) checks every tracked URL
- Makes HEAD requests to detect status changes:
  - 404/410/403 = Removed (success)
  - 200 = Still active
  - 301/302 = Redirected (partial success)
  - Error/timeout = technical issue
- Users can also manually trigger a check anytime
- Tracks: check count, last checked, next check, effectiveness status

**Key files:** `src/app/api/takedowns/`, `src/app/api/takedowns/check-urls/`

---

## 8. GoHighLevel (GHL) CRM Integration

**What it does:** Syncs user activity to GoHighLevel for automated marketing workflows.

**Events tracked:**
| Event | When it fires |
|-------|--------------|
| First Scan | User runs their first scan |
| Scan Completed | Any scan finishes (with count) |
| High Severity Alert | P0 infringement detected |
| DMCA Sent | User generates a DMCA notice |
| Infringement Verified | User confirms a threat |
| Trial Ending Soon | 3 days before trial expires |
| Trial Expired | Trial period ends |
| User Inactive | 7/14/30 days without login |
| Onboarding Incomplete | 3/7/14 days without products or scans |
| Power User | Crosses thresholds (3+ products, 5+ scans, 3+ DMCAs) |
| Monthly Report | 1st of each month — activity summary |

**Key files:** `src/lib/ghl/events.ts`, `src/lib/ghl/ghl-client.ts`, `src/lib/ghl/workflow-automation.ts`

---

## 9. AI Product Analyzer

**What it does:** When a user adds a product URL, AI analyzes the page and extracts everything needed for effective scanning.

**Extracts:**
- Brand identifiers (company names, trademarked terms)
- Unique phrases (distinctive marketing copy that proves copying)
- Keywords (product features, technical terms)
- Copyrighted terms
- Content fingerprint (SHA-256 hash)
- Page metadata (title, description, Open Graph data)

**Used by:** Scan engine to generate better search queries. DMCA generator to build stronger comparison items.

**Key files:** `src/lib/ai/product-analyzer.ts`, `src/app/api/products/scrape/route.ts`

---

## 10. Verification Workflow

**What it does:** Prevents false positives from reaching enforcement by requiring user review.

**Flow:**
```
Scan detects URL → pending_verification → User reviews → Confirm / Dismiss
                                                           |           |
                                                        active    false_positive
                                                           |
                                              Evidence captured + actionable
```

**Deduplication:** URLs are normalized (remove protocol, www, trailing slashes) and SHA-256 hashed. Same URL found on rescan just increments `seen_count` — no duplicate records.

**Key files:** `src/app/api/infringements/[id]/verify/route.ts`, `src/components/dashboard/PendingVerificationList.tsx`

---

## 11. Stripe Billing

**What it does:** Handles subscriptions, plan enforcement, and billing portal.

**Plans:** Scout (free), Starter, Pro, Business — each with product and scan limits.

**Key files:** `src/lib/stripe/index.ts`, `src/app/api/checkout/route.ts`, `src/app/api/webhooks/stripe/route.ts`

---

## 12. Dashboard Pages

| Page | What it shows |
|------|--------------|
| `/dashboard` | Overview stats, recent activity |
| `/dashboard/products` | Product grid with edit/delete/scan actions |
| `/dashboard/products/[id]` | Product detail with image, trend chart, pending verifications, scan history |
| `/dashboard/infringements` | All detected infringements with filters |
| `/dashboard/infringements/[id]` | Full detail view with evidence, infrastructure, WHOIS, actions, evidence snapshot |
| `/dashboard/scans` | Scan history with progress tracking |
| `/dashboard/scans/[id]` | Individual scan results |
| `/dashboard/takedowns` | DMCA notices sent with status tracking |
| `/dashboard/settings` | Profile, billing, DMCA contact info |
| `/admin` | User management (admin only) |

---

## 13. Cron Jobs (Automated Background Tasks)

| Job | Schedule | What it does |
|-----|----------|-------------|
| Daily Workflows | Every day | Check trials, inactive users, onboarding, power users |
| Monthly Reports | 1st of month | Generate per-user activity summaries for GHL |
| URL Monitoring | Every Sunday 2am | Check if takedown URLs are removed |
| Deadline Tracking | Daily | Auto-escalate overdue takedown responses |

---

## 14. External Services Used

| Service | What for | Cost |
|---------|----------|------|
| OpenAI (GPT-4o-mini) | AI filtering, evidence extraction | ~$0.01-0.02 per 100 results |
| OpenAI (GPT-4o) | Complex analysis (legacy DMCA gen, now replaced) | $2.50-10 per 1M tokens |
| SerpAPI | Google search for piracy detection | ~$0.01-0.02 per search |
| WhoisXML | Domain registration lookups | ~$0.005-0.02 per lookup |
| ip-api.com | IP geolocation | Free (45 req/min) |
| OpenTimestamps | Bitcoin blockchain timestamping | Free |
| Wayback Machine | Third-party page archival | Free |
| Supabase | Database, auth, storage, RLS | Per-GB + API calls |
| Stripe | Payments and subscriptions | % of transaction |
| GoHighLevel | CRM automation | Per-workflow trigger |

---

## 15. Database Tables

| Table | Purpose |
|-------|---------|
| profiles | Users — name, email, plan, Stripe ID, theme |
| products | Protected products — name, URL, keywords, IP info, DMCA contact |
| scans | Scan execution records — status, timing, cost metrics |
| scan_history | Per-run history for living scans |
| infringements | Detected threats — URL, evidence, scoring, status, WHOIS, infrastructure |
| evidence_snapshots | Immutable evidence packages — HTML, hashes, blockchain proof, chain of custody |
| takedowns | DMCA notices — content, recipient, status, URL monitoring |
| dmca_submission_logs | Audit trail — who sent what, when, from where |
| status_transitions | Every status change logged with reason and actor |
| intelligence_patterns | Learned patterns from user feedback |
| intelligence_metrics | Daily AI performance metrics per product |
| subscriptions | Stripe subscription lifecycle |

---

*Last updated: February 16, 2026*
