# Metrics Audit — ProductGuard.ai

**Auditor:** Metrics Inspector Agent
**Date:** Feb 20, 2026
**Scope:** Every number, metric, chart, and data display in the application

---

## Legend

| Status | Meaning |
|--------|---------|
| ✅ | Accurate — query and display are correct |
| ❌ | Bug — produces wrong numbers, now fixed |
| ⚠️ | Warning — technically works but has caveats |

---

## 1. Dashboard Stats (`src/app/dashboard/page.tsx`)

| Metric | Source | Status | Notes |
|--------|--------|--------|-------|
| Total Products | `user_dashboard_stats.total_products` | ✅ | Uses `COUNT(DISTINCT pr.id)` — handles cartesian join correctly |
| Needs Review | Direct `infringements` count, `status = 'pending_verification'` | ✅ | Accurate direct query |
| Active Threats | Direct count, `status IN ('active','takedown_sent','disputed')` | ✅ | Correct status set |
| Takedowns Sent | `user_dashboard_stats.total_takedowns` | ✅ | Uses `COUNT(DISTINCT t.id)` — handles cartesian join correctly |
| Revenue at Risk | Direct SUM of `est_revenue_loss` from active/pending infringements | ✅ | Correctly avoids `user_dashboard_stats` view (cartesian join inflates SUM) |
| Revenue Protected | SUM of `est_revenue_loss` from `status = 'removed'` | ✅ | Direct query, accurate |
| Protection Score | `computeProtectionScore()` in `protection-score.ts` | ✅ | Logarithmic formula is sound — see §7 |
| Needs Review Trend | `pendingCount - pendingCountPrev` | ⚠️ | Shows "items added in last 30 days still pending" — not a period-over-period comparison. Label says "vs last 30d" which is slightly misleading |
| Active Threats Trend | `activeCount - activeCountPrev` | ⚠️ | Same as above |
| Takedowns Trend | `totalTakedowns - takedownsCountPrev` | ⚠️ | Same approach — shows recent activity, not a true trend comparison |
| Platform Breakdown | Direct query, excludes removed/false_positive/archived | ✅ | Correct status exclusion |
| Detection Sparkline | Direct query on `detected_at >= 30 days ago` | ✅ | Grouped by date correctly |
| Status Transitions (Timeline) | `status_transitions` table with `infringements!inner` join | ❌ **FIXED** | Was missing `user_id` filter — RLS mitigated data leak at DB level, but app-level had no filter. Added `.eq('infringements.user_id', user.id)` |

### `user_dashboard_stats` View (SQL)

| Column | Status | Notes |
|--------|--------|-------|
| `total_products` | ✅ | `COUNT(DISTINCT)` handles cartesian join |
| `total_scans` | ✅ | `COUNT(DISTINCT)` handles cartesian join |
| `total_infringements` | ✅ | `COUNT(DISTINCT)` handles cartesian join |
| `total_takedowns` | ✅ | `COUNT(DISTINCT)` handles cartesian join |
| `total_est_loss` | ⚠️ | `SUM(i.est_revenue_loss)` inflated by cartesian join (products × takedowns). **Not used by dashboard code** — code correctly queries revenue directly |

---

## 2. Infringement Tab Counts (`src/app/dashboard/infringements/page.tsx` + `InfringementsPageClient.tsx`)

| Tab | Server Stats | Client Filter | Status |
|-----|-------------|---------------|--------|
| Actionable | `pending_verification` + `active` | Same | ✅ |
| In Progress | `takedown_sent` + `disputed` | Same | ✅ |
| Resolved | `removed` | Same | ✅ |
| Dismissed | N/A (no server count) | `false_positive` + `archived` | ✅ |
| Header: Needs Attention | `pending_verification` + `active` | — | ✅ |
| Header: In Progress | `takedown_sent` + `disputed` | — | ✅ |
| Header: Resolved | `removed` | — | ✅ |

All tab definitions are consistent between server and client components.

---

## 3. Scan Results (`src/app/dashboard/scans/[id]/page.tsx`)

| Metric | Source | Status | Notes |
|--------|--------|--------|-------|
| New This Scan | `scan.infringement_count` | ✅ | Set by scan engine at completion |
| Total Infringements | Count of all product infringements | ❌ **FIXED** | Was counting ALL statuses including `false_positive` and `archived`. Fixed to exclude these |
| Pending Review | Count where `status = 'pending_verification'` | ✅ | Accurate |
| Active Threats | Count where `status IN ('active','takedown_sent','disputed')` | ✅ | Accurate |
| Scan Recovery (stuck running) | Checks stage completion + 5min timeout | ✅ | Reasonable failsafe |

---

## 4. Revenue Loss Estimation

