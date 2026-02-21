# Integration Audit Report — ProductGuard.ai

**Auditor:** API & Integration Hardener Agent
**Date:** Feb 20, 2026
**Scope:** All external API integrations — reliability, timeouts, retry logic, caching, cost efficiency

---

## External Integrations Summary

| Integration | Provider | Purpose | Timeout | Retry | Caching | Cost Model |
|-------------|----------|---------|---------|-------|---------|------------|
| Search API | Serper.dev | Web search for piracy detection | 15s | No | Delta detection (DB) | ~$0.004/query |
| AI Filter | OpenAI | Infringement classification | 30s | No | No (unique per URL) | ~$0.0003/URL (gpt-4o-mini) |
| Email (DMCA) | Resend | DMCA notice delivery | SDK default | Queue: 3x/5min | No | $0.001/email |
| Email (Notifications) | Resend | User alerts & admin alerts | SDK default | No | No | $0.001/email |
| Payments | Stripe | Subscriptions & billing | 15s | 2x auto | N/A | 2.9% + $0.30/txn |
| WHOIS | WhoisXML API | Domain registration lookups | 10s | No | 30-day in-memory | ~$0.04/lookup |
| CRM | GoHighLevel | Marketing automation | 10s | No | No | Flat monthly |
| WHOIS Bulk | WhoisXML API | Batch domain lookups | 15s/30s | No | Results cached after parse | ~$0.02/domain |

---

## Fixes Applied

### Critical — Timeout Protection

| # | File | Change |
|---|------|--------|
| T1 | `src/lib/whois/whois-client.ts` | Added 10s timeout to `lookupWhois()` fetch |
| T2 | `src/lib/whois/whois-client.ts` | Added 15s timeout to `submitBulkWhoisRequest()` fetch |
| T3 | `src/lib/whois/whois-client.ts` | Added 30s timeout to `downloadBulkWhoisResults()` fetch |
| T4 | `src/lib/ghl/ghl-client.ts` | Added 10s timeout to `request()` method (all GHL API calls) |
| T5 | `src/lib/ghl/ghl-client.ts` | Added 10s timeout to `triggerWorkflow()` webhook call |
| T6 | `src/lib/ai/client.ts` | Added 30s timeout to OpenAI client constructor |

**Why:** Without timeouts, a hanging external API call can block a Vercel serverless function for the full 60s limit, consuming compute and leaving users waiting. Serper.dev already had a 15s timeout — now all integrations are covered.

### High — Stripe Webhook Deduplication

| # | File | Change |
|---|------|--------|
| D1 | `src/app/api/webhooks/stripe/route.ts` | Added in-memory event ID dedup with 5-min TTL |

**Why:** Stripe retries webhooks when the handler returns 500 (which happens on DB errors via `hasCriticalError`). Without deduplication, a retried `checkout.session.completed` event can create duplicate subscription records. The dedup map tracks `event.id` for 5 minutes — long enough to cover Stripe's immediate retry window.

**Limitation:** Per-instance only on Vercel (each cold start gets a fresh map). This is acceptable because Stripe's own idempotency handles most edge cases — our dedup is a defense-in-depth layer.

### High — Stripe SDK Hardening

| # | File | Change |
|---|------|--------|
| S1 | `src/lib/stripe/index.ts` | Added `timeout: 15000` and `maxNetworkRetries: 2` to Stripe constructor |

**Why:** Stripe SDK defaults to no timeout and 1 retry. Adding explicit timeout prevents hanging calls. 2 retries with Stripe's built-in idempotent retry logic safely handles transient network failures.

---

## Integration Details

### 1. Serper.dev (Search API)

**File:** `src/lib/scan-engine/serp-client.ts`

| Aspect | Status | Details |
|--------|--------|---------|
| Timeout | Good | 15s per call via `AbortSignal.timeout()` |
| Budget cap | Good | 75 calls/scan hard limit, queries trimmed to budget |
| Rate limiting | Good | 150ms minimum between calls, batch concurrency of 3 |
| Error handling | Good | Errors logged with diagnostics, empty results returned |
| Caching | Good | Delta detection in scan engine prevents re-processing known URLs |
| Retry | None | Acceptable — budget-limited, each failed query reduces noise |

**Cost per scan:** ~$0.30 (75 queries x $0.004) — capped regardless of product keyword count.

### 2. OpenAI (AI Classification)

**File:** `src/lib/ai/client.ts`, `src/lib/ai/infringement-filter.ts`

| Aspect | Status | Details |
|--------|--------|---------|
| Timeout | Fixed | 30s via SDK `timeout` option |
| Cost tracking | Good | Per-call cost logged to `system_logs` with token counts |
| Rate limiting | Good | 100ms delay between batch calls |
| Error handling | Good | Conservative fallback (confidence 0.5) on AI failures |
| Retry | None | Acceptable — fallback behavior is safe (flags for human review) |

**Cost per scan:** ~$0.02-0.05 (50-150 URLs x ~$0.0003 each with gpt-4o-mini).

**Pricing reference:**
- gpt-4o-mini: $0.15/1M input, $0.60/1M output
- gpt-4o: $2.50/1M input, $10.00/1M output (used for STANDARD/ADVANCED, currently same model)

### 3. Resend (Email)

