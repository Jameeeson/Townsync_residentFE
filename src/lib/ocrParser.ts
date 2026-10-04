export interface ParsedIdFields {
  fullName: string;
  idNumber: string;
  idType: string;
  isSuspicious?: boolean;
}

type NamePart = "first" | "middle" | "last" | "full";

// Keyword groups, most-specific first. A line is classified by the first group whose
// keyword appears in it, so "Gitnang Apelyido/Middle Name" resolves to "middle" even
// though "Apelyido" (a "last" keyword) is also a substring of that line.
const NAME_LABEL_GROUPS: { part: NamePart; keywords: string[] }[] = [
  { part: "middle", keywords: ["MIDDLE NAME", "GITNANG APELYIDO", "GITNANG"] },
  { part: "last", keywords: ["LAST NAME", "SURNAME", "FAMILY NAME", "APELYIDO"] },
  { part: "first", keywords: ["GIVEN NAME", "GIVEN NAMES", "FIRST NAME", "PANGALAN"] },
  { part: "full", keywords: ["FULL NAME", "NAME"] },
];

function classifyNameLabel(line: string): NamePart | null {
  const upper = line.toUpperCase();
  for (const group of NAME_LABEL_GROUPS) {
    if (group.keywords.some((kw) => upper.includes(kw))) return group.part;
  }
  return null;
}

function isUsableNameValue(value: string): boolean {
  if (!value) return false;
  const alphaChars = value.replace(/[^a-zA-Z]/g, "").length;
  return alphaChars / value.length >= 0.6;
}

function extractLabeledNameValue(line: string): { part: NamePart; value: string } | null {
  const colonIndex = line.indexOf(":");
  if (colonIndex === -1) return null;

  const label = line.slice(0, colonIndex).trim();
  const value = line.slice(colonIndex + 1).trim();
  const part = classifyNameLabel(label);
  if (!part || !isUsableNameValue(value)) return null;

  return { part, value };
}

function scoreAsName(text: string): number {
  const textUpper = text.toUpperCase();
  let score = 0.0;

  // 1. Disqualify labels
  const blacklisted = ["GIVEN", "NAME", "MIDDLE", "GITNANG", "ADDRESS", "BIRTH", "DATE", "SEX", "ISSUANCE"];
  if (blacklisted.some(label => textUpper.includes(label))) {
    return -1.0;
  }

  // 2. Reward All Caps (PhilSys style)
  if (textUpper === text && text.trim().length > 0) {
    score += 0.5;
  }

  // 3. Reward spaces (Names usually have first/last)
  if (text.includes(" ")) {
    score += 0.3;
  }

  // 4. Length check
  if (text.length > 4) score += 0.2;
  if (text.length > 25) score -= 0.5; // Too long for a name line usually

  // 5. Noise check (Alpha ratio)
  const alphaChars = text.replace(/[^a-zA-Z]/g, "").length;
  if (text.length > 0 && alphaChars / text.length < 0.7) {
    return -1.0;
  }

  return score;
}

// Text printed on the front of every PhilSys card / ePhilID, grouped by what it
// is, written as capital letters with no spaces (see lettersOnly). OCR drops
// words, so a card passes with any two different groups rather than needing
// every line read perfectly.
const PHILSYS_MARKERS: string[][] = [
  ["REPUBLIKANGPILIPINAS", "REPUBLICOFTHEPHILIPPINES"],
  ["PAMBANSANGPAGKAKAKILANLAN", "PHILIPPINEIDENTIFICATIONCARD", "PHILIPPINEIDENTIFICATIONSYSTEM", "PHILSYS", "EPHILID"],
  ["APELYIDO"],
  ["MGAPANGALAN", "GIVENNAMES"],
  ["PETSANGKAPANGANAKAN"],
  ["TIRAHAN"],
];

// Phrases this long tolerate OCR slips (one wrong, missing or extra letter per
// FUZZY_ERROR_RATE of the phrase); shorter ones must be read exactly.
const FUZZY_MIN_LENGTH = 9;
const FUZZY_ERROR_RATE = 0.2;

function lettersOnly(text: string): string {
  return text.toUpperCase().replace(/[^A-Z]/g, "");
}

