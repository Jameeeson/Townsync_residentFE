import { NextRequest, NextResponse } from "next/server";
import { createWorker, PSM } from "tesseract.js";
import { idVerificationConfigured, signNationalIdScan } from "@/lib/idVerification";
import {
  cardNumberGroups,
  decideCardNumber,
  mergeNameFields,
  nameFieldsFromCard,
  parseIdText,
  readCardNumber,
  type NameFields,
  type PassNumberReading,
} from "@/lib/ocrParser";

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

type OcrPass = { mode: PSM; image: () => Promise<Buffer> };

// Tesseract's accuracy scales with resolution, so small captures are upscaled.
const MIN_WIDTH = 1600;

/**
 * Different preparations of the same photo, cheapest and most often right
 * first. Each one rescues a different real-world problem: the first suits a
 * clean, evenly lit card; lighting flattening recovers text under glare; a
 * larger, sharper copy helps blur and small/far cards; local contrast (CLAHE)
 * helps dim or uneven light; a hard black-and-white threshold cuts through the
 * card's background pattern.
 */
function buildPasses(sharp: Sharp, oriented: import("sharp").Sharp, width: number): OcrPass[] {
  const scaled = (target: number) =>
    width > 0 && width < target ? oriented.clone().resize({ width: target, kernel: "lanczos3" }) : oriented.clone();
  return [
    {
      // ID cards are scattered field blocks, not paragraphs — SPARSE_TEXT finds
      // disjoint text regions far better than AUTO, which expects a uniform page.
      mode: PSM.SPARSE_TEXT,
      image: () => scaled(MIN_WIDTH).grayscale().normalize().linear(1.3, -20).sharpen({ sigma: 1 }).toBuffer(),
    },
    {
      mode: PSM.AUTO,
      image: () => scaled(2200).grayscale().normalize().sharpen({ sigma: 1.6, m2: 2 }).toBuffer(),
    },
    {
      mode: PSM.SPARSE_TEXT,
      image: () =>
        scaled(MIN_WIDTH).grayscale().clahe({ width: 48, height: 48, maxSlope: 3 }).sharpen({ sigma: 1 }).toBuffer(),
    },
    {
      // Glare and uneven light: divide the photo by a heavily blurred copy of
      // itself (its lighting), so a washed-out patch becomes as white as the rest
      // of the card, then keep anything even slightly darker than that as ink.
      mode: PSM.SPARSE_TEXT,
      image: async () => {
        const gray = await scaled(MIN_WIDTH).grayscale().toBuffer();
        const lighting = await sharp(gray).blur(30).negate().toBuffer();
        return sharp(gray)
          .composite([{ input: lighting, blend: "colour-dodge" }])
          .grayscale()
          .normalize()
          .threshold(215)
          .toBuffer();
      },
    },
    {
      mode: PSM.SPARSE_TEXT,
      image: () => scaled(2000).grayscale().normalize().median(3).threshold(150).toBuffer(),
    },
  ];
}

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
  if (!idVerificationConfigured()) {
    console.error("ID_VERIFICATION_SECRET is not set; National ID scans cannot be verified.");
    return NextResponse.json(
      { error: "ID verification is temporarily unavailable. Please try again later." },
      { status: 503 },
    );
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
    let passes: OcrPass[];
    if (sharp) {
      try {
        const oriented = sharp(buffer, { limitInputPixels: MAX_PIXELS }).rotate(); // auto-orient from EXIF
        const { width = 0 } = await oriented.metadata();
        passes = buildPasses(sharp, oriented, width);
      } catch {
        return NextResponse.json({ error: "That file is not a readable image." }, { status: 415 });
      }
    } else {
      // Fallback: accept only PNG/JPEG we can measure, and enforce the same pixel limit from the header.
      const dimensions = readDimensions(buffer);
      if (!dimensions || dimensions.width * dimensions.height > MAX_PIXELS) {
        return NextResponse.json({ error: "That file is not a readable image." }, { status: 415 });
      }
      passes = [{ mode: PSM.SPARSE_TEXT, image: async () => buffer }];
    }

    // Read the photo with each preparation in turn, stopping early once the result is
    // dependable. The card wording is judged on the pooled text (words one pass garbles
    // are often clean in another). The card number and the name are each decided across
    // passes (see decideCardNumber / mergeNameFields) because the resident can't edit
    // either afterwards: a number needs two reads to agree, and a name is the most
    // complete one the passes support.
    worker = await createWorker("eng");
    const texts: string[] = [];
    const numbers: PassNumberReading[] = [];
    const nameReadings: NameFields[] = [];
    let parsed = parseIdText("");
    let number = decideCardNumber(numbers);
    let name = mergeNameFields(nameReadings);
    for (const pass of passes) {
      await worker.setParameters({ tessedit_pageseg_mode: pass.mode, preserve_interword_spaces: "1" });
      // rotateAuto straightens a card held at a slight angle before reading it.
      const {
        data: { text },
      } = await worker.recognize(await pass.image(), { rotateAuto: true });
      texts.push(text);
      numbers.push({ reading: readCardNumber(text), groups: cardNumberGroups(text) });
      const fields = nameFieldsFromCard(text);
      if (fields) nameReadings.push(fields);
      number = decideCardNumber(numbers);
      name = mergeNameFields(nameReadings);
      parsed = parseIdText(texts.join("\n"));
      if (parsed.idType === "National ID" && number.settled && name && name.support >= 2) break;
    }
    parsed = { ...parsed, idNumber: number.value, fullName: name?.fullName ?? "" };

    // Only a positively recognised Philippine National ID passes, and only with
    // both its card number and a name read. Everything else is refused here, so
    // no verification is issued for it.
    if (parsed.idType !== "National ID") {
      return NextResponse.json(
        {
          error:
            "This does not look like a Philippine National ID (PhilSys). Only the National ID is accepted for self-registration.",
          idType: parsed.idType,
        },
        { status: 422 },
      );
    }
    // It is a National ID, but something on it wasn't legible: say which, so the
    // resident knows what to fix before retaking the photo.
    if (!parsed.idNumber) {
      return NextResponse.json(
        {
          error:
            "We can see this is a National ID, but could not read the 16-digit card number. Hold the card flat, avoid glare on the number, and keep it sharp inside the frame.",
          retry: true,
        },
        { status: 422 },
      );
    }
    if (!name) {
      return NextResponse.json(
        {
          error:
            "We could read the card number but not the name clearly. Keep the whole card inside the frame, in good light, and try again.",
          retry: true,
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      success: true,
      ...parsed,
      verification: signNationalIdScan({ cardNumber: parsed.idNumber, fullName: parsed.fullName }),
      // Anything less than two agreeing reads of the number and of the name asks the
      // resident to check the result against their card before continuing.
      confirm: !number.agreed || !name || name.support < 2,
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
