// ============================================================
// Alerts Landing Page
// src/app/(alerts)/r/[prospectId]/page.tsx
//
// This is the tracked link destination from GHL emails/DMs.
// URL: alerts.productguard.com/r/{prospect_id}
//
// Server-side:
//   - Loads prospect data from DB
//   - Records page_visited_at on marketing_outreach
//   - Renders pre-filled infringement analysis
//
// Client-side:
//   - Shows analysis card + blurred DMCA preview
//   - CTA: "Create free account to unlock & send"
//   - Routes to /signup?ref={prospect_id}
// ============================================================

import { createAdminClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import AlertsLandingClient from './client';
import type { AlertsPageData } from '@/types/marketing';

interface PageProps {
  params: Promise<{ prospectId: string }>;
}

export default async function AlertsLandingPage({ params }: PageProps) {
  const { prospectId } = await params;
  const supabase = createAdminClient();

  // 1. Load prospect data
  const { data: prospect, error } = await supabase
    .from('marketing_prospects')
    .select(`
      id, product_name, product_url, product_price,
      infringing_url, infringing_platform, audience_size,
      confidence_score, screenshot_url, est_revenue_loss,
      company_name, owner_name
    `)
    .eq('id', prospectId)
    .single();

  if (error || !prospect) {
    notFound();
  }

  // 2. Record page visit (fire-and-forget, don't block render)
  supabase
    .from('marketing_outreach')
    .update({ page_visited_at: new Date().toISOString() })
    .eq('prospect_id', prospectId)
    .is('page_visited_at', null)
    .then(() => {});

  // 3. Update prospect status to engaged if still in email phase
  supabase
    .from('marketing_prospects')
    .update({ status: 'engaged' })
    .eq('id', prospectId)
    .in('status', ['pushed_to_ghl', 'email_sent'])
    .then(() => {});

  // 4. Build page data (only expose what the client needs)
  const pageData: AlertsPageData = {
    prospect_id: prospect.id,
    product_name: prospect.product_name,
    product_url: prospect.product_url,
    product_price: prospect.product_price,
    infringing_url: prospect.infringing_url,
    infringing_platform: prospect.infringing_platform,
    audience_size: prospect.audience_size,
    confidence_score: prospect.confidence_score,
    screenshot_url: prospect.screenshot_url,
    est_revenue_loss: prospect.est_revenue_loss,
    company_name: prospect.company_name,
    owner_name: prospect.owner_name,
  };

  return <AlertsLandingClient data={pageData} />;
}

// Generate metadata for SEO / social sharing
export async function generateMetadata({ params }: PageProps) {
  return {
    title: 'Infringement Detected — ProductGuard',
    description: 'Unauthorized copies of your digital product have been detected. Send a free DMCA takedown.',
    robots: 'noindex, nofollow', // Don't index alert pages
  };
}
