import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const { action } = await req.json();

    let command = "";
    if (action === "analyze") command = "npm run analyze";
    else if (action === "evolve") command = "npm run evolve";
    else if (action === "promote") command = "npm run promote-winner";
    else return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    const { stdout, stderr } = await execAsync(command, { cwd: process.cwd() });
    
    return NextResponse.json({ success: true, output: stdout, errorOutput: stderr });
  } catch (error: any) {
    console.error("Admin action failed:", error);
    return NextResponse.json({ error: error.message || "Failed to execute" }, { status: 500 });
  }
}
