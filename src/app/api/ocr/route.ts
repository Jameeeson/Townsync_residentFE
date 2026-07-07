import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { createWorker } from "tesseract.js";
import { parseIdText } from "@/lib/ocrParser";
import sharp from "sharp";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // --- PRE-PROCESSING (Crucial for Tesseract) ---
    const processedImage = await sharp(buffer)
      .grayscale() // Tesseract works better on B&W
      .normalize() // Fix exposure
      .toBuffer();

    const worker = await createWorker("eng"); // Tesseract v5 uses simple init

    const { data: { text } } = await worker.recognize(processedImage);
    await worker.terminate();

    const parsed = parseIdText(text);

    // Basic Validation
    if (!parsed.idNumber && !parsed.fullName) {
      return NextResponse.json({ 
        error: "Could not read ID clearly. Please provide a sharper image.",
        rawText: text 
      }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      rawText: text,
      ...parsed,
    });
  } catch (error) {
    console.error("OCR error:", error);
    return NextResponse.json({ error: "Failed to process image" }, { status: 500 });
  }
}