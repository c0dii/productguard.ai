# Mobile & Responsive Audit Report — ProductGuard.ai

**Auditor:** Mobile & Responsive Auditor Agent
**Date:** Feb 20, 2026
**Scope:** All dashboard pages, modals, tables, navigation — mobile usability, touch targets, responsive layout

---

## Overall Assessment

The app uses a solid mobile-first approach with Tailwind responsive utilities (`sm:`, `md:`, `lg:`). The `MobileDashboardLayout` provides a slide-out sidebar with hamburger menu, and all modals use a bottom-sheet pattern on mobile (`items-end sm:items-center`). Several specific issues were found and fixed.

---

## Fixes Applied

### Critical — Touch Targets & Visibility

| # | File | Issue | Fix |
|---|------|-------|-----|
| M1 | `ProductListView.tsx` | Row action buttons invisible on mobile (hover-only: `opacity-0 group-hover:opacity-100`) | Actions now always visible on mobile (`sm:opacity-0 sm:group-hover:opacity-100`), hidden on desktop until hover |
| M2 | `ProductListView.tsx` | Action buttons too small for touch (`px-2 py-1` = ~28px) | Added `min-w-[36px] min-h-[36px]` to all action buttons |
| M3 | `MobileDashboardLayout.tsx` | Hamburger menu button 40px (below 44px minimum) | Increased to `p-2.5` with `min-w-[44px] min-h-[44px]` |
| M4 | `InlineDMCASendFlow.tsx` | Close button too small (`p-1` = ~28px touch target) | Increased to `p-2` with `min-w-[44px] min-h-[44px]` |
| M5 | `BulkDMCAReviewModal.tsx` | Close button too small (`p-1` = ~28px) | Same fix as M4 |

### High — Layout & Overflow

| # | File | Issue | Fix |
|---|------|-------|-----|
| M6 | `BulkDMCAReviewModal.tsx` | Summary cards forced 3-column grid on mobile (`grid-cols-3`) | Changed to `grid-cols-2 sm:grid-cols-3` with `col-span-2 sm:col-span-1` on third card |
| M7 | `ProductListView.tsx` | All 8 columns visible on mobile (horizontal scroll required for every column) | Type, Price, Threats, Pending, Last Scan columns now hidden progressively (`hidden sm:table-cell`, `hidden md:table-cell`, `hidden lg:table-cell`) |
| M8 | `ProductListView.tsx` | Archive button crowds row on mobile | Hidden on mobile (`hidden sm:inline-flex`), available via product detail page |

### Medium — Text Readability

| # | File | Issue | Fix |
|---|------|-------|-----|
| M9 | `BulkDMCAReviewModal.tsx` | `text-[10px]` labels in summary cards and info sections (below 11px minimum) | Changed to `text-[11px] sm:text-xs` for progressive scaling |
| M10 | `InlineDMCASendFlow.tsx` | Step indicators `w-6 h-6` (24px) too small for touch | Increased to `w-7 h-7 sm:w-6 sm:h-6` on mobile |
| M11 | `BulkDMCAReviewModal.tsx` | Step indicators same issue | Same fix as M10 |

---

## What's Working Well

### Layout Architecture
- **MobileDashboardLayout**: Slide-out sidebar with smooth transform animation, backdrop overlay, auto-close on navigation
- **Desktop**: Fixed sidebar at 256px, content offset with `lg:ml-64`
- **Mobile**: Content gets full width with `px-3 py-3`, 48px top padding for hamburger button

### Modal Patterns (Consistent Across All Modals)
- `fixed inset-0` + `flex items-end sm:items-center` — bottom-sheet on mobile, centered on desktop
- `max-h-[85vh] sm:max-h-[90vh]` — leaves room for system UI
- `rounded-b-none sm:rounded-b-2xl` — flush with bottom edge on mobile
- `overflow-y-auto` on all modal cards — scrollable content

