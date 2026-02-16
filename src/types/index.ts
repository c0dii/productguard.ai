// ============================================================================
// ENUMS
// ============================================================================

export type PlanTier = 'scout' | 'starter' | 'pro' | 'business';
export type ProductType = 'course' | 'indicator' | 'software' | 'template' | 'ebook' | 'other';
export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed';
export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';
export type PlatformType = 'telegram' | 'google' | 'cyberlocker' | 'torrent' | 'discord' | 'forum' | 'social';
export type InfringementType = 'channel' | 'group' | 'bot' | 'indexed_page' | 'direct_download' | 'torrent' | 'server' | 'post';
export type InfringementStatus = 'pending_verification' | 'active' | 'takedown_sent' | 'removed' | 'disputed' | 'false_positive';
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
  plan_tier: PlanTier;
  stripe_customer_id: string | null;
  theme: 'light' | 'dark' | 'system';
  is_admin: boolean;
  created_at: string;
  updated_at: string;
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
  authorized_sellers: string[] | null;
  release_date: string | null;
  min_price_threshold: number | null;
  unique_identifiers: string[] | null;
  file_hash: string | null;
  copyright_number: string | null;
  copyright_owner: string | null;
  tags: string[] | null;
  language: string | null;
  internal_notes: string | null;
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
  created_at: string;
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
}
