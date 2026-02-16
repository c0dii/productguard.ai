# ProductGuard.ai — Architecture & Schema Update Guide

> **Purpose:** Drop this file into your Claude Code CLI context to guide implementation of the updated database schema, case state machine, evidence system, and modular scan/enforcement architecture.
>
> **Context:** This builds on the existing project scaffold (Next.js 15 + Supabase + Stripe + Tailwind). It incorporates architectural improvements from the agent-based systems analysis, filtered down to what's actually actionable for MVP.

---

## What Changed & Why

The original schema had flat `status` enums on `infringements` and `takedowns` tables. This update introduces:

1. **Case State Machine** — Proper state transitions with validation logic so infringements move through a predictable lifecycle
2. **Evidence Packets** — Structured JSONB storage on infringements so every detection carries exportable proof
3. **Infrastructure Profiles** — WHOIS/hosting data stored per infringement to power smart DMCA routing
4. **Enforcement Actions** — Replaces the single `takedowns` table with a more flexible `enforcement_actions` table that supports multiple action types per infringement (DMCA → host escalation → payment complaint)
5. **Standardized JSON contracts** — Consistent data shapes flowing between scan → match → score → enforce modules

---

## Updated Database Schema

### Migration: `001_updated_schema.sql`

Run this AFTER the initial Supabase project setup. If you already ran the original 7-table migration from the scaffold, create a new migration that alters/adds to the existing tables.

