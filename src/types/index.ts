// ============================================================================
// ENUMS
// ============================================================================

export type PlanTier = 'scout' | 'starter' | 'pro' | 'business';
export type ProductType = 'course' | 'indicator' | 'software' | 'template' | 'ebook' | 'other';
export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed';
export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';
export type PlatformType = 'telegram' | 'google' | 'cyberlocker' | 'torrent' | 'discord' | 'forum' | 'social';
export type InfringementType = 'channel' | 'group' | 'bot' | 'indexed_page' | 'direct_download' | 'torrent' | 'server' | 'post';
export type InfringementStatus = 'pending_verification' | 'active' | 'takedown_sent' | 'removed' | 'disputed' | 'false_positive' | 'archived';
export type Priority = 'P0' | 'P1' | 'P2';
export type MatchType = 'exact_hash' | 'near_hash' | 'keyword' | 'phrase' | 'partial' | 'manual';
export type ActionType =
  | 'dmca_platform'
  | 'dmca_host'
  | 'dmca_cdn'
  | 'google_deindex'
  | 'bing_deindex'
  | 'cease_desist'
  | 'payment_complaint'
  | 'marketplace_report'
  | 'manual_other';
export type NoticeTone = 'friendly' | 'firm' | 'nuclear';
export type EnforcementStatus =
  | 'draft'
  | 'sent'
  | 'acknowledged'
  | 'action_taken'
  | 'removed'
  | 'refused'
  | 'no_response'
  | 'failed';
export type TriggeredBy = 'system' | 'user' | 'cron' | 'webhook';
export type TakedownType = 'dmca' | 'cease_desist' | 'google_deindex';
export type TakedownStatus = 'draft' | 'sent' | 'acknowledged' | 'removed' | 'failed';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'unpaid';

// ============================================================================
// EVIDENCE & INFRASTRUCTURE TYPES
// ============================================================================

export interface EvidencePacket {
  screenshots: string[]; // URLs or paths to screenshot files
  matched_excerpts: string[]; // Text excerpts showing the match
  hash_matches: string[]; // Hash values that matched
  url_chain: string[]; // Redirect chain or related URLs
  detection_metadata: {
    [key: string]: any; // Flexible metadata from detection algorithms
  };
}

export interface InfrastructureProfile {
  // Hosting & Network
  hosting_provider: string | null;
  ip_address?: string | null;
  asn?: string | null; // Autonomous System Number
  asn_org?: string | null; // ASN Organization name

  // Location
  country?: string | null;
  region?: string | null;
  city?: string | null;

  // Domain Registration
  registrar: string | null;
  registrar_url?: string | null;
  creation_date?: string | null;
  expiration_date?: string | null;

  // CDN & DNS
  cdn: string | null;
  nameservers: string[];

  // Contacts
  abuse_contact: string | null;
  admin_email?: string | null;
  tech_email?: string | null;

  // Raw Data
  whois_data?: any; // Raw WHOIS data for reference
}

// ============================================================================
// DATABASE TYPES
// ============================================================================

export interface Profile {
  id: string; // UUID, references auth.users
  email: string;
  full_name: string | null;
  company_name: string | null;
  phone: string | null;
  address: string | null;
  dmca_reply_email: string | null;
  is_copyright_owner: boolean;
  plan_tier: PlanTier;
  stripe_customer_id: string | null;
  theme: 'light' | 'dark' | 'system';
  is_admin: boolean;
  email_threat_alerts: boolean;
  email_scan_notifications: boolean;
  email_takedown_updates: boolean;
  email_account_only: boolean;
  email_unsubscribe_all: boolean;
  email_preferences_token: string | null;
  created_at: string;
  updated_at: string;
}

export type CommunicationDirection = 'outbound' | 'inbound';
export type CommunicationChannel = 'email' | 'web_form' | 'manual';
export type CommunicationStatus = 'pending' | 'sent' | 'delivered' | 'bounced' | 'failed' | 'replied';

