# Copy Whisperer Audit — Change Log

**Date:** 2026-02-20
**Tone:** Confident, clear, approachable. "Trusted security guard who also makes you smile."

---

## Landing Page (`src/app/page.tsx`)

| Location | Before | After | Why |
|----------|--------|-------|-----|
| Hero badge | "Protecting 500+ Digital Creators" | "AI-Powered Piracy Protection for Creators" | Unverifiable claim → value prop |
| Scout plan | "Perfect for testing" | "Try it free — no card needed" | Removes friction anxiety |
| Starter plan | "For individual creators" | "For solo creators ready to fight back" | More empowering |
| Pro plan | "For serious creators" | "For creators with a growing catalog" | Specific, not judgmental |
| Business plan | "For teams and agencies" | "For teams protecting multiple brands" | Clarifies who it's for |
| Subheadline | "Stop pirates from stealing your digital products..." | "Find stolen copies of your work across the internet — and take them down before they spread." | Action-oriented, specific |
| Features header | "Powerful Protection Features" | "Find It. Flag It. Take It Down." | Memorable, action-driven |
| All 6 feature descriptions | Generic corporate language | Personal, specific, empowering tone | "We scan for..." → "Our engine crawls..." |
| How It Works subtitle | "Three simple steps to protect..." | "From setup to takedown in under 5 minutes" | Concrete time commitment |
| Step descriptions | Brief/vague | Detailed with specific actions | Users know exactly what to expect |
| Testimonials subtitle | "See what digital creators are saying..." | "Hear from creators who stopped losing revenue..." | Outcome-focused |
| Pricing header | "Simple Pricing" | "Simple, Transparent Pricing" | Trust signal |
| Final CTA | "Join 500+ creators who trust..." | "Every day you wait, pirates are profiting from your work." | Urgency-based motivation |

## Auth Pages

### Login (`src/app/auth/login/page.tsx`)

| Before | After | Why |
|--------|-------|-----|
| "An unexpected error occurred" | "Something went wrong on our end. Please try again in a moment." | Blame-taking, actionable |
| "Failed to initiate Google login" | "Couldn't connect to Google. Please try again or use email instead." | Friendly, offers alternative |
| "Log in to your ProductGuard account" | "Log in to check on your products" | Task-oriented, personal |

### Signup (`src/app/auth/signup/page.tsx`)

| Before | After | Why |
|--------|-------|-----|
| Same error improvements as login | Same pattern | Consistency |
| "Check Your Email" | "Check Your Inbox" | More natural |
| Wordy confirmation message | Shorter: "We sent a confirmation link to {email}. Click it to activate your account and start scanning." | Clearer next step |

## Dashboard Navigation & Components

### DashboardSidebar

| Before | After | Why |
|--------|-------|-----|
| "Ready for Takedown" nav label | "Ready to Send" | Clearer action — user sends the notice |

### QuickActionsBar

| Before | After | Why |
|--------|-------|-----|
| "Takedowns" button label | "View Takedowns" | Clarifies it's a navigation action |

### OnboardingCard

| Before | After | Why |
|--------|-------|-----|
| "Complete Your Setup" | "Finish Your Profile" | Less formal, more personal |
| "Fill in your DMCA contact details..." | "Add your contact info so we can generate legally valid takedown notices on your behalf." | Plain English, explains the "why" |
| "DMCA reply email set" | "Takedown reply email set" | De-jargoned |

### OnboardingBanner

| Before | After | Why |
|--------|-------|-----|
| "Welcome to ProductGuard!" | "Let's find out if your work is being pirated" | Curiosity-driven, action-oriented |
| "Protect your digital products in 4 simple steps" | "Get started in 4 quick steps" | Simpler |
| Step 3 and 4 descriptions | Reworded for natural language | Less robotic |
| "You're almost there!" | "Your product is ready — time to scan" | More specific |

### ProtectionScoreHero

All 5 `buildSummary` strings rewritten for clarity and action-orientation. Example:
- Before: "No products protected yet. Add one to get started."
- After: "You haven't added any products yet. Add one to start scanning for piracy."

### ThreatLandscape

| Before | After | Why |
|--------|-------|-----|
| "No threats detected yet. Run a scan..." | "No threats found yet. This chart fills in as scans detect piracy across platforms." | Sets expectation about the chart |

### ActivityTimeline

| Before | After | Why |
|--------|-------|-----|
| "No activity yet. Run a scan to get started." | "No activity yet. Your scan results, verifications, and takedowns will appear here." | Tells user what to expect |

## Key Flows

### InlineDMCASendFlow (`src/components/dmca/InlineDMCASendFlow.tsx`)