```sql
-- ============================================================
-- PROFILES (extends Supabase Auth)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  company_name TEXT,
  plan_tier TEXT NOT NULL DEFAULT 'scout' CHECK (plan_tier IN ('scout', 'starter', 'pro', 'business')),
  stripe_customer_id TEXT,
  enforcement_prefs JSONB DEFAULT '{
    "auto_enforce": false,
    "max_daily_actions": 10,
    "allow_payment_escalation": false,
    "default_tone": "firm"
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PRODUCTS (creator's registered digital products)
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT,
  price NUMERIC(10,2),
  type TEXT NOT NULL DEFAULT 'other' CHECK (type IN ('course', 'indicator', 'software', 'template', 'ebook', 'other')),
  keywords TEXT[] DEFAULT '{}',
  description TEXT,
  -- Canonical product profile for matching
  canonical_profile JSONB DEFAULT '{
    "aliases": [],
    "canonical_urls": [],
    "authorized_domains": [],
    "authorized_marketplaces": [],
    "signature_phrases": []
  }'::jsonb,
  -- Fingerprints for content matching
  fingerprints JSONB DEFAULT '{
    "text_simhash": null,
    "title_variations": [],
    "keyword_queries": []
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_products_user_id ON products(user_id);

-- ============================================================
-- SCANS (individual scan runs)
-- ============================================================
CREATE TABLE IF NOT EXISTS scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scan_type TEXT NOT NULL DEFAULT 'manual' CHECK (scan_type IN ('manual', 'scheduled_weekly', 'scheduled_daily', 'realtime')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  -- Platforms actually scanned in this run
  platforms_scanned TEXT[] DEFAULT '{}',
  -- Results summary
  infringement_count INTEGER DEFAULT 0,
  est_revenue_loss NUMERIC(12,2) DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_scans_product_id ON scans(product_id);
CREATE INDEX idx_scans_user_id ON scans(user_id);

-- ============================================================
-- INFRINGEMENTS (detected piracy — with state machine)
-- ============================================================
-- State Machine:
--   new → verified → enforced → waiting → resolved
--                                       → escalated → enforced (loop)
--   new → archived (false positive / authorized)
--   any → disputed
CREATE TABLE IF NOT EXISTS infringements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID REFERENCES scans(id) ON DELETE SET NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Detection info
  platform TEXT NOT NULL CHECK (platform IN ('telegram', 'google', 'cyberlocker', 'torrent', 'discord', 'forum', 'social', 'marketplace', 'other')),
  source_url TEXT NOT NULL,
  source_type TEXT CHECK (source_type IN ('channel', 'group', 'bot', 'indexed_page', 'direct_download', 'torrent', 'server', 'post', 'listing', 'other')),
  
  -- Matching & confidence
  match_type TEXT DEFAULT 'keyword' CHECK (match_type IN ('exact_hash', 'near_hash', 'keyword', 'phrase', 'partial', 'derivative', 'manual')),
  match_confidence NUMERIC(3,2) DEFAULT 0.00 CHECK (match_confidence >= 0 AND match_confidence <= 1),
  match_evidence TEXT[] DEFAULT '{}',  -- e.g. ['title_match', 'keyword_match', 'url_pattern']
  
  -- Severity & priority
  risk_level TEXT NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('critical', 'high', 'medium', 'low')),
  severity_score INTEGER DEFAULT 0 CHECK (severity_score >= 0 AND severity_score <= 100),
  priority TEXT DEFAULT 'P2' CHECK (priority IN ('P0', 'P1', 'P2')),
  
  -- Audience & impact
  audience_size TEXT,  -- human-readable: "12,400 members"
  audience_count INTEGER DEFAULT 0,  -- numeric for calculations
  est_revenue_loss NUMERIC(12,2) DEFAULT 0,
  monetization_detected BOOLEAN DEFAULT false,  -- are they selling/monetizing it?
  
  -- === CASE STATE MACHINE ===
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'verified', 'enforced', 'waiting', 'escalated', 'resolved', 'archived', 'disputed')),
  status_changed_at TIMESTAMPTZ DEFAULT now(),
  previous_status TEXT,
  escalation_count INTEGER DEFAULT 0,
  next_check_at TIMESTAMPTZ,
  
  -- === EVIDENCE PACKET ===
  evidence JSONB DEFAULT '{
    "screenshots": [],
    "matched_excerpts": [],
    "hash_matches": [],
    "url_chain": [],
    "detection_metadata": {}
  }'::jsonb,
  
  -- === INFRASTRUCTURE PROFILE ===
  infrastructure JSONB DEFAULT '{
    "hosting_provider": null,
    "registrar": null,
    "cdn": null,
    "nameservers": [],
    "abuse_contact": null
  }'::jsonb,
  
  detected_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_infringements_product_id ON infringements(product_id);
CREATE INDEX idx_infringements_user_id ON infringements(user_id);
CREATE INDEX idx_infringements_status ON infringements(status);
CREATE INDEX idx_infringements_platform ON infringements(platform);
CREATE INDEX idx_infringements_priority ON infringements(priority);
CREATE INDEX idx_infringements_next_check ON infringements(next_check_at) WHERE next_check_at IS NOT NULL;

-- ============================================================
-- ENFORCEMENT ACTIONS (replaces old "takedowns" table)
-- Supports multiple actions per infringement (escalation chain)
-- ============================================================
CREATE TABLE IF NOT EXISTS enforcement_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  infringement_id UUID NOT NULL REFERENCES infringements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Action type & target
  action_type TEXT NOT NULL CHECK (action_type IN (
    'dmca_platform',      -- DMCA to the platform hosting content
    'dmca_host',          -- DMCA to hosting provider
    'dmca_cdn',           -- Notice to CDN (Cloudflare, etc.)
    'google_deindex',     -- Google Search removal request
    'bing_deindex',       -- Bing Search removal request
    'cease_desist',       -- Cease & desist letter
    'payment_complaint',  -- Report to payment processor
    'marketplace_report', -- Report to marketplace (Etsy, Gumroad, etc.)
    'manual_other'        -- Creator-initiated custom action
  )),
  escalation_step INTEGER DEFAULT 1,  -- 1 = first attempt, 2+ = escalation
  
  -- Target & content
  target_entity TEXT,       -- "Cloudflare", "Namecheap", "Google", etc.
  target_contact TEXT,      -- abuse email or form URL
  notice_content TEXT,      -- the actual notice/letter text
  notice_tone TEXT DEFAULT 'firm' CHECK (notice_tone IN ('friendly', 'firm', 'nuclear')),
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'acknowledged', 'action_taken', 'removed', 'refused', 'no_response', 'failed')),
  
  -- Timestamps
  sent_at TIMESTAMPTZ,
  response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  deadline_at TIMESTAMPTZ,  -- when to escalate if no response
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_enforcement_infringement ON enforcement_actions(infringement_id);
CREATE INDEX idx_enforcement_user ON enforcement_actions(user_id);
CREATE INDEX idx_enforcement_status ON enforcement_actions(status);
CREATE INDEX idx_enforcement_deadline ON enforcement_actions(deadline_at) WHERE status = 'sent';

-- ============================================================
-- SUBSCRIPTIONS (Stripe data)
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  plan_tier TEXT NOT NULL CHECK (plan_tier IN ('scout', 'starter', 'pro', 'business')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);

-- ============================================================
-- STATUS TRANSITION LOG (audit trail for state machine)
-- ============================================================
CREATE TABLE IF NOT EXISTS status_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  infringement_id UUID NOT NULL REFERENCES infringements(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  reason TEXT,
  triggered_by TEXT CHECK (triggered_by IN ('system', 'user', 'cron', 'webhook')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_transitions_infringement ON status_transitions(infringement_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE infringements ENABLE ROW LEVEL SECURITY;
ALTER TABLE enforcement_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_transitions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users see own profile" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users see own products" ON products FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own scans" ON scans FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own infringements" ON infringements FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own enforcement" ON enforcement_actions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own subscriptions" ON subscriptions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own transitions" ON status_transitions FOR ALL USING (
  infringement_id IN (SELECT id FROM infringements WHERE user_id = auth.uid())
);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Validate state transitions
CREATE OR REPLACE FUNCTION validate_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  valid_transitions JSONB := '{
    "new": ["verified", "archived"],
    "verified": ["enforced", "archived"],
    "enforced": ["waiting", "escalated"],
    "waiting": ["resolved", "escalated"],
    "escalated": ["enforced", "resolved"],
    "archived": ["new"],
    "disputed": ["verified", "archived", "resolved"]
  }'::jsonb;
  allowed TEXT[];
BEGIN
  -- Skip if status hasn't changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Check if transition is valid
  SELECT ARRAY(SELECT jsonb_array_elements_text(valid_transitions -> OLD.status))
    INTO allowed;
  
  IF NEW.status != ALL(allowed) THEN
    RAISE EXCEPTION 'Invalid status transition: % → %', OLD.status, NEW.status;
  END IF;
  
  -- Update metadata
  NEW.previous_status := OLD.status;
  NEW.status_changed_at := now();
  NEW.updated_at := now();
  
  IF NEW.status = 'escalated' THEN
    NEW.escalation_count := OLD.escalation_count + 1;
  END IF;
  
  IF NEW.status = 'resolved' THEN
    NEW.resolved_at := now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_infringement_status
  BEFORE UPDATE OF status ON infringements
  FOR EACH ROW
  EXECUTE FUNCTION validate_status_transition();

-- Auto-log status transitions
CREATE OR REPLACE FUNCTION log_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO status_transitions (infringement_id, from_status, to_status, triggered_by)
    VALUES (NEW.id, OLD.status, NEW.status, 'system');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_infringement_status
  AFTER UPDATE OF status ON infringements
  FOR EACH ROW
  EXECUTE FUNCTION log_status_transition();

-- Update scan summary after infringement insert
CREATE OR REPLACE FUNCTION update_scan_summary()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE scans SET
    infringement_count = (SELECT COUNT(*) FROM infringements WHERE scan_id = NEW.scan_id),
    est_revenue_loss = (SELECT COALESCE(SUM(est_revenue_loss), 0) FROM infringements WHERE scan_id = NEW.scan_id)
  WHERE id = NEW.scan_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_scan_summary
  AFTER INSERT ON infringements
  FOR EACH ROW
  WHEN (NEW.scan_id IS NOT NULL)
  EXECUTE FUNCTION update_scan_summary();
```