export interface Communication {
  id: string;
  user_id: string;
  infringement_id: string | null;
  takedown_id: string | null;
  direction: CommunicationDirection;
  channel: CommunicationChannel;
  from_email: string | null;
  to_email: string | null;
  reply_to_email: string | null;
  subject: string | null;
  body_preview: string | null;
  status: CommunicationStatus;
  external_message_id: string | null;
  provider_name: string | null;
  metadata: Record<string, any>;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// AI ANALYSIS TYPES
// ============================================================================

export interface ProductImage {
  url: string; // Supabase storage URL or external URL
  type: 'primary' | 'secondary' | 'uploaded';
  uploaded_at: string;
  size: number; // bytes
  hash: string; // SHA256 for reverse image search
  filename: string;
}

// ============================================================================
// INTELLECTUAL PROPERTY TYPES
// ============================================================================

export type IPType = 'copyright' | 'trademark' | 'patent' | 'trade_secret' | 'license';

export interface CopyrightInfo {
  registration_number?: string | null;
  year: string;
  holder_name: string;
}

export interface TrademarkInfo {
  name: string;
  registration_number?: string | null;
  country?: string | null;
}

export interface PatentInfo {
  number: string;
  type: 'utility' | 'design' | 'plant' | 'other';
}

export interface LicenseInfo {
  type: string; // e.g., "All Rights Reserved", "CC BY-NC", custom
  terms_url?: string | null;
}

export interface DMCAContact {
  full_name: string;
  company?: string | null;
  email: string;
  phone?: string | null;
  address: string; // Required for sworn statements
  is_copyright_owner: boolean;
  relationship_to_owner?: string | null; // If not owner: "Authorized Agent", "Licensee", etc.
}

export interface ExtractionMetadata {
  model: string; // e.g., "gpt-4o-mini"
  analyzed_at: string; // ISO timestamp
  confidence_scores: {
    [key: string]: number; // confidence per extraction type (0-1)
  };
  processing_time_ms?: number;
  tokens_used?: number;
}

export interface AIExtractedData {
  brand_identifiers: string[]; // Trademarked names, company names, product names
  unique_phrases: string[]; // Distinctive marketing copy, taglines
  keywords: string[]; // Industry terms, product features, specifications
  copyrighted_terms: string[]; // Terms with ©, ™, ® or explicitly copyrighted
  product_description: string | null; // AI-generated 2-sentence description for DMCA letters
  content_fingerprint: string; // Hash or unique identifier for content matching
  extraction_metadata: ExtractionMetadata;
}

export interface Product {
  id: string; // UUID
  user_id: string; // UUID, references profiles
  name: string;
  url: string | null;
  price: number; // numeric(10,2)
  type: ProductType;
  keywords: string[] | null;
  description: string | null;
  created_at: string;
  updated_at: string;

  // Enhanced fields for better detection
  product_image_url: string | null;
  alternative_names: string[] | null;
  brand_name: string | null;
  negative_keywords: string[] | null;
  whitelist_domains: string[] | null;
  whitelist_urls: string[] | null;
  authorized_sellers: string[] | null;
  release_date: string | null;
  min_price_threshold: number | null;
  unique_identifiers: string[] | null;
  file_hash: string | null;
  copyright_number: string | null;
  copyright_owner: string | null;

  // Intellectual Property Protection
  ip_types: IPType[] | null;
  copyright_info: CopyrightInfo | null;
  trademark_info: TrademarkInfo | null;
  patent_info: PatentInfo | null;
  license_info: LicenseInfo | null;

  // DMCA Contact Information
  dmca_contact: DMCAContact | null;

  tags: string[] | null;
  language: string | null;
  internal_notes: string | null;

