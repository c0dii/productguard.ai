# ProductGuard.ai — Project Instructions

## Product Overview

ProductGuard.ai is a SaaS platform that helps digital product creators protect their intellectual property from online piracy. Creators register their products (courses, trading indicators, software, templates, ebooks, etc.), and the platform monitors the web for unauthorized copies, then enables one-click DMCA takedowns and cease & desist letters.

**Target Audience:** Solo digital product creators and small product businesses — people selling on Teachable, Kajabi, Thinkific, Gumroad, Etsy, Creative Market, TradingView, NinjaTrader, etc.

**Core Value Proposition:** The only affordable, self-service, AI-powered piracy protection platform built specifically for the creator economy. Enterprise solutions cost $1,000+/month. Mid-market services start at $199/month with sales-call onboarding. Basic DMCA tools are manual and reactive. ProductGuard.ai fills the gap with automated monitoring and one-click enforcement starting at $29/month.

**Domain:** productguard.ai (owned)

**Owner:** Cody / Ease Web Development (Odessa, Texas)

---

## Tech Stack

- **Frontend/App:** Next.js (App Router) deployed on Vercel
- **Database & Auth:** Supabase (PostgreSQL + Supabase Auth)
- **Styling:** Tailwind CSS
- **Scanning Engine:** Serverless functions on Vercel for lightweight scans; Railway or Render worker for longer background jobs
- **Key APIs:**
  - SerpAPI or Google Custom Search API — web piracy detection
  - Telegram Bot API + Telethon — Telegram channel/group monitoring
  - Google URL Removal API — search de-indexing
  - WHOIS API — hosting provider identification for DMCA routing
- **Payments:** Stripe (subscriptions + one-time add-ons)
- **Email:** Resend or Postmark (transactional emails, scan reports, takedown confirmations)

---

## Business Model & Pricing Tiers

### Scout (Free)
- 1 product
- One-time piracy scan on signup
- Basic dashboard showing results
- DMCA template generator (manual use)
- Purpose: Lead generation funnel — seeing pirated copies converts to paid

### Starter ($29–49/month)
- Up to 5 products
- Weekly automated monitoring (Telegram, Google, cyberlockers)
- Dashboard with active infringements
- One-click DMCA takedown generation
- Automated Google search de-indexing submissions

### Pro ($99–149/month)
- Up to 25 products
- Daily monitoring
- Cease & desist letter generation (customizable templates)
- Direct submissions to hosting providers and registrars
- Telegram channel monitoring and takedown
- Monthly revenue-impact reports

### Business ($299–499/month)
- Unlimited products
- Real-time monitoring
- White-label reporting
- API access
- Multi-brand management
- Priority support

### Add-On Revenue Streams
- Pay-per-use legal documents ($15–49 each)
- Copyright registration assistance ($49–149)
- Trust badge / verification seal ($9.99/month add-on or included in Pro+)
- Attorney referral network (15–25% referral fee)

---

## Core Architecture

### Database Schema (Supabase/PostgreSQL)

**users** — Supabase Auth handles this, extended with a profiles table
- id, email, full_name, company_name, plan_tier, stripe_customer_id, created_at

**products** — Creator's registered digital products
- id, user_id, name, url, price, type (course/indicator/software/template/ebook/other), keywords[], description, created_at

**scans** — Individual scan runs
- id, product_id, user_id, status (pending/running/completed/failed), started_at, completed_at, infringement_count, est_revenue_loss

**infringements** — Individual piracy detections
- id, scan_id, product_id, platform (telegram/google/cyberlocker/torrent/discord/forum/social), source_url, risk_level (critical/high/medium/low), type (channel/group/bot/indexed_page/direct_download/torrent/server/post), audience_size, est_revenue_loss, detected_at, status (active/takedown_sent/removed/disputed)

**takedowns** — DMCA and legal actions taken
- id, infringement_id, user_id, type (dmca/cease_desist/google_deindex), status (draft/sent/acknowledged/removed/failed), sent_at, resolved_at, recipient_email, notice_content