/** Whether `needle` appears in `haystack` with at most `maxErrors` edits (Sellers' algorithm). */
function containsApprox(haystack: string, needle: string, maxErrors: number): boolean {
  if (maxErrors === 0) return haystack.includes(needle);
  const m = needle.length;
  let prev = new Array<number>(m + 1);
  for (let i = 0; i <= m; i += 1) prev[i] = i;
  for (let j = 1; j <= haystack.length; j += 1) {
    const cur = new Array<number>(m + 1);
    cur[0] = 0; // a match may start anywhere in the haystack
    for (let i = 1; i <= m; i += 1) {
      const cost = needle[i - 1] === haystack[j - 1] ? 0 : 1;
      cur[i] = Math.min(prev[i - 1] + cost, prev[i] + 1, cur[i - 1] + 1);
    }
    if (cur[m] <= maxErrors) return true;
    prev = cur;
  }
  return false;
}

function hasMarker(letters: string, phrases: string[]): boolean {
  return phrases.some((phrase) =>
    containsApprox(
      letters,
      phrase,
      phrase.length >= FUZZY_MIN_LENGTH ? Math.floor(phrase.length * FUZZY_ERROR_RATE) : 0,
    ),
  );
}

// OCR often reads digits as look-alike letters (0→O, 1→I, 5→S, 8→B) or splits a
// group with a stray space. Only lines that are already mostly digits are
// corrected, so ordinary words are never turned into numbers.
const DIGIT_LOOKALIKES: Record<string, string> = {
  O: "0", o: "0", D: "0", Q: "0", I: "1", l: "1", i: "1", "|": "1", "!": "1",
  Z: "2", z: "2", S: "5", s: "5", B: "8", G: "6", b: "6", T: "7",
};