| Component | Formula | Status |
|-----------|---------|--------|
| `est_revenue_loss` per infringement | `audience × conversionRate × productPrice` | ✅ | Set by scan engine during scoring |
| Platform conversion rates | telegram: 1%, torrent: 10%, web: 3%, etc. | ⚠️ | Rates are reasonable estimates but not empirically validated. Revenue loss feature is partially disabled in UI (commented out in InfringementCard and admin views) |
| Revenue at Risk (dashboard) | SUM from active infringements | ✅ | Direct query, not from view |
| Revenue Protected (dashboard) | SUM from removed infringements | ✅ | Direct query |

---

## 5. Trend Charts

| Chart | Source | Status | Notes |
|-------|--------|--------|-------|
| Detection Sparkline | `infringements.detected_at >= 30d ago`, grouped by date | ✅ | Clean implementation |
| Product Trend Chart | `product_infringement_timeline` materialized view | ✅ | Pre-aggregated `unique_count` and `total_loss` by date |
| Infringement Trend Chart | `ProductTimelineData` from materialized view | ✅ | Displays `unique_count` over time |

---

## 6. Admin Metrics

### Admin Overview (`src/app/admin/page.tsx`)

| Metric | View | Status | Notes |
|--------|------|--------|-------|
| MRR | `admin_revenue_stats.mrr_usd` | ❌ **FIXED** | View WHERE clause used `plan_tier != 'free'` (should be `'scout'`). Fixed in migration 00035 |
| ARR | `admin_revenue_stats.arr_usd` | ❌ **FIXED** | Same view issue |
| Active Subscriptions | `admin_subscription_stats.active_subscriptions` | ✅ | |
| Past Due | `admin_subscription_stats.past_due_subscriptions` | ✅ | |
| Total Users | `admin_user_stats.total_users` | ✅ | |
| New This Week | `admin_user_stats.new_users_7d` | ✅ | |
| New This Month | `admin_user_stats.new_users_30d` | ✅ | |
| Free Users | `admin_user_stats.free_users` | ❌ **FIXED** | View filtered `plan_tier = 'free'` (should be `'scout'`). Always returned 0. Fixed in migration 00035 |
| Starter/Pro/Business Users | `admin_user_stats.*_users` | ✅ | |
| Total Scans | `admin_scan_stats.total_scans` | ✅ | |
| Scans This Week | `admin_scan_stats.scans_7d` | ✅ | |
| Scan Success Rate | `completed_scans / total_scans * 100` | ✅ | |
| Avg Infringements/Scan | `admin_scan_stats.avg_infringements_per_scan` | ❌ **FIXED** | View used `results_count` column which doesn't exist (should be `infringement_count`). Returned NULL. Fixed in migration 00035 |
| Total Infringements | `admin_infringement_stats.total_infringements` | ✅ | |
| Active Infringements | `admin_infringement_stats.active_infringements` | ✅ | |
| Removed Infringements | `admin_infringement_stats.removed_infringements` | ✅ | |
| Est. Revenue Loss | `admin_infringement_stats.total_estimated_loss` | ❌ **FIXED** | View used `estimated_revenue_loss` (should be `est_revenue_loss`). Returned NULL. Fixed in migration 00035. Display is currently commented out in UI |
| Total Takedowns | `admin_takedown_stats.total_takedowns` | ✅ | |
| Takedowns This Week | `admin_takedown_stats.takedowns_7d` | ✅ | |
| Sent Takedowns | `admin_takedown_stats.sent_takedowns` | ✅ | |
| Takedown Success Rate | `successful_takedowns / sent_takedowns * 100` | ✅ | |
| Recent Scans: infringements found | `scan.results_count` | ❌ **FIXED** | Used `results_count` which doesn't exist on scans table. Changed to `infringement_count` |

### Admin Scans (`src/app/admin/scans/page.tsx`)

| Metric | Source | Status | Notes |
|--------|--------|--------|-------|
| Total/Completed/Pending/Failed | Computed from fetched scans (limit 100) | ⚠️ | Stats are from most recent 100 scans only, not the full table. Acceptable for admin overview |
| Per-scan infringements | `scan.results_count` | ❌ **FIXED** | Changed to `scan.infringement_count` |

### Admin Infringements (`src/app/admin/infringements/page.tsx`)

| Metric | Source | Status | Notes |
|--------|--------|--------|-------|
| Total/Active/Removed/Critical | Computed from fetched infringements (limit 100) | ⚠️ | Same limit-100 caveat |
| Revenue loss display | Commented out (`estimated_revenue_loss` → `est_revenue_loss`) | ⚠️ | Correctly disabled; would need column name fix to re-enable |

### Admin Takedowns (`src/app/admin/takedowns/page.tsx`)

| Metric | Source | Status |
|--------|--------|--------|
| Total/Draft/Sent/Successful | Computed from fetched takedowns (limit 100) | ⚠️ | Limit-100 caveat |

### Admin Subscriptions (`src/app/admin/subscriptions/page.tsx`)