---

## Case State Machine Reference

Use this as the single source of truth for how infringements move through the system.

```
NEW ──────────────► VERIFIED ──────────► ENFORCED
 │                    │                    │
 │                    │                    ├──► WAITING
 │                    ▼                    │      │
 │                 ARCHIVED                │      ├──► RESOLVED ✓
 │              (false positive)           │      │
 │                                         │      └──► ESCALATED
 │                                         │             │
 │                                         ◄─────────────┘
 │                                               (loop: new vector)
 │
 └──────────────► ARCHIVED
              (authorized/allowed)
```

### Transition Rules

| From | To | Trigger |
|---|---|---|
| `new` | `verified` | Match confidence ≥ threshold AND false-positive filter passed |
| `new` | `archived` | Creator marks as authorized OR false positive detected |
| `verified` | `enforced` | Severity ≥ P1 AND (auto_enforce enabled OR manual approval) |
| `verified` | `archived` | Manual review determines not actionable |
| `enforced` | `waiting` | At least one enforcement action submitted |
| `enforced` | `escalated` | Immediate escalation needed (P0 + high confidence) |
| `waiting` | `resolved` | Content confirmed removed / deindexed / monetization killed |
| `waiting` | `escalated` | Deadline exceeded OR reupload detected OR no response |
| `escalated` | `enforced` | New enforcement vector triggered (host → payment → CDN) |
| `escalated` | `resolved` | Escalation succeeded |

