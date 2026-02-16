# DMCA Takedown Tracking & Monitoring System

## Overview

ProductGuard.ai now includes a comprehensive DMCA case tracking and automated monitoring system that allows users to:

- **Customize email recipients** for each DMCA notice
- **Track full case timeline** from discovery to resolution
- **Automatically monitor URLs** weekly to verify takedown effectiveness
- **Measure platform response rates** and identify cases needing escalation

---

## Features

### 1. Customizable Email Recipients

**Form Step 4: Email Configuration**

- **Auto-detected recipient**: Platform-specific abuse contacts automatically populated
- **Edit recipient email**: Modify the auto-detected email or enter custom recipient
- **Copy self**: Checkbox to automatically CC yourself on the notice
- **Additional CC recipients**: Add multiple comma-separated emails

**Benefits:**
- Full control over who receives your DMCA notices
- Keep yourself in the loop with automatic CC
- Include legal team, managers, or other stakeholders

---

### 2. Comprehensive Case Timeline

**Tracked Milestones:**
- **First Discovered**: When the infringement was initially detected by scan
- **User Verified**: When you manually verified the infringement as legitimate
- **DMCA Submitted**: When the takedown notice was sent
- **Last Checked**: When the URL status was last verified
- **Next Check**: Scheduled date for next automatic URL check

**Stored Data:**
```typescript
{
  discovered_at: timestamp,      // From first_seen_at in infringement
  verified_at: timestamp,        // When user clicked "Verify"
  verified_by: user_id,          // Which user verified it
  submitted_at: timestamp,       // When DMCA was sent
  last_checked_at: timestamp,    // Last URL check
  next_check_at: timestamp       // Next scheduled check (7 days later)
}
```

---

### 3. Automated Weekly URL Monitoring

**How It Works:**

1. **Automatic Checks**: Every Sunday at 2:00 AM UTC, a cron job runs `/api/takedowns/check-urls`
2. **URL Status Detection**:
   - `removed` (404, 410, 403) → ✓ Success! Content taken down
   - `active` (200-299) → ⚠️ Still online, platform hasn't acted yet
   - `redirected` (301, 302, 307, 308) → Partial success, content moved
   - `error` → Technical error during check
   - `timeout` → Site not responding

3. **Database Updates**:
   - Updates `url_status`, `last_checked_at`, `check_count`
   - Automatically schedules `next_check_at` for 7 days later
   - If status = `removed`, stops future checks and marks infringement as resolved

4. **Infringement Status Sync**: When URL status becomes `removed`, the linked infringement automatically updates to `status = 'removed'`

**Manual Checks:**
- Users can click **"🔍 Check URL Status"** button on any takedown
- Instantly checks if the infringing content is still online
- Updates monitoring data in real-time

---

### 4. Effectiveness Tracking & Alerts

**Visual Indicators on Takedown Detail Page:**

- **✓ Success Badge**: Green when `url_status = removed`
- **⚠️ Warning Badge**: Yellow when `url_status = active` for 14+ days
- **Days Since Submission**: Shows how long the case has been pending
- **Escalation Prompt**: Alerts when no action after 14 days

**Example Alert:**
```
💡 This takedown has been pending for over 14 days.
Consider following up or escalating.
```

---

## Database Schema

### New Columns in `takedowns` Table

```sql
-- Email tracking
recipient_email TEXT,              -- Primary recipient (abuse@platform.com)
cc_emails TEXT[],                  -- Array of CC recipients
infringing_url TEXT,               -- The URL being reported

-- Timeline tracking
discovered_at TIMESTAMPTZ,         -- When infringement first detected
verified_at TIMESTAMPTZ,           -- When user verified infringement
verified_by UUID,                  -- User ID who verified
submitted_at TIMESTAMPTZ,          -- When DMCA was submitted

-- Monitoring
last_checked_at TIMESTAMPTZ,       -- Last URL status check
next_check_at TIMESTAMPTZ,         -- Next scheduled check (auto-set to +7 days)
url_status url_check_status,       -- Enum: pending_check, active, removed, redirected, error, timeout
check_count INTEGER,               -- Number of times URL has been checked
effectiveness_notes TEXT           -- Optional notes about case progress
```

### Materialized View: `takedown_effectiveness`

Provides analytics on DMCA effectiveness:

```sql
SELECT
  infringement_id,
  infringing_url,
  platform,
  days_since_submission,
  url_status,
  check_count,
  effectiveness_status  -- successful | partial | needs_escalation | pending | unknown
FROM takedown_effectiveness
WHERE user_id = current_user;
```

---

## API Endpoints

### POST `/api/takedowns/check-urls`

**Purpose**: Automated cron job endpoint (runs weekly)

**Authentication**: Requires `Bearer {CRON_SECRET}` in Authorization header

**Returns**:
```json
{
  "success": true,
  "checked": 47,
  "summary": {
    "removed": 23,
    "active": 18,
    "redirected": 4,
    "error": 2
  }
}
```

### POST `/api/takedowns/[id]/check-url`

