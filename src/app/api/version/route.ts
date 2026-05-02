export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { variants } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const visitorId = searchParams.get('visitorId');
  
  if (!visitorId) {
    return NextResponse.json({ error: 'No visitorId' }, { status: 400 });
  }

  try {
    const activeVariantsList = await db
      .select()
      .from(variants)
      .where(and(eq(variants.status, 'active'), eq(variants.visitorId, visitorId)))
      .orderBy(desc(variants.generation))
      .limit(1);

    if (activeVariantsList.length > 0) {
      return NextResponse.json({ latestVariantId: activeVariantsList[0].id });
    }
    return NextResponse.json({ latestVariantId: null });
  } catch (error) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
