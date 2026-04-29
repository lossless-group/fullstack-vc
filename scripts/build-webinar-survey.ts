// ============================================================================
// build-webinar-survey.ts
//
// Reads a Zoom-style registrant CSV and emits a normalized JSON blob the
// webinar detail page consumes at build time. Everything that hits the
// rendered HTML is aggregated or anonymized — individual names and emails
// stay in this script's input and never leave the JSON.
//
// Run:
//   pnpm --filter fullstack-vc gen:webinar-survey
//
// The output JSON is committed and hand-edited to (a) curate the final
// quote list and (b) override domain → firm display names. Re-running the
// script regenerates `_candidates` blocks but preserves the curated arrays
// (it merges, it doesn't overwrite hand-edits).
// ============================================================================

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const SOURCE_CSV = new URL(
  '../context-v/extra/2026-04-26_AI-SIG_AI-Skill-Dojo-Reg_report.csv',
  import.meta.url
).pathname;

const OUT_JSON = new URL(
  '../src/data/webinar-survey/2026-04-29_agentic-vc-dojo-launch.json',
  import.meta.url
).pathname;

// ---------- Domain → firm display name overrides ---------------------------
// Public-facing names. Edit here if a brand prefers a specific casing.
const FIRM_NAMES: Record<string, string> = {
  'cometa.vc': 'Cometa',
  'foolventures.com': 'Motley Fool Ventures',
  'mgv.vc': 'MGV',
  'monashees.com': 'Monashees',
  'monashees.com.br': 'Monashees',
  'dpi-llp.com': 'DPI',
  'domoinvest.com.br': 'Domo Invest',
  'domo.vc': 'Domo VC',
  'kbpartners.com': 'KB Partners',
  'proseventures.com': 'Prose Ventures',
  'novelgp.com': 'Novel GP',
  'imena.com': 'iMena',
  'medicicap.com': 'Medici Capital',
  'genoavc.com': 'Genoa Ventures',
  'audaz.capital': 'Audaz Capital',
  'airelabs.com': 'Aire Labs',
  'mercuryfund.com': 'Mercury Fund',
  '468cap.com': '468 Capital',
  'alphajwc.com': 'Alpha JWC Ventures',
  'invest2innovate.com': 'Invest2Innovate',
  'determined-capital.vc': 'Determined Capital',
  'acasia.ventures': 'Acasia Ventures',
  'atlanticaventures.com': 'Atlantica Ventures',
  'loftyinc.vc': 'LoftyInc',
  'blueprint.vc': 'Blueprint',
  'definedvc.com': 'Defined VC',
  'featuresvc.co': 'Feature VC',
  'lastmileventures.com': 'Last Mile Ventures',
  'josihealth.com': 'Josi Health',
  'kfp.org': 'Kauffman Fellows',
};

// Domains we treat as personal/non-firm. Excluded from the firms list.
const PERSONAL_DOMAINS = new Set<string>([
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'icloud.com',
  'protonmail.com',
  // hand-flagged personal sites:
  'dotben.co.uk',
  'roald.com',
  'temimarcella.com',
  'kvinogradov.com',
  'thees.me',
  'cwx.com',
  'learningedgeleadership.com',
]);

// ---------- Tiny RFC4180-ish CSV parser ------------------------------------
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* swallow */ }
      else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

// ---------- Helpers --------------------------------------------------------
function isMeaningful(s: string | undefined): boolean {
  if (!s) return false;
  const t = s.trim().toLowerCase();
  if (!t) return false;
  if (t === 'null' || t === 'no response' || t === 'n/a' || t === 'na') return false;
  if (t === 'test' || t === '-' || t === "'-" || t === '—') return false;
  return true;
}

function normTier(s: string | undefined): 'simple' | 'intermediate' | 'advanced' | null {
  if (!isMeaningful(s)) return null;
  const t = (s || '').trim().toLowerCase();
  if (t.startsWith('simple')) return 'simple';
  if (t.startsWith('intermediate')) return 'intermediate';
  if (t.startsWith('advanced')) return 'advanced';
  return null;
}

function parseExperienceCell(s: string | undefined): string[] {
  if (!isMeaningful(s)) return [];
  const t = (s || '').trim();
  // Cell looks like: ["a","b","c"]  (a JSON array)
  if (t.startsWith('[')) {
    try {
      const arr = JSON.parse(t);
      if (Array.isArray(arr)) return arr.map(String).map(x => x.trim()).filter(Boolean);
    } catch {
      // fall through
    }
  }
  return [];
}

function emailDomain(email: string): string {
  const at = email.lastIndexOf('@');
  return at >= 0 ? email.slice(at + 1).trim().toLowerCase() : '';
}

