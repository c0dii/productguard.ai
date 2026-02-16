# ProductGuard.ai

AI-powered piracy protection SaaS for digital product creators.

**Owner:** Cody / Ease Web Development (Odessa, Texas)
**Domain:** productguard.ai (owned)
**Status:** Phase 1 MVP scaffold complete — auth, DB schema, dashboard, scan API, Stripe billing all scaffolded. Scan engine has stubs ready for real API integration.

## Tech Stack

- **Framework:** Next.js 15 (App Router, TypeScript, Server Components by default)
- **Database & Auth:** Supabase (PostgreSQL + Supabase Auth + RLS)
- **Styling:** Tailwind CSS (design system in tailwind.config.ts)
- **Payments:** Stripe (subscriptions + webhooks)
- **Email:** Resend
- **Deployment:** Vercel
- **Scan APIs (to integrate):** SerpAPI, Telegram Bot API + Telethon, WHOIS API, Google URL Removal API

## Commands

- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run lint` — ESLint check
- Supabase migration: run `supabase/migrations/00001_initial_schema.sql` via Supabase SQL Editor

## Project Structure

```
src/
├── app/
│   ├── api/scan/                  # POST — trigger piracy scan
│   ├── api/webhooks/stripe/       # Stripe webhook handler
│   ├── auth/login/                # Login page (client component)
│   ├── auth/signup/               # Signup page (client component)
│   ├── auth/callback/             # OAuth + email confirmation handler
│   ├── dashboard/                 # Protected dashboard layout + overview
│   ├── dashboard/products/        # Product CRUD
│   ├── dashboard/scans/           # Scan history
│   ├── dashboard/takedowns/       # DMCA tracking
│   └── page.tsx                   # Marketing landing page
├── components/dashboard/          # Dashboard-specific components
├── lib/
│   ├── supabase/client.ts         # Browser Supabase client
│   ├── supabase/server.ts         # Server + admin Supabase clients
│   ├── stripe/index.ts            # Checkout + billing portal helpers
│   ├── scan-engine/index.ts       # Scan orchestrator + platform scanner stubs
│   └── utils/
│       ├── validation.ts          # Zod schemas
│       └── dmca-templates.ts      # DMCA + C&D notice generators
├── types/index.ts                 # All TypeScript types + plan limits
├── styles/globals.css             # Tailwind + custom component classes
└── middleware.ts                   # Auth session refresh + route protection
```

## Database (Supabase)

7 tables with RLS enabled on all: `profiles`, `products`, `scans`, `infringements`, `takedowns`, `subscriptions`, `scan_schedules`. Auto-trigger creates profile on signup. `updated_at` triggers on profiles, products, takedowns, subscriptions. Dashboard stats view: `user_dashboard_stats`.

Custom enums: `plan_tier`, `product_type`, `scan_status`, `risk_level`, `platform_type`, `infringement_type`, `infringement_status`, `takedown_type`, `takedown_status`, `subscription_status`.

## Design System

Dark theme throughout. Colors defined in `tailwind.config.ts` under `pg.*`:
- Background: #0B0F1A, Surface: #111827, Accent: #00D4AA, Danger: #FF4757, Warning: #FFB830
- Fonts: DM Sans (primary), JetBrains Mono (code/data)
- Component classes in globals.css: `.btn-glow`, `.card`, `.card-glow`, `.badge-critical/high/medium/low`, `.input-field`

## Code Conventions

- TypeScript strict mode throughout
- Next.js App Router (NOT Pages Router)
- Server Components by default, `"use client"` only when needed
- Supabase client via `@supabase/ssr` (see lib/supabase/)
- Use `createClient()` from server.ts in Server Components/API routes
- Use `createClient()` from client.ts in Client Components
- Use `createAdminClient()` only for trusted server operations (bypasses RLS)
- Zod for all input validation
- Tailwind for styling (use the pg.* design tokens)
- Keep components modular: `/components/ui/` for primitives, `/components/dashboard/` for features

## Business Model

4 tiers: Scout (free), Starter ($29-49/mo), Pro ($99-149/mo), Business ($299-499/mo). Limits defined in `PLAN_LIMITS` in `src/types/index.ts`. Stripe handles billing via webhooks that sync plan_tier to profiles table.

## What's Done

- Full project scaffold with all config files
- Supabase schema with 7 tables, RLS, triggers, views
- Auth flow (login, signup, OAuth, callback, middleware protection)
- Dashboard with sidebar nav, overview stats, product CRUD, scan history, takedowns page
- Scan API route with auth, validation, duplicate prevention
- Stripe webhook handler for subscription lifecycle
- DMCA + Cease & Desist template generators
- Scan engine orchestrator with platform scanner stubs

## What's Next (Phase 1 Remaining)

1. Run `npm install` and verify dev server starts
2. Create Supabase project and run the migration SQL
3. Create Stripe products/prices and configure webhook
4. Fill in `.env.local` from `.env.example`
5. Implement Google scan via SerpAPI (in `lib/scan-engine/index.ts`)
6. Implement Telegram scan via Telegram Bot API
7. Wire scan results back to DB (insert infringements, update scan status)
8. Build the one-click DMCA send flow (takedown creation from infringement row)
9. Email notifications via Resend on scan completion

## Key References

- Market research doc: see `ProductGuard_Market_Research.docx` in project knowledge
- MVP prototype (simulated scan UI): see `ProductGuard_MVP_Prototype.jsx` in project knowledge
- Competitive landscape: Red Points (enterprise), Onsist ($199/mo), DMCA.com ($10/mo DIY), BranditScan ($45/mo)
- Key differentiator: Telegram-first monitoring at creator-affordable pricing ($29-149/mo)