### Auto-Enforcement Criteria

Only auto-enforce (skip manual review) when ALL of these are true:
- `match_confidence >= 0.85`
- At least 2 independent signals in `match_evidence` (e.g., `['title_match', 'keyword_match']`)
- Source URL is NOT in product's `authorized_domains` or `authorized_marketplaces`
- Creator's `enforcement_prefs.auto_enforce = true`
- Creator has not exceeded `enforcement_prefs.max_daily_actions`

If confidence is 0.65–0.84, route to dashboard for manual review.  
If confidence < 0.65, add to watchlist (status stays `new`, flag for next scan).

---

## Escalation Routing Logic

When an infringement reaches `enforced` status, determine the action sequence based on platform and infrastructure:

```
Step 1: Platform/Marketplace  (fastest response, try first)
  └─ Telegram: Abuse report via t.me/dmca
  └─ Google: URL Removal API
  └─ Discord: Trust & Safety report
  └─ Marketplace: Platform-specific DMCA form

Step 2: Hosting Provider
  └─ WHOIS lookup → abuse contact email
  └─ Send formatted DMCA notice
  └─ Set 72-hour deadline

Step 3: CDN Provider (if applicable)
  └─ Check response headers for Cloudflare/Fastly/etc.
  └─ Submit CDN-specific abuse form

Step 4: Search Suppression
  └─ Google DMCA dashboard
  └─ Bing Content Removal tool

Step 5: Payment/Ad Network (Pro+ tier only)
  └─ Identify payment processor from page
  └─ Submit copyright violation complaint
  └─ Flag ad network policy violation

Step 6: Legal Escalation Queue
  └─ Attorney referral (Business tier)
  └─ Pre-litigation notice templates
```

### Deadline Logic

After each enforcement action is sent, set `deadline_at`:
- Platform reports: 48 hours
- Host DMCA: 72 hours (DMCA safe harbor window)
- CDN: 48 hours
- Search engines: 7 days
- Payment processors: 5 business days

A cron job checks `enforcement_actions WHERE status = 'sent' AND deadline_at < now()` and triggers escalation.

---

## MVP Module Architecture

Build these 5 modules. Each is a set of functions/API routes, not an "agent."

### Module 1: Product Normalizer

**Location:** `lib/modules/product-normalizer.ts`  
**Called by:** Product creation form submit  
**Purpose:** Turn creator input into searchable queries + basic fingerprints

```typescript
// Input
interface ProductInput {
  name: string;
  url?: string;
  price: number;
  type: ProductType;
  keywords: string[];
  description?: string;
}

// Output (stored in products.canonical_profile + products.fingerprints)
interface CanonicalProfile {
  aliases: string[];           // title variations: lowercase, no spaces, abbreviations
  canonical_urls: string[];    // normalized URLs
  authorized_domains: string[];
  authorized_marketplaces: string[];
  signature_phrases: string[]; // distinctive phrases from description
}

interface ProductFingerprints {
  text_simhash: string | null;
  title_variations: string[];  // "Day Trading Masterclass", "day-trading-masterclass", "daytradingmasterclass"
  keyword_queries: string[];   // pre-built search queries: "day trading masterclass free download", etc.
}
```

**Implementation notes:**
- Generate title variations: lowercase, hyphenated, no-spaces, common abbreviations
- Build query templates: `"{title}" free download`, `"{title}" telegram`, `"{title}" mega`, `"{title}" torrent`
- Extract 3-5 signature phrases from description (longest unique phrases)
- No LLM needed — string manipulation only

### Module 2: Scanner

**Location:** `lib/modules/scanner.ts`  
**Called by:** API route `app/api/scan/route.ts` (manual) or cron job (scheduled)  
**Purpose:** Run queries against SerpAPI + Telegram, return candidate URLs

