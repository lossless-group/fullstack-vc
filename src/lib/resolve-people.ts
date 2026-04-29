// ============================================================================
// resolve-people.ts
//
// Enriches free-form person blocks (working_group_leads / working_group_members
// in projects + working-groups, presenterDetails in sessions) with data from
// the `participants` content collection.
//
// Match strategy: case-insensitive name match against participant.data.name.
// When a participant matches, their headshot (or github_avatar fallback),
// firm, and profile link are merged into the resolved record. Inline values
// in the source frontmatter always win — the resolver only fills gaps.
//
// "TBD" placeholders pass through with isTbd=true so renderers can show a
// dedicated waiting-on-someone variant.
// ============================================================================
import { getCollection, type CollectionEntry } from 'astro:content';

export interface PersonInput {
  name: string;
  firm?: string;
  role?: string;
  profile?: string;
  avatar?: string;
}

export interface PersonResolved extends PersonInput {
  isTbd: boolean;
  /** participant handle when the resolver matched a registered member. */
  handle?: string;
}

let nameIndex: Promise<Map<string, CollectionEntry<'participants'>>> | null = null;

function buildIndex(): Promise<Map<string, CollectionEntry<'participants'>>> {
  if (!nameIndex) {
    nameIndex = (async () => {
      const all = await getCollection('participants');
      const map = new Map<string, CollectionEntry<'participants'>>();
      for (const p of all) {
        map.set(p.data.name.trim().toLowerCase(), p);
      }
      return map;
    })();
  }
  return nameIndex;
}

function isTbdName(name: string | undefined): boolean {
  if (!name) return true;
  const t = name.trim().toLowerCase();
  return t === '' || t === 'tbd' || t === 'tba' || t === 'to be determined' || t === 'to be announced';
}

export async function resolvePerson(input: PersonInput): Promise<PersonResolved> {
  if (isTbdName(input.name)) {
    return { ...input, name: 'TBD', isTbd: true };
  }
  const index = await buildIndex();
  const match = index.get(input.name.trim().toLowerCase());
  if (!match) return { ...input, isTbd: false };

  const d = match.data;
  return {
    name: input.name,
    firm: input.firm ?? d.firm,
    role: input.role,
    profile: input.profile ?? d.linkedin ?? d.github,
    avatar: input.avatar ?? d.headshot ?? d.github_avatar,
    isTbd: false,
    handle: d.handle,
  };
}

export async function resolvePeople(
  inputs: PersonInput[] | undefined
): Promise<PersonResolved[]> {
  if (!inputs?.length) return [];
  return Promise.all(inputs.map(resolvePerson));
}
