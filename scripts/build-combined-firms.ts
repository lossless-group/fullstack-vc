// scripts/build-combined-firms.ts
//
// Merges the April 29 launch survey firms (from src/data/webinar-survey/
// 2026-04-29_agentic-vc-dojo-launch.json $.firms) with the May 27 registration
// roll-up (from context-v/extra/2026-05-27_ ATTENDEES.csv, email column), and
// writes a combined JSON the deck slide 02a "Firms represented" panel reads
// from. Each firm is tagged with source ∈ {april-only, may-only, both} and a
// repeat boolean so the renderer can highlight cross-session attendees.
//
// Run via:
//
//   pnpm gen:combined-firms
//
// Safe to re-run any time the source files change. The output JSON is
// committed so the deck composes against a stable file regardless of build
// environment.
//
// Output shape: extends the April $.firms entry shape (name, domains, count)
// with two new fields (source, repeat). Existing
// Section__WebinarFirmsRepresented can be extended to read the new fields
// with one small prop addition; without that, it ignores them and renders
// the union as a flat list (no styling distinction) — which is still useful
// as a fallback.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// ─── Paths ──────────────────────────────────────────────────────────────────
const ROOT = resolve(import.meta.dirname, "..");
const APRIL_JSON_PATH = resolve(
  ROOT,
  "src/data/webinar-survey/2026-04-29_agentic-vc-dojo-launch.json",
);
const MAY_CSV_PATH = resolve(
  ROOT,
  "context-v/extra/2026-05-27_ ATTENDEES.csv",
);
const OUTPUT_PATH = resolve(
  ROOT,
  "src/data/webinar-survey/2026-05-27_combined-firms.json",
);

// Personal / corporate / inbox-provider domains that are NOT VC firms.
// Anyone registering with an email from one of these should not get their
// "firm" added to the network. Extend as new edge cases surface.
const EXCLUDED_DOMAINS = new Set([
  "gmail.com",
  "intel.com",
  "okta.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "proton.me",
  "protonmail.com",
  "icloud.com",
  "me.com",
]);

// Hand-curated names for domains where the auto-derivation would be ugly.
// Extend as new firms join. Lookup is case-insensitive on the domain.
const NAME_OVERRIDES: Record<string, string> = {
  "wvvcapital.com": "WVV Capital",
  "lyticalventures.com": "Lytical Ventures",
  "53stations.com": "53 Stations",
  "tribecap.co": "Tribe Capital",
  "voyagervc.com": "Voyager VC",
  "notioncapital.com": "Notion Capital",
  "hqcap.com": "HQ Capital",
  "enza.capital": "Enza Capital",
  "cortado.ventures": "Cortado Ventures",
  "alexia.vc": "Alexia VC",
  "seedstars.com": "Seedstars",
  "iolar.vc": "Iolar Ventures",
  "hi.vc": "Hi.VC",
  "nidovc.com.br": "Nido VC",
  "novelcapital.com": "Novel Capital",
  "prysmcapital.com": "Prysm Capital",
  "glitchcap.com": "Glitch Capital",
  "fjlabs.com": "FJ Labs",
  "soundboardventurefund.com": "Soundboard Venture Fund",
};

// ─── Types ──────────────────────────────────────────────────────────────────
type AprilFirm = { name: string; domains: string[]; count: number };
type CombinedFirm = AprilFirm & {
  source: "april-only" | "may-only" | "both";
  repeat: boolean;
};