### Responsive Grids
- Dashboard stats: `grid-cols-2 lg:grid-cols-4`
- Product cards: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Takedown cards: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Filter controls: `flex-col sm:flex-row` with full-width on mobile

### Tables
- Scans `ProductStatusTable`: Already hides columns on mobile (`hidden sm:table-cell`) and abbreviates labels ("Not Scanned" -> "None", "Action Required" -> "Review")
- All tables wrapped in `overflow-x-auto` as fallback
- Infringements page uses card-based list (not table) — naturally mobile-friendly

---

## Remaining Issues (Documented for Future)

### Medium Priority

| # | Category | Component | Issue | Recommendation |
|---|----------|-----------|-------|----------------|
| R1 | iOS scrolling | InlineDMCASendFlow Step 1 | Nested `overflow-y-auto` (modal card + infringement type list at `max-h-[45vh]`) can cause iOS momentum scrolling issues | Consider `-webkit-overflow-scrolling: touch` or flatten to single scroll container |
| R2 | Kebab menu | Products card view | Absolute-positioned dropdown (`right-0 top-8`) may overflow viewport on small phones | Add boundary detection or use a portal-based dropdown |
| R3 | DataTable (generic) | `src/components/ui/DataTable.tsx` | No column hiding — relies entirely on horizontal scroll | Add `hiddenOnMobile` column option for pages using DataTable directly |
| R4 | Tablet gap | Multiple | Jump from mobile to `sm:` (640px) is large — no `md:` (768px) specific styles for tablets | Consider adding tablet-specific layouts for complex pages |

### Low Priority

| # | Category | Issue |
|---|----------|-------|
| L1 | Sheet pattern | InlineDMCASendFlow and ProductWizard render as modal on all viewports — could use Sheet/Drawer pattern on mobile for more native feel |
| L2 | Input attributes | Forms don't use `inputMode`, `pattern`, or `autocomplete` attributes — would improve mobile keyboard experience |
| L3 | Long URLs | Inconsistent truncation across components (mix of `truncate`, `line-clamp`, `break-all`, manual `slice()`) |

---

## Touch Target Audit

| Component | Element | Size | Status |
|-----------|---------|------|--------|
| MobileDashboardLayout | Hamburger button | 44x44px | Fixed |
| DashboardSidebar | Nav links | ~44px height (`py-3`) | Good |
| ProductListView | Action buttons | 36x36px min | Fixed |
| InlineDMCASendFlow | Step circles | 28px mobile | Fixed (28px) |
| InlineDMCASendFlow | Close button | 44x44px | Fixed |
| BulkDMCAReviewModal | Close button | 44x44px | Fixed |
| BulkDMCAReviewModal | Step circles | 28px mobile | Fixed (28px) |
| ProductWizard | Step circles | 32px | Good |
| DataTable | Pagination buttons | 40x40px (`w-10 h-10`) | Acceptable |
| OnboardingBanner | CTA button | ~44px height | Good |
| SlideOver | Close button | ~36px (`p-1.5`) | Acceptable |

---

## Breakpoint Usage

| Breakpoint | Value | Usage |
|------------|-------|-------|
| (default) | 0px | Mobile-first base styles |
| `sm:` | 640px | Text scaling, padding increases, flex direction changes, column visibility |
| `md:` | 768px | Additional column visibility, grid expansion |
| `lg:` | 1024px | Sidebar visibility, 3-4 column grids, full desktop layout |
| `xl:` | 1280px | Minimal usage (some admin grids) |

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/dashboard/ProductListView.tsx` | Progressive column hiding, always-visible mobile actions, 36px min touch targets |
| `src/components/dashboard/MobileDashboardLayout.tsx` | 44px minimum hamburger button |
| `src/components/dmca/InlineDMCASendFlow.tsx` | Larger step indicators on mobile, 44px close button |
| `src/components/dmca/BulkDMCAReviewModal.tsx` | Responsive summary grid, larger step indicators, 44px close button, readable text sizes |
