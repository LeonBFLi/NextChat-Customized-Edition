import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { Buffer } from "buffer";

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
    const { rawInput, response, images } = await req.json();

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

    const logDir = path.join(process.cwd(), "data");
    const logFile = path.join(logDir, "raw_user_inputs.log");

    // Handle image attachments if provided. Save each image to disk and record the filenames in the log entry.
    if (Array.isArray(images) && images.length > 0) {
      const imagesDir = path.join(logDir, "attachments");
      fs.mkdirSync(imagesDir, { recursive: true });
      entry.images = [];
      images.forEach((dataUrl: string, idx: number) => {
        try {
          // Data URLs are in the format: data:image/<ext>;base64,<base64-data>
          const match = dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
          if (!match) {
            return;
          }
          const mimeType = match[1];
          const base64Data = match[2];
          const buffer = Buffer.from(base64Data, "base64");
          let ext = mimeType.split("/").pop() || "png";
          // Sanitize extension to common names
          if (ext === "jpeg") ext = "jpg";
          const safeTimestamp = timestamp.replace(/[:\.]/g, "-");
          const fileName = `${safeTimestamp}-${idx}.${ext}`;
          const filePath = path.join(imagesDir, fileName);
          fs.writeFileSync(filePath, buffer);
          entry.images.push(fileName);
        } catch (imgError) {
          console.error("Failed to save attachment", imgError);
        }
      });
    }

    // Ensure log directory exists
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
