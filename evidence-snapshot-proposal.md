# Infringement Evidence Snapshot System

## Core Components:

### A. Visual Evidence
- **Full Page Screenshot** - Automated via Puppeteer/Playwright
- **Above-the-fold capture** - What users see immediately
- **Scrolling capture** - Entire page if needed
- **Mobile + Desktop views** - Show it works on both

### B. Content Archive
- **Full HTML Snapshot** - Complete page source
- **Extracted Text** - Searchable content
- **Embedded Media URLs** - Videos, images, downloads
- **Archive.org Submission** - Third-party verification

### C. Technical Fingerprint
- **IP Address** - Server IP at time of detection
- **IP Geolocation** - Physical server location
- **SSL Certificate** - Cert details if HTTPS
- **HTTP Headers** - Server software, CDN info
- **DNS Records** - A, MX, NS records at detection time

### D. Cryptographic Proof
- **SHA256 Hash** - Hash of screenshot + HTML
- **Timestamp** - ISO 8601 with timezone
- **Blockchain Anchor** (optional) - Immutable timestamp proof
- **Digital Signature** - Prove evidence wasn't tampered

### E. Metadata
- **Detection Method** - How it was found
- **Scan ID** - Link to original scan
- **User Agent** - What browser was used
- **Response Time** - Page load time
- **HTTP Status** - 200, 301, etc.

## Implementation:

### Database Schema Addition:
```sql
CREATE TABLE infringement_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  infringement_id UUID REFERENCES infringements(id),
  
  -- Visual Evidence
  screenshot_url TEXT, -- S3/CloudFlare R2 URL
  screenshot_hash TEXT, -- SHA256 of image
  full_page_html TEXT, -- Compressed HTML
  
  -- Technical Data
  ip_address INET,
  ip_geolocation JSONB, -- {city, region, country, coords}
  ssl_certificate JSONB, -- {issuer, valid_from, valid_to, fingerprint}
  http_headers JSONB,
  dns_records JSONB,
  
  -- Timestamps
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Cryptographic Proof
  evidence_hash TEXT, -- Hash of all evidence combined
  archive_org_url TEXT, -- Wayback Machine link
  
  -- Metadata
  page_title TEXT,
  page_description TEXT,
  detected_content_type TEXT,
  response_code INTEGER,
  response_time_ms INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_snapshots_infringement ON infringement_snapshots(infringement_id);
CREATE INDEX idx_snapshots_captured ON infringement_snapshots(captured_at);
```

### API Endpoints:
- POST /api/infringements/[id]/capture - Trigger snapshot
- GET /api/infringements/[id]/snapshots - List all snapshots
- GET /api/snapshots/[id]/download - Download evidence package

### Evidence Package Export:
Generate a .zip file with:
- screenshots/ (PNG images)
- html/ (full HTML snapshots)
- metadata.json (all technical data)
- chain-of-custody.txt (signed log)
- README.txt (explanation for legal teams)

## When to Capture:
1. **First Detection** - Automatic on discovery
2. **Before Takedown** - Capture current state
3. **User Request** - Manual "Capture Evidence" button
4. **Re-verification** - After claimed removal

## Cost Considerations:
- **Puppeteer/Playwright** - Free (self-hosted)
- **Storage** - ~5MB per snapshot (S3/R2 ~$0.023/GB)
- **Archive.org** - Free API
- **IP Geolocation** - Free tier (ipapi.co, ip-api.com)

