// ============================================================
// ProductGuard Marketing Engine Types
// src/types/marketing.ts
// ============================================================

export type ProspectStatus =
  | 'new'
  | 'qualified'
  | 'pushed_to_ghl'
  | 'email_sent'
  | 'engaged'
  | 'account_created'
  | 'converted'
  | 'suppressed';

export type InfringingPlatform =
  | 'telegram'
  | 'cyberlocker'
  | 'torrent'
  | 'discord'
  | 'forum'
  | 'social_media'
  | 'google_indexed'
  | 'other';

export type SocialActionType = 'dm_sent' | 'post_created' | 'post_reply';
export type SocialPlatform = 'twitter' | 'instagram' | 'facebook' | 'linkedin';
export type ResponseChannel = 'email' | 'twitter_dm' | 'instagram_dm' | 'facebook_dm' | 'post_comment';
export type ExclusionMatchType = 'product' | 'brand' | 'domain' | 'email';
export type SuppressionReason = 'unsubscribed' | 'bounced' | 'complained' | 'manual' | 'expired';

// ── Database row types ──────────────────────────────────────

export interface MarketingProspect {
  id: string;
  product_name: string;
  product_url: string | null;
  product_price: string | null;
  infringing_url: string;
  infringing_platform: InfringingPlatform;
  audience_size: string | null;
  confidence_score: number;
  screenshot_url: string | null;
  est_revenue_loss: string | null;
  company_name: string;
  owner_name: string | null;
  owner_email: string | null;
  company_domain: string | null;
  social_twitter: string | null;
  social_instagram: string | null;
  social_facebook: string | null;
  social_linkedin: string | null;
  contact_source: string | null;
  status: ProspectStatus;
  ghl_contact_id: string | null;
  alert_page_url: string | null;
  discovered_at: string;
  qualified_at: string | null;
  pushed_to_ghl_at: string | null;
  updated_at: string;
}

export interface MarketingOutreach {
  id: string;
  prospect_id: string;
  ghl_contact_id: string | null;
  email_sent_to: string;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  page_visited_at: string | null;
  signed_up_at: string | null;
  user_id: string | null;
  dmca_sent_at: string | null;
  converted_at: string | null;
  converted_plan: string | null;
  unsubscribed: boolean;
  complained: boolean;
  created_at: string;
}

export interface MarketingSocialAction {
  id: string;
  prospect_id: string;
  action: SocialActionType;
  platform: SocialPlatform;
  content: string | null;
  post_url: string | null;
  sent_at: string;
  engagement: string | null;
  engagement_at: string | null;
}

export interface MarketingResponse {
  id: string;
  prospect_id: string;
  outreach_id: string | null;
  channel: ResponseChannel;
  from_contact: string | null;
  subject: string | null;
  body: string;
  received_at: string;
  read_by_admin: boolean;
  admin_notes: string | null;
}

export interface MarketingExclusion {
  id: string;
  match_type: ExclusionMatchType;
  match_value: string;
  user_id: string | null;
  created_at: string;
}

export interface MarketingSuppression {
  id: string;
  domain: string | null;
  email: string | null;
  reason: SuppressionReason;
  source: string | null;
  created_at: string;
}

// ── GHL API types ───────────────────────────────────────────

export interface GHLContactPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  companyName: string;
  website?: string;
  source: 'productguard_engine';
  tags: string[];
  customField: Record<string, string>;
}

export interface GHLContactResponse {
  contact: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface GHLOpportunityPayload {
  pipelineId: string;
  pipelineStageId: string;
  contactId: string;
  name: string;
  monetaryValue: number;
  source: 'productguard_engine';
}

export interface GHLWebhookEvent {
  event: string;
  contact: {
    id: string;
    email: string;
    tags: string[];
    customField: Record<string, string>;
    note?: string;
  };
}

// ── Internal engine types ───────────────────────────────────

export interface QualificationResult {
  qualified: boolean;
  reason?: string;
  checks: {
    confidence_met: boolean;
    not_excluded: boolean;
    not_suppressed: boolean;
    not_previously_contacted: boolean;
    valid_contact: boolean;
  };
}

export interface PushResult {
  success: boolean;
  ghl_contact_id?: string;
  ghl_opportunity_id?: string;
  error?: string;
}

// ── Alerts page types ───────────────────────────────────────

export interface AlertsPageData {
  prospect_id: string;
  product_name: string;
  product_url: string | null;
  product_price: string | null;
  infringing_url: string;
  infringing_platform: InfringingPlatform;
  audience_size: string | null;
  confidence_score: number;
  screenshot_url: string | null;
  est_revenue_loss: string | null;
  company_name: string;
  owner_name: string | null;
}