| Before | After | Why |
|--------|-------|-----|
| Step labels: "Type" | "Infringement" | "Type" is ambiguous — clarifies it means infringement type |
| Step 2 description: "Configure where and how..." | "Confirm where the notice should be sent. We auto-detect the right contact when possible." | Highlights auto-detection value |
| Perjury consent: just legal text | Added plain-English summary above: "You're confirming that you own this content and that it's being used without permission." | Accessible first, legal second |
| Liability consent: just legal text | Added plain-English summary: "ProductGuard helps you send notices — but you're responsible for the claims in them." | Same pattern |
| Success: "DMCA Notice Sent" | "Notice Sent Successfully" | Warmer |
| Success body: "Your DMCA takedown notice has been sent to..." | "Your takedown notice is on its way to..." | More natural |
| Follow-up: "Allow X days for a response before escalating..." | "Most providers respond within X days. We'll track the status for you." | Reassuring, highlights tracking |
| Error: "Failed to send DMCA notice" | "Couldn't send the notice. Check the recipient email and try again." | Actionable, suggests fix |

### CancelRetentionFlow (`src/components/dashboard/CancelRetentionFlow.tsx`)

| Before | After | Why |
|--------|-------|-----|
| "Failed to cancel subscription" | "Couldn't cancel right now. Please try again in a moment." | Friendlier |
| "Failed to apply discount" | "Couldn't apply the discount. Please try again." | Same pattern |
| "Failed to pause subscription" | "Couldn't pause your account. Please try again." | Same pattern |
| "Failed to downgrade" | "Couldn't switch your plan. Please try again." | "Switch" > "downgrade" |
| "Failed to delete account" | "Couldn't delete your account. Please contact support." | Critical action → suggests support |
| "Product monitoring will stop (limited to 1 product, 1 scan/mo)" | "Monitoring drops to 1 product and 1 scan per month" | Cleaner |
| "One-click DMCA, cease & desist, and automated monitoring will be disabled" | "One-click takedowns, automated scanning, and enforcement tools will be disabled" | De-jargoned |

### EnhancedProductForm (`src/components/dashboard/EnhancedProductForm.tsx`)

| Before | After | Why |
|--------|-------|-----|
| "Enter your product page URL to automatically extract details..." | "Paste your product page URL and we'll pull in the title, description, price, and images automatically." | More conversational |
| "Failed to fetch product details. Please enter manually." | "Couldn't pull details from that URL. You can enter them manually below." | Friendlier, directional |
| "Failed to refresh AI analysis" | "Couldn't refresh the analysis. Try again in a few minutes." | Actionable |
| "Product details fetched successfully! Review and edit below." | "Details pulled in successfully. Review and edit below." | Removed emoji, cleaner |
| "This description is used in DMCA takedown notices. Keep it concise and factual." | "Used in takedown notices. Keep it concise and factual." | Shorter |
| "Product URL is required to refresh AI analysis" | "Add a product URL first so we know what to analyze." | Conversational |
| AI info banner (long instruction text) | Shorter: "Review the AI-extracted data below. Hover over any item to remove it. Click 'Save Product' to approve." | Removed emoji, cleaner |
| AI approval status (pending) | "This data will be used for detection once you save the product." | Shorter |
| AI approval status (approved) | "Approved — this data is active and improving your scan results." | Positive, reassuring |

## Error Messages (Codebase-Wide)

Rewrote ~40 user-facing error messages from "Failed to X" to "Couldn't X" pattern. Consistent rules:

1. **"Couldn't" > "Failed to"** — conversational, not robotic
2. **Always include a next step** — "Please try again" / "Please try again in a moment" / "Please contact support"
3. **Be specific when possible** — "Check the recipient email" rather than generic retry

### Files updated:
- `ArchiveScanButton.tsx` — archive scan error
- `ArchiveProductButton.tsx` — archive product error
- `InfringementCard.tsx` — DMCA generate, resolve, reopen errors
- `InfringementActions.tsx` — verify, reject, whitelist, reopen errors
- `DashboardNeedsReview.tsx` — verify/reject errors
- `RunScanButton.tsx` — scan start error
- `ProductActions.tsx` — scan start error
- `ExportReportButton.tsx` — export error
- `PendingVerificationList.tsx` — action errors
- `TakedownActions.tsx` — send and URL check errors
- `TakedownForm.tsx` — create takedown error
- `SubscriptionWizard.tsx` — plan change and billing portal errors
- `ProfileEditForm.tsx` — save error
- `ProductWizard.tsx` — scrape and save errors
- `ReassignProductButton.tsx` — load and reassign errors
- `email-preferences/page.tsx` — load and save errors
- `EnforcementPlan.tsx` — generate notice error
- `DMCAGenerateButton.tsx` — generate notice error
- `DMCAQuickSetup.tsx` — save profile error
- `BulkDMCAReviewModal.tsx` — generate and submit errors
- `ImageUpload.tsx` — upload error
- `products/page.tsx` — CRUD and scan errors

---

## Not Changed (Intentionally)

- **Admin panel copy** (`src/components/admin/*`) — internal tool, not user-facing
- **Console errors / API route responses** — developer-facing, not end-user copy
- **Legal text in DMCA notices** — must remain formal for legal validity (added plain-English summaries above them instead)
- **Email notification templates** (`src/lib/notifications/email.ts`) — separate audit recommended for email copy
