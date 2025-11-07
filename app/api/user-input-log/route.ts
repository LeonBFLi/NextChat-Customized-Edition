import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Use the Node.js runtime for this API route so that we can access the filesystem.
export const runtime = "nodejs";

/**
 * API route to append raw user input to a log file on the server.
 *
 * The client should POST a JSON body with a `rawInput` property containing
 * the text entered by the user. Each call appends a new line to the log
 * file along with a timestamp. This is intended for testing or educational
 * purposes; ensure you have user consent before enabling in production.
 */
export async function POST(req: NextRequest) {
  try {
    // parse the posted JSON. rawInput is required; response is optional
    const { rawInput, response } = await req.json();

    // Determine the client's IP address. Use x-forwarded-for header if present.
    const forwardedFor =
      req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
    let clientIp: string | undefined;
    if (forwardedFor) {
      // May contain multiple comma-separated IPs; take the first one
      clientIp = forwardedFor.split(",")[0].trim();
    }

    const timestamp = new Date().toISOString();
    // Build a log entry as a JSON object. Include only defined fields.
    const entry: any = {
      timestamp,
      rawInput,
    };
    if (response !== undefined) entry.response = response;
    if (clientIp) entry.ip = clientIp;

    // Compute log directory and file path. Write one JSON object per line.
    const logDir = path.join(process.cwd(), "data");
    const logFile = path.join(logDir, "raw_user_inputs.log");
    fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(logFile, JSON.stringify(entry) + "\n", "utf-8");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[User Input Log API] Failed to write log", error);
    return NextResponse.json(
      { success: false, error: "Failed to write log" },
      { status: 500 },
    );
  }
}
