/**
 * Typed context builders for SystemLogger.
 *
 * Each builder produces a consistent JSONB shape for its log_source,
 * making it easy to query and display in the admin UI.
 */

export interface ApiCallContext {
  provider: 'openai' | 'serper' | 'whois' | 'resend' | 'stripe' | 'other';
  model?: string;
  tokens_used?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  cost_usd?: number;
  status_code?: number;
  endpoint?: string;
  request_summary?: string;
  response_summary?: string;
}

export interface ScrapeContext {
  url: string;
  ai_enabled: boolean;
  ai_model?: string;
  content_length?: number;
  fields_extracted?: string[];
  fallback_used?: boolean;
  piracy_terms_count?: number;
}

export interface CronContext {
  job_name: string;
  items_processed?: number;
  items_succeeded?: number;
  items_failed?: number;
  next_scheduled?: string;
}

export interface WebhookContext {
  provider: 'stripe' | 'ghl' | 'other';
  event_type: string;
  event_id?: string;
  customer_id?: string;
  subscription_id?: string;
}

export interface EmailContext {
  template: string;
  to: string;
  subject?: string;
  provider: 'resend';
  message_id?: string;
}

export interface DmcaContext {
  infringement_id?: string;
  takedown_id?: string;
  target_entity?: string;
  notice_type?: string;
}

export interface ScanSystemContext {
  scan_id: string;
  product_name: string;
  product_type: string;
  run_number?: number;
  queries_executed?: number;
  results_found?: number;
  infringements_created?: number;
  api_calls_saved?: number;
}

export type LogContext =
  | ApiCallContext
  | ScrapeContext
  | CronContext
  | WebhookContext
  | EmailContext
  | DmcaContext
  | ScanSystemContext
  | Record<string, unknown>;

// Builder functions for type safety
export const ctx = {
  apiCall: (data: ApiCallContext): ApiCallContext => data,
  scrape: (data: ScrapeContext): ScrapeContext => data,
  cron: (data: CronContext): CronContext => data,
  webhook: (data: WebhookContext): WebhookContext => data,
  email: (data: EmailContext): EmailContext => data,
  dmca: (data: DmcaContext): DmcaContext => data,
  scan: (data: ScanSystemContext): ScanSystemContext => data,
};
