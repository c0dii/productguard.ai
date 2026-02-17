import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { trackUserSignup, trackUserReEngaged } from '@/lib/ghl/events';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function GET(request: Request) {
  // Rate limit: 10 auth attempts per minute per IP
  const ip = getClientIp(request);
  const limiter = rateLimit(`auth-callback:${ip}`, { limit: 10, windowSeconds: 60 });
  if (!limiter.success) {
    return new NextResponse('Too many requests', { status: 429 });
  }

  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next') ?? '/dashboard';

  // Prevent open redirect: only allow relative paths starting with /
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Check if this is a new user (created within last 10 seconds)
      const userCreatedAt = new Date(data.user.created_at);
      const now = new Date();
      const isNewUser = (now.getTime() - userCreatedAt.getTime()) < 10000; // 10 seconds

      if (isNewUser) {
        // Track new user signup in GHL
        console.log('[Auth Callback] New user detected, tracking signup in GHL');
        try {
          await trackUserSignup(
            data.user.id,
            data.user.email || '',
            data.user.user_metadata?.full_name || data.user.email
          );
        } catch (error) {
          console.error('[Auth Callback] Error tracking signup:', error);
          // Don't block signup if GHL tracking fails
        }
      } else {
        // Returning user — track re-engagement if they've been inactive (7+ days)
        const lastSignIn = data.user.last_sign_in_at ? new Date(data.user.last_sign_in_at) : null;
        if (lastSignIn) {
          const daysSinceLastLogin = Math.floor(
            (now.getTime() - lastSignIn.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSinceLastLogin >= 7 && data.user.email) {
            try {
              await trackUserReEngaged(data.user.id, data.user.email);
              console.log(`[Auth Callback] Re-engagement tracked for ${data.user.email} (${daysSinceLastLogin} days inactive)`);
            } catch (error) {
              console.error('[Auth Callback] Error tracking re-engagement:', error);
            }
          }
        }
      }

      // Successful authentication - redirect to dashboard
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth failed - redirect to login with error
  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
}
