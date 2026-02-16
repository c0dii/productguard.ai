# GoHighLevel Workflows Implementation Guide

Complete guide for setting up automated workflows in GHL for ProductGuard.ai.

---

## 📋 **Overview**

ProductGuard.ai now has **automated workflow triggers** that fire based on user behavior and time-based events. These workflows are powered by:
- Real-time event tracking (user actions)
- Scheduled background jobs (daily/monthly checks)
- GHL webhook integration

---

## 🔄 **Implemented Workflows**

### 1. **Trial Expiration Sequence** 🔔

**Trigger:** Automated daily check (3 days before trial ends)

**Event Type:** `user.trial_ending_soon`

**When it fires:**
- Daily cron job checks for trials expiring in 3 days
- Automatically sends event to GHL

**Data sent:**
```json
{
  "email": "user@example.com",
  "eventType": "user.trial_ending_soon",
  "trialEndDate": "2026-02-19",
  "daysRemaining": 3
}
```

**Recommended GHL Workflow:**
1. Send "Trial ending soon" email
2. Highlight their achievements (scans, infringements found)
3. Wait 1 day
4. Send upgrade offer with discount
5. Final reminder on expiration day

---

### 2. **Trial Expired** ⏰

**Trigger:** Automated daily check (day after trial ends)

**Event Type:** `user.trial_expired`

**When it fires:**
- Day after trial expiration date

**Data sent:**
```json
{
  "email": "user@example.com",
  "eventType": "user.trial_expired",
  "totalProducts": 2,
  "totalScans": 5,
  "totalInfringements": 12,
  "expiredAt": "2026-02-16T12:00:00Z"
}
```

**Recommended GHL Workflow:**
1. Send "Your trial has ended" email
2. Show what they accomplished
3. Offer limited-time discount
4. Add to "Convert Trial" pipeline

---

### 3. **Inactive User Re-engagement** 💤

**Trigger:** Automated daily check (7, 14, or 30 days since last login)

**Event Type:** `user.inactive`

**When it fires:**
- User hasn't logged in for 7/14/30 days

**Data sent:**
```json
{
  "email": "user@example.com",
  "eventType": "user.inactive",
  "daysSinceLastLogin": 7,
  "lastLoginDate": "2026-02-09T12:00:00Z"
}
```

**Recommended GHL Workflow:**
1. Send "We miss you" email
2. Share success story or new feature
3. Wait 3 days
4. Send "Need help?" with support link
5. Add tag `inactive-user`

---

### 4. **Onboarding Incomplete** 🎓

**Trigger:** Automated daily check (3, 7, or 14 days after signup)

**Event Type:** `user.onboarding_incomplete`

**When it fires:**
- User signed up but hasn't added products or run scans

**Data sent:**
```json
{
  "email": "user@example.com",
  "eventType": "user.onboarding_incomplete",
  "daysSinceSignup": 3,
  "hasProducts": false,
  "hasScans": false
}
```

**Recommended GHL Workflow:**
1. Send "Need help getting started?" email
2. Include video tutorial or walkthrough
3. Wait 2 days
4. Offer live demo or support call
5. Remove `needs-onboarding` tag when completed

---

### 5. **Power User Nurture** ⭐

**Trigger:** Automated daily check

**Event Type:** `user.became_power_user`

**When it fires:**
- User crosses power user threshold:
  - 3+ products, OR
  - 5+ scans, OR
  - 3+ DMCA notices sent

**Data sent:**
```json
{
  "email": "user@example.com",
  "eventType": "user.became_power_user",
  "totalProducts": 5,
  "totalScans": 12,
  "totalDMCASent": 8
}
```

**Recommended GHL Workflow:**
1. Send congratulations email
2. Request testimonial or review
3. Offer referral program incentive
4. Invite to exclusive community
5. Add to "Upsell to Pro" pipeline

---

### 6. **Monthly Health Check** 📊

