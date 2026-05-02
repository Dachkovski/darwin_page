export const runtime = 'edge';
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { action } = (await req.json()) as any;

    return NextResponse.json({ 
      success: true, 
      output: "System execution is not supported on Cloudflare Pages/Edge runtime.", 
      errorOutput: "" 
    });
  } catch (error: any) {
    console.error("Admin action failed:", error);
    return NextResponse.json({ error: error.message || "Failed to execute" }, { status: 500 });
  }
}
