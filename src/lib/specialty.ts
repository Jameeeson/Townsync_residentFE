/**
 * Technicians' specialization is free text ("Plumbing", "Electrical works", "HVAC / aircon"), while a
 * ticket's category is one of a few fixed words. These keywords connect the two so dispatch can put
 * the best-fitting technicians first.
 */
const CATEGORY_KEYWORDS: Record<string, RegExp> = {
  Plumbing: /plumb|pipe|water|drain|sanit/i,
  Electrical: /electr|wiring|power|lighting/i,
  HVAC: /hvac|air ?con|cooling|ventilat|refrigerat/i,
  Appliance: /appliance|refrigerat|washer|repair/i,
  Structural: /structur|carpent|mason|civil|roof|construct|weld|tile|paint|wood|pest|termite/i,
};

/** How well a technician's specialty fits a ticket category: 2 = fits, 1 = generalist, 0 = unrelated. */
export function specialtyFit(specialty: string | null | undefined, category: string | null | undefined): 0 | 1 | 2 {
  const text = (specialty ?? "").trim();
  const rule = CATEGORY_KEYWORDS[category ?? ""];
  if (rule && rule.test(text)) return 2;
  if (!text || /^(general|all[- ]?around|maintenance|handyman|multi)/i.test(text)) return 1;
  return 0;
}

export const SPECIALTY_FIT_LABEL: Record<0 | 1 | 2, string> = {
  2: "Matches this issue",
  1: "General",
  0: "Other specialty",
};
