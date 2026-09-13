export interface ParsedIdFields {
  fullName: string;
  idNumber: string;
  idType: string;
  isSuspicious?: boolean;
}

type NamePart = "first" | "middle" | "last" | "full";

// Exact-match label -> which part of the name it holds. Matched against the
// text before a ":" on the same line, so this only fires for ID formats where
// the label and value share one line (e.g. "Last Name: RIVERA").
const NAME_LABELS: Record<string, NamePart> = {
  "NAME": "full",
  "FULL NAME": "full",
  "GIVEN NAME": "first",
  "GIVEN NAMES": "first",
  "FIRST NAME": "first",
  "PANGALAN": "first",
  "LAST NAME": "last",
  "SURNAME": "last",
  "FAMILY NAME": "last",
  "APELYIDO": "last",
  "MIDDLE NAME": "middle",
};

function extractLabeledNameValue(line: string): { part: NamePart; value: string } | null {
  const colonIndex = line.indexOf(":");
  if (colonIndex === -1) return null;

  const label = line.slice(0, colonIndex).trim().toUpperCase();
  const value = line.slice(colonIndex + 1).trim();
  const part = NAME_LABELS[label];
  if (!part || !value) return null;

  // Guard against grabbing a noisy/non-name value that happens to follow a name-ish label.
  const alphaChars = value.replace(/[^a-zA-Z]/g, "").length;
  if (alphaChars / value.length < 0.6) return null;

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
  if (labeledParts.full) {
    bestName = labeledParts.full;
    highestScore = 1;
  } else if (labeledParts.first || labeledParts.last) {
    bestName = [labeledParts.first, labeledParts.middle, labeledParts.last].filter(Boolean).join(" ");
    highestScore = 1;
  }

  // Strategy B: PhilSys-style "GIVEN NAME" label on its own line, with the actual
  // name printed on one of the next few lines.
  if (!bestName) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toUpperCase();

      if (line.includes("GIVEN NAME") || line.includes("PANGALAN")) {
        for (let j = i + 1; j <= i + 3 && j < lines.length; j++) {
          const score = scoreAsName(lines[j]);
          if (score > highestScore) {
            highestScore = score;
            bestName = lines[j];
          }
        }
      }
    }
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

  // 3. Determine ID Type
  let idType = "National ID";
  if (/driver|license|dl/i.test(fullText)) idType = "Driver's License";
  else if (/passport/i.test(fullText)) idType = "Passport";
  else if (/umid|sss|philhealth|tin/i.test(fullText)) idType = "Government ID";

  return {
    fullName: bestName.replace(/[^a-zA-Z\s,.]/g, ""), // Clean noise
    idNumber,
    idType,
  };
}
