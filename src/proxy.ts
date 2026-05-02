import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function proxy(req: NextRequest) {
  const url = req.nextUrl;
  
  // Protect admin API and login trigger
  if (url.pathname.startsWith('/api/admin') || url.pathname.startsWith('/admin/login')) {
    const basicAuth = req.headers.get('authorization');
    const authPassword = process.env.ADMIN_PASSWORD;

    if (authPassword) {
      if (basicAuth) {
        const authValue = basicAuth.split(' ')[1];
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
  matcher: ['/admin/login', '/api/admin/:path*'],
};
