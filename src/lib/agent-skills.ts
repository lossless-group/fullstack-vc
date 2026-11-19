/* The agent-skills registry: skills from lossless-agent-skills (and other
   public repos) that the site can reference. The data lives in
   src/data/agent-skills.json so the site deploys on its own; each entry
   points at the skill's folder on GitHub. */
import skills from '../data/agent-skills.json';

export interface AgentSkill {
  slug: string;
  name: string;
  category: string;
  summary: string;
  use_for?: string;
  status?: string;
  /** The product that rolls this skill up, as a tools-registry handle (memopop-ai, dididecks-ai). */
  suite?: string;
  repo: string;
  branch?: string;
  path?: string;
}

const all = skills as AgentSkill[];
const bySlug = new Map(all.map((s) => [s.slug, s]));

export function getSkill(slug: string): AgentSkill | undefined {
  return bySlug.get(slug.trim());
}

export function allSkills(): AgentSkill[] {
  return all;
}

/** Every skill a product rolls up, in registry order. */
export function skillsInSuite(suite: string): AgentSkill[] {
  return all.filter((s) => s.suite === suite);
}

/** The skill's folder on GitHub, for people. */
export function skillUrl(s: AgentSkill): string {
  return `https://github.com/${s.repo}/tree/${s.branch ?? 'main'}/${s.path ?? s.slug}`;
}

/** The raw SKILL.md, for an agent to read. */
export function skillRawUrl(s: AgentSkill): string {
  return `https://raw.githubusercontent.com/${s.repo}/${s.branch ?? 'main'}/${s.path ?? s.slug}/SKILL.md`;
}

/** The one-line prompt that loads the skill into any chat. */
export function skillPrompt(s: AgentSkill): string {
  return `Read the ${s.name} skill at ${skillRawUrl(s)} and follow it.`;
}
