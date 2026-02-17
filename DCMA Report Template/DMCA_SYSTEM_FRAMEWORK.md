# DMCA Notice Generation System — Framework Reference

This document describes the architecture and rules for ProductGuard.ai's DMCA takedown notice generation system. Use this as context when building or modifying the DMCA workflow.

---

## System Overview

The DMCA system takes data from three sources (user profile, product record, detected infringement) and produces a legally complete DMCA takedown notice formatted for the specific service provider hosting the infringing content. Every notice runs through a quality checker before output.

```
[User Profile] + [Product Record] + [Infringement Detection]
        ↓
   Input Validation (Zod schemas)
        ↓
   Provider Resolution (URL → abuse contact)
        ↓
   Profile Selection (infringement type → legal framing)
        ↓
   Notice Generation (structured template assembly)
        ↓
   Quality Check (hard errors + soft warnings + score)
        ↓
   Output (text notice + subject line + metadata)
```

---

## Data Model

### Rights Holder (from user profile)
- `ownerLegalName` — required, used in ownership statement + signature
- `agentName` / `agentRelationship` — optional, for authorized representatives
- `companyName` — optional
- `mailingAddress` — required (§512 compliance)
- `email` — required
- `phone` — optional but recommended
- `preferredContact` — email or phone

### Copyrighted Work (from product record)
- `title` — required
- `type` — enum: video_course, ebook, pdf, software, images, audio, slides, trading_indicator, template, digital_asset, other
- `creationDate` — required
- `firstPublicationDate` — optional
- `originalUrls` — required, at least one (the legitimate product page)
- `fileNames` — optional internal identifiers
- `copyrightRegNumber` — optional but strengthens notice
- `uniqueMarkers` — optional (watermarks, logos, distinctive phrases)
- `description` — required, minimum 20 chars, describes what the work is and why it's protectable

### Infringing Material (from scan results + user input)
- `infringingUrls` — required, at least one exact URL
- `mirrorUrls` — optional alternate/cached copies
- `directFileUrls` — optional direct download links
- `redirectUrls` — optional gateway/redirector URLs
- `profile` — enum, see Infringement Profiles below
- `description` — required, factual description of what was found
- `comparisonItems` — required, 1-10 mappings of original asset → infringing location (3-8 recommended for strongest notices)
- `matchingImages` — optional list of matched image names
- `matchingTextSnippets` — optional short identifying excerpts

### Evidence Packet (optional, supplemental)
- `screenshotUrl` — link to preserved screenshots
- `captureTimestamp` / `captureTimezone`
- `screenshotHash` / `originalFileHash` / `infringingFileHash` — SHA-256
- `hostingProvider` / `ipAddresses` / `registrar` / `cdn`

### Service Provider (resolved automatically or entered manually)
- `name` — required
- `dmcaContact` — required, email address or web form URL

---

## Infringement Profiles

The generator selects legally precise framing language based on the type of infringement. Each profile maps to different §106 rights being violated.

| Profile | Legal Basis | Use When |
|---|---|---|
| `full_reupload` | reproduction, distribution, and public display in entirety | Complete mirror of the product |
| `copied_text` | reproduction and public display of substantial textual content | Sales page scrape, blog duplication |
| `copied_images` | reproduction and public display of copyrighted visual assets | Stolen screenshots, graphics, creatives |
| `leaked_download` | unauthorized reproduction and distribution of digital files | File on cyberlocker, Telegram, torrent |
| `unauthorized_resale` | unauthorized reproduction, distribution, and commercial exploitation | Listed for sale without license |
| `partial_copy` | reproduction and public display of substantial portions | Module rips, excerpts, paywall bypass |

### Mapping from scan data to profile
- Telegram channel/group/bot → `leaked_download`
- Google indexed page → `full_reupload`
- Cyberlocker / direct download → `leaked_download`
- Torrent → `leaked_download`
- Discord server → `leaked_download`
- Forum post → `copied_text`
- Social media post → `copied_text`
- Marketplace listing → `unauthorized_resale`

---

## Notice Structure (7 Sections)

Every generated notice follows this structure:

### A) Notifier / Rights Holder
Identity and contact information for the copyright owner or authorized agent.

### B) Copyrighted Work Claimed to Be Infringed
Title, type, creation date, original URLs, identifiers, description, and ownership statement. The ownership statement always reads: "No authorization has been granted to the infringing party to reproduce, distribute, display, sell, or create derivative works from this content."

### C) Infringing Material and Location(s)
Profile-specific legal basis statement, exact infringing URLs (one per line), mirror/direct/redirect URLs if available, factual infringement description, and the comparison summary mapping original assets to infringing locations.

### D) Evidence Packet (optional)
Only included when evidence data is provided. Screenshots, timestamps, file hashes, hosting identifiers. Always noted as supplemental.

### E) Required DMCA Statements (17 U.S.C. §512(c)(3))
Two verbatim statements that must appear in every notice:
1. Good faith belief statement
2. Accuracy and authority under penalty of perjury statement