**Files:** `src/lib/dmca/send-email.ts`, `src/lib/notifications/email.ts`, `src/lib/dmca/queue-processor.ts`

| Aspect | Status | Details |
|--------|--------|---------|
| Timeout | SDK default | Resend SDK manages its own HTTP timeouts internally |
| DMCA queue retry | Good | 3 attempts with 5-min backoff in `queue-processor.ts` |
| Notification retry | None | Acceptable — notifications are informational, not critical path |
| Rate limiting | Good | 200ms between batch DMCA emails |
| Preference checks | Good | All notifications check user opt-out preferences before sending |
| Logging | Good | All sends logged via `systemLogger.logEmail()` |

**Cost:** ~$0.001/email (Resend pricing). DMCA notices are the critical path — queue processor handles retries.

### 4. Stripe (Payments)

**Files:** `src/lib/stripe/index.ts`, `src/app/api/webhooks/stripe/route.ts`

| Aspect | Status | Details |
|--------|--------|---------|
| Timeout | Fixed | 15s via SDK `timeout` option |
| Retry | Fixed | 2 auto-retries via SDK `maxNetworkRetries` |
| Webhook auth | Good | `constructEvent()` with signature verification |
| Webhook retry | Good | Returns 500 on critical DB errors → Stripe retries over 72hrs |
| Webhook dedup | Fixed | In-memory event ID tracking with 5-min TTL |
| Error logging | Good | All webhook events logged via `systemLogger.logWebhook()` |

**Webhook events handled:** `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`.

### 5. WhoisXML API (WHOIS)

**File:** `src/lib/whois/whois-client.ts`

| Aspect | Status | Details |
|--------|--------|---------|
| Timeout | Fixed | 10s (single), 15s (bulk submit), 30s (bulk download) |
| Caching | Good | 30-day in-memory cache, 500-domain cap with LRU eviction |
| Cache stats | Good | Hit rate tracking via `getWhoisCacheStats()` |
| Rate limiting | Good | 1s delay between batch lookups |
| Error handling | Good | Returns null on failure, never throws |

**Cache limitation:** In-memory cache resets on Vercel cold starts and is not shared across instances. Acceptable for current scale — the 30-day TTL means most lookups for the same domain within a scan session will hit cache.

**Cost:** ~$0.04/lookup. Cache reduces repeat costs significantly.

### 6. GoHighLevel (CRM/Marketing)

**Files:** `src/lib/ghl/ghl-client.ts`, `src/lib/ghl/events.ts`

| Aspect | Status | Details |
|--------|--------|---------|
| Timeout | Fixed | 10s on all API calls and workflow triggers |
| Error handling | Good | All event tracking wrapped in try/catch, never breaks main flow |
| Retry | None | Acceptable — GHL events are marketing/tracking, not critical path |
| Auth | Good | Bearer token auth on all requests |

**Design decision:** GHL failures are silently logged and never propagate to users. This is intentional — marketing automation should never block scan results, DMCA sending, or subscription management.

---

## Remaining Recommendations (Future)

### Medium Priority

| # | Category | Issue | Recommendation |
|---|----------|-------|----------------|
| M1 | WHOIS cache | In-memory only, lost on cold start | Consider Supabase cache table for cross-instance persistence |
| M2 | Resend notifications | No retry on user notifications | Add 1-retry for high-severity alerts (P0 infringement, payment failed) |
| M3 | OpenAI | No retry on transient failures | Add 1-retry with 2s delay for 429/500 responses |
| M4 | Health checks | Only OpenAI has a health check | Add `/api/health` endpoint checking all external services |

### Low Priority

| # | Category | Issue |
|---|----------|-------|
| L1 | Circuit breakers | No circuit breaker pattern on any integration. At current scale (<100 users), the cost/complexity isn't justified. |
| L2 | GHL deduplication | No dedup on event tracking — same event can fire twice. Acceptable since GHL upserts contacts by email. |
| L3 | Structured logging | External API calls logged with `console.log/error` — consider migrating to `systemLogger` for all integrations. |

---

## Cost Summary (Per Scan)

| Component | Est. Cost | Notes |
|-----------|-----------|-------|
| Serper.dev queries | ~$0.30 | 75 queries max |
| OpenAI classification | ~$0.03 | gpt-4o-mini, ~100 URLs |
| WHOIS lookups | ~$0.00-0.40 | 0-10 unique domains, cached |
| Resend notifications | ~$0.002 | 1-2 emails if threats found |
| **Total per scan** | **~$0.33-0.73** | |

**Monthly projection (100 active users, 2 scans/week):**
- Serper.dev: ~$240/mo
- OpenAI: ~$24/mo
- WHOIS: ~$30/mo (with caching)
- Resend: ~$5/mo
- **Total: ~$300/mo** at 100 users

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/whois/whois-client.ts` | Added timeouts to all 3 fetch calls (10s, 15s, 30s) |
| `src/lib/ghl/ghl-client.ts` | Added 10s timeout to `request()` and `triggerWorkflow()` |
| `src/lib/ai/client.ts` | Added 30s timeout to OpenAI SDK constructor |
| `src/lib/stripe/index.ts` | Added 15s timeout and 2 max retries to Stripe SDK |
| `src/app/api/webhooks/stripe/route.ts` | Added webhook event deduplication (in-memory, 5-min TTL) |