```typescript
interface ScanJob {
  product_id: string;
  scan_type: 'manual' | 'scheduled_weekly' | 'scheduled_daily';
  platforms: Platform[];
  queries: string[];
}

interface CandidateURL {
  url: string;
  source: 'google' | 'bing' | 'telegram' | 'manual';
  title: string;
  snippet: string;
  rank?: number;
  first_seen: string;
}
```

**Implementation notes:**
- SerpAPI: Run each query, collect top 10 results, deduplicate by domain
- Telegram Bot API: Search public channels matching product keywords
- Deduplicate against previously seen URLs (check infringements table)
- Rate limit: max 10 SerpAPI calls per scan, batch queries efficiently

### Module 3: Matcher & Scorer

**Location:** `lib/modules/matcher.ts`  
**Called by:** Scanner module, after candidates are collected  
**Purpose:** Compare candidates against product profile, assign confidence + severity

```typescript
interface MatchResult {
  candidate_url: string;
  product_id: string;
  match_type: 'exact_hash' | 'keyword' | 'phrase' | 'partial';
  confidence: number;         // 0.00 - 1.00
  evidence_points: string[];  // ['title_match', 'keyword_match', 'download_link_present']
  actionable: boolean;
  false_positive_reason?: string;
}

interface SeverityResult {
  severity_score: number;     // 0-100
  priority: 'P0' | 'P1' | 'P2';
  risk_level: 'critical' | 'high' | 'medium' | 'low';
  drivers: string[];          // ['selling_product', 'high_audience', 'exact_title_match']
}
```

**Scoring rubric:**
- +40: Page is selling/monetizing the product (checkout links, price detected)
- +25: Direct download available (file links, mega/mediafire/drive URLs)
- +15: High search visibility (rank in top 5 for product name)
- +15: Large audience (Telegram channel >5K, high traffic indicators)
- +10: Multiple keyword matches (3+ keywords from product)
- +5: Title exact match
- −30: Appears to be review/commentary/affiliate (contains review language, no download links)
- −20: Domain is in authorized list

**Priority mapping:**
- P0: severity ≥ 80 (immediate action)
- P1: severity 50-79 (standard enforcement)
- P2: severity < 50 (watchlist/monitor)

### Module 4: Notice Generator

**Location:** `lib/modules/notice-generator.ts`  
**Called by:** Dashboard "Send Takedown" button or auto-enforce  
**Purpose:** Generate properly formatted DMCA/C&D for the right target

```typescript
interface NoticeRequest {
  infringement_id: string;
  action_type: ActionType;
  tone: 'friendly' | 'firm' | 'nuclear';
}

interface GeneratedNotice {
  target_entity: string;
  target_contact: string;
  subject: string;
  body: string;
  attachments_needed: string[]; // ['screenshot', 'ownership_proof']
}
```

**Implementation notes:**
- Template-based with variable insertion, NOT LLM-generated
- Templates per target type: hosting DMCA, Google removal, Telegram abuse, platform report
- Pull creator legal info from profile, product info from products table
- Include evidence packet references
- Tone adjusts language intensity but keeps legal requirements intact

### Module 5: Case Tracker

**Location:** `lib/modules/case-tracker.ts`  
**Called by:** Cron job (daily), webhook callbacks  
**Purpose:** Monitor enforcement action status, trigger escalations

```typescript
interface CaseCheck {
  infringement_id: string;
  enforcement_action_id: string;
  check_type: 'deadline' | 'recheck' | 'reappearance';
}

interface CaseUpdate {
  new_status: InfringementStatus;
  reason: string;
  next_action?: ActionType;  // if escalating
}
```

**Implementation notes:**
- Cron runs daily, checks: overdue deadlines, URLs still live, reappearances
- For URL liveness checks: HEAD request to source_url, check HTTP status
- If content still live after deadline → transition to `escalated`, trigger next step in routing chain
- Log all transitions to `status_transitions` table (handled by DB trigger)

---

## Evidence Packet Structure

Every infringement stores an `evidence` JSONB column. Keep this lightweight but legally useful.

