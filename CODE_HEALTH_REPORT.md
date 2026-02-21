# Code Health Report — ProductGuard.ai

**Auditor:** Code Health Auditor Agent
**Date:** Feb 20, 2026
**Scope:** Error handling, dead code, performance, type safety, consistency, race conditions, environment config

---

## Legend

| Severity | Meaning |
|----------|---------|
| Critical | Can cause data loss, 500 errors, or security issues in production |
| High | Functional bug or significant dead code |
| Medium | Code quality issue worth tracking |
| Low | Cosmetic or minor cleanup |

---

## Summary of Fixes Applied

### Critical Fixes

1. **Stripe webhook returns 500 on DB failure** (`webhooks/stripe/route.ts`)
   - **Before:** All switch branches logged errors but always returned `{ received: true }` (200). If profile/subscription updates failed, Stripe considered the webhook processed and never retried.
   - **After:** Tracks `hasCriticalError` flag. Returns 500 on DB failures so Stripe retries the webhook up to 3 times over 72 hours.

2. **Verify route: GHL failure no longer kills evidence capture** (`infringements/[id]/verify/route.ts`)
   - **Before:** `Promise.all([capturePageEvidence, ghlTracking])` — if GHL tracking rejected, the entire evidence capture pipeline was skipped (blockchain timestamp, AI analysis, snapshot creation all lost).
   - **After:** Uses `Promise.allSettled`. GHL failure is logged but evidence capture continues independently.

3. **DMCA process-queue: timing-safe cron secret comparison** (`dmca/process-queue/route.ts`)
   - **Before:** `cronSecret === process.env.CRON_SECRET` — vulnerable to timing attacks.
   - **After:** Uses `crypto.timingSafeEqual()` matching the pattern in all other cron routes.

4. **Email unsubscribe: returns 500 on update failure** (`email-preferences/route.ts`)
   - **Before:** Unsubscribe update had no error check — returned success even if DB update failed, leaving user subscribed.
   - **After:** Checks error, returns 500 with error message on failure.

### High Fixes

5. **Subscription pause: error check on DB update** (`subscription/pause/route.ts`)
   - Added `{ error }` destructuring and logging on the `.update()` call that records pause state.

6. **Retention offer: error check on DB update** (`subscription/retention-offer/route.ts`)
   - Added error check on the `.update({ retention_offer_used: true })` call. Still returns success (Stripe discount was applied) but logs the DB failure.

7. **Admin export: empty catch block now logs error** (`admin/data/export/route.ts`)
   - Was swallowing errors silently. Now logs to console for observability.

8. **Deleted unused `plan-enforcement.ts`** (`lib/utils/plan-enforcement.ts`)
   - 5 exported functions, zero imports anywhere in codebase. Removed.

9. **Removed emoji decorations from Stripe webhook logs**
   - Replaced `✅` and `⚠️` in console.log messages with plain text for production log parsability.

---

## Remaining Issues (Not Fixed — Logged for Future)

### Medium Priority

| # | Category | File | Issue |
|---|----------|------|-------|
| M1 | Error handling | `marketing/prospects/route.ts` | Multiple `.insert()`, `.upsert()`, `.update()` calls with no error checking. Marketing pipeline records can fail silently. |
| M2 | Error handling | `webhooks/ghl/route.ts` | Multiple Supabase mutations without error checking in webhook handler. |
| M3 | Error handling | `infringements/[id]/reassign/route.ts` | Main `.update()` at line 81-84 has no error check — returns 200 OK on failure. |
| M4 | Error handling | `takedowns/[id]/check-url/route.ts` | Two `.update()` calls (lines 58-61) with no error checking. Takedown/infringement status can become inconsistent. |
| M5 | Dead code | `dashboard/scans/ScansTable.tsx` | 11-line commented-out "Est. Revenue Loss" column definition (lines 94-108). Should be removed or restored. |
| M6 | Dead code | `admin/UserManagementActions.tsx` | `handleImpersonate()` is a stub with `alert('coming soon')`. |
| M7 | Type safety | `lib/enforcement/infrastructure-profiler.ts` | 12 `as any` casts for WHOIS data — should have proper `WhoisRecord` type. |
| M8 | Type safety | `app/dashboard/page.tsx` | 3 `as any` casts for timeline/infringement relation data from Supabase joins. |
| M9 | Type safety | `lib/scan-engine/index.ts` | 4-5 `as any` casts for dynamic settings and scan result properties. |
| M10 | Env config | `.env.example` | 11 environment variables used in code but not documented in `.env.example` (see §Environment below). |
| M11 | Env config | No env validation | No Zod schema for environment variable validation at startup. Runtime errors only when vars are first accessed. |