  // AI-powered analysis fields
  full_text_content: string | null; // Complete page text for comparison
  ai_extracted_data: AIExtractedData | null; // AI-extracted structured data
  product_images: ProductImage[]; // Array of uploaded images
  ai_analysis_version: number; // Version tracker for re-analysis
  last_analyzed_at: string | null; // Cache invalidation timestamp
}

export interface ProductWithStats extends Product {
  infringement_count?: number;
  pending_count?: number;
  active_count?: number;
  last_scan_at?: string | null;
}

export type ScanStageStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface ScanStage {
  name: string;
  display_name: string;
  status: ScanStageStatus;
  started_at: string | null;
  completed_at: string | null;
  result_count?: number;
}

export interface ScanProgress {
  current_stage: string | null;
  stages: ScanStage[];
}

export interface Scan {
  id: string; // UUID
  product_id: string; // UUID, references products
  user_id: string; // UUID, references profiles
  status: ScanStatus;
  started_at: string | null;
  completed_at: string | null;
  infringement_count: number;
  est_revenue_loss: number; // numeric(10,2)
  scan_progress: ScanProgress | null;
  last_updated_at: string;
  created_at: string;

  // Living scan fields (for delta detection)
  run_count: number; // Number of times this scan has been run
  last_run_at: string; // Most recent run timestamp
  initial_run_at: string; // When scan was first created
}

export interface ScanHistory {
  id: string; // UUID
  scan_id: string; // UUID, references scans
  run_number: number; // Sequential run number
  run_at: string; // When this run happened

  // Metrics for this run
  new_urls_found: number; // URLs discovered this run
  total_urls_scanned: number; // Total URLs checked
  new_infringements_created: number; // New threats added

  // Resource savings from delta detection
  api_calls_saved: number; // WHOIS/infrastructure lookups skipped
  ai_filtering_saved: number; // AI calls skipped for known URLs

  // Performance
  duration_seconds: number | null; // How long this run took

  // Run details
  platforms_searched: string[] | null; // Which platforms were searched
  search_queries_used: string[] | null; // Queries executed

  // Timestamps
  created_at: string;
  updated_at: string;
}

// ============================================================================
// SCAN LOG TYPES
// ============================================================================

export type ScanLogLevel = 'info' | 'warn' | 'error' | 'fatal';

export type ScanLogStage =
  | 'initialization' | 'keyword_search' | 'trademark_search'
  | 'marketplace_scan' | 'platform_scan' | 'phrase_matching'
  | 'finalization' | 'notification' | 'cleanup';

export type ScanErrorCode =
  | 'TIMEOUT' | 'API_LIMIT' | 'SERP_ERROR' | 'SERP_429'
  | 'AI_FILTER_FAIL' | 'DB_INSERT_FAIL' | 'DB_BATCH_FAIL'
  | 'TELEGRAM_FAIL' | 'EVIDENCE_FAIL' | 'GHL_FAIL' | 'EMAIL_FAIL' | 'UNKNOWN';

export interface ScanLogEntry {
  id: string;
  scan_id: string;
  product_id: string;
  user_id: string;
  log_level: ScanLogLevel;
  stage: ScanLogStage;
  message: string;
  error_code: ScanErrorCode | null;
  error_details: Record<string, unknown> | null;
  scan_params: Record<string, unknown> | null;
  metrics: Record<string, unknown> | null;
  self_healed: boolean;
  heal_action: string | null;
  created_at: string;
}

export interface ProductScanStatus {
  product_id: string;
  product_name: string;
  scan_id: string | null;
  scan_status: ScanStatus | null;
  run_count: number | null;
  first_scanned_at: string | null;
  last_run_at: string | null;
  total_infringements: number | null;

  // Infringement counts by status
  pending_verification_count: number;
  active_count: number;
  resolved_count: number;
  false_positive_count: number;

  // Recent run stats
  last_run_new_infringements: number | null;
  last_run_api_savings: number | null;
}

export interface Infringement {
  id: string; // UUID
  scan_id: string; // UUID, references scans
  product_id: string; // UUID, references products
  user_id: string; // UUID, references profiles
  platform: PlatformType;
  source_url: string;
  risk_level: RiskLevel;
  type: InfringementType;

  // URL deduplication fields
  url_hash: string | null; // SHA256 hash of normalized URL
  url_normalized: string | null; // Normalized URL for display
  first_seen_at: string; // When first detected
  last_seen_at: string; // Most recent scan that found it
  seen_count: number; // Number of times detected across scans

  // Verification tracking
  verified_by_user_at: string | null; // When user manually verified
  verified_by_user_id: string | null; // User who verified it