### F) Requested Action
Standard request to remove or disable access pursuant to §512(c), including a request to handle additional copies on the same service.

### G) Electronic Signature
Format: `/ Full Legal Name /` followed by name, title, company, date.

---

## Quality Checker

Every notice is scored before output. The checker produces: pass/fail, numeric score (0-100), hard errors, and soft warnings.

### Hard Errors (blocks sending)
These are the six legally required elements under §512(c)(3):
- Rights holder identity with address + email
- Copyrighted work title + description + original URL
- Explicit infringing URL list
- Good faith statement (auto-included by generator)
- Perjury/accuracy statement (auto-included by generator)
- Electronic signature fields

If any are missing, the notice fails validation.

### Soft Warnings (notice is weaker but sendable)
- Fewer than 3 comparison mappings
- No evidence packet
- No copyright registration number
- No unique markers
- No phone number
- Aggressive/threatening language in description

### Scoring
- Start at 100
- -15 per hard error
- -4 per soft warning
- +5 for 3+ comparison mappings
- +5 for evidence packet
- +3 for copyright registration

### Strength Rating
- **Strong**: passed + score ≥ 85 + ≤ 2 warnings
- **Standard**: passed + score ≥ 60
- **Weak**: failed or score < 60

---

## Provider Resolution

The system maintains a database of known platform DMCA contacts. When an infringing URL is detected, the system attempts to auto-resolve the correct abuse contact from the URL domain.

### Known Providers
| Platform | Contact |
|---|---|
| Telegram | dmca@telegram.org |
| Discord | copyright@discord.com |
| Google (Search) | support.google.com/legal/troubleshooter/1114905 |
| Google (Drive) | same as above |
| MEGA | mega.nz/copyright |
| MediaFire | copyright@mediafire.com |
| Dropbox | copyright@dropbox.com |
| Cloudflare | abuse.cloudflare.com |
| Namecheap | abuse@namecheap.com |
| GoDaddy | abuse@godaddy.com |
| DigitalOcean | abuse@digitalocean.com |
| TikTok | tiktok.com/legal/report/Copyright |
| Reddit | reddithelp.com DMCA form |
| YouTube | youtube.com/copyright_complaint_form |
| Facebook/Meta | facebook.com DMCA form |

### Resolution fallback
If the URL doesn't match a known platform, fall back to WHOIS API lookup to find the hosting provider's abuse contact. If WHOIS also fails, prompt the user to enter the provider manually.

---

## Tone & Language Rules

These rules ensure notices get processed quickly and aren't rejected:

1. **Always factual and neutral** — never use "criminal," "theft," "steal," "illegal," "sue," or "prosecute"
2. **Never claim "no license exists"** — instead say "No authorization has been granted to this party"
3. **Never accuse intentional wrongdoing** — state unauthorized use, not intent
4. **Keep comparison bullets factual** — "Original: [X] → Infringing: [Y]" format
5. **Don't include private data beyond what's needed** for the notice
6. **Make the host's job effortless** — separate original URLs and infringing URLs into clearly labeled lists, include comparison bullets, keep it scannable

---

## One-Click Takedown Flow

This is the "happy path" for the dashboard takedown button:

1. User clicks takedown on a detected infringement
2. System pulls: user profile (rights holder info), product record (work details), infringement record (URLs, platform, type)
3. System auto-resolves provider from the infringing URL
4. System maps the infringement type to an infringement profile
5. System generates the notice with all sections populated
6. Quality checker runs — if hard errors exist (e.g. user hasn't filled out their mailing address), prompt user to complete their profile
7. Notice is saved to `takedowns` table as status `draft`
8. User reviews and confirms
9. If provider contact is an email → send via Resend/Postmark, update status to `sent`
10. If provider contact is a web form → show the notice for copy/paste, update status to `sent` on user confirmation
11. System tracks removal status on subsequent scans

---

## Database Integration

### Takedowns table row shape
```
id                — uuid
infringement_id   — FK to infringements table
user_id           — FK to users/profiles
type              — enum: dmca, cease_desist, google_deindex
status            — enum: draft, sent, acknowledged, removed, failed
sent_at           — timestamp, null until sent
resolved_at       — timestamp, null until confirmed removed
recipient_email   — provider's DMCA contact
notice_content    — full text of generated notice
quality_score     — 0-100 from quality checker
provider_name     — resolved provider name
```

### Status transitions
```
draft → sent → acknowledged → removed
draft → sent → failed
draft → sent → acknowledged → failed
```

---

## Future Enhancements

- **Cease & desist letter generator** — separate template, more formal, for direct-to-infringer communication
- **Google de-indexing requests** — specialized format for Google URL Removal API
- **Batch generation** — generate notices for multiple infringements across different providers in one action
- **Evidence packet auto-generation** — screenshots via headless browser, file hash computation, hosted evidence bundles
- **WHOIS integration** — automatic hosting provider + registrar lookup for unknown domains
- **Submission tracking** — automated follow-up emails if no response within configurable timeframe
- **Attorney escalation** — flag cases where takedowns fail repeatedly for referral to IP attorney network
