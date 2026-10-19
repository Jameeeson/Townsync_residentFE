/**
 * Staff accounts are sometimes stored with the role in front of the name ("Maintenance. Jasen Aquino"). Wherever a name is
 * shown to a person only the name is wanted.
 */
const ROLE_LABEL = /^\s*(?:maintenance|maintainance|staff|security(?:\s+guard)?|admin(?:istrator)?|technician|tech)\s*[.:\-\u2013\u2014/]+\s*/i;

export function cleanPersonName(name: string | null | undefined): string {
  let text = (name ?? "").replace(/\s+/g, " ").trim();
  for (let i = 0; i < 3; i += 1) {
    const stripped = text.replace(ROLE_LABEL, "");
    if (stripped === text) break;
    text = stripped;
  }
  text = text.replace(/^[\s.:-]+|[\s.:-]+$/g, "");
  // Keep what was stored when nothing else is left (an account with only a role label or an email).
  return text || (name ?? "").trim();
}
