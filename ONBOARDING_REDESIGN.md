# Onboarding Redesign — ProductGuard.ai

**Agent:** Onboarding Alchemist
**Date:** Feb 20, 2026
**Goal:** Reduce time-to-first-scan-results from 4-10 minutes to under 3 minutes

---

## Current Flow (Before)

| Step | Action | Time | Pain Point |
|------|--------|------|------------|
| 1 | Signup (3 fields or Google OAuth) | 30s | None |
| 2 | Check email, click verification link | 60-120s | Necessary for security |
| 3 | Land on dashboard | 5s | Wall of zeros and empty charts |
| 4 | Figure out to click "Add Product" | 10-30s | CTA buried at bottom of page |
| 5 | Navigate to Products page, click button | 5-10s | Two clicks for one intent |
| 6 | Complete ProductWizard (5 steps) | 60-120s | Steps 4-5 already skippable |
| 7 | Wizard closes, edit form auto-opens | 10s | Confusing — just finished creating |
| 8 | Close edit form, find "Run Scan" link | 15-30s | Small text link, easy to miss |
| 9 | Watch scan progress | 30-300s | Good once found |

**Total: 4-10+ minutes with 3 "what do I do now?" dead ends**

---

## Proposed Flow (After)

| Step | Action | Time | Change |
|------|--------|------|--------|
| 1 | Signup (3 fields or Google OAuth) | 30s | Unchanged |
| 2 | Check email, click verification link | 60-120s | Unchanged |
| 3 | Land on dashboard | 5s | Welcome layout with CTA at top |
| 4 | Click "Add Your First Product" | 0s | Opens wizard directly |
| 5 | Complete ProductWizard (5 steps) | 60-120s | Unchanged |
| 6 | Wizard completes | 0s | Auto-triggers scan, redirects to progress page |
| 7 | Watch scan progress | 30-300s | Unchanged |

**Total: 2.5-5 minutes, zero dead ends**

---

## Changes Made

### 1. Auto-scan after product creation
- **File:** `src/app/dashboard/products/page.tsx`
- When the ProductWizard completes, the app automatically triggers `POST /api/scan` and redirects to the scan progress page
- Falls back gracefully if scan fails (rate limit, plan exceeded)
- Removes the confusing auto-opening of the edit form

### 2. Direct wizard opening from OnboardingBanner
- **Files:** `OnboardingBanner.tsx`, `products/page.tsx`
- "Add Your First Product" CTA now links to `/dashboard/products?wizard=1`
- Products page reads `?wizard=1` and auto-opens the ProductWizard
- Eliminates one unnecessary click

### 3. Focused welcome layout for new users
- **File:** `DashboardOverview.tsx`
- When `productCount === 0`, shows a focused welcome view:
  - "Welcome to ProductGuard" heading
  - OnboardingBanner at the TOP (was buried at bottom)
  - Stat cards (preview of what will fill in)
  - Profile completion card
  - Quick actions bar
- Hides empty sections: ActionCenter, ThreatLandscape, ActivityTimeline

---

## What We Didn't Change (and Why)

| Item | Reason |
|------|--------|
| Signup form fields | Already minimal (3 fields + Google OAuth) |
| Email verification | Security requirement |
| ProductWizard steps | Steps 1-2 can't merge (type selector + AI scrape are each substantial). Steps 4-5 already skippable. |
| Scan engine / API routes | Already work correctly |
| Tooltips / contextual help | Core problem is flow, not missing help text |
| Auto-scan scheduling | Out of scope — separate feature |