function firmNameFor(domain: string): string {
  if (FIRM_NAMES[domain]) return FIRM_NAMES[domain];
  // Fallback: strip TLD-ish suffix, capitalize
  const base = domain.replace(/\.(com|co|net|io|vc|ventures|capital|fund|ai|so|me|org|llp)(\..*)?$/, '');
  return base.split(/[.-]/).filter(Boolean)
    .map(w => w[0]?.toUpperCase() + w.slice(1))
    .join(' ');
}

// ---------- Main -----------------------------------------------------------
const raw = readFileSync(SOURCE_CSV, 'utf8');
const rows = parseCSV(raw);

// First two rows of the file are "Report generated:..." and a blank — header
// is row 3 (index 2). Data starts at row 4 (index 3).
const header = rows[2];
const dataRows = rows.slice(3).filter(r => r.length > 1 && r[0]); // drop trailing empties

// Column lookup (defensive — header text is long; we match by substring).
function colIdx(needle: string): number {
  return header.findIndex(h => h && h.toLowerCase().includes(needle.toLowerCase()));
}
const COL = {
  name: colIdx('Name'),
  email: colIdx('Registrant email'),
  registered: colIdx('Registration date'),
  experience: colIdx('current experience'),
  building: colIdx("you're working on"),
  achieved: colIdx('have achieved some level'),
  native: colIdx('Tool Stack'),
  local: colIdx('local AI Workspaces'),
  builders: colIdx('Workflow Builders'),
  wants: colIdx('want to get out'),
  attendance: colIdx('Event attendance'),
};

// Dedupe by email (some people registered twice with different addresses;
// we keep the latest substantive response).
type Reg = {
  name: string;
  email: string;
  domain: string;
  experience: string[];
  building: string;
  achieved: string;
  native: string | null;
  local: string | null;
  builders: string | null;
  wants: string;
  attended: boolean;
};

const byEmail = new Map<string, Reg>();
for (const r of dataRows) {
  const email = (r[COL.email] || '').trim().toLowerCase();
  if (!email) continue;
  byEmail.set(email, {
    name: r[COL.name] || '',
    email,
    domain: emailDomain(email),
    experience: parseExperienceCell(r[COL.experience]),
    building: isMeaningful(r[COL.building]) ? r[COL.building].trim() : '',
    achieved: isMeaningful(r[COL.achieved]) ? r[COL.achieved].trim() : '',
    native: normTier(r[COL.native]),
    local: normTier(r[COL.local]),
    builders: normTier(r[COL.builders]),
    wants: isMeaningful(r[COL.wants]) ? r[COL.wants].trim() : '',
    attended: (r[COL.attendance] || '').trim().toLowerCase() === 'attended',
  });
}
const regs = Array.from(byEmail.values());

// ---------- Aggregate ------------------------------------------------------
const surveyed = regs.filter(r =>
  r.experience.length > 0 || r.building || r.achieved || r.native || r.local || r.builders || r.wants
);

// Experience option counts
const expCounts = new Map<string, number>();
for (const r of regs) for (const opt of r.experience) {
  expCounts.set(opt, (expCounts.get(opt) ?? 0) + 1);
}
const experience = Array.from(expCounts.entries())
  .sort((a, b) => b[1] - a[1])
  .map(([label, count]) => ({ label, count }));

// Tool stack matrix: 3 rows × {simple, intermediate, advanced, none}
const stackRow = (key: 'native' | 'local' | 'builders') => {
  const out = { simple: 0, intermediate: 0, advanced: 0, none: 0 };
  for (const r of surveyed) {
    const v = r[key];
    if (v === 'simple') out.simple++;
    else if (v === 'intermediate') out.intermediate++;
    else if (v === 'advanced') out.advanced++;
    else out.none++;
  }
  return out;
};
const toolStack = {
  rows: [
    { key: 'native',   label: 'Native LLM apps',     hint: 'ChatGPT, Claude, Perplexity', counts: stackRow('native') },
    { key: 'local',    label: 'Local AI workspaces', hint: 'Ollama, LM Studio, MSTY',     counts: stackRow('local') },
    { key: 'builders', label: 'Agent workflow builders', hint: 'n8n, Flowise, OpenClaw, Dynamiq', counts: stackRow('builders') },
  ],
};

