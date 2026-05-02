export const runtime = 'edge';
import { NextResponse } from "next/server";
import { db } from "@/db";
import { variants } from "@/db/schema";
export const dynamic = 'force-dynamic';
export async function GET() {
  const allVariants = await db.select().from(variants);
  return NextResponse.json({ count: allVariants.length });
}