**Trigger:** Automated monthly (1st of month at midnight)

**Event Type:** `user.monthly_report`

**When it fires:**
- Every 1st of the month
- Only for users with activity last month

**Data sent:**
```json
{
  "email": "user@example.com",
  "eventType": "user.monthly_report",
  "month": "January 2026",
  "totalScans": 8,
  "totalInfringements": 23,
  "totalDMCASent": 5,
  "totalResolved": 3,
  "newProducts": 2
}
```

**Recommended GHL Workflow:**
1. Send monthly report email with stats
2. Celebrate their protection efforts
3. Suggest next action based on usage
4. Cross-sell unused features

---

### 7. **High Severity Alert** 🚨

**Trigger:** Real-time (during scan)

**Event Type:** `infringement.high_severity`

**When it fires:**
- Scan finds infringement with severity ≥ 80

**Webhook:** `GHL_WEBHOOK_HIGH_SEVERITY`

**Data sent:**
```json
{
  "email": "user@example.com",
  "eventType": "infringement.high_severity",
  "infringementUrl": "https://torrent-site.com/...",
  "severityScore": 95,
  "platform": "torrent",
  "productName": "Your Product"
}
```

**Recommended GHL Workflow:**
1. Send urgent SMS notification
2. Send email with threat details
3. Include quick DMCA action link
4. Add to "Urgent Action Needed" pipeline

---

### 8. **First Scan** 🎉

**Trigger:** Real-time (when user completes first scan)

**Event Type:** `product.first_scan`

**Webhook:** `GHL_WEBHOOK_FIRST_SCAN`

**Data sent:**
```json
{
  "email": "user@example.com",
  "eventType": "product.first_scan",
  "productName": "Your Product",
  "scanId": "scan_123",
  "resultsFound": 12
}
```

**Recommended GHL Workflow:**
1. Send congratulations email
2. Explain next steps (verify infringements)
3. Educate about DMCA notices
4. Remove `needs-onboarding` tag

---

### 9. **User Signup** 👋

**Trigger:** Real-time (new account created)

**Event Type:** `user.signup`

**Webhook:** `GHL_WEBHOOK_SIGNUP`

**Data sent:**
```json
{
  "email": "user@example.com",
  "eventType": "user.signup",
  "name": "John Doe"
}
```

**Recommended GHL Workflow:**
1. Send welcome email immediately
2. Wait 1 day
3. Send "Getting Started" guide
4. Wait 2 days
5. Check if first scan completed (if not, send reminder)

---

## ⚙️ **Setup Instructions**

### 1. **Add Environment Variables**

Add to your `.env.local` **AND** Vercel:

```bash
# GHL Core
GHL_API_KEY=your_ghl_api_key
GHL_LOCATION_ID=your_ghl_location_id

# GHL Webhooks (optional but recommended)
GHL_WEBHOOK_SIGNUP=https://services.leadconnectorhq.com/hooks/...
GHL_WEBHOOK_FIRST_SCAN=https://services.leadconnectorhq.com/hooks/...
GHL_WEBHOOK_HIGH_SEVERITY=https://services.leadconnectorhq.com/hooks/...

# Cron Security
CRON_SECRET=your_random_secret_here
```

**Generate cron secret:**
```bash
openssl rand -hex 32
```

---

### 2. **Deploy to Vercel**

The cron jobs are configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-workflows",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/monthly-workflows",
      "schedule": "0 0 1 * *"
    }
  ]
}
```

**Schedule:**
- Daily: Every day at midnight UTC
- Monthly: 1st of every month at midnight UTC

**Note:** Vercel Cron is available on **Pro plan and above**. For free tier, use external cron service (see below).

---

### 3. **Alternative: External Cron Service (Free Tier)**

If on Vercel Free tier, use [cron-job.org](https://cron-job.org) or similar:

**Daily Job:**
- URL: `https://your-domain.com/api/cron/daily-workflows`
- Schedule: `0 0 * * *` (daily at midnight)
- Header: `Authorization: Bearer YOUR_CRON_SECRET`

