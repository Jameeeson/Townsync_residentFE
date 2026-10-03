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

export function parseIdText(text: string): ParsedIdFields {
  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 2);
  const fullText = lines.join(" ");

  // 1. Extract ID Number (PhilSys: 1111-2222-3333-4444)
  const philsysMatch = text.match(/(\d{4})[\s.-](\d{4})[\s.-](\d{4})[\s.-](\d{4})/);
  const genericMatch = text.match(/\b(\d{6,14})\b/);

  const idNumber = philsysMatch
    ? `${philsysMatch[1]}-${philsysMatch[2]}-${philsysMatch[3]}-${philsysMatch[4]}`
    : (genericMatch?.[1] ?? "");

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
  // for self-registration, so it must be positively recognised: either its
  // printed title or its 16-digit PhilSys Card Number (####-####-####-####).
  const philsysTitle =
    /PAMBANSANG|PAGKAKAKILANLAN|PHILIPPINE\s*IDENTIFICATION|PHIL\s*SYS|PHILID|NATIONAL\s*ID/i.test(fullText);
  let idType = "Unknown";
  if (philsysTitle || philsysMatch) idType = "National ID";
  else if (/driver|license|\bdl\b/i.test(fullText)) idType = "Driver's License";
  else if (/passport/i.test(fullText)) idType = "Passport";
  else if (/\b(umid|sss|philhealth|tin)\b/i.test(fullText)) idType = "Government ID";

  return {
    fullName: bestName.replace(/[^a-zA-Z\s,.]/g, ""), // Clean noise
    idNumber,
    idType,
  };
}
