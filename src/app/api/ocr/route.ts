import { NextRequest, NextResponse } from "next/server";
import { createWorker, PSM } from "tesseract.js";
import { idVerificationConfigured, signNationalIdScan } from "@/lib/idVerification";
import {
  cardNumberGroups,
  decideCardNumber,
  findNumberRegion,
  mergeNameFields,
  nameFieldsFromCard,
  parseIdText,
  readCardNumber,
  type NameFields,
  type NumberRegion,
  type PageLine,
  type PassNumberReading,
} from "@/lib/ocrParser";

export const runtime = "nodejs";
// A hard-to-read photo is retried several ways (see READ_BUDGET_MS) and can take ~10s,
// longer than the 10s default some hosting plans give a serverless function.
export const maxDuration = 30;

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

/**
 * Number-focused reading. The 16-digit card number is bold black text over the card's
 * coloured swirl pattern, right above the photo, and a whole-card read often drops it
 * even when everything else is legible. So the photo is converted to its brightest
 * colour channel (black ink stays dark, every coloured background turns light) and read
 * in overlapping horizontal strips with only digits allowed, which leaves the number
 * line alone in its strip. Each strip takes about a tenth of a second.
 */
async function* numberStrips(
  sharp: Sharp,
  oriented: import("sharp").Sharp,
  tiltDegrees: number,
  region: NumberRegion | null,
  regionScale: number,
): AsyncGenerator<{ crop: string; prep: string; mode: PSM; image: Buffer }> {
  // Strips are horizontal, so a card photographed at an angle is first straightened by
  // the tilt Tesseract measured on the page read (reliable for the moderate angles people
  // actually hold a card at).
  let source = oriented.clone();
  if (Math.abs(tiltDegrees) >= 1) {
    source = sharp(await oriented.clone().toBuffer()).rotate(tiltDegrees, { background: "#ffffff" });
  }
  const { data, info } = await source
    .resize({ width: MIN_WIDTH, kernel: "lanczos3" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const bright = Buffer.alloc(info.width * info.height);
  for (let i = 0, p = 0; i < bright.length; i += 1, p += 3) {
    bright[i] = Math.max(data[p], data[p + 1], data[p + 2]);
  }
  const gray = () => sharp(bright, { raw: { width: info.width, height: info.height, channels: 1 } });

  const preparations: { source: string; prepare: (image: import("sharp").Sharp) => import("sharp").Sharp }[] = [
    { source: "strip-threshold", prepare: (image) => image.normalize().threshold(110) },
    { source: "strip-normalized", prepare: (image) => image.normalize().sharpen({ sigma: 1 }) },
    { source: "strip-threshold-light", prepare: (image) => image.normalize().threshold(135) },
  ];

  // First: the band where the page read says the number is (see findNumberRegion), cut a
  // few ways because reading is sensitive to exactly where the crop edges fall.
  if (region) {
    const unit = region.unit * regionScale;
    const centre = [
      [0, 0],
      [-0.7, 0.7],
      [0.5, 0.5],
    ];
    for (const [cropIndex, [topShift, bottomShift]] of centre.entries()) {
      const top = Math.max(0, Math.round(region.top * regionScale + topShift * unit));
      const bottom = Math.min(info.height, Math.round(region.bottom * regionScale + bottomShift * unit));
      if (bottom - top < 24) continue;
      for (const { source, prepare } of preparations) {
        const image = await prepare(gray().extract({ left: 0, top, width: info.width, height: bottom - top }))
          .png()
          .toBuffer();
        yield { crop: `region-${cropIndex}`, prep: source, mode: PSM.SINGLE_BLOCK, image };
      }
    }
  }

  const stripHeight = Math.round(info.height * 0.2);
  // Reading is sensitive to where a strip lands relative to the number line, so strips
  // overlap densely. The likeliest area (upper-middle of the card) goes first, nearest
  // the usual number position outward, then the rest; most cards finish within a few.
  const likely: number[] = [];
  for (let fraction = 0.2; fraction <= 0.5001; fraction += 0.035) likely.push(fraction);
  likely.sort((a, b) => Math.abs(a - 0.33) - Math.abs(b - 0.33));
  const tops = [...likely, 0.15, 0.55, 0.1, 0.6, 0.05].map((fraction) => Math.round(info.height * fraction));
  for (const top of tops) {
    if (top < 0 || top + stripHeight > info.height) continue;
    for (const { source, prepare } of preparations) {
      const image = await prepare(gray().extract({ left: 0, top, width: info.width, height: stripHeight }))
        .png()
        .toBuffer();
      yield { crop: `strip-${top}`, prep: source, mode: PSM.SINGLE_BLOCK, image };
    }
  }
}

// A photo that still isn't settled after this long gets a plain "retake" instead of more waiting.
const READ_BUDGET_MS = 9000;

/** Text lines with their vertical position from a Tesseract result. */
function pageLines(data: unknown): PageLine[] {
  const blocks =
    (data as { blocks?: { paragraphs?: { lines?: { text: string; bbox: { y0: number; y1: number } }[] }[] }[] })
      .blocks ?? [];
  const lines: PageLine[] = [];
  for (const block of blocks) {
    for (const paragraph of block.paragraphs ?? []) {
      for (const line of paragraph.lines ?? []) {
        lines.push({ text: line.text, y0: line.bbox.y0, y1: line.bbox.y1 });
      }
    }
  }
  return lines;
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
    let orientedImage: import("sharp").Sharp | null = null;
    if (sharp) {
      try {
        const oriented = sharp(buffer, { limitInputPixels: MAX_PIXELS }).rotate(); // auto-orient from EXIF
        orientedImage = oriented;
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
    let stripsTried = false;
    let tiltDegrees = 0;
    let numberRegion: NumberRegion | null = null;
    let pageWidth = MIN_WIDTH;
    const startedAt = Date.now();
    for (const pass of passes) {
      if (texts.length > 0 && Date.now() - startedAt > READ_BUDGET_MS) break;
      await worker.setParameters({
        tessedit_pageseg_mode: pass.mode,
        preserve_interword_spaces: "1",
        tessedit_char_whitelist: "",
      });
      // rotateAuto straightens a card held at a slight angle before reading it.
      const input = await pass.image();
      const { data } = await worker.recognize(input, { rotateAuto: true }, { text: true, blocks: true });
      const text = data.text;
      if (texts.length === 0) {
        tiltDegrees = (((data as { rotateRadians?: number }).rotateRadians ?? 0) * 180) / Math.PI;
        numberRegion = findNumberRegion(pageLines(data));
        pageWidth = sharp ? ((await sharp(input).metadata()).width ?? MIN_WIDTH) : MIN_WIDTH;
      }
      texts.push(text);
      numbers.push({
        reading: readCardNumber(text),
        groups: cardNumberGroups(text),
        crop: `page-${numbers.length}`,
        prep: `page-${numbers.length}`,
      });
      const fields = nameFieldsFromCard(text);
      if (fields) nameReadings.push(fields);
      number = decideCardNumber(numbers);
      name = mergeNameFields(nameReadings);
      parsed = parseIdText(texts.join("\n"));

      // The card is recognisable but its number isn't settled: look for the number on its
      // own (see numberStrips), then go back to full-page reads. If the first page read
      // found no number at all there is nothing for a second page read to corroborate, so
      // strips start right away; otherwise the second page read (a differently prepared
      // copy, which settles most cards by itself and is cheaper) goes first.
      if (
        sharp &&
        orientedImage &&
        !stripsTried &&
        (texts.length >= 2 || !number.value) &&
        !number.settled &&
        parsed.idType === "National ID"
      ) {
        stripsTried = true;
        await worker.setParameters({ tessedit_char_whitelist: "0123456789-", preserve_interword_spaces: "1" });
        let stripReads = 0;
        // With a clean whole-page reading already in hand the strips only corroborate it.
        const stripBudget = number.value ? 12 : 30;
        // Page coordinates only line up with the strip image when the card isn't noticeably tilted.
        const anchored = Math.abs(tiltDegrees) < 2 ? numberRegion : null;
        for await (const strip of numberStrips(sharp, orientedImage, tiltDegrees, anchored, 1600 / pageWidth)) {
          if (stripReads >= stripBudget || Date.now() - startedAt > READ_BUDGET_MS) break;
          stripReads += 1;
          await worker.setParameters({ tessedit_pageseg_mode: strip.mode });
          const {
            data: { text: stripText },
          } = await worker.recognize(strip.image);
          numbers.push({
            reading: readCardNumber(stripText),
            groups: cardNumberGroups(stripText),
            crop: strip.crop,
            prep: strip.prep,
          });
          number = decideCardNumber(numbers);
          if (number.agreed) break;
        }
        await worker.setParameters({ tessedit_char_whitelist: "" });
      }
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
