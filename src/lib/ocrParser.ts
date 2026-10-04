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

// OCR often reads digits as look-alike letters (0→O, 1→I, 5→S, 8→B). Only tokens
// that are already mostly digits are corrected, so words are never turned into
// numbers, and stray edge marks ("|", "!") are never turned into digits at all.
const DIGIT_LOOKALIKES: Record<string, string> = {
  O: "0", o: "0", D: "0", Q: "0", I: "1", l: "1", i: "1",
  Z: "2", z: "2", S: "5", s: "5", B: "8", G: "6", b: "6", T: "7",
};

function formatCardNumber(digits: string): string {
  return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}-${digits.slice(12, 16)}`;
}

/** A 16-digit card number on one line of OCR text. `clean` = read as digits, no repair needed. */
function cardNumberFromLine(line: string): { value: string; clean: boolean } | null {
  const exact = line.match(/(?<!\d)(\d{4})[-.,_ ]?(\d{4})[-.,_ ]?(\d{4})[-.,_ ]?(\d{4})(?!\d)/);
  if (exact) return { value: formatCardNumber(exact.slice(1, 5).join("")), clean: true };

  // Repair: keep the mostly-digit tokens, fix look-alike letters inside them, then
  // take 16 digits from consecutive tokens (groups may be merged or split by OCR).
  const tokens = line
    .split(/[\s\-.,_]+/)
    .map((token) => token.replace(/[^0-9A-Za-z]/g, ""))
    .filter((token) => token.length >= 2)
    .map((token) => {
      if ((token.match(/\d/g)?.length ?? 0) / token.length < 0.5) return null;
      const fixed = token.replace(/[OoDQIliZzSsBGbT]/g, (c) => DIGIT_LOOKALIKES[c] ?? c);
      return /^\d+$/.test(fixed) ? fixed : null;
    });
  for (let start = 0; start < tokens.length; start += 1) {
    let digits = "";
    for (let k = start; k < tokens.length && tokens[k] !== null; k += 1) {
      digits += tokens[k];
      if (digits.length === 16) return { value: formatCardNumber(digits), clean: false };
      if (digits.length > 16) break;
    }
  }
  return null;
}

export interface CardNumberReading {
  value: string;
  /** True when the digits were read as digits (no look-alike letter repair was needed). */
  clean: boolean;
}

/**
 * The 16-digit PhilSys Card Number (####-####-####-####) read from one OCR text, or
 * null. When the text holds several readings the most agreed-on one wins, with
 * cleanly read digits counting double.
 */
export function readCardNumber(text: string): CardNumberReading | null {
  const votes = new Map<string, { score: number; first: number; clean: boolean }>();
  text.split("\n").forEach((line, index) => {
    const found = cardNumberFromLine(line);
    if (!found) return;
    const vote = votes.get(found.value) ?? { score: 0, first: index, clean: false };
    vote.score += found.clean ? 2 : 1;
    vote.clean = vote.clean || found.clean;
    votes.set(found.value, vote);
  });
  let best: CardNumberReading | null = null;
  let bestVote = { score: 0, first: Infinity };
  for (const [value, vote] of votes) {
    if (vote.score > bestVote.score || (vote.score === bestVote.score && vote.first < bestVote.first)) {
      best = { value, clean: vote.clean };
      bestVote = vote;
    }
  }
  return best;
}

/** The card number as text, or "" when none could be read. */
export function findCardNumber(text: string): string {
  return readCardNumber(text)?.value ?? "";
}

/**
 * The standalone 4-digit groups visible in an OCR text, even when the whole number
 * wasn't legible ("1234-5678 o1001213" gives 1234, 5678, 0100, 1213). Used to check
 * that another pass independently saw the same digits as a clean full reading.
 */
export function cardNumberGroups(text: string): string[] {
  const groups: string[] = [];
  for (const line of text.split("\n")) {
    for (const raw of line.split(/[\s\-.,_]+/)) {
      const token = raw.replace(/[^0-9A-Za-z]/g, "");
      if (token.length < 4 || (token.match(/\d/g)?.length ?? 0) / token.length < 0.5) continue;
      const fixed = token.replace(/[OoDQIliZzSsBGbT]/g, (c) => DIGIT_LOOKALIKES[c] ?? c);
      if (!/^\d+$/.test(fixed) || fixed.length % 4 !== 0) continue;
      for (let i = 0; i < fixed.length; i += 4) groups.push(fixed.slice(i, i + 4));
    }
  }
  return groups;
}

export interface PageLine {
  text: string;
  y0: number;
  y1: number;
}

/** Vertical band (in the page image's pixels) where the card number should be, and one text-line height. */
export interface NumberRegion {
  top: number;
  bottom: number;
  unit: number;
}

/**
 * Locates the card number from the lines read on the page. The number is printed just
 * under "Philippine Identification Card" and above the first name label
 * ("Apelyido/Last Name"), and those two lines are read far more reliably than the
 * number itself. Returns null when the anchor line wasn't read.
 */
export function findNumberRegion(lines: PageLine[]): NumberRegion | null {
  const anchor = lines.find((line) => containsApprox(lettersOnly(line.text), "IDENTIFICATIONCARD", 4));
  if (!anchor) return null;
  const unit = Math.max(8, anchor.y1 - anchor.y0);
  const label = lines.find(
    (line) => line.y0 > anchor.y1 && containsApprox(lettersOnly(line.text), "APELYIDOLASTNAME", 4),
  );
  const top = anchor.y1 - 0.3 * unit;
  const bottom = label ? Math.min(label.y0 + 0.2 * unit, anchor.y1 + 5 * unit) : anchor.y1 + 4 * unit;
  return bottom - top > unit ? { top, bottom, unit } : null;
}

export interface PassNumberReading {
  reading: CardNumberReading | null;
  groups: string[];
  /**
   * Which part of the photo was read ("page-0", "region-1", "strip-340"...) and how it was
   * prepared ("threshold", "page-0"...). Reads of the same crop share blind spots, and so do
   * reads prepared the same way (a 5 read as an 8 tends to repeat), so two reads only count
   * as agreeing when they differ in BOTH the crop and the preparation.
   */
  crop: string;
  prep: string;
}

/** A supporting pass must show at least this many of the number's four groups, last one included. */
const SUPPORT_GROUPS = 3;

function supports(value: string, groups: string[]): boolean {
  const wanted = value.split("-");
  if (!groups.includes(wanted[3])) return false;
  return wanted.filter((group) => groups.includes(group)).length >= SUPPORT_GROUPS;
}

export interface DecidedCardNumber {
  value: string;
  /** Two separate passes read the same full 16 digits. The only level that needs no human check. */
  agreed: boolean;
  /** `agreed`, or one pass read it as clean digits and another independently shows most of it. */
  settled: boolean;
}

/**
 * Decides the card number from what each OCR pass saw. The resident can't edit the
 * number afterwards, so how sure we are matters:
 *  - agreed:  two reads that differ in both the part of the photo and the preparation
 *             give the same full number. Trusted outright.
 *  - settled: one clean full read plus another pass that shows 3+ of its groups
 *             (including the last). Good enough to stop early, but the resident is
 *             still asked to confirm it, because the unseen group is unchecked.
 *  - a number read as clean digits by a single pass is still returned so a card only
 *    one preparation could read isn't rejected, but it is neither agreed nor settled.
 * A number that needed look-alike repair is never used from a single pass.
 */
export function decideCardNumber(passes: PassNumberReading[]): DecidedCardNumber {
  const tally = new Map<
    string,
    { passes: number; clean: number; first: number; crops: Set<string>; preps: Set<string> }
  >();
  passes.forEach(({ reading, crop, prep }, index) => {
    if (!reading) return;
    const entry = tally.get(reading.value) ?? {
      passes: 0,
      clean: 0,
      first: index,
      crops: new Set<string>(),
      preps: new Set<string>(),
    };
    entry.passes += 1;
    entry.crops.add(crop);
    entry.preps.add(prep);
    if (reading.clean) entry.clean += 1;
    tally.set(reading.value, entry);
  });

  let best: DecidedCardNumber = { value: "", agreed: false, settled: false };
  let bestRank: number[] | null = null;
  for (const [value, entry] of tally) {
    const supporters = passes.filter(({ reading, groups }) => reading?.value !== value && supports(value, groups)).length;
    const agreed = entry.crops.size >= 2 && entry.preps.size >= 2;
    const settled = agreed || (entry.clean >= 1 && supporters >= 1);
    if (!settled && entry.clean < 1) continue; // a repaired number seen by a single pass
    const rank = [agreed ? 2 : settled ? 1 : 0, entry.passes + supporters, entry.clean, -entry.first];
    if (isBetter(rank, bestRank)) {
      best = { value, agreed, settled };
      bestRank = rank;
    }
  }
  return best;
}

function isBetter(a: number[], b: number[] | null): boolean {
  if (!b) return true;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
}

// Wording that belongs to other IDs and cards. Any of it means the photo is not
// a National ID, even if it happens to contain a 16-digit number.
const OTHER_ID_MARKERS =
  /DRIVER'?S?\s*LICEN[CS]E|LAND\s*TRANSPORTATION|\bLTO\b|PASSPORT|PASAPORTE|\bUMID\b|SOCIAL\s*SECURITY|PHILHEALTH|POSTAL\s*IDENTITY|\bPRC\b|PROFESSIONAL\s*REGULATION|VOTER|COMELEC|\bTIN\b|BUREAU\s*OF\s*INTERNAL|STUDENT|\bVISA\b|MASTERCARD|DEBIT|CREDIT\s*CARD|UNIFIED\s*MULTI|MULTI-?\s*PURPOSE|\bCRN\b|SURNAME|LICEN[CS]E|\bSSS\b/i;

const REQUIRED_MARKER_GROUPS = 2;

// Card header and field wording that must never be taken as a person's name.
const HEADER_WORDS = /REPUBLI|PILIPINAS|PHILIPPINE|PAMBANSANG|PAGKAKAKILANLAN|IDENTIFICATION|PETSA|TIRAHAN|KAPANGANAKAN|\bBLK\b|\bLOT\b|\bST\b|CITY/i;

/**
 * True when the text reads as the front of a Philippine National ID: at least two
 * kinds of PhilSys card wording and nothing that belongs to a different ID or card.
 * Says nothing about whether the card number could be read (see findCardNumber).
 */
export function looksLikePhilId(text: string): boolean {
  if (OTHER_ID_MARKERS.test(text)) return false;
  const letters = lettersOnly(text);
  const groups = PHILSYS_MARKERS.filter((phrases) => hasMarker(letters, phrases)).length;
  return groups >= REQUIRED_MARKER_GROUPS;
}

/** A National ID needs both: it reads as a PhilSys card and its 16-digit number was read. */
export function isPhilippineNationalId(text: string, hasCardNumber: boolean): boolean {
  return hasCardNumber && looksLikePhilId(text);
}

// ---- Reading the name by position -------------------------------------------------
// The PhilID prints name fields in a fixed order under the card number: last name,
// given names (one or two lines), middle name, then the date of birth. Each value is
// in capitals under a small italic bilingual label ("Apelyido/Last Name"). On a phone
// photo those labels are often unreadable or missing entirely, so the capitalised
// value lines in that stretch of the card are what we rely on; labels, when they do
// survive, only help to say which value belongs to which field.

export interface NameFields {
  last: string;
  given: string;
  middle: string;
  /** Split using the card's own "/" field labels (more reliable than position alone). */
  labelled: boolean;
  /** How many capitalised value lines were found between the card number and the date of birth. */
  lines: number;
}

/** A bilingual field label such as "Apelyido/Last Name": a slash plus lowercase letters. */
function isFieldLabel(line: string): boolean {
  return line.includes("/") && /[a-z]/.test(line);
}

const BIRTH_LABELS = ["PETSANGKAPANGANAKAN", "DATEOFBIRTH"];

function isBirthOrAddressLabel(line: string): boolean {
  const letters = lettersOnly(line);
  return (
    BIRTH_LABELS.some((label) => containsApprox(letters, label, Math.floor(label.length * FUZZY_ERROR_RATE))) ||
    containsApprox(letters, "TIRAHANADDRESS", 2)
  );
}

/** "JANUARY 01, 1990" or a garbled version of it: marks the end of the name block. */
function isBirthDate(line: string): boolean {
  return /\b\d{1,2}\s*,?\s*(19|20)\d{2}\b/.test(line);
}

// Card header, field-label and address wording that is never part of a person's name.
// Long fragments are matched anywhere; short ones only as whole words (so a name like
// CHARLOTTE is not mistaken for "LOT").
const NON_NAME_FRAGMENTS =
  /REPUBLI|PILIPINAS|FILIPINAS|PHILIPPINE|PAMBANSANG|PAGKAKAKILANLAN|IDENTIFICATION|APELYIDO|PANGALAN|GITNANG|KAPANGANAKAN|TIRAHAN|SAMPALOK|JANUARY|FEBRUARY|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER/;
const NON_NAME_WORDS = /\b(BRGY|BARANGAY|ZONE|BLK|BLOCK|LOT|CITY|METRO|MANILA|PHL|ST|STREET|AVE|ROAD|ADDRESS|NAME|NAMES|LAST|GIVEN|MIDDLE)\b/;

/** The name text on a line if it looks like a printed value (capitals, letters only), else "". */
function nameValue(line: string): string {
  const cleaned = line
    .replace(/^[^A-Za-z]+|[^A-Za-z.]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const letters = cleaned.replace(/[^A-Za-z]/g, "").length;
  if (letters < 2) return "";
  if (cleaned !== cleaned.toUpperCase() || /[^A-Z .'-]/.test(cleaned)) return "";
  if (letters / cleaned.length < 0.8) return "";
  if (NON_NAME_FRAGMENTS.test(cleaned) || NON_NAME_WORDS.test(cleaned)) return "";
  return tidyName(cleaned);
}

/**
 * Drops single stray letters ("S JUANA") and a dot after a full word ("CRUZ."), but
 * keeps initials ("J.") and suffixes ("JR.").
 */
function tidyName(name: string): string {
  const words = name
    .split(" ")
    .filter((word) => word.replace(/[^A-Z]/g, "").length >= 2 || /[A-Z]\./.test(word))
    .map((word) => (word.endsWith(".") && word.replace(/[^A-Z]/g, "").length > 3 ? word.slice(0, -1) : word));
  return words.join(" ");
}

/** Drops 1-2 letter fragments when a field also has a real name line. */
function joinFieldLines(values: string[]): string {
  const real = values.filter((value) => value.replace(/[^A-Z]/g, "").length >= 4);
  return (real.length > 0 ? real : values).join(" ");
}

/**
 * Last / given / middle names read from one OCR text, or null when it doesn't hold a
 * complete set. Needs either the card's own field labels to split three fields, or at
 * least three value lines (a surname, one or more given-name lines, a middle name).
 */
export function nameFieldsFromCard(text: string): NameFields | null {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);

  // The name block starts after the card number (or, if that's unreadable, the
  // "Philippine Identification Card" line above it).
  let start = lines.findIndex((line) => cardNumberGroups(line).length >= 2);
  if (start < 0) {
    start = lines.findIndex((line) => containsApprox(lettersOnly(line), "IDENTIFICATIONCARD", 4));
  }

  // Values grouped under the card's own labels. Anything read above the first label
  // (an emblem fragment such as "WN") belongs to no field and is left out of the groups.
  const groups: string[][] = [];
  const values: string[] = [];
  let labels = 0;
  for (const line of lines.slice(start + 1)) {
    if (isBirthDate(line) || isBirthOrAddressLabel(line)) {
      if (values.length > 0) break;
      continue;
    }
    if (isFieldLabel(line)) {
      labels += 1;
      // Each label opens a field; a label with nothing under it yet (or two in a row) doesn't open a second one.
      if (groups.length === 0 || groups[groups.length - 1].length > 0) groups.push([]);
      continue;
    }
    const value = nameValue(line);
    if (!value) continue;
    values.push(value);
    if (groups.length > 0) groups[groups.length - 1].push(value);
    if (values.length >= 6) break;
  }

  if (labels >= 2 && groups.length === 3 && groups.every((group) => group.length > 0)) {
    const [last, given, middle] = groups.map(joinFieldLines);
    return { last, given, middle, labelled: true, lines: values.length };
  }
  if (values.length >= 3) {
    return {
      last: values[0],
      given: joinFieldLines(values.slice(1, -1)),
      middle: values[values.length - 1],
      labelled: false,
      lines: values.length,
    };
  }
  return null;
}

/** Whether `short` is `full` cut off part-way through its last word ("DELA CRU" of "DELA CRUZ"). */
function isTruncationOf(short: string, full: string): boolean {
  return short.length < full.length && full.startsWith(short) && short.split(" ").length === full.split(" ").length;
}

export interface MergedName {
  fields: NameFields;
  /** "GIVEN MIDDLE LAST" */
  fullName: string;
  /** How many separate readings back every field of the chosen name (1 = a single pass). */
  support: number;
}

/**
 * Combines the name read in each OCR pass. Readings are first grouped by shape (same
 * way of splitting the name, same number of lines) and the commonest shape wins, so a
 * pass that picked up a stray line is outvoted. Then each field takes the string the
 * most readings agree on, where a truncated reading ("DELA CRU") counts as support for
 * the complete one ("DELA CRUZ"), so the complete word wins.
 */
export function mergeNameFields(candidates: NameFields[]): MergedName | null {
  if (candidates.length === 0) return null;
  const shapes = new Map<string, NameFields[]>();
  for (const candidate of candidates) {
    const key = `${candidate.labelled ? "L" : "F"}${candidate.lines}`;
    shapes.set(key, [...(shapes.get(key) ?? []), candidate]);
  }
  const pool = [...shapes.values()].sort(
    (a, b) => b.length - a.length || Number(b[0].labelled) - Number(a[0].labelled) || b[0].lines - a[0].lines,
  )[0];

  let support = Infinity;
  const pick = (field: "last" | "given" | "middle"): string => {
    const values = pool.map((candidate) => candidate[field]).filter(Boolean);
    let best = "";
    let bestSupport = 0;
    for (const value of values) {
      const score = values.filter((other) => other === value || isTruncationOf(other, value)).length;
      const words = value.split(" ").length;
      const bestWords = best ? best.split(" ").length : 0;
      // Most support wins; on a tie keep the reading with more words (a missing word
      // can't be added back later, a stray one can be deleted), then the longer one.
      if (
        score > bestSupport ||
        (score === bestSupport && (words > bestWords || (words === bestWords && value.length > best.length)))
      ) {
        best = value;
        bestSupport = score;
      }
    }
    if (best) support = Math.min(support, bestSupport);
    return best;
  };
  const last = pick("last");
  const given = pick("given");
  const middle = pick("middle");
  if (!last || !given) return null;
  return {
    fields: { ...pool[0], last, given, middle },
    fullName: [given, middle, last].filter(Boolean).join(" "),
    support: Number.isFinite(support) ? support : 1,
  };
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

  const layoutFields = nameFieldsFromCard(text);
  const layoutName = layoutFields ? mergeNameFields([layoutFields])?.fullName ?? "" : "";
  if (layoutName) {
    bestName = layoutName;
    highestScore = 1;
  } else if (labeledParts.full) {
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
  // for self-registration, so it must be positively recognised (see looksLikePhilId);
  // anything else is "Unknown" and the scan screen refuses to continue. A recognised
  // card whose number couldn't be read still comes back as "National ID" with an empty
  // idNumber, so the resident can be told to retake the photo rather than that it
  // isn't a National ID.
  const idType = looksLikePhilId(fullText) ? "National ID" : "Unknown";

  return {
    fullName: bestName.replace(/[^a-zA-Z\s,.]/g, ""), // Clean noise
    idNumber: idType === "National ID" ? pcn : "",
    idType,
  };
}