  // Priority and severity scoring
  severity_score: number; // 0-100
  priority: Priority; // P0, P1, P2

  // Match quality fields
  match_type: MatchType;
  match_confidence: number; // 0.00-1.00
  match_evidence: string[];

  // Audience and impact
  audience_size: string | null; // e.g. "12,400 members" or "2,100 visits/mo"
  audience_count: number; // Numeric count for sorting/filtering
  monetization_detected: boolean;
  est_revenue_loss: number; // numeric(10,2)

  // Evidence packet (screenshots, excerpts, URL chain, etc.)
  evidence: EvidencePacket;

  // Infrastructure profile (WHOIS, hosting, CDN data for smart routing)
  infrastructure: InfrastructureProfile;

  // WHOIS data (dedicated columns for querying and analytics)
  whois_domain: string | null;
  whois_registrant_org: string | null;
  whois_registrant_country: string | null;
  whois_registrant_country_code: string | null;
  whois_registrar_name: string | null;
  whois_registrar_abuse_email: string | null;
  whois_registrar_abuse_phone: string | null;
  whois_created_date: string | null;
  whois_updated_date: string | null;
  whois_expires_date: string | null;
  whois_name_servers: string[] | null;
  whois_status: string | null;
  whois_domain_age_days: number | null;
  whois_fetched_at: string | null;

  // Status tracking
  detected_at: string;
  status: InfringementStatus;
  status_changed_at: string;
  previous_status: InfringementStatus | null;
  next_check_at: string | null;

  created_at: string;
  updated_at: string;
}

export interface Takedown {
  id: string; // UUID
  infringement_id: string; // UUID, references infringements
  user_id: string; // UUID, references profiles
  type: TakedownType;
  status: TakedownStatus;
  sent_at: string | null;
  resolved_at: string | null;
  recipient_email: string | null;
  notice_content: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductTimelineData {
  product_id: string;
  date: string;
  unique_count: number;
  total_count: number;
  total_loss: number;
}

export interface ProductStats {
  total_infringements: number;
  pending_verification: number;
  active_verified: number;
  resolved: number;
  false_positives: number;
  total_est_loss: number;
  recent_scans_count: number;
  last_scan_at: string | null;
}

export interface EnforcementAction {
  id: string; // UUID
  infringement_id: string; // UUID, references infringements
  user_id: string; // UUID, references profiles

  // Action type & escalation step
  action_type: ActionType;
  escalation_step: number; // 1 = first attempt, 2+ = escalation

  // Target entity & contact
  target_entity: string | null; // "Cloudflare", "Namecheap", "Google", etc.
  target_contact: string | null; // abuse email or form URL

  // Notice content
  notice_content: string | null; // the actual notice/letter text
  notice_tone: NoticeTone; // 'friendly', 'firm', 'nuclear'

  // Status tracking
  status: EnforcementStatus;

  // Timestamps
  sent_at: string | null;
  response_at: string | null;
  resolved_at: string | null;
  deadline_at: string | null; // when to escalate if no response