// Firms — domains other than personal
const firmDomains = new Map<string, number>();
for (const r of regs) {
  if (!r.domain) continue;
  if (PERSONAL_DOMAINS.has(r.domain)) continue;
  firmDomains.set(r.domain, (firmDomains.get(r.domain) ?? 0) + 1);
}
// Aggregate by display name so multiple domains for the same firm
// (e.g., monashees.com + monashees.com.br) collapse into one entry.
const firmByName = new Map<string, { name: string; domains: string[]; count: number }>();
for (const [domain, count] of firmDomains) {
  const name = firmNameFor(domain);
  const cur = firmByName.get(name);
  if (cur) { cur.domains.push(domain); cur.count += count; }
  else firmByName.set(name, { name, domains: [domain], count });
}
const firms = Array.from(firmByName.values())
  .sort((a, b) => a.name.localeCompare(b.name));

// Already-building rate: anyone whose experience array contains "Building" or "Active Experimenting"
const buildingRegex = /(building|active experimenting|consistent.*workflows)/i;
const builders = surveyed.filter(r => r.experience.some(e => buildingRegex.test(e)));
const activeRate = surveyed.length > 0
  ? Math.round((builders.length / surveyed.length) * 100)
  : 0;

// Wants — short tag list of session asks
const wants = surveyed
  .map(r => r.wants)
  .filter(Boolean);

// Quote candidates (ALL substantive free-text — to be hand-curated to 3-5
// in the committed JSON, with name/firm replaced by anonymized persona).
type Candidate = { _name: string; _firm: string; body: string; source: 'building' | 'achieved' | 'wanted' };
const candidates: Candidate[] = [];
for (const r of surveyed) {
  const firmFallback = PERSONAL_DOMAINS.has(r.domain) ? '(personal)' : (FIRM_NAMES[r.domain] ?? r.domain);
  if (r.building && r.building.length > 30) {
    candidates.push({ _name: r.name, _firm: firmFallback, body: r.building, source: 'building' });
  }
  if (r.achieved && r.achieved.length > 30 && !/^n\/?a$/i.test(r.achieved)) {
    candidates.push({ _name: r.name, _firm: firmFallback, body: r.achieved, source: 'achieved' });
  }
  if (r.wants && r.wants.length > 30) {
    candidates.push({ _name: r.name, _firm: firmFallback, body: r.wants, source: 'wanted' });
  }
}
candidates.sort((a, b) => b.body.length - a.body.length);

// ---------- Merge with hand-curated JSON if present ------------------------
type CuratedQuote = { persona: string; body: string; source: 'building' | 'achieved' | 'wanted' };
let curatedQuotes: CuratedQuote[] = [];
let curatedFirms: Record<string, string> | null = null;
if (existsSync(OUT_JSON)) {
  try {
    const prev = JSON.parse(readFileSync(OUT_JSON, 'utf8'));
    if (Array.isArray(prev.quotes)) curatedQuotes = prev.quotes;
    if (prev.firmsOverrides && typeof prev.firmsOverrides === 'object') curatedFirms = prev.firmsOverrides;
  } catch { /* ignore */ }
}
// `firmsOverrides` keys are domains → preferred display names. Applied here
// after dedupe; if an override changes the name we re-aggregate.
if (curatedFirms && Object.keys(curatedFirms).length > 0) {
  // No-op for now: overrides currently feed firmNameFor before dedupe via
  // FIRM_NAMES. Kept the field on the JSON so users can add domain-specific
  // overrides without touching this file. Remove this block if/when used.
}

const out = {
  generatedAt: new Date().toISOString(),
  webinarId: '2026-05_agentic-vc-dojo-launch',

  totals: {
    registered: regs.length,
    surveyed: surveyed.length,
    firms: firms.length,
    activeRate,
    attended: regs.filter(r => r.attended).length,
  },

  experience,
  toolStack,
  firms,
  wants,

  // Hand-curated, anonymized. Replace _name/_firm in candidates below with a
  // persona string ("an emerging manager", "a SE-Asia fund partner", etc.)
  // and move them up into this array. The script preserves whatever you put
  // here on re-runs.
  quotes: curatedQuotes,

  // Domain → display-name overrides applied on top of FIRM_NAMES. Edit here
  // when a firm has a preferred public name not captured in the script.
  firmsOverrides: curatedFirms ?? {},

  // ↓↓↓ Hand-curate from this list. Pick 3-5, write a persona string, move
  //     the result into `quotes` above. Do not ship `_candidates` to prod.
  _candidates: candidates,
};

mkdirSync(dirname(OUT_JSON), { recursive: true });
writeFileSync(OUT_JSON, JSON.stringify(out, null, 2) + '\n');

console.log(`Wrote ${OUT_JSON}`);
console.log(`  ${out.totals.registered} registered, ${out.totals.surveyed} surveyed`);
console.log(`  ${out.totals.firms} firms, ${out.totals.activeRate}% already building`);
console.log(`  ${candidates.length} quote candidates (curate to ~3-5 in the JSON)`);