```jsonc
{
  // Screenshots of the infringing page (stored as URLs to Supabase Storage)
  "screenshots": [
    {
      "url": "https://xxx.supabase.co/storage/v1/object/evidence/...",
      "captured_at": "2026-02-15T10:30:00Z",
      "description": "Telegram channel post sharing course download link"
    }
  ],
  
  // Short text excerpts that matched (keep under 100 chars each)
  "matched_excerpts": [
    "Complete Day Trading Masterclass - Free Download",
    "Original price $297 - get it free here"
  ],
  
  // File hash matches (if applicable)
  "hash_matches": [],
  
  // URL redirect chain (shows the path to infringing content)
  "url_chain": [
    "https://t.me/freecourses/12345",
    "https://mega.nz/file/abc123"
  ],
  
  // Detection metadata
  "detection_metadata": {
    "scan_id": "uuid",
    "detection_method": "keyword_search",
    "search_query": "day trading masterclass free download telegram",
    "search_engine": "serpapi_google",
    "result_rank": 3
  }
}
```

### Evidence Storage

- Screenshots: Capture with a serverless screenshot service (or Puppeteer on Railway worker) and store in Supabase Storage
- For MVP, store the URL and basic metadata; don't worry about building a full screenshot pipeline yet
- The structure is designed so you can export it as a PDF "Ownership Packet" later

---

## Infrastructure Profile Lookup

The `infrastructure` JSONB on infringements stores hosting/registrar data for DMCA routing.

```jsonc
{
  "hosting_provider": "Namecheap",
  "registrar": "Namecheap, Inc.",
  "cdn": "Cloudflare",           // detected from response headers
  "nameservers": ["dns1.registrar-servers.com"],
  "abuse_contact": "abuse@namecheap.com",
  "lookup_method": "whois",
  "looked_up_at": "2026-02-15T10:30:00Z"
}
```

**How to populate:**
- WHOIS API call on the domain extracted from `source_url`
- Check HTTP response headers for `cf-ray` (Cloudflare), `x-served-by` (Fastly), etc.
- Maintain a lookup table of common hosting providers → abuse email addresses (this is a static JSON file you maintain, not a database table)

---

## API Routes Map

```
app/api/
├── auth/
│   └── callback/route.ts          # Supabase auth callback
├── products/
│   ├── route.ts                   # GET (list), POST (create + normalize)
│   └── [id]/route.ts              # GET, PATCH, DELETE
├── scan/
│   ├── route.ts                   # POST (trigger manual scan)
│   ├── status/[id]/route.ts       # GET (scan progress polling)
│   └── results/[id]/route.ts      # GET (scan results)
├── infringements/
│   ├── route.ts                   # GET (list with filters)
│   ├── [id]/route.ts              # GET, PATCH (status transitions)
│   └── [id]/evidence/route.ts     # GET (evidence packet), POST (add evidence)
├── enforcement/
│   ├── route.ts                   # POST (create action), GET (list)
│   ├── [id]/route.ts              # GET, PATCH (status updates)
│   ├── generate-notice/route.ts   # POST (generate DMCA/C&D text)
│   └── send/route.ts              # POST (submit notice)
├── dashboard/
│   └── stats/route.ts             # GET (aggregated stats for dashboard)
├── webhooks/
│   └── stripe/route.ts            # POST (Stripe subscription webhooks)
└── cron/
    ├── scheduled-scans/route.ts   # Triggered by Vercel Cron
    └── case-checks/route.ts       # Triggered by Vercel Cron
```

---

## Cron Jobs (Vercel Cron)

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/scheduled-scans",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/cron/case-checks",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

- **scheduled-scans**: Runs daily at 6 AM UTC. Queries products with active subscriptions that are due for a scan (weekly for Starter, daily for Pro, etc.)
- **case-checks**: Runs every 6 hours. Checks enforcement action deadlines, verifies if URLs are still live, triggers escalations.

---

## DMCA Notice Templates

Store in `lib/templates/` as TypeScript template literal functions.

### Required DMCA Elements (17 U.S.C. § 512(c)(3))

Every DMCA notice MUST include:
1. Identification of the copyrighted work
2. Identification of the infringing material + its location (URL)
3. Contact information of the complaining party
4. Statement of good faith belief
5. Statement of accuracy under penalty of perjury
6. Physical or electronic signature

### Template Variables

```typescript
interface DMCAVariables {
  // Creator info (from profile)
  owner_name: string;
  owner_email: string;
  owner_company?: string;
  
  // Product info
  product_name: string;
  product_url: string;
  product_description: string;
  
  // Infringement info
  infringing_url: string;
  platform_name: string;
  
  // Generated
  date: string;
  notice_id: string;
}
```

