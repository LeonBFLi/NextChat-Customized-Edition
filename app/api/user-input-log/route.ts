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
    const { rawInput } = await req.json();
    // Construct the directory and file path relative to the project root.
    // We store logs under a `data` folder so that it persists in the container
    // and is easy to locate when ssh'ing into the server or container.
    const logDir = path.join(process.cwd(), "data");
    const logFile = path.join(logDir, "raw_user_inputs.log");
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${rawInput}\n`;

    // Ensure the directory exists; if not, create it recursively.
    fs.mkdirSync(logDir, { recursive: true });
    // Append the log line to the file. If the file does not exist, it will be created.
    fs.appendFileSync(logFile, logLine, "utf-8");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[User Input Log API] Failed to write log", error);
    return NextResponse.json(
      { success: false, error: "Failed to write log" },
      { status: 500 },
    );
  }
}
