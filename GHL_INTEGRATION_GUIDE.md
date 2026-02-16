# GoHighLevel (GHL) Integration Guide

This guide explains how to connect ProductGuard.ai with GoHighLevel for automated marketing, user nurturing, and event notifications.

---

## 📋 Overview

The GHL integration automatically tracks user behavior and syncs contacts to your GoHighLevel CRM, enabling:

✅ **Automated Trial Nurturing** - Welcome sequences, usage tips, trial expiry reminders
✅ **Event-Based Workflows** - Trigger automations based on user actions
✅ **Smart Tagging** - Auto-tag users based on behavior (power users, inactive, etc.)
✅ **Custom Notifications** - Alert users about high-severity infringements
✅ **Marketing Campaigns** - Target users based on activity level

---

## 🔑 Getting Your GHL Credentials

### 1. Get Your API Key

1. Log in to your GoHighLevel account
2. Go to **Settings** → **API Key**
3. Click **Create API Key** or copy your existing one
4. Save this key securely

### 2. Get Your Location ID

1. In GoHighLevel, go to **Settings** → **Company Profile**
2. Your **Location ID** is displayed at the top
3. Copy this ID

### 3. Add to Environment Variables

Open `.env.local` and add:

```bash
# Required
GHL_API_KEY=your_actual_api_key_here
GHL_LOCATION_ID=your_actual_location_id_here

# Optional - for custom workflows
GHL_WEBHOOK_SIGNUP=https://services.leadconnectorhq.com/hooks/xxxxx
GHL_WEBHOOK_FIRST_SCAN=https://services.leadconnectorhq.com/hooks/xxxxx
GHL_WEBHOOK_HIGH_SEVERITY=https://services.leadconnectorhq.com/hooks/xxxxx
```

### 4. Restart Your Server

```bash
npm run dev
```

---

## 📊 Events Tracked Automatically

The integration automatically tracks these events:

| Event | When It Fires | Tags Added | Use Case |
|-------|---------------|------------|----------|
| **User Signup** | New account created | `trial-user`, `needs-onboarding` | Welcome sequence, onboarding emails |
| **Trial Started** | User subscription starts | `trial-user` | Trial nurturing campaign |
| **First Scan** | User completes first scan | `first-scan-complete`, `engaged-user` | Engagement tracking, remove from onboarding |
| **Scan Completed** | Any scan finishes | `active-scanner` | Activity monitoring |
| **High Severity Infringement** | Critical threat detected (score ≥80) | `high-severity-alert`, `has-infringements` | Urgent notification workflow |
| **Infringement Verified** | User confirms infringement | `has-infringements`, `engaged-user` | Track protection activity |
| **DMCA Generated** | AI DMCA notice created | `dmca-sender`, `proactive-protector`, `power-user` | Identify power users |

---

## 🏷️ Auto-Tags Reference

These tags are automatically applied based on user behavior:

### User Status
- `trial-user` - Currently in trial period
- `active-user` - Paid subscriber
- `inactive-user` - No activity in 30 days
- `cancelled-user` - Subscription cancelled

### Product Activity
- `has-products` - Added at least one product
- `first-scan-complete` - Completed first scan
- `active-scanner` - Regular scanner (3+ scans/month)

### Infringement Activity
- `has-infringements` - Found at least one infringement
- `high-severity-alert` - Has critical threats
- `dmca-sender` - Sent DMCA notices
- `proactive-protector` - Regular user of protection tools

### Engagement
- `engaged-user` - Active platform usage
- `needs-onboarding` - New user, hasn't scanned yet
- `power-user` - Frequent usage, multiple features

---

## 🔔 Setting Up Workflows (Optional)

### 1. Create Webhook-Triggered Workflows

In GoHighLevel:

1. Go to **Automations** → **Workflows**
2. Click **Create Workflow**
3. Choose **Webhook** as the trigger
4. Copy the webhook URL
5. Add to `.env.local` (e.g., `GHL_WEBHOOK_SIGNUP`)

### Example Workflows

#### Welcome Sequence (Signup Webhook)
```
Trigger: New user signup webhook
Actions:
1. Wait 5 minutes
2. Send welcome email
3. Wait 1 day
4. If tag "first-scan-complete" missing → Send "Getting Started" SMS
5. Wait 2 days
6. If tag "engaged-user" missing → Send "Need Help?" email
```

#### High Severity Alert (High Severity Webhook)
```
Trigger: High severity infringement webhook
Actions:
1. Send urgent SMS notification
2. Send email with DMCA guide
3. Add to "Needs Support" pipeline
```