/** The 16-digit PhilSys Card Number formatted ####-####-####-####, or "". */
export function findCardNumber(text: string): string {
  for (const line of text.split("\n")) {
    const alnum = line.replace(/[^0-9A-Za-z|!]/g, "");
    const digits = alnum.replace(/\D/g, "");
    if (digits.length < 12 || digits.length / alnum.length < 0.75) continue;
    const fixed = line
      .replace(/[OoDQIli|!ZzSsBGbT]/g, (c) => DIGIT_LOOKALIKES[c] ?? c)
      .replace(/(\d)\s+(?=\d)/g, "$1");
    const match = fixed.match(/(?<!\d)(\d{4})[-.,_ ]?(\d{4})[-.,_ ]?(\d{4})[-.,_ ]?(\d{4})(?!\d)/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}-${match[4]}`;
  }
  return "";
}

// Wording that belongs to other IDs and cards. Any of it means the photo is not
// a National ID, even if it happens to contain a 16-digit number.
const OTHER_ID_MARKERS =
  /DRIVER'?S?\s*LICEN[CS]E|LAND\s*TRANSPORTATION|\bLTO\b|PASSPORT|PASAPORTE|\bUMID\b|SOCIAL\s*SECURITY|PHILHEALTH|POSTAL\s*IDENTITY|\bPRC\b|PROFESSIONAL\s*REGULATION|VOTER|COMELEC|\bTIN\b|BUREAU\s*OF\s*INTERNAL|STUDENT|\bVISA\b|MASTERCARD|DEBIT|CREDIT\s*CARD/i;

const REQUIRED_MARKER_GROUPS = 2;

// Card header and field wording that must never be taken as a person's name.
const HEADER_WORDS = /REPUBLI|PILIPINAS|PHILIPPINE|PAMBANSANG|PAGKAKAKILANLAN|IDENTIFICATION|PETSA|TIRAHAN|KAPANGANAKAN|\bBLK\b|\bLOT\b|\bST\b|CITY/i;

/**
 * True only when the text reads as the front of a Philippine National ID: a
 * 16-digit PhilSys Card Number, at least two kinds of PhilSys card wording, and
 * nothing that belongs to a different ID or card.
 */
export function isPhilippineNationalId(text: string, hasCardNumber: boolean): boolean {
  if (!hasCardNumber) return false;
  if (OTHER_ID_MARKERS.test(text)) return false;
  const letters = lettersOnly(text);
  const groups = PHILSYS_MARKERS.filter((phrases) => hasMarker(letters, phrases)).length;
  return groups >= REQUIRED_MARKER_GROUPS;
}

// PhilSys prints names in capitals, so capitalised words count as name and
// mixed-case words are treated as OCR noise (e.g. a misread label).
function nameQuality(name: string): { caps: number; noise: number } {
  const words = name.split(/[\s,]+/).filter(Boolean);
  const caps = words.filter((word) => /^[A-Z][A-Z.'-]+$/.test(word)).length;
  return { caps, noise: words.length - caps };
}

/** A name worth showing: at least a given name and a surname, with little noise. */
export function isPlausibleName(name: string): boolean {
  const { caps, noise } = nameQuality(name);
  return caps >= 2 && noise <= 1;
}

/**
 * Picks the most complete name among several readings of the same card (one per
 * OCR pass): the most capitalised words net of noise, and among equals the one
 * read most often.
 */
export function pickBestName(candidates: string[]): string {
  const counts = new Map<string, number>();
  for (const candidate of candidates) {
    const name = candidate.trim().replace(/\s+/g, " ");
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  let best = "";
  let bestKey = [-Infinity, -1];
  for (const [name, count] of counts) {
    const { caps, noise } = nameQuality(name);
    const key = [caps - 2 * noise, count];
    if (key[0] > bestKey[0] || (key[0] === bestKey[0] && key[1] > bestKey[1])) {
      best = name;
      bestKey = key;
    }
  }
  return best;
}

export function parseIdText(text: string): ParsedIdFields {
  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 2);
  const fullText = lines.join(" ");

  // 1. Extract ID Number. A National ID is only ever identified by its 16-digit
  // PhilSys Card Number (####-####-####-####).
  const pcn = findCardNumber(text);

  // 2. Extract Name
  let bestName = "";
  let highestScore = -1;

  // Strategy A: explicit same-line "Label: Value" pairs (driver's licenses, most
  // non-PhilSys cards). Treated as authoritative when found, since an explicit
  // label beats any heuristic guess.
  const labeledParts: Partial<Record<NamePart, string>> = {};
  for (const line of lines) {
    const extracted = extractLabeledNameValue(line);
    if (extracted && !labeledParts[extracted.part]) {
      labeledParts[extracted.part] = extracted.value;
    }
  }

  // Strategy B: bilingual label on its own line with no colon (PhilSys-style, e.g.
  // "Apelyido/Last Name" followed on the next line(s) by "DELA CRUZ"). Fills in
  // whichever parts Strategy A didn't already find from a same-line pair.
  for (let i = 0; i < lines.length; i++) {
    const part = classifyNameLabel(lines[i]);
    if (!part || labeledParts[part]) continue;

    // The value sits immediately after its label in these formats. Stop as soon as we
    // hit the next field's label (or a clearly bad line), so a short value like "JUAN"
    // doesn't lose out to a longer value belonging to the *next* field further down.
    for (let j = i + 1; j <= i + 2 && j < lines.length; j++) {
      if (classifyNameLabel(lines[j])) break;
      const score = scoreAsName(lines[j]);
      if (score < 0) break;
      if (score >= 0.5) {
        labeledParts[part] = lines[j];
        break;
      }
    }
  }

  // Strategy B2 (PhilSys layout): when blur or glare makes the small grey labels
  // unreadable, the bold values still come right after the card number, in the
  // order last name, given names, middle name. Fills only the parts still missing.
  if (pcn && !labeledParts.full) {
    const start = lines.findIndex((line) => findCardNumber(line));
    const missing = (["last", "first", "middle"] as const).filter((part) => !labeledParts[part]);
    if (start >= 0 && missing.length === 3) {
      const values = lines
        .slice(start + 1)
        .filter((line) => !classifyNameLabel(line) && !HEADER_WORDS.test(line) && scoreAsName(line) >= 0.5)
        .slice(0, 3);
      values.forEach((value, k) => {
        labeledParts[missing[k]] = value;
      });
    }
  }

  if (labeledParts.full) {
    bestName = labeledParts.full;
    highestScore = 1;
  } else if (labeledParts.first || labeledParts.last || labeledParts.middle) {
    bestName = [labeledParts.first, labeledParts.middle, labeledParts.last].filter(Boolean).join(" ");
    highestScore = 1;
  }

  // Strategy C: fallback if neither label-driven strategy found anything — just
  // find the highest scoring line in the whole document.
  if (!bestName || highestScore < 0.5) {
    lines.forEach(line => {
      const score = scoreAsName(line);
      if (score > highestScore) {
        highestScore = score;
        bestName = line;
      }
    });
  }

  // 3. Determine ID Type. Only the Philippine National ID (PhilSys) is accepted
  // for self-registration, so it must be positively recognised (see
  // isPhilippineNationalId); anything else is reported as "Unknown" or by the
  // other ID it looks like, and the scan screen refuses to continue.
  const idType = isPhilippineNationalId(fullText, Boolean(pcn)) ? "National ID" : "Unknown";

  return {
    fullName: bestName.replace(/[^a-zA-Z\s,.]/g, ""), // Clean noise
    idNumber: idType === "National ID" ? pcn : "",
    idType,
  };
}
