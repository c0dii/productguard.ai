/**
 * GoHighLevel (GHL) Integration Types
 *
 * Types for integrating with GHL CRM and automation platform
 */

export interface GHLConfig {
  apiKey: string;
  locationId: string;
  baseUrl?: string;
}

export interface GHLContact {
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  phone?: string;
  tags?: string[];
  customFields?: Record<string, string | number | boolean>;
  source?: string;
}

export interface GHLContactResponse {
  contact: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    tags?: string[];
  };
}

export interface GHLTag {
  name: string;
}

export interface GHLWebhookPayload {
  contactId?: string;
  email?: string;
  eventType: string;
  eventData: Record<string, any>;
  timestamp: string;
}

/**
 * Event types that can be tracked and sent to GHL
 */
export type GHLEventType =
  // User Lifecycle
  | 'user.signup'
  | 'user.trial_started'
  | 'user.trial_ending_soon'
  | 'user.trial_expired'
  | 'user.subscription_started'
  | 'user.subscription_cancelled'
  | 'user.subscription_upgraded'
  | 'user.inactive'
  | 'user.re_engaged'

  // Product Activity
  | 'product.created'
  | 'product.first_scan'
  | 'scan.completed'
  | 'infringement.detected'
  | 'infringement.high_severity'
  | 'infringement.verified'
  | 'infringement.dismissed'
  | 'dmca.sent'
  | 'infringement.resolved'

  // Engagement & Health
  | 'user.onboarding_incomplete'
  | 'user.monthly_report'
  | 'user.became_power_user';

export interface GHLEvent {
  type: GHLEventType;
  userId: string;
  email: string;
  data: Record<string, any>;
  tags?: string[];
  customFields?: Record<string, string | number>;
}

/**
 * Tag templates for different user actions
 */
export const GHL_TAGS = {
  // User Status
  TRIAL_USER: 'trial-user',
  ACTIVE_USER: 'active-user',
  INACTIVE_USER: 'inactive-user',
  CANCELLED_USER: 'cancelled-user',

  // Product Activity
  HAS_PRODUCTS: 'has-products',
  FIRST_SCAN_COMPLETE: 'first-scan-complete',
  ACTIVE_SCANNER: 'active-scanner',

  // Infringement Activity
  HAS_INFRINGEMENTS: 'has-infringements',
  HIGH_SEVERITY_INFRINGEMENT: 'high-severity-alert',
  DMCA_SENDER: 'dmca-sender',
  PROACTIVE_PROTECTOR: 'proactive-protector', // Regularly uses platform

  // Engagement
  ENGAGED_USER: 'engaged-user',
  NEEDS_ONBOARDING: 'needs-onboarding',
  POWER_USER: 'power-user',
} as const;

/**
 * Custom field mappings for GHL
 */
export const GHL_CUSTOM_FIELDS = {
  TRIAL_END_DATE: 'trial_end_date',
  TOTAL_PRODUCTS: 'total_products',
  TOTAL_SCANS: 'total_scans',
  TOTAL_INFRINGEMENTS: 'total_infringements',
  TOTAL_DMCA_SENT: 'total_dmca_sent',
  LAST_LOGIN: 'last_login',
  LAST_SCAN: 'last_scan',
  ACCOUNT_CREATED: 'account_created',
  SUBSCRIPTION_STATUS: 'subscription_status',
} as const;
