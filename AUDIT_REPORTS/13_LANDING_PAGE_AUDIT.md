# Landing Page Conversion Audit — ProductGuard.ai

**Date:** 2026-02-21
**Page:** `src/app/page.tsx`

---

## 1. Hero Section — Score: 5/10

| Element | Finding |
|---------|---------|
| **Headline** | "Stop Losing Revenue to Digital Piracy" — too generic. Doesn't specify WHO it's for or create visceral urgency. A Notion template seller won't immediately self-identify. |
| **Subheadline** | Decent — mentions 50+ platforms and one-click takedowns. But doesn't name specific platforms the target audience uses (Telegram, Gumroad, Teachable). |
| **Primary CTA** | "Start Free Scan" — good, action-oriented. But link goes to generic `/auth/signup`, not a scan flow. |
| **Secondary CTA** | "See How It Works" — good, scrolls to how-it-works section. |
| **Hero visual** | Faux dashboard mockup with hardcoded stat cards. Looks decent but shows generic numbers (1,247 scans, 342 infringements). Not compelling enough — doesn't show the actual product experience. |
| **Urgency** | None in the hero itself. Trust signals below CTA ("No credit card, 2-min setup") are good. |
| **Technical** | `'use client'` on entire page kills SSR/SEO. Should be server component. |

**Fix:** Rewrite headline to target creators specifically. Add urgency hook. Make CTA more specific ("Scan for Piracy — Free"). Convert to server component.

---

## 2. Social Proof & Trust — Score: 2/10

| Element | Finding |
|---------|---------|
| **Stats bar** | Shows "$2.5M+ Revenue Protected", "15K+ Infringements Removed", "500+ Creators Protected" — clearly fabricated for an early-stage product. This actively damages trust if anyone investigates. |
| **Testimonials** | 3 obviously fake testimonials with emoji avatars (👩‍💼, 👨‍💻, 👩‍🎨). Generic names and vague praise. A visitor will immediately suspect these are fabricated. |
| **Platform logos** | None. No indication of which platforms are monitored or which creator platforms are supported. |
| **Trust badges** | None. No DMCA compliance, security signals, or credibility markers. |
| **Security signals** | None. |

**Fix:** Replace inflated stats with honest capability statements ("Monitors 50+ platforms", "Scans Telegram, Google, torrents & more"). Mark testimonials as TODO with realistic mock data. Add platform logo bar. Add trust badges.

---

## 3. Problem → Solution Narrative — Score: 1/10

| Element | Finding |
|---------|---------|
| **Problem section** | Does not exist. Page jumps from hero straight to features. |
| **Emotional hook** | Missing entirely. No empathy with the creator's pain of discovering piracy. |
| **Visual storytelling** | None. No before/after, no "this is what piracy looks like for you." |

**Fix:** Add dedicated problem section between trust bar and features. Paint the picture: "Your course is on Telegram. Your templates are on file-sharing sites. You don't even know about most of it." Show the time/cost of manual DMCA process.

---

## 4. Feature Presentation — Score: 6/10

| Element | Finding |
|---------|---------|
| **Copy quality** | Mostly benefit-oriented. "We scan Google, Telegram, Discord, torrents, and 50+ platforms so you don't have to" is strong. |
| **Differentiators** | Telegram monitoring is mentioned but buried as one of six equal cards. Should be highlighted as a unique selling point. |
| **Visual hierarchy** | All 6 features presented equally. No visual emphasis on key differentiators. |
| **Icons** | Emoji icons (🔍, 🤖, 📧) look unprofessional for a security product. |
| **Comparison** | No positioning against competitors. No "why us vs alternatives" section. |

**Fix:** Rewrite feature titles as action-oriented benefits. Replace emoji icons with SVG icons. Add competitor comparison section. Elevate Telegram monitoring and AI detection as primary differentiators.

---

## 5. Pricing Section — Score: 5/10

| Element | Finding |
|---------|---------|
| **Clarity** | 4 tiers visible, billing toggle works. But feature lists are minimal (only 3 items per card). |
| **Highlighted tier** | Starter marked "Most Popular" with visual emphasis. Good. |
| **Free tier** | Scout shown as equal to paid tiers. Should be positioned as a gateway. |
| **Annual pricing** | Toggle exists with "-20%" badge. But annual price displays as "/yr" when showing the discounted monthly rate — confusing. |
| **Feature grid** | None. No detailed comparison of what each tier includes. |
| **CTAs** | All cards say "Get Started" — should be tier-specific. |
| **Objection handling** | None near pricing. No "cancel anytime", no money-back language. |

**Fix:** Add tier-specific CTAs. Fix annual pricing display. Add feature comparison grid. Add reassurance copy near pricing.

---

## 6. Objection Handling — Score: 1/10

| Objection | Addressed? |
|-----------|-----------|
| "Is piracy really costing me money?" | No |
| "Can't I just do this myself?" | No |
| "Is this legal?" | No |
| "What if it doesn't find anything?" | No |
| "I'm not technical" | No |
| "Will takedowns actually work?" | No |

**Fix:** Add comprehensive FAQ section addressing all 6 objections with specific, reassuring answers.

---

## 7. Final CTA Section — Score: 6/10

| Element | Finding |
|---------|---------|
| **Headline** | "Ready to Protect Your Revenue?" — decent. |
| **Urgency** | "Every day you wait, pirates are profiting from your work." — strong line. |
| **CTA** | "Start Free Scan →" — good, matches hero CTA. |
| **Secondary option** | None. No email capture or demo link for people not ready. |

**Fix:** Strengthen headline. Add secondary CTA option.

---

## 8. Page Performance & SEO — Score: 3/10

| Element | Finding |
|---------|---------|
| **SSR** | `'use client'` on entire page means zero server-side rendering. Terrible for SEO. |
| **Metadata** | No page-level metadata export. Relies on root layout's generic title. |
| **Open Graph** | None. No social sharing optimization. |
| **Images** | No images to optimize (all CSS/emoji). |
| **Design tokens** | Page uses hardcoded colors (cyan-500, blue-600, gray-400) instead of design system tokens (pg-accent, pg-text-muted, pg-border). |
| **Font** | Doesn't explicitly use DM Sans/JetBrains Mono classes. |

**Fix:** Convert to server component. Add metadata export with Open Graph. Migrate to design system tokens.

---

## Overall Score: 3.6/10

### Critical Issues (Must Fix)
1. No server-side rendering (SEO killer)
2. Fabricated social proof (trust killer)
3. No problem/pain narrative (conversion killer)
4. No objection handling (abandonment driver)
5. Not using design system tokens

### High-Priority Improvements
6. Add platform trust bar
7. Add competitor comparison
8. Tier-specific pricing CTAs
9. Feature comparison grid
10. FAQ section

### Nice-to-Have
11. Professional SVG icons replacing emoji
12. Open Graph metadata
13. Email capture for non-ready visitors
