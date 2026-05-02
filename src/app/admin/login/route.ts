export const runtime = 'edge';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  // If the user reaches this route, they have successfully passed the Basic Auth check in src/proxy.ts.
  // We simply redirect them back to the admin dashboard. The browser will now include the Authorization header automatically.
  return NextResponse.redirect(new URL('/admin', req.url));
}
