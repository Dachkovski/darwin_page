import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  
  // Protect admin panel and admin APIs
  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/api/admin')) {
    const basicAuth = req.headers.get('authorization');
    const authPassword = process.env.ADMIN_PASSWORD;

    // Only enforce if ADMIN_PASSWORD is set in env
    if (authPassword) {
      if (basicAuth) {
        const authValue = basicAuth.split(' ')[1];
        // atob is supported in Edge Runtime
        const [user, pwd] = atob(authValue).split(':');

        if (pwd === authPassword) {
          return NextResponse.next();
        }
      }

      return new NextResponse('Auth required', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Darwin Admin"',
        },
      });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
