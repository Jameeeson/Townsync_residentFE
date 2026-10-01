import { NextRequest, NextResponse } from "next/server";
import { createWorker } from "tesseract.js";
import { parseIdText } from "@/lib/ocrParser";

export const runtime = "nodejs";

// sharp is loaded lazily and treated as optional. It needs a native libvips file at runtime; if the
// deployment is ever missing it, a top-level import would make EVERY scan fail with a 500 before this
// handler even runs. Without it we skip the grayscale/normalize step and validate the image ourselves.
type Sharp = (typeof import("sharp"))["default"];
let sharpModule: Sharp | null | undefined;

async function loadSharp(): Promise<Sharp | null> {
  if (sharpModule !== undefined) return sharpModule;
  try {
    sharpModule = (await import("sharp")).default;
  } catch (error) {
    console.error("sharp is unavailable; OCR will run without image preprocessing:", error);
    sharpModule = null;
  }
  return sharpModule;
}

// Dimensions from the file header (PNG / JPEG only), so the decoded-pixel limit still holds without sharp.
function readDimensions(buf: Buffer): { width: number; height: number } | null {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47 && buf.readUInt32BE(4) === 0x0d0a1a0a) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) {
        i += 1;
        continue;
      }
      const marker = buf[i + 1];
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2;
        continue;
      }
      const isStartOfFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isStartOfFrame) {
        return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return null;
}

// This endpoint is public (it powers ID scanning during registration), so it is
// bounded on every axis an anonymous caller could abuse: origin, size, file type,
// decoded pixel count, request rate and concurrent CPU-heavy jobs.
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_PIXELS = 25_000_000;
const RATE_LIMIT = 6;
const RATE_WINDOW_MS = 60_000;
const MAX_CONCURRENT = 2;

const hits = new Map<string, number[]>();
let running = 0;

function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "local";
}

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= RATE_WINDOW_MS)) hits.delete(k);
    }
  }
  return false;
}

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // non-browser callers are still bound by the other limits
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (rateLimited(clientKey(request))) {
    return NextResponse.json(
      { error: "Too many scans. Please wait a minute and try again." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES + 64 * 1024) {
    return NextResponse.json({ error: "Image is too large (max 8 MB)." }, { status: 413 });
  }
  if (running >= MAX_CONCURRENT) {
    return NextResponse.json(
      { error: "The scanner is busy. Please try again in a moment." },
      { status: 503, headers: { "Retry-After": "5" } },
    );
  }

  running += 1;
  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
  try {
    const formData = await request.formData();
    const file = formData.get("image");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image is too large (max 8 MB)." }, { status: 413 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are supported." }, { status: 415 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // sharp decodes by content, not by the claimed MIME type, and refuses oversized images.
    const sharp = await loadSharp();
    let processedImage: Buffer;
    if (sharp) {
      try {
        processedImage = await sharp(buffer, { limitInputPixels: MAX_PIXELS })
          .grayscale() // Tesseract works better on B&W
          .normalize() // Fix exposure
          .toBuffer();
      } catch {
        return NextResponse.json({ error: "That file is not a readable image." }, { status: 415 });
      }
    } else {
      // Fallback: accept only PNG/JPEG we can measure, and enforce the same pixel limit from the header.
      const dimensions = readDimensions(buffer);
      if (!dimensions || dimensions.width * dimensions.height > MAX_PIXELS) {
        return NextResponse.json({ error: "That file is not a readable image." }, { status: 415 });
      }
      processedImage = buffer;
    }

    worker = await createWorker("eng");
    const {
      data: { text },
    } = await worker.recognize(processedImage);

    const parsed = parseIdText(text);

    // Basic Validation
    if (!parsed.idNumber && !parsed.fullName) {
      return NextResponse.json(
        {
          error: "Could not read ID clearly. Please provide a sharper image.",
          rawText: text,
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      success: true,
      rawText: text,
      ...parsed,
    });
  } catch (error) {
    console.error("OCR error:", error);
    return NextResponse.json({ error: "Failed to process image" }, { status: 500 });
  } finally {
    running -= 1;
    if (worker) {
      await worker.terminate().catch(() => undefined);
    }
  }
}
