import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
export const runtime = 'edge';

export default function middleware(req: NextRequest) {
  const url = req.nextUrl;
  let res = NextResponse.next();
  
  // Assign visitor_id if not present
  if (!req.cookies.has('visitor_id')) {
    res.cookies.set('visitor_id', crypto.randomUUID());
  }

  // Protect admin API and login trigger
  if (url.pathname.startsWith('/api/admin') || url.pathname.startsWith('/admin/login')) {
    const basicAuth = req.headers.get('authorization');
    const authPassword = process.env.ADMIN_PASSWORD;

    if (authPassword) {
      if (basicAuth) {
        const authValue = basicAuth.split(' ')[1];
        const [user, pwd] = atob(authValue).split(':');

        if (pwd === authPassword) {
          return res;
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

  return res;
}

export const config = {
  matcher: ['/admin/login', '/api/admin/:path*'],
};