### Low Priority

| # | Category | File | Issue |
|---|----------|------|-------|
| L1 | Type safety | Multiple files | ~45 `as any` type assertions across codebase. Most are for Supabase join relations and WHOIS data. |
| L2 | Type safety | Multiple files | ~21 non-null assertions (`!`). Most are for `process.env` and `Date.toISOString().split('T')[0]`. |
| L3 | Dead code | `lib/evidence/blockchain-timestamp.ts:255` | TODO: blockchain upgrade queue uses stub implementation. |
| L4 | Dead code | Multiple scan-engine files | 6 TODO comments for incomplete features (geolocation, monetization detection). |
| L5 | Console logs | 515 statements across codebase | All use structured prefixes — acceptable for beta. Consider log levels for production. |

---

## Environment Variables

### Missing from `.env.example`

| Variable | Used In | Purpose | Has Fallback |
|----------|---------|---------|-------------|
| `ADMIN_ALERT_EMAIL` | `notifications/email.ts` | Admin alert recipient | No |
| `ALERTS_BASE_URL` | `marketing/push-to-ghl.ts` | Alert page URLs | Yes (`alerts.productguard.com`) |
| `AI_CONFIDENCE_THRESHOLD` | `scan-engine/index.ts` | AI filter sensitivity | Yes (`0.40`) |
| `AUTO_ESCALATE_P0` | `cron/check-deadlines/route.ts` | Feature flag | Yes (disabled) |
| `DISABLE_AI_FILTER` | `scan-engine/index.ts` | Feature flag | Yes (disabled) |
| `DMCA_FROM_EMAIL` | `dmca/send-email.ts` | DMCA notice sender | Yes (`dmca@productguard.ai`) |
| `NOTIFICATION_FROM_EMAIL` | `notifications/email.ts` | Notification sender | Yes (`alerts@productguard.ai`) |
| `GHL_PIPELINE_ID` | `marketing/push-to-ghl.ts` | GHL pipeline | No |
| `GHL_PIPELINE_FIRST_STAGE_ID` | `marketing/push-to-ghl.ts` | GHL pipeline stage | No |
| `GHL_WEBHOOK_SECRET` | `marketing/ghl-client.ts` | Webhook HMAC verification | No |
| `STRIPE_RETENTION_COUPON_ID` | `subscription/retention-offer/route.ts` | Retention discount | No (returns 500) |

---

## Architecture Assessment

### What's Working Well

- **Consistent auth pattern**: All user-facing API routes check `supabase.auth.getUser()` and return 401
- **Admin routes**: Consistently check `profile.is_admin` after auth
- **RLS as safety net**: Supabase RLS provides database-level access control even if app-level checks fail
- **Structured logging**: Console statements use `[Component Name]` prefixes consistently
- **Error recovery in scans**: 4-minute hard timeout, delta detection, budget-aware query execution
- **Non-blocking background work**: `after()` pattern keeps user-facing responses fast

### Areas for Improvement

- **No env validation at startup**: Consider `@t3-oss/env-nextjs` or Zod schema
- **Inconsistent error checking on DB writes**: Some routes check `.update()` errors, many don't
- **WHOIS typing**: The infrastructure profiler needs proper types instead of `as any` everywhere
- **No structured logging framework**: Console.log works but won't scale to log aggregation services

---

## Files Changed

| File | Change |
|------|--------|
| `src/app/api/webhooks/stripe/route.ts` | Return 500 on critical DB failures; track `hasCriticalError`; remove emoji from logs |
| `src/app/api/infringements/[id]/verify/route.ts` | Replace `Promise.all` with `Promise.allSettled` for evidence capture |
| `src/app/api/dmca/process-queue/route.ts` | Use `timingSafeEqual` for cron secret comparison |
| `src/app/api/subscription/pause/route.ts` | Add error check on `.update()` call |
| `src/app/api/subscription/retention-offer/route.ts` | Add error check on `.update()` call |
| `src/app/api/email-preferences/route.ts` | Add error check on unsubscribe `.update()`, return 500 on failure |
| `src/app/api/admin/data/export/route.ts` | Log error in catch block instead of swallowing |
| `src/lib/utils/plan-enforcement.ts` | **DELETED** — zero imports, completely unused |