---

## Dashboard Stats Query

For the main dashboard "IP Health Score" view:

```sql
-- Dashboard summary for a user
SELECT
  COUNT(*) FILTER (WHERE status NOT IN ('archived', 'resolved')) AS active_infringements,
  COUNT(*) FILTER (WHERE status = 'resolved') AS resolved_count,
  COUNT(*) FILTER (WHERE risk_level = 'critical' AND status NOT IN ('archived', 'resolved')) AS critical_count,
  COALESCE(SUM(est_revenue_loss) FILTER (WHERE status NOT IN ('archived', 'resolved')), 0) AS revenue_at_risk,
  COALESCE(SUM(est_revenue_loss) FILTER (WHERE status = 'resolved'), 0) AS revenue_protected,
  COUNT(DISTINCT platform) FILTER (WHERE status NOT IN ('archived', 'resolved')) AS platforms_affected,
  (SELECT COUNT(*) FROM enforcement_actions WHERE user_id = $1 AND status IN ('sent', 'acknowledged', 'action_taken', 'removed')) AS total_actions_taken,
  (SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - detected_at)) / 3600) FROM infringements WHERE user_id = $1 AND resolved_at IS NOT NULL) AS avg_hours_to_resolution
FROM infringements
WHERE user_id = $1;
```

---

## Environment Variables Needed

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Scanning
SERPAPI_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_API_ID=
TELEGRAM_API_HASH=

# WHOIS
WHOIS_API_KEY=

# Search suppression
GOOGLE_DMCA_API_KEY=

# Email (for sending DMCA notices)
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=
CRON_SECRET=
```

---

## File Structure Reference

```
productguard/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Dashboard shell with sidebar
│   │   ├── page.tsx                # Main dashboard (IP Health Score)
│   │   ├── products/
│   │   │   ├── page.tsx            # Product list
│   │   │   └── [id]/page.tsx       # Product detail + scan history
│   │   ├── infringements/
│   │   │   ├── page.tsx            # All infringements with filters
│   │   │   └── [id]/page.tsx       # Infringement detail + enforcement
│   │   ├── scan/
│   │   │   └── page.tsx            # Manual scan trigger
│   │   └── settings/
│   │       └── page.tsx            # Account, billing, enforcement prefs
│   ├── api/                        # See API Routes Map above
│   ├── layout.tsx
│   └── page.tsx                    # Marketing landing page
├── components/
│   ├── ui/                         # Reusable primitives (Button, Card, Badge, etc.)
│   └── dashboard/                  # Feature components (InfringementRow, ScanProgress, etc.)
├── lib/
│   ├── modules/                    # The 5 core modules
│   │   ├── product-normalizer.ts
│   │   ├── scanner.ts
│   │   ├── matcher.ts
│   │   ├── notice-generator.ts
│   │   └── case-tracker.ts
│   ├── templates/                  # DMCA / C&D notice templates
│   ├── supabase/
│   │   ├── client.ts               # Browser client
│   │   ├── server.ts               # Server client
│   │   └── admin.ts                # Service role client (for cron/webhooks)
│   ├── stripe/
│   │   └── config.ts
│   └── utils/
│       ├── scoring.ts              # Severity scoring rubric
│       ├── whois.ts                # WHOIS lookup helper
│       └── url.ts                  # URL normalization/extraction
├── supabase/
│   └── migrations/
│       └── 001_updated_schema.sql  # The migration from this document
├── public/
├── vercel.json                     # Cron config
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Implementation Priority

When building, follow this order:

1. **Database first** — Run the migration, verify tables/triggers in Supabase dashboard
2. **Auth + profiles** — Supabase Auth setup, profile creation on signup
3. **Product CRUD** — Add/edit/delete products with normalizer running on create
4. **Manual scan flow** — The "free scan" funnel: enter product → run scan → see results
5. **Infringement display** — Dashboard showing detected infringements with status badges
6. **DMCA generation** — Generate notice from template, display for copy/send
7. **Enforcement tracking** — Status updates on sent notices, deadline monitoring
8. **Stripe integration** — Subscription gating for scan frequency and features
9. **Scheduled scans** — Cron-based rescanning for paying subscribers
10. **Escalation logic** — Automated routing through the enforcement chain

---

*ProductGuard.ai — Protecting what creators build.*
