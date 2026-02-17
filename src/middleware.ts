import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // ── Alerts subdomain handling ──────────────────────────────
  // alerts.productguard.com serves the (alerts) route group publicly
  const host = request.headers.get('host') || '';
  const isAlertsSubdomain = host.startsWith('alerts.');

  if (isAlertsSubdomain) {
    const { pathname } = request.nextUrl;
    const allowedPaths = ['/r/', '/signup', '/dmca/', '/api/marketing/'];
    const isAllowed = allowedPaths.some(p => pathname.startsWith(p)) || pathname === '/';

    if (!isAllowed) {
      // Redirect disallowed paths to main domain
      const mainDomain = host.replace('alerts.', '');
      return NextResponse.redirect(new URL(pathname, `https://${mainDomain}`));
    }

    // Alerts pages are public — no auth needed
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Skip auth check for auth callback route (needed for OAuth flow)
  if (request.nextUrl.pathname === '/auth/callback') {
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage = request.nextUrl.pathname.startsWith('/auth/login') ||
                     request.nextUrl.pathname.startsWith('/auth/signup');
  const isDashboardPage = request.nextUrl.pathname.startsWith('/dashboard');
  const isAdminPage = request.nextUrl.pathname.startsWith('/admin');

  // Early return: Redirect authenticated users away from auth pages
  if (isAuthPage && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Early return: Redirect unauthenticated users to login
  if ((isDashboardPage || isAdminPage) && !user) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Admin route protection
  if (isAdminPage && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Protected routes
    '/dashboard/:path*',
    '/auth/login',
    '/auth/signup',
    '/admin/:path*',
    // Alerts subdomain routes (middleware handles subdomain gating)
    '/r/:path*',
    '/signup',
    '/dmca/:path*',
  ],
};
