/* github-repo — one public repository's card data from the GitHub API, for
   GitHubRepoCard. Results (and misses) are cached in memory for an hour so a
   server-rendered page doesn't spend the 60-requests-an-hour anonymous quota;
   GITHUB_TOKEN, when set, raises that quota. Any failure returns null and the
   card falls back to its directive attributes. */

export interface RepoInfo {
  full_name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  topics: string[];
  pushed_at: string | null;
  homepage: string | null;
}

const TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, { at: number; info: RepoInfo | null }>();

export async function fetchRepo(slug: string): Promise<RepoInfo | null> {
  const hit = cache.get(slug);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.info;

  let info: RepoInfo | null = null;
  try {
    const token = import.meta.env.GITHUB_TOKEN ?? process.env.GITHUB_TOKEN;
    const res = await fetch(`https://api.github.com/repos/${slug}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'fullstack-vc',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      const r = await res.json();
      info = {
        full_name: r.full_name,
        description: r.description ?? null,
        language: r.language ?? null,
        stargazers_count: r.stargazers_count ?? 0,
        forks_count: r.forks_count ?? 0,
        topics: r.topics ?? [],
        pushed_at: r.pushed_at ?? null,
        homepage: r.homepage || null,
      };
    }
  } catch {
    // Timeout or network error: fall back to the directive's attributes.
  }
  cache.set(slug, { at: Date.now(), info });
  return info;
}
