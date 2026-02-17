import type { SupabaseClient } from '@supabase/supabase-js';

interface LogCommunicationParams {
  user_id: string;
  infringement_id?: string;
  takedown_id?: string;
  channel: 'email' | 'web_form' | 'manual';
  from_email?: string;
  to_email: string;
  reply_to_email?: string;
  subject?: string;
  body_preview?: string;
  status: 'sent' | 'failed';
  external_message_id?: string;
  provider_name?: string;
  metadata?: Record<string, any>;
}

/**
 * Log an outbound DMCA communication.
 * Never throws — returns the communication ID on success, null on error.
 */
export async function logCommunication(
  supabase: SupabaseClient,
  params: LogCommunicationParams
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('communications')
      .insert({
        user_id: params.user_id,
        infringement_id: params.infringement_id || null,
        takedown_id: params.takedown_id || null,
        direction: 'outbound',
        channel: params.channel,
        from_email: params.from_email || null,
        to_email: params.to_email,
        reply_to_email: params.reply_to_email || null,
        subject: params.subject || null,
        body_preview: params.body_preview ? params.body_preview.slice(0, 500) : null,
        status: params.status,
        external_message_id: params.external_message_id || null,
        provider_name: params.provider_name || null,
        metadata: params.metadata || {},
        sent_at: params.status === 'sent' ? new Date().toISOString() : null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[Communications] Error logging communication:', error);
      return null;
    }

    return data?.id || null;
  } catch (err) {
    console.error('[Communications] Exception logging communication:', err);
    return null;
  }
}
