export const runtime = 'edge';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const authPassword = process.env.ADMIN_PASSWORD;

  if (authPassword) {
    if (authHeader) {
      try {
        const authValue = authHeader.split(' ')[1];
        const pwd = atob(authValue).split(':')[1];

        if (pwd === authPassword) {
          // Success: Set cookie and Redirect to admin dashboard
          const res = NextResponse.redirect(new URL('/admin', req.url));
          res.cookies.set('admin_token', authPassword, { 
            path: '/', 
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production', 
            maxAge: 60 * 60 * 24 * 7 // 1 week
          });
          return res;
        }
      } catch (e) {}
    }

    // Fail: Prompt for credentials
    return new NextResponse('Auth required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Admin Access"',
      },
    });
  }

  // If no password configured, just let them in
  return NextResponse.redirect(new URL('/admin', req.url));
}