| Metric | Source | Status |
|--------|--------|--------|
| Total/Active/Canceled/Past Due | Computed from query (no limit) | ✅ |

### Admin Users (`src/app/admin/users/page.tsx`)

| Metric | Source | Status | Notes |
|--------|--------|--------|-------|
| Plan filter dropdown | URL param `plan` | ❌ **FIXED** | "Free" option sent `value="free"` which matches no users. Changed to `value="scout"` with label "Scout (Free)" |

### Admin User Detail (`AdminUserScans.tsx`)

| Metric | Source | Status | Notes |
|--------|--------|--------|-------|
| Scan results count | `scan.results_count` | ❌ **FIXED** | Changed interface and display to `infringement_count` |

---

## 7. Protection Score (`src/lib/utils/protection-score.ts`)

```
score = 100
      - min(20 × log₂(1 + activeCount), 80)    // active penalty
      - min(8 × log₂(1 + pendingCount), 20)     // pending penalty
      + min(removedCount × 3, 20)                // removed bonus
      + (hasRecentScan ? 10 : 0)                 // scan bonus
      clamped to [0, 100]
```

| Aspect | Status | Notes |
|--------|--------|-------|
| Formula | ✅ | Logarithmic scaling prevents runaway values |
| Input: activeCount | ✅ | From direct query (`active` + `takedown_sent` + `disputed`) |
| Input: pendingCount | ✅ | From direct query (`pending_verification`) |
| Input: removedCount | ✅ | From `removedInfringements.length` |
| Input: hasRecentScan | ✅ | Checks if latest scan completed within 7 days |
| Edge cases | ✅ | 0 active + 0 pending + no scans = 100 (clean slate). Clamped to 0-100 |

---

## 8. Data Integrity Checks

| Check | Location | Status |
|-------|----------|--------|
| Null handling on revenue | Dashboard: `(inf.est_revenue_loss \|\| 0)` | ✅ |
| Null handling on counts | Dashboard: `?? 0` throughout | ✅ |
| Empty state for action items | Maps `actionItems ?? []` | ✅ |
| Empty state for timeline | Handles empty arrays for all 3 sources | ✅ |
| Scan stuck detection | 5-min timeout + stage completion check | ✅ |
| Division by zero on rates | Admin: checks `total_scans` and `sent_takedowns` before dividing | ✅ |

---

## Summary of Fixes Applied

### Critical (❌ → ✅)

1. **Dashboard: status_transitions missing user_id filter** (`dashboard/page.tsx:124-128`)
   Added `.eq('infringements.user_id', user.id)` to the status_transitions query. RLS was the only protection before — now has app-level filtering too.

2. **Admin views: 4 column/value mismatches** (new migration `00035_fix_admin_view_columns.sql`)
   - `admin_scan_stats`: `results_count` → `infringement_count`
   - `admin_infringement_stats`: `estimated_revenue_loss` → `est_revenue_loss`
   - `admin_user_stats`: `plan_tier = 'free'` → `'scout'`
   - `admin_revenue_stats`: `WHERE plan_tier != 'free'` → `!= 'scout'`

3. **Admin display: results_count → infringement_count** (4 files)
   - `admin/page.tsx` — recent scans display
   - `admin/scans/page.tsx` — scan list display
   - `AdminUserScans.tsx` — interface + display

4. **Admin users filter: "free" → "scout"** (`admin/users/page.tsx`)
   Plan filter dropdown value corrected.

5. **Scan detail: total infringement count** (`dashboard/scans/[id]/page.tsx`)
   Excluded `false_positive` and `archived` from "Total Infringements" count.

### Informational (⚠️)

1. **Trend calculations** — show "items added in last 30 days" rather than period-over-period comparison. Functional but label "vs last 30d" is slightly misleading.

2. **Admin sub-page stats** — computed from `limit(100)` queries, not full table counts. Acceptable for admin overview but will undercount on growth.

3. **Revenue loss estimates** — platform conversion rates are reasonable defaults but not empirically validated. Feature partially disabled in UI.

4. **`user_dashboard_stats.total_est_loss`** — inflated by cartesian join but NOT used by application code (revenue is queried directly).

---

## Files Changed

| File | Change |
|------|--------|
| `src/app/dashboard/page.tsx` | Added `user_id` filter to `status_transitions` query |
| `src/app/admin/page.tsx` | `results_count` → `infringement_count` |
| `src/app/admin/scans/page.tsx` | `results_count` → `infringement_count` |
| `src/app/admin/users/page.tsx` | Plan filter: `"free"` → `"scout"` |
| `src/components/admin/AdminUserScans.tsx` | Interface + display: `results_count` → `infringement_count` |
| `src/app/dashboard/scans/[id]/page.tsx` | Exclude `false_positive`/`archived` from total count |
| `supabase/migrations/00035_fix_admin_view_columns.sql` | New migration fixing 4 admin views |
