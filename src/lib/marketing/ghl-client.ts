// ============================================================
// GoHighLevel API Client
// src/lib/marketing/ghl-client.ts
//
// Wraps GHL REST API v1 for contact + opportunity management.
// Docs: https://highlevel.stoplight.io/docs/integrations
// ============================================================

import crypto from 'crypto';
import type {
  GHLContactPayload,
  GHLContactResponse,
  GHLOpportunityPayload,
} from '@/types/marketing';

const GHL_BASE = 'https://rest.gohighlevel.com/v1';

function getHeaders(): HeadersInit {
  const key = process.env.GHL_API_KEY;
  if (!key) throw new Error('GHL_API_KEY not set');
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}

// ── Create or update a contact in GHL ───────────────────────

export async function createGHLContact(
  payload: GHLContactPayload
): Promise<GHLContactResponse> {
  const res = await fetch(`${GHL_BASE}/contacts/`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GHL create contact failed (${res.status}): ${body}`);
  }

  return res.json();
}

// ── Lookup contact by email (to avoid duplicates) ───────────

export async function findGHLContactByEmail(
  email: string
): Promise<GHLContactResponse | null> {
  const res = await fetch(
    `${GHL_BASE}/contacts/lookup?email=${encodeURIComponent(email)}`,
    { headers: getHeaders() }
  );

  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GHL contact lookup failed (${res.status}): ${body}`);
  }

  return res.json();
}

// ── Create a pipeline opportunity ───────────────────────────

export async function createGHLOpportunity(
  payload: GHLOpportunityPayload
): Promise<{ id: string }> {
  const res = await fetch(`${GHL_BASE}/pipelines/${payload.pipelineId}/opportunities`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      pipelineStageId: payload.pipelineStageId,
      contactId: payload.contactId,
      name: payload.name,
      monetaryValue: payload.monetaryValue,
      source: payload.source,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GHL create opportunity failed (${res.status}): ${body}`);
  }

  return res.json();
}

// ── Add a tag to a contact ──────────────────────────────────

export async function addGHLTag(
  contactId: string,
  tag: string
): Promise<void> {
  const res = await fetch(`${GHL_BASE}/contacts/${contactId}/tags`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ tags: [tag] }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GHL add tag failed (${res.status}): ${body}`);
  }
}

// ── Verify GHL webhook signature ────────────────────────────

export function verifyGHLWebhook(
  rawBody: string,
  signature: string | null
): boolean {
  const secret = process.env.GHL_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('GHL_WEBHOOK_SECRET not set — skipping verification');
    return true;
  }
  if (!signature) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