// ─── Helpers ────────────────────────────────────────────────────────────────
function deriveNameFromDomain(domain: string): string {
  if (NAME_OVERRIDES[domain.toLowerCase()]) {
    return NAME_OVERRIDES[domain.toLowerCase()];
  }
  // Strip TLD (last dot segment), replace remaining dots / hyphens with space,
  // title-case each word. Imperfect — the overrides table is the escape hatch.
  const stripped = domain.replace(/\.(com|co|org|io|net|ai)$/i, "");
  return stripped
    .replace(/[.-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

// Very small CSV row parser tuned for the Webex export shape — comma-separated
// with double-quoted values that may contain commas / newlines / escaped
// quotes. Returns the row's cells as strings (quotes stripped).
function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (inQuotes) {
      if (ch === '"' && csv[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      current.push(cell);
      cell = "";
    } else if (ch === "\n") {
      current.push(cell);
      rows.push(current);
      current = [];
      cell = "";
    } else if (ch === "\r") {
      // skip — handled by \n
    } else {
      cell += ch;
    }
  }
  if (cell || current.length) {
    current.push(cell);
    rows.push(current);
  }
  return rows.filter((r) => r.length > 1 || (r[0] && r[0].trim() !== ""));
}

// ─── Read April firms ───────────────────────────────────────────────────────
const aprilJson = JSON.parse(readFileSync(APRIL_JSON_PATH, "utf8"));
const aprilFirms: AprilFirm[] = aprilJson.firms ?? [];

// Build a lookup: every April domain → its firm entry, for fast matching.
const aprilDomainToFirm = new Map<string, AprilFirm>();
for (const firm of aprilFirms) {
  for (const d of firm.domains) {
    aprilDomainToFirm.set(d.toLowerCase(), firm);
  }
}

// ─── Read May registrations ─────────────────────────────────────────────────
const mayCsv = readFileSync(MAY_CSV_PATH, "utf8");
const mayRows = parseCsvRows(mayCsv);

// Header row is the third row in this Webex export (rows 0-1 are metadata).
// Column 1 (index 1) is "Registrant email" once we hit the header.
const headerRowIndex = mayRows.findIndex(
  (r) => r[0] === "Name" && r.some((c) => c.includes("Registrant email")),
);
if (headerRowIndex === -1) {
  console.error("Could not find header row in May CSV. Expected 'Name' in col 1.");
  process.exit(1);
}
const dataRows = mayRows.slice(headerRowIndex + 1);

const mayDomains = new Set<string>();
for (const row of dataRows) {
  const email = (row[1] ?? "").trim().toLowerCase();
  if (!email.includes("@")) continue;
  const domain = email.split("@")[1];
  if (!domain) continue;
  if (EXCLUDED_DOMAINS.has(domain)) continue;
  mayDomains.add(domain);
}

// ─── Merge ──────────────────────────────────────────────────────────────────
const combined: CombinedFirm[] = [];
const aprilFirmsSeen = new Set<AprilFirm>();

// Pass A — for every April firm, check whether any of its domains shows up in
// May. If so → 'both' + repeat: true. Otherwise → 'april-only'.
for (const firm of aprilFirms) {
  const inMay = firm.domains.some((d) => mayDomains.has(d.toLowerCase()));
  combined.push({
    name: firm.name,
    domains: firm.domains,
    count: firm.count,
    source: inMay ? "both" : "april-only",
    repeat: inMay,
  });
  aprilFirmsSeen.add(firm);
}

// Pass B — for every May domain that didn't match an April firm, create a new
// firm entry sourced as 'may-only'.
for (const domain of mayDomains) {
  if (aprilDomainToFirm.has(domain)) continue; // already covered in Pass A
  combined.push({
    name: deriveNameFromDomain(domain),
    domains: [domain],
    count: 1,
    source: "may-only",
    repeat: false,
  });
}

// Sort alphabetically by display name for a stable order in the rendered grid.
combined.sort((a, b) => a.name.localeCompare(b.name));

// ─── Summary ────────────────────────────────────────────────────────────────
const aprilOnly = combined.filter((f) => f.source === "april-only").length;
const mayOnly = combined.filter((f) => f.source === "may-only").length;
const both = combined.filter((f) => f.source === "both").length;
const total = combined.length;

const output = {
  generated_at: new Date().toISOString(),
  sources: {
    april_29: APRIL_JSON_PATH.replace(`${ROOT}/`, ""),
    may_27: MAY_CSV_PATH.replace(`${ROOT}/`, ""),
  },
  excluded_domains: [...EXCLUDED_DOMAINS],
  totals: {
    total,
    april_only: aprilOnly,
    may_only: mayOnly,
    both,
  },
  firms: combined,
};

writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n");

console.log(`Wrote ${OUTPUT_PATH.replace(`${ROOT}/`, "")}`);
console.log(`  Total firms:   ${total}`);
console.log(`  April-only:    ${aprilOnly}`);
console.log(`  May-only:      ${mayOnly}`);
console.log(`  Both (repeat): ${both}`);
console.log("");
if (both > 0) {
  console.log(`  Repeat firms (in both April + May):`);
  for (const firm of combined.filter((f) => f.source === "both")) {
    console.log(`    • ${firm.name}  (${firm.domains.join(", ")})`);
  }
}