**Monthly Job:**
- URL: `https://your-domain.com/api/cron/monthly-workflows`
- Schedule: `0 0 1 * *` (1st of month)
- Header: `Authorization: Bearer YOUR_CRON_SECRET`

---

### 4. **Create GHL Workflows**

For each event type, create a workflow in GoHighLevel:

1. Go to **Automations** → **Workflows**
2. Click **Create Workflow**
3. Choose **Webhook** as trigger (for real-time events)
4. OR choose **Tag Applied** (for scheduled events)
5. Build your automation sequence
6. Save and activate

---

## 🧪 **Testing**

### Test Cron Jobs Manually

```bash
# Test daily workflows
curl -X GET "http://localhost:3010/api/cron/daily-workflows" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Test monthly workflows
curl -X GET "http://localhost:3010/api/cron/monthly-workflows" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Test Webhook Events

Already tested! Your webhooks are configured and working:
- ✅ Signup webhook
- ✅ First scan webhook
- ✅ High severity webhook

---

## 📊 **Events Timeline**

| Time | Event | Description |
|------|-------|-------------|
| **Immediate** | User Signup | New account created |
| **Immediate** | First Scan | User completes first scan |
| **Immediate** | High Severity | Critical threat detected |
| **Day 3** | Onboarding Incomplete | No products/scans yet |
| **Day 7** | Onboarding Incomplete | Still not active (2nd reminder) |
| **Day 7** | Inactive User | No login in 7 days |
| **Day 11** | Trial Ending Soon | 3 days before expiration |
| **Day 14** | Trial Expired | Day after trial ends |
| **Day 14** | Inactive User | No login in 14 days (escalation) |
| **Monthly** | Health Check | Usage report sent |

---

## 🔒 **Security**

**Cron endpoints are secured with:**
- Bearer token authentication (`CRON_SECRET`)
- Only accessible via authorized requests
- No public access

**Best Practices:**
- Use strong random secret (32+ characters)
- Store in environment variables only
- Never commit to version control
- Rotate periodically

---

## 📈 **Metrics to Track in GHL**

**User Engagement:**
- Trial conversion rate
- Time to first scan
- Re-engagement success rate

**Product Usage:**
- Average scans per user
- DMCA notices sent
- Infringements resolved

**Workflow Performance:**
- Email open rates by workflow
- Click-through rates
- Conversion rates per sequence

---

## 🆘 **Troubleshooting**

### Cron jobs not running?

1. Check Vercel deployment logs
2. Verify `vercel.json` is committed
3. Ensure environment variables are set in Vercel
4. Check if on Pro plan (required for Vercel Cron)

### Events not showing in GHL?

1. Check console logs for `[GHL Events]` messages
2. Verify `GHL_API_KEY` and `GHL_LOCATION_ID` are correct
3. Test API connection manually
4. Check GHL contact exists

### Webhooks not triggering?

1. Verify webhook URLs are correct
2. Check GHL workflow is active
3. Test webhook with curl (see examples above)
4. Review GHL webhook logs

---

## 💡 **Pro Tips**

1. **Start Simple:** Begin with 2-3 workflows, then expand
2. **Monitor Performance:** Track which workflows drive engagement
3. **A/B Test:** Try different messaging and timing
4. **Segment Users:** Use tags to personalize workflows
5. **Avoid Spam:** Don't trigger too frequently (use daily limits)

---

## 🚀 **Next Steps**

1. ✅ Add environment variables to Vercel
2. ✅ Deploy updated code
3. ✅ Create workflows in GHL
4. ✅ Test one workflow end-to-end
5. ✅ Monitor and optimize

---

**Need help setting up a specific workflow?** Let me know which one you'd like to start with!