  created_at: string;
  updated_at: string;
}

export interface StatusTransition {
  id: string; // UUID
  infringement_id: string; // UUID, references infringements
  from_status: InfringementStatus | null;
  to_status: InfringementStatus;
  reason: string | null;
  triggered_by: TriggeredBy;
  metadata: {
    [key: string]: any;
  };
  created_at: string;
}

export interface Subscription {
  id: string; // UUID
  user_id: string; // UUID, references profiles
  stripe_subscription_id: string;
  plan_tier: PlanTier;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  cancel_reason: string | null;
  cancel_reason_detail: string | null;
  paused_at: string | null;
  resume_at: string | null;
  retention_offer_used: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScanSchedule {
  id: string; // UUID
  product_id: string; // UUID, references products
  user_id: string; // UUID, references profiles
  frequency: 'daily' | 'weekly' | 'monthly'; // could be an enum
  last_run_at: string | null;
  next_run_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// DASHBOARD STATS VIEW
// ============================================================================

export interface DashboardStats {
  user_id: string;
  total_products: number;
  total_scans: number;
  total_infringements: number;
  total_takedowns: number;
  total_est_loss: number;
}

// ============================================================================
// PLAN LIMITS (Business Model)
// ============================================================================

export interface PlanFeatures {
  products: number;
  scansPerMonth: number;
  scanFrequency: string;
  features: string[];
  priceUsd: number | null; // null for Scout (free)
}

export const PLAN_LIMITS: Record<PlanTier, PlanFeatures> = {
  scout: {
    products: 1,
    scansPerMonth: 1,
    scanFrequency: 'one-time',
    features: ['basic-dashboard', 'dmca-template'],
    priceUsd: null,
  },
  starter: {
    products: 5,
    scansPerMonth: 4,
    scanFrequency: 'weekly',
    features: [
      'automated-monitoring',
      'one-click-dmca',
      'google-deindex',
      'telegram-monitoring',
      'google-monitoring',
      'cyberlocker-monitoring',
    ],
    priceUsd: 29,
  },
  pro: {
    products: 25,
    scansPerMonth: 30,
    scanFrequency: 'daily',
    features: [
      'automated-monitoring',
      'one-click-dmca',
      'cease-desist',
      'google-deindex',
      'telegram-monitoring',
      'google-monitoring',
      'cyberlocker-monitoring',
      'torrent-monitoring',
      'discord-monitoring',
      'revenue-reports',
      'priority-support',
    ],
    priceUsd: 99,
  },
  business: {
    products: 999999, // unlimited
    scansPerMonth: 999999, // unlimited
    scanFrequency: 'real-time',
    features: [
      'automated-monitoring',
      'one-click-dmca',
      'cease-desist',
      'google-deindex',
      'telegram-monitoring',
      'google-monitoring',
      'cyberlocker-monitoring',
      'torrent-monitoring',
      'discord-monitoring',
      'forum-monitoring',
      'social-media-monitoring',
      'revenue-reports',
      'white-label-reporting',
      'api-access',
      'multi-brand-management',
      'priority-support',
    ],
    priceUsd: 299,
  },
};

// ============================================================================
// HELPER TYPES FOR API REQUESTS/RESPONSES
// ============================================================================

export interface ScanRequest {
  product_id: string;
}

export interface ScanResponse {
  scan_id: string;
}

export interface InfringementResult {
  platform: PlatformType;
  source_url: string;
  risk_level: RiskLevel;
  type: InfringementType;
  audience_size: string | null;
  est_revenue_loss: number;
  // SERP context for AI filtering
  title?: string;
  snippet?: string;
}

// ============================================================================
// DASHBOARD OVERVIEW DATA
// ============================================================================

export interface DashboardData {
  protectionScore: number;
  revenueAtRisk: number;
  revenueProtected: number;

  stats: {
    totalProducts: number;
    needsReview: number;
    activeThreats: number;
    takedownsSent: number;
    // 30-day trends (positive = increase, negative = decrease)
    needsReviewTrend: number;
    activeThreatsTrend: number;
    takedownsTrend: number;
  };

  // Top 5 priority infringements for action center
  actionItems: Array<{
    id: string;
    sourceUrl: string;
    platform: PlatformType;
    riskLevel: RiskLevel;
    severityScore: number;
    audienceSize: string | null;
    estRevenueLoss: number;
    productName: string;
    detectedAt: string;
  }>;

  // Platform breakdown for threat landscape
  platformBreakdown: Array<{
    platform: PlatformType;
    count: number;
  }>;

  // 30-day detection trend (sparkline data)
  detectionTrend: Array<{
    date: string;
    count: number;
  }>;

  // Recent activity timeline (10 events)
  timeline: Array<{
    id: string;
    type: 'detection' | 'takedown' | 'removal' | 'scan';
    title: string;
    subtitle: string;
    timestamp: string;
    status?: string;
  }>;

  // User context
  planTier: PlanTier;
  productCount: number;
  hasScanRun: boolean;
  hasRecentScan: boolean;
  profileComplete: boolean;
  userProfile: {
    fullName: string | null;
    phone: string | null;
    address: string | null;
    dmcaReplyEmail: string | null;
  };
}
