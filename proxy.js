import { NextResponse } from 'next/server';

export function proxy(request) {
  const url = request.nextUrl.clone();
  const host = request.headers.get('host') || '';

  // Admin features remain unavailable until the new secure backend is configured.
  if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) {
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url, 302);
  }

  // www redirect — PWA scope consistent রাখতে
  if (host.startsWith('www.')) {
    url.host = host.replace('www.', '');
    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
