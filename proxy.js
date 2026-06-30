// proxy.js — Next.js 16 proxy (the renamed Middleware; see node_modules/next/dist/docs).
// Purpose: keep throwaway debug/preview routes (/zz-*) reachable in local
// development but return a 404 for them in production, so internal preview pages
// like /zz-mgrpreview are never publicly accessible on the deployed site.
import { NextResponse } from 'next/server';

export function proxy(request) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/zz-') && process.env.NODE_ENV === 'production') {
    // Rewrite to a non-existent path so Next renders its standard 404 page
    // (with a 404 status) instead of exposing the debug route.
    return NextResponse.rewrite(new URL('/_zz-not-found', request.url));
  }

  return NextResponse.next();
}

// Run on all routes except static assets; the prefix check above scopes the
// actual blocking to the /zz-* debug namespace.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