#### Trial Ending Soon
```
Trigger: Tag "trial-user" + custom field "trial_end_date" within 3 days
Actions:
1. Send "Trial ending" email
2. Wait 1 day
3. Send upgrade offer SMS
4. Add to "Hot Leads" pipeline
```

---

## 📈 Custom Fields Reference

These custom fields are automatically updated in GHL:

| Field | Description | Example Value |
|-------|-------------|---------------|
| `trial_end_date` | When trial expires | `2026-03-01` |
| `total_products` | Number of products added | `3` |
| `total_scans` | Total scans run | `12` |
| `total_infringements` | Verified infringements | `8` |
| `total_dmca_sent` | DMCA notices generated | `5` |
| `last_login` | Last login date | `2026-02-16` |
| `last_scan` | Last scan date | `2026-02-15` |
| `account_created` | Signup date | `2026-02-01` |
| `subscription_status` | Current status | `trial`, `active`, `cancelled` |

---

## 🧪 Testing the Integration

### 1. Test User Signup

1. Create a new account on ProductGuard.ai
2. Check GHL - new contact should appear with tags:
   - `trial-user`
   - `needs-onboarding`

### 2. Test First Scan

1. Add a product
2. Run your first scan
3. Check GHL - tags should update:
   - Removed: `needs-onboarding`
   - Added: `first-scan-complete`, `engaged-user`, `active-scanner`

### 3. Test High Severity

1. Wait for a scan to find high-severity results (score ≥ 80)
2. Check GHL - should trigger high severity workflow
3. Tag `high-severity-alert` should be added

### 4. Test DMCA Generation

1. Verify an infringement
2. Generate a DMCA notice
3. Check GHL - tags should include:
   - `dmca-sender`
   - `proactive-protector`
   - `power-user`

---

## 🔧 Troubleshooting

### Events Not Syncing?

**Check Console Logs:**
```bash
# Look for GHL-related logs in terminal
[GHL Events] Tracking event: user.signup for user...
[GHL Client] Upserting contact: user@example.com
```

**Common Issues:**
- ❌ Invalid API key → Check `.env.local` has correct `GHL_API_KEY`
- ❌ Invalid Location ID → Verify `GHL_LOCATION_ID` matches your account
- ❌ Rate limiting → GHL API has rate limits; events will retry automatically
- ❌ Contact not found → Check email is valid and user has email verified

**Disable GHL (Testing):**
```bash
# Remove or comment out in .env.local
# GHL_API_KEY=...
# GHL_LOCATION_ID=...
```

Events will be logged but not sent to GHL.

---

## 📊 Monitoring Integration Health

### View Logs in Development

```bash
npm run dev

# Watch for GHL events:
[GHL Events] Tracking event: user.signup for user@example.com
[GHL Client] Creating new contact: user@example.com
[GHL Client] Adding tags to contact: abc123 ['trial-user']
[GHL Events] Successfully tracked user.signup
```

### Check GHL Dashboard

1. Go to **Contacts** in GHL
2. Search for recent signups
3. Verify tags and custom fields are populated
4. Check **Activity** tab for API events

---

## 🚀 Advanced Usage

### Custom Event Tracking

You can manually track custom events in your code:

```typescript
import { trackEvent } from '@/lib/ghl/events';

// Track custom event
await trackEvent({
  type: 'product.created', // Custom event type
  userId: user.id,
  email: user.email,
  data: {
    productName: 'My Product',
    productType: 'digital_download',
  },
  tags: ['has-products'],
  customFields: {
    total_products: 5,
  },
});
```

### Trigger Custom Workflows

```typescript
import { getGHLClient } from '@/lib/ghl/ghl-client';

const client = getGHLClient();
if (client) {
  await client.triggerWorkflow(
    'https://services.leadconnectorhq.com/hooks/your-webhook-url',
    {
      email: user.email,
      eventType: 'custom_event',
      data: { /* custom data */ },
    }
  );
}
```

---

## 💰 Cost

**GHL Integration:** Free to use (part of your GHL subscription)
**API Calls:** Minimal cost per month
**Typical Usage:**
- ~100-500 API calls/day for active users
- Within GHL's generous rate limits

---

## 📚 Resources

- [GoHighLevel API Docs](https://highlevel.stoplight.io/docs/integrations/)
- [GHL Webhooks Guide](https://help.gohighlevel.com/support/solutions/articles/48001182926)
- [GHL Workflows](https://help.gohighlevel.com/support/solutions/folders/48000680396)

---

## 🆘 Support

Need help? Check:
1. Console logs for error messages
2. GHL contact was created successfully
3. API key permissions are correct
4. Webhooks are pointing to correct endpoints

**Still stuck?** Contact support with:
- Error messages from console
- Steps to reproduce
- Environment (dev/production)