**subscriptions** — Stripe subscription data
- id, user_id, stripe_subscription_id, plan_tier, status, current_period_start, current_period_end

---

## Phased Build Plan

### Phase 1: MVP & Validation (Months 1–3)
- Next.js project scaffolding with Supabase auth
- Landing page with email capture
- Free piracy scan tool (core acquisition funnel)
- Initial scan engine covering: Telegram (public channels), Google Search, top cyberlockers
- One-click DMCA notice generation (template-based)
- Basic dashboard showing scan results
- Stripe integration for Starter tier

### Phase 2: Launch & Early Growth (Months 4–8)
- Automated weekly/daily monitoring (cron-based rescans)
- Expanded platform coverage (Discord, torrent sites, forums)
- Cease & desist letter generation
- Revenue impact reporting
- Google search de-indexing automation
- Pro tier launch
- Creator community marketing

### Phase 3: Scale & Expansion (Months 9–18)
- Business/Agency tier with multi-brand management
- Trust badge system
- Attorney referral network
- API for platform integrations
- White-label reporting
- AI-powered content matching (beyond keyword search)

---

## Design System

### Color Palette
- Background: #0B0F1A
- Surface: #111827
- Surface Light: #1A2236
- Accent (Primary): #00D4AA
- Accent Dim: rgba(0,212,170,0.12)
- Danger/Alert: #FF4757
- Warning: #FFB830
- Text Primary: #E8ECF1
- Text Muted: #7B8CA8
- Border: #1E2A3F

### Typography
- Primary font: DM Sans
- Monospace (code/data): JetBrains Mono
- Dark theme throughout — the product protects against threats, so the dark aesthetic reinforces security and trust

### UI Principles
- Creator-first: No legal jargon, clean and modern, mobile-friendly
- Immediate value: Free scan shows results on first visit
- Action-oriented: Every infringement has a clear next action (takedown button)
- Quantified impact: Always show estimated revenue loss and revenue protected

---

## Competitive Positioning

### Key Differentiators (The "Five Pillars")
1. **Creator-First UX** — Built for someone selling Notion templates or TradingView indicators, not for a legal department
2. **Telegram-First Monitoring** — Over 40% of creator-economy piracy happens on Telegram; no affordable competitor monitors it
3. **AI-Powered Discovery** — Content matching across web, Telegram, Discord, torrents at the $29–149/month price point
4. **One-Click Enforcement** — Detect → identify abuse contact → generate DMCA → submit → track, all from one button
5. **Revenue Impact Reporting** — Show creators the dollar value of piracy and protection ROI

### Main Competitors
- **Red Points** — Enterprise, $1K+/mo, AI + 10yr data
- **Onsist** — SMB, $199/mo, strong e-learning expertise
- **DMCA.com** — $10/mo DIY toolkit, no monitoring
- **DMCAForce** — $150/mo, full enforcement but not creator-specific
- **BranditScan** — $45/mo, creator-focused but narrower coverage

---

## Coding Conventions

- Use TypeScript throughout
- Next.js App Router (not Pages Router)
- Server Components by default, "use client" only when needed
- Supabase client initialized via @supabase/ssr for proper server/client handling
- API routes in app/api/ for scan engine endpoints
- Tailwind CSS for styling (matching the design system colors above)
- Use Zod for input validation
- Use React Server Actions where appropriate for form submissions
- Keep components modular: /components/ui/ for reusable primitives, /components/dashboard/ for feature-specific components
- Environment variables prefixed: NEXT_PUBLIC_ for client-safe, otherwise server-only

---

## Important Context

- Market research document and MVP prototype are uploaded to this project's knowledge base — reference them for detailed competitive analysis, pricing rationale, and UI patterns
- The MVP prototype (React JSX file) contains the complete scan tool UX with simulated data — use it as the design spec for the real implementation
- Cody has experience with Vercel and web development through Ease Web Development (SEO and digital marketing agency)
- This is a greenfield build — no legacy code to work around
