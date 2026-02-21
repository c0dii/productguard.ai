/**
 * GoHighLevel API Client
 *
 * Handles all communication with GHL API v2
 * Docs: https://highlevel.stoplight.io/docs/integrations/
 */

import type { GHLConfig, GHLContact, GHLContactResponse, GHLTag } from './types';

export class GHLClient {
  private apiKey: string;
  private locationId: string;
  private baseUrl: string;

  constructor(config: GHLConfig) {
    this.apiKey = config.apiKey;
    this.locationId = config.locationId;
    this.baseUrl = config.baseUrl || 'https://services.leadconnectorhq.com';
  }

  /**
   * Make authenticated request to GHL API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28',
        ...options.headers,
      },
      signal: options.signal || AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[GHL Client] API Error:', error);
      throw new Error(`GHL API Error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Create or update a contact in GHL
   */
  async upsertContact(contact: GHLContact): Promise<GHLContactResponse> {
    console.log('[GHL Client] Upserting contact:', contact.email);

    try {
      // First, try to find existing contact by email
      const existing = await this.findContactByEmail(contact.email);

      if (existing) {
        // Update existing contact
        return await this.updateContact(existing.contact.id, contact);
      } else {
        // Create new contact
        return await this.createContact(contact);
      }
    } catch (error) {
      console.error('[GHL Client] Error upserting contact:', error);
      throw error;
    }
  }

  /**
   * Create a new contact
   */
  async createContact(contact: GHLContact): Promise<GHLContactResponse> {
    console.log('[GHL Client] Creating new contact:', contact.email);

    const payload = {
      locationId: this.locationId,
      email: contact.email,
      firstName: contact.firstName,
      lastName: contact.lastName,
      name: contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
      phone: contact.phone,
      tags: contact.tags || [],
      customFields: this.formatCustomFields(contact.customFields || {}),
      source: contact.source || 'ProductGuard.ai',
    };

    return await this.request<GHLContactResponse>('/contacts/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Update an existing contact
   */
  async updateContact(
    contactId: string,
    contact: Partial<GHLContact>
  ): Promise<GHLContactResponse> {
    console.log('[GHL Client] Updating contact:', contactId);

    const payload: any = {};

    if (contact.firstName) payload.firstName = contact.firstName;
    if (contact.lastName) payload.lastName = contact.lastName;
    if (contact.name) payload.name = contact.name;
    if (contact.phone) payload.phone = contact.phone;
    if (contact.customFields) {
      payload.customFields = this.formatCustomFields(contact.customFields);
    }

    return await this.request<GHLContactResponse>(`/contacts/${contactId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Find contact by email
   */
  async findContactByEmail(email: string): Promise<GHLContactResponse | null> {
    try {
      const response = await this.request<any>(
        `/contacts/?locationId=${this.locationId}&email=${encodeURIComponent(email)}`
      );

      if (response.contacts && response.contacts.length > 0) {
        return { contact: response.contacts[0] };
      }

      return null;
    } catch (error) {
      console.error('[GHL Client] Error finding contact:', error);
      return null;
    }
  }

  /**
   * Add tags to a contact
   */
  async addTags(contactId: string, tags: string[]): Promise<void> {
    if (!tags || tags.length === 0) return;

    console.log('[GHL Client] Adding tags to contact:', contactId, tags);

    try {
      await this.request(`/contacts/${contactId}/tags`, {
        method: 'POST',
        body: JSON.stringify({ tags }),
      });
    } catch (error) {
      console.error('[GHL Client] Error adding tags:', error);
      throw error;
    }
  }

  /**
   * Remove tags from a contact
   */
  async removeTags(contactId: string, tags: string[]): Promise<void> {
    if (!tags || tags.length === 0) return;

    console.log('[GHL Client] Removing tags from contact:', contactId, tags);

    try {
      await this.request(`/contacts/${contactId}/tags`, {
        method: 'DELETE',
        body: JSON.stringify({ tags }),
      });
    } catch (error) {
      console.error('[GHL Client] Error removing tags:', error);
      throw error;
    }
  }

  /**
   * Trigger a workflow in GHL (via webhook)
   */
  async triggerWorkflow(webhookUrl: string, data: Record<string, any>): Promise<void> {
    console.log('[GHL Client] Triggering workflow webhook');

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(10000), // 10s timeout
      });
    } catch (error) {
      console.error('[GHL Client] Error triggering workflow:', error);
      throw error;
    }
  }

  /**
   * Format custom fields for GHL API
   */
  private formatCustomFields(fields: Record<string, string | number | boolean>): any[] {
    return Object.entries(fields).map(([key, value]) => ({
      key,
      value: String(value),
    }));
  }
}

/**
 * Get configured GHL client instance
 */
export function getGHLClient(): GHLClient | null {
  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;

  if (!apiKey || !locationId) {
    console.warn('[GHL Client] GHL not configured - missing API key or location ID');
    return null;
  }

  return new GHLClient({ apiKey, locationId });
}
