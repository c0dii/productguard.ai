# Security Audit Report — ProductGuard.ai

**Auditor:** Security & Compliance Auditor Agent
**Date:** Feb 20, 2026
**Scope:** Authentication, authorization, RLS policies, input validation, service role usage, sensitive data handling, cron/webhook security

---

## Legend

| Severity | Meaning |
|----------|---------|
| Critical | Exploitable vulnerability — data exposure, privilege escalation, or injection |
| High | Significant auth/authz gap or unsafe data flow |
| Medium | Hardening opportunity or inconsistency |
| Low | Best-practice recommendation |

---

## Fixes Applied

### Critical Fixes

1. **SQL injection in admin marketing prospects** (`api/admin/marketing/prospects/route.ts`)
   - **Before:** User-supplied `search` param injected directly into PostgREST `.or()` filter string. A search like `test,id.eq.1` could inject arbitrary filter conditions.
   - **After:** Search input sanitized — PostgREST-special characters (`, . ( ) " ' \`) stripped before building the filter string.

2. **Marketing prospects PATCH: unauthenticated + client-supplied user_id** (`api/marketing/prospects/route.ts`)
   - **Before:** PATCH endpoint had no authentication. `user_id` accepted from request body — any caller could create attribution records (exclusions, takedowns) under any user's account.
   - **After:** Requires `supabase.auth.getUser()` authentication. `user_id` derived from session, never from request body.

3. **Marketing prospects GET: no input validation** (`api/marketing/prospects/route.ts`)
   - **Before:** Accepted any string as `id` parameter, queried with admin client.
   - **After:** UUID format validation added. Non-UUID values rejected with 400.

### High Fixes

4. **Takedowns check-url: unchecked infringement status update** (`api/takedowns/[id]/check-url/route.ts`)
   - **Before:** Infringement status update to `removed` (line 59-61) had no error check — takedown could show "removed" while infringement record stayed active.
   - **After:** Error check added with console logging.

5. **Product detail page: unnecessary admin client** (`dashboard/products/[id]/page.tsx`)
   - **Before:** Used `createAdminClient()` to query `product_infringement_timeline` materialized view despite the view already being granted to `authenticated` role.
   - **After:** Uses user-scoped `supabase` client. Product ownership already verified above via RLS.

---

## Remaining Issues (Documented for Future)

### Critical — Requires Supabase Console / Migration

| # | Category | Location | Issue | Recommended Fix |
|---|----------|----------|-------|-----------------|
| C1 | Storage | `evidence-screenshots` bucket | Bucket may be publicly readable. Evidence screenshots (page captures, blockchain timestamps) should be private. | Set bucket to private. Add storage policy: `SELECT` only for `auth.uid() = owner_id` or admin. |
| C2 | Storage | `product-images` bucket | Bucket is publicly readable. Acceptable for product images but should be documented as intentional. | Document as intentional — product images are displayed in UI. |

### High

| # | Category | File | Issue | Recommended Fix |
|---|----------|------|-------|-----------------|
| H1 | Auth consistency | `api/dmca/process-queue/route.ts` | Uses non-standard `x-cron-secret` header for cron auth. All other cron routes use `Authorization: Bearer <secret>`. | Standardize to `Authorization` header pattern. |
| H2 | Error handling | `api/webhooks/ghl/route.ts` | 12+ Supabase mutations (update/insert) with no error checking. Webhook returns 200 even if all DB writes fail. | Add error tracking similar to Stripe webhook pattern. |
| H3 | Error handling | `api/marketing/prospects/route.ts` | Multiple `.insert()`, `.upsert()`, `.update()` calls with no error checking in PATCH handler. | Add error checks on DB mutations. |
| H4 | Input validation | Multiple API routes | 7 routes accept `request.json()` without Zod schema validation. Zod schemas exist in `lib/utils/validation.ts` but are not used consistently. | Apply Zod validation at API boundaries. |

### Medium

| # | Category | File | Issue |
|---|----------|------|-------|
| M1 | RLS | Materialized views | Materialized views (`product_infringement_timeline`, etc.) granted to `authenticated` role. PostgreSQL doesn't support RLS on materialized views — all authenticated users can read all rows. Application-level filtering mitigates this. |
| M2 | Type safety | `lib/enforcement/infrastructure-profiler.ts` | 12 `as any` casts for WHOIS data — should have `WhoisRecord` type. |
| M3 | Env validation | Startup | No Zod schema for environment variable validation at startup. Runtime errors only when vars are first accessed. Consider `@t3-oss/env-nextjs`. |
| M4 | Rate limiting | `api/email-preferences/route.ts` | Token-based auth allows enumeration attempts. No rate limiting on token lookups. |
| M5 | Error handling | `api/infringements/[id]/reassign/route.ts` | Audit trail insert (status_transitions) in try/catch — correct pattern, but should log structured metadata. |

### Low

| # | Category | Issue |
|---|----------|-------|
| L1 | Type safety | ~45 `as any` assertions across codebase. Most for Supabase join relations. |
| L2 | Logging | 515 console statements. Structured prefixes in place — consider log levels for production. |
| L3 | Headers | No `X-Content-Type-Options`, `X-Frame-Options`, or CSP headers configured. Next.js defaults provide some protection. |

---

## Authentication & Authorization Assessment

### What's Working Well

- **Consistent auth pattern**: All 62 user-facing API routes check `supabase.auth.getUser()` and return 401
- **Admin routes**: Consistently check `profile.is_admin` after auth (`requireAdmin()` helper in admin routes)
- **RLS as safety net**: Supabase Row Level Security provides database-level access control on all major tables
- **Webhook verification**: Stripe uses `constructEvent()` signature verification. GHL uses HMAC via `verifyGHLWebhook()`
- **Cron auth**: All cron routes use `timingSafeEqual()` for constant-time secret comparison
- **User-scoped queries**: Product, infringement, and takedown queries consistently filter by `user_id`

### Service Role (`createAdminClient`) Usage

| Context | Count | Justified |
|---------|-------|-----------|
| Webhook handlers (Stripe, GHL) | ~15 | Yes — no user session in webhooks |
| Cron jobs (daily, monthly, deadlines) | ~20 | Yes — no user session in cron |
| Background jobs (scan engine, DMCA queue) | ~30 | Yes — system-level operations |
| Admin API routes | ~20 | Yes — admin verified before use |
| Email preferences (token auth) | ~5 | Yes — token-based auth, no session |
| Marketing alerts pages | ~5 | Partially — PATCH now uses session auth |

**Total:** ~95 usages. All reviewed — no unnecessary privilege escalation found after fixes.

---

## Input Validation Assessment

### Strong Points

- **File upload validation**: `ProductImageUpload.tsx` validates file type, size (5MB), and dimensions
- **DMCA emails**: Sent as plain text via Resend — no XSS risk in email content
- **UUID parameters**: Route params are UUIDs, limiting injection surface
- **Zod schemas exist**: `lib/utils/validation.ts` has schemas for products, scans, takedowns, auth

### Gaps

- **PostgREST filter injection**: Fixed in admin/marketing/prospects (see Fix #1)
- **Inconsistent Zod usage**: Schemas defined but not applied to all API routes
- **URL validation**: Some routes accept URLs without validation (e.g., `infringing_url` in DMCA routes)

---

## Compliance Notes (DMCA / 17 U.S.C. §512)

- DMCA notice generation follows §512(c)(3) requirements
- Evidence capture includes blockchain timestamping for legal defensibility
- `Promise.allSettled` ensures GHL tracking failure doesn't prevent evidence capture (fixed in Code Health audit)
- Cron secret for DMCA queue processing uses timing-safe comparison

---

## Files Changed

| File | Change |
|------|--------|
| `src/app/api/admin/marketing/prospects/route.ts` | Sanitize search input in `.or()` PostgREST filter |
| `src/app/api/marketing/prospects/route.ts` | Add auth to PATCH, derive user_id from session, UUID validation on GET |
| `src/app/api/takedowns/[id]/check-url/route.ts` | Add error check on infringement status update |
| `src/app/dashboard/products/[id]/page.tsx` | Remove unnecessary `createAdminClient` — use user-scoped client |
