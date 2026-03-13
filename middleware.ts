import { NextResponse, type NextRequest } from 'next/server';
import { getPrivateOwnerLoginPath } from '@/lib/authConfig';
import { getSessionFromTokenEdge } from '@/lib/apiSecurityEdge';
import { AUTH_COOKIE_NAME } from '@/lib/apiSecurityShared';

const PUBLIC_PAGE_PATHS = new Set(['/']);
const PUBLIC_API_PATHS = new Set(['/api/auth', '/api/auth/logout', '/api/deploy/smoke']);

function applySecurityHeaders(response: NextResponse) {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000');
  }

  return response;
}

function isPublicAsset(pathname: string) {
  return (
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/site.webmanifest' ||
    pathname === '/sitemap.xml'
  );
}

async function getSession(request: NextRequest) {
  return getSessionFromTokenEdge(request.cookies.get(AUTH_COOKIE_NAME)?.value);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const privateOwnerLoginPath = getPrivateOwnerLoginPath();

  if (isPublicAsset(pathname)) {
    return applySecurityHeaders(NextResponse.next());
  }

  const session = await getSession(request);

  if (session && pathname === privateOwnerLoginPath) {
    const destination = request.nextUrl.clone();
    destination.pathname = '/';
    destination.search = '';
    return applySecurityHeaders(NextResponse.redirect(destination));
  }

  if (PUBLIC_PAGE_PATHS.has(pathname) || pathname === privateOwnerLoginPath || PUBLIC_API_PATHS.has(pathname)) {
    return applySecurityHeaders(NextResponse.next());
  }

  if (session) {
    return applySecurityHeaders(NextResponse.next());
  }

  if (pathname.startsWith('/api/')) {
    return applySecurityHeaders(
      NextResponse.json({ error: 'Authentication required.' }, { status: 401 }),
    );
  }

  const destination = request.nextUrl.clone();
  destination.pathname = '/';
  destination.search = '';
  return applySecurityHeaders(NextResponse.redirect(destination));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|txt|xml|json|map)$).*)'],
};