**Purpose**: Manual URL check for specific takedown

**Authentication**: Requires authenticated user

**Returns**:
```json
{
  "success": true,
  "url_status": "removed",
  "message": "✓ Success! The infringing content has been removed."
}
```

---

## Cron Configuration

**File**: `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/takedowns/check-urls",
      "schedule": "0 2 * * 0"
    }
  ]
}
```

**Schedule**: Every Sunday at 2:00 AM UTC

**To Deploy**:
1. Set environment variable `CRON_SECRET` in Vercel dashboard
2. Push changes to trigger deployment
3. Cron will automatically start running on schedule

---

## User Workflow

### Creating a DMCA Takedown

1. **Navigate**: Click "Send DMCA Notice" from infringement detail page
2. **Step 1**: Select product, enter IP ownership info, contact details
3. **Step 2**: Choose infringement types (exact recreation, trademark, etc.)
4. **Step 3**: Review auto-populated evidence, add additional details
5. **Step 4**:
   - Review auto-detected platform email
   - Edit recipient if needed
   - Check "Copy myself" to receive CC
   - Add other CC recipients (legal team, etc.)
   - Select tone (professional, formal legal, urgent, friendly firm)
6. **Submit**: Creates takedown record with full tracking enabled

### Monitoring Takedown Progress

1. **View Takedown List**: `/dashboard/takedowns`
2. **Click Takedown**: Opens detail page showing:
   - Status & Timeline card (discovered → verified → submitted)
   - URL Monitoring card (current status, last check, next check, days pending)
   - Email Recipients card (to, cc list)
   - Full DMCA notice content

3. **Manual URL Check**: Click "🔍 Check URL Status" to verify immediately

4. **Effectiveness Indicators**:
   - ✓ **Green "Removed"** = Success! Your DMCA worked
   - ⚠️ **Yellow "Active (14+ days)"** = Consider escalating
   - 🔄 **"Redirected"** = Partial success, review new URL

---

## Platform Response Tracking

The system tracks which platforms respond best to DMCA notices:

**Fast Responders** (typically 1-3 days):
- GitHub
- Etsy
- eBay
- Amazon
- Instagram
- Facebook

**Medium Responders** (3-7 days):
- TradingView
- Reddit
- MediaFire
- Dropbox

**Slow Responders** (7-14+ days):
- MQL5
- ProRealCode
- Telegram
- MEGA
- Forex Station forums

**Escalation Strategy**: If no response after 14 days, consider:
1. Following up with another notice
2. Contacting platform's legal department directly
3. Filing with Google Search de-indexing
4. Consulting legal counsel for next steps

---

## Effectiveness Metrics

View overall performance in takedown_effectiveness view:

```sql
-- See success rate by platform
SELECT
  platform,
  COUNT(*) as total_takedowns,
  COUNT(*) FILTER (WHERE url_status = 'removed') as successful,
  ROUND(AVG(days_since_submission), 1) as avg_days_to_removal
FROM takedown_effectiveness
GROUP BY platform
ORDER BY successful DESC;
```

---

## Security & Privacy

- **RLS Enabled**: Users can only see their own takedowns
- **Cron Secret**: Automated checks require secret token
- **No Auto-Send**: DMCAs are never sent automatically without user confirmation
- **Email Privacy**: CC emails stored securely, never exposed in logs
- **URL Monitoring**: Uses HEAD requests (faster, less invasive than GET)

---

## Future Enhancements

Potential additions to the tracking system:

- **Email delivery confirmation** tracking
- **Platform response logging** (track replies to DMCAs)
- **Bulk URL checks** for multiple takedowns
- **Effectiveness dashboard** with charts and analytics
- **Automated escalation reminders** via email
- **Integration with legal case management** systems
- **Export takedown reports** for legal proceedings

---

## Troubleshooting

**Q: URL check shows "error" status**
- Site may be temporarily down
- Firewall blocking automated requests
- Try manual check with browser first

**Q: URL showing "active" but content is actually removed**
- Platform may return 200 status with "removed" page
- Manually verify by visiting URL
- Add note in effectiveness_notes field

**Q: Cron job not running**
- Verify CRON_SECRET environment variable is set
- Check Vercel deployment logs
- Ensure vercel.json is in repository root

**Q: Want to stop monitoring a specific URL**
- Update url_status to 'removed' manually
- next_check_at will automatically be set to NULL
- Or delete next_check_at to skip future checks

---

## Environment Variables

Required for production deployment:

```env
# Cron job authentication
CRON_SECRET=your-random-secret-here

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Summary

This DMCA tracking system transforms ProductGuard.ai from a detection tool into a complete IP protection platform. Users can now:

✅ Send customized DMCA notices with full email control
✅ Track complete case timelines from discovery to resolution
✅ Automatically monitor takedown effectiveness weekly
✅ Identify which platforms respond and which need escalation
✅ Measure ROI of DMCA efforts with hard data

**Result**: Users save time, increase takedown success rates, and have clear data on which infringement cases need legal escalation.
