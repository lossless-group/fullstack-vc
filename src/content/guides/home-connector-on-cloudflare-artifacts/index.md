---
title: "Build a Home Connector on Cloudflare Artifacts"
lede: "One small server you own gives Claude, ChatGPT and your other agents the same home: a folder of files with full history, which every agent can read and write."
kind: how-to
tools:
  - claude-code
prerequisites:
  - "A Cloudflare account on the Workers Paid plan ($5 a month), which includes Artifacts"
  - "Node.js on your machine, and Claude Code (or a colleague who's comfortable in a terminal)"
  - "A rough idea of what you want your agents to remember: deals, portfolio notes, people, your weekly plan"
estimated_minutes: 90
difficulty: intermediate
order: 5
status: Draft
publish: false
date_created: 2026-11-15
date_modified: 2026-11-15
authors:
  - Michael Staton
augmented_with: "Claude Code on Claude Opus 5.5"
tags:
  - Connectors
  - MCP
  - Cloudflare-Artifacts
  - Cloudflare-Workers
  - Agent-Memory
---

> [!warning] Draft: check before publishing
> The code below is condensed from event-hog, which runs in production. These exact snippets haven't been run on their own. Build the starter once from this page, fix anything that doesn't work, then set `publish: true`.

## What a home connector is

Every AI app you use keeps its own memory. Claude remembers some things, ChatGPT remembers others, and your personal agent has a third pile. None of them can see the others' memory, and you can't easily see any of it.

A **home connector** fixes that. It's a small server you own that every agent connects to. Behind it is one folder of plain files: your deal notes, portfolio updates, the people you've met, your weekly plan. Any app that supports connectors can read and write that folder, including Claude on your phone, ChatGPT, Claude Code, and other agents. And because the folder is a **git repository**, every change is saved with who made it and when, and any mistake can be undone.

We've built this pattern once for real and are designing two more versions of it:

- **[event-hog](https://eventhog.cc)** is built. It's a shared workspace for a team working a conference: one repository per event, and every contact, note and slide a teammate logs from Claude becomes a commit under their name. It ran live at a conference in October.
- **hope-ai** is designed but not built yet. It takes the same pattern to a coaching cohort: one repository per member for their personal strategic plan, with sign-in, and sharing with their coaching group enforced in code.
- **kay-os** is designed but not built yet. It's a colony of personal agents (Hermes among them) that would share one record. Agents that have a terminal clone the repository directly, and phone apps reach it through the connector.

This recipe is the smallest version of that pattern: one person, one repository, one connector.

## How it fits together

```
Claude app / ChatGPT / Claude Code / your agent
                │   (MCP: the standard connector protocol)
                ▼
     Your Worker  (a small server on Cloudflare)
                │   (git clone → change files → commit as you → push)
                ▼
     Your home repository on Cloudflare Artifacts
     (plain markdown files, with full history)
```

- **Cloudflare Workers** run the connector. Your server costs nothing while it's idle, and you don't have to look after it.
- **[Cloudflare Artifacts](https://developers.cloudflare.com/artifacts/)** is git hosting built for agents. Each repository has its own address and its own short-lived passwords ("tokens"). It's in open beta. Your plan includes 10,000 operations and 1 GB of storage a month, then $0.15 per 1,000 operations and $0.50 per GB a month. A personal connector stays well inside that.
- **MCP** (Model Context Protocol) is the standard that Claude, ChatGPT and most agent tools use to talk to connectors.

## Before you start: decide what home holds

Spend ten minutes on this before writing any code. The folders you choose become the way your agents think about your work. Here's a starting layout for a VC:

```
README.md          ← what this home is; agents read it first
deals/             ← one file per company in the pipeline
portfolio/         ← one file per portfolio company: updates, metrics, asks
people/            ← one file per person: how you met, what they care about
notes/             ← meeting notes, dated
plans/             ← your weekly or quarterly plan
```

Two rules from event-hog are worth adopting now:

1. **Plain files first.** The files are the record. A database or a CRM can come later as a *view* that you rebuild from the files, never as the source.
2. **Add, don't overwrite.** Tools should append to a file or create a new one. Then a confused agent can't erase anything, and two agents writing at once can't clobber each other.

## Steps

### 1. Start the project

```bash
mkdir home-connector && cd home-connector
npm init -y
npm install isomorphic-git
npm install -D wrangler typescript
npx wrangler login
```

[isomorphic-git](https://isomorphic-git.org/) is git written in JavaScript, so the Worker can clone, commit and push without a computer underneath it.

You also need an **in-memory filesystem** for isomorphic-git to work in. Copy Cloudflare's from their [Artifacts isomorphic-git example](https://developers.cloudflare.com/artifacts/examples/isomorphic-git/) into `src/memory-fs.ts`. event-hog uses exactly that file.

### 2. Configure the Worker

Create `wrangler.jsonc`. The `artifacts` block gives your code a handle on your repositories (`env.ARTIFACTS`) with no password in the code:

```jsonc
{
  "name": "home-connector",
  "main": "src/index.ts",
  "compatibility_date": "2026-10-25",
  "compatibility_flags": ["nodejs_compat"],
  "artifacts": [{ "binding": "ARTIFACTS", "namespace": "home" }],
  "vars": { "HOME_REPO": "home" }
  // Secret, set with: npx wrangler secret put CONNECTOR_KEY
}
```

A **namespace** is a folder of repositories; `home` will hold just one for now.

### 3. Create your home repository

This runs once. It creates the repository and pushes your starting files as the first commit. (In event-hog, this is what the `new_event` tool does for each new conference.)

```ts
import git from "isomorphic-git";
import http from "isomorphic-git/http/web";
import { MemoryFS } from "./memory-fs";

const DIR = "/repo";

export async function createHome(env: Env, me: { name: string; email: string }) {
  const created = await env.ARTIFACTS.create(env.HOME_REPO, {
    description: "My home connector",
    setDefaultBranch: "main",
  });
  const fs = new MemoryFS();
  await git.init({ fs, dir: DIR, defaultBranch: "main" });
  const files: Record<string, string> = {
    "README.md": "# Home\n\nWhat this is, and how agents should use it.\n",
    "deals/.gitkeep": "", "portfolio/.gitkeep": "", "people/.gitkeep": "",
    "notes/.gitkeep": "", "plans/.gitkeep": "",
  };
  for (const [path, text] of Object.entries(files)) {
    await fs.promises.writeFile(`${DIR}/${path}`, text);
    await git.add({ fs, dir: DIR, filepath: path });
  }
  await git.commit({ fs, dir: DIR, message: "Start home", author: me });
  const secret = String(created.token).split("?expires=")[0];
  await git.push({ fs, http, dir: DIR, url: created.remote, ref: "main",
    onAuth: () => ({ username: "x", password: secret }) });
}
```

You can also create the repository from your own machine with Wrangler or the REST API, then push your starting files with ordinary git. The Lossless `cloudflare-artifacts-interface` agent skill walks an agent through that.

### 4. Read and write: clone, change, commit, push

This is the heart of the pattern. On every request, the Worker:

1. clones the repository into memory with a **ten-minute token**
2. makes its change
3. commits it **in your name**
4. pushes

If another agent pushed first, it starts again from a fresh clone.

```ts
async function open(env: Env, scope: "read" | "write") {
  const repo = await env.ARTIFACTS.get(env.HOME_REPO);
  const { remote } = await repo.info();
  const token = await repo.createToken(scope, 600); // expires in 10 minutes
  const secret = String(token.plaintext).split("?expires=")[0];
  const onAuth = () => ({ username: "x", password: secret });
  const fs = new MemoryFS();
  await git.clone({ fs, http, dir: DIR, url: remote, ref: "main", singleBranch: true, onAuth });
  return { fs, remote, onAuth };
}

async function write(env: Env, me: Person, message: string,
                     change: (ws) => Promise<string[]>) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const ws = await open(env, "write");
    const paths = await change(ws);
    for (const filepath of paths) await git.add({ fs: ws.fs, dir: DIR, filepath });
    const oid = await git.commit({ fs: ws.fs, dir: DIR, message, author: me });
    try {
      await git.push({ fs: ws.fs, http, dir: DIR, url: ws.remote, ref: "main", onAuth: ws.onAuth });
      return `Saved as commit ${oid.slice(0, 8)}.`;
    } catch {
      await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
    }
  }
  throw new Error("Couldn't save after several tries.");
}
```

Cloning on every call sounds slow, but for a repository of text files it takes well under a second. event-hog does it on every tool call for a whole team.

### 5. Speak MCP

A connector answers a few kinds of request, all as JSON posted to one address. `initialize` says who the server is, and its `instructions` field is read by the AI as standing orders. `tools/list` lists what it can do. `tools/call` does one of those things.

Start with five tools. You can add more once you see how you use it.

| Tool | What it does | Writes? |
|---|---|---|
| `read_me` | Returns `README.md`, so the agent learns the layout first | No |
| `list_files` | Lists files, optionally in one folder | No |
| `read_file` | Returns one file | No |
| `search` | Finds files containing some text | No |
| `add_note` | Appends a dated note to a file, creating it if needed | Yes, as a commit |

```ts
const TOOLS = [
  { name: "read_file", description: "Read one file from home, e.g. portfolio/acme.md.",
    inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
    annotations: { readOnlyHint: true } },
  { name: "add_note", description: "Append a dated note to a file in home. Never overwrites.",
    inputSchema: { type: "object", properties: { path: { type: "string" }, text: { type: "string" } },
                   required: ["path", "text"] } },
  // ...read_me, list_files, search
];

async function handle(msg, env, me) {
  const { id, method, params } = msg;
  const reply = (result) => ({ jsonrpc: "2.0", id, result });
  switch (method) {
    case "initialize":
      return reply({
        protocolVersion: params?.protocolVersion ?? "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: { name: "home", version: "0.1.0" },
        instructions: "This is the user's home: their deals, portfolio, people and notes as files. " +
          "Call read_me first. Search before creating a file. Never invent facts; ask.",
      });
    case "tools/list": return reply({ tools: TOOLS });
    case "tools/call": {
      const text = await HANDLERS[params.name](params.arguments ?? {}, env, me);
      return reply({ content: [{ type: "text", text }] });
    }
    default: return id == null ? null : { jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found" } };
  }
}
```

The `instructions` string matters more than it looks. It's how you teach every agent your home's rules without installing anything in each app. event-hog goes further and bundles whole agent skills (step-by-step playbooks) into the Worker, which it serves through `list_skills` and `get_skill`.

### 6. Lock the door

Anyone who can reach your connector can read your deals, so decide how it checks who's calling:

- **A secret key in the address** (what event-hog does). The address looks like `https://home.<you>.workers.dev/mcp/<long-random-key>`. Make the key with `openssl rand -hex 24`, store it with `npx wrangler secret put CONNECTOR_KEY`, and reject any request whose key doesn't match. It's simple and it works in every app. **But the address is the password:** don't paste it anywhere you wouldn't paste a password.
- **Real sign-in (OAuth)** is the plan for hope-ai. If anyone besides you will use the connector, or the data is sensitive, use Cloudflare's [`workers-oauth-provider`](https://github.com/cloudflare/workers-oauth-provider) so that a forwarded link alone grants nothing and you can cut off one person's access.

Two more rules:

- **Enforce your rules in code, not in the instructions.** "Never overwrite" belongs in the code, where an agent can't talk its way around it. The instructions are only requests.
- **Never store a token in a git address.** Tokens should live for minutes and only in memory, as in step 4.

### 7. Deploy and connect

```bash
npx wrangler secret put CONNECTOR_KEY
npx wrangler deploy
```

Then add the connector, using `https://home-connector.<you>.workers.dev/mcp/<your-key>` as the address:

- **Claude** (web, desktop or mobile): Settings → Connectors → Add custom connector. Paste the address.
- **Claude Code:** `claude mcp add --transport http home <address>`
- **ChatGPT:** custom connectors are available on some plans, in developer mode. Check ChatGPT's current settings.
- **An agent with a terminal** (Hermes, OpenClaw, Claude Code) can skip the connector and `git clone` the repository directly, using a read token you mint for it. That's the kay-os plan.

Try it from your phone: *"Add a note to portfolio/acme.md: Q3 revenue up 40%, hiring a CFO, asked for intros to two growth investors."* Then open the repository's history and you'll see that note as a commit under your name.

## Where it goes from here

Each of our three projects grows the same starter in a different direction:

- **A database for questions files can't answer quickly.** "Which portfolio companies are raising this quarter?" is a query, not a file. event-hog keeps a SQLite database (Cloudflare D1) in step with the files, and kay-os plans the same thing as a knowledge graph. In both, the database can be rebuilt from the files.
- **Images and PDFs.** Keep them in Cloudflare R2 and store only their link in a file. Repositories are for text.
- **More people.** event-hog gives a team one shared repository. hope-ai gives each person their own, plus shared repositories for small groups, with a permission check in code before anyone reads anyone else's.
- **Your CRM as a destination.** Let the connector propose records and let a person approve them before anything goes into the CRM. Files stay the source of truth.

## The shortcut: have Claude Code build it

You don't have to type any of this. Open Claude Code in an empty folder and paste:

> Build me a home connector: a Cloudflare Worker serving a remote MCP server whose storage is one Cloudflare Artifacts repo named `home` in namespace `home`. Use isomorphic-git with an in-memory filesystem (Cloudflare's Artifacts isomorphic-git example) to clone with a 10-minute token, commit as me, push, and retry from a fresh clone on conflict. Tools: read_me, list_files, read_file, search, add_note (append only, never overwrite). Authenticate with a secret key in the URL path, stored as the CONNECTOR_KEY secret. Seed the repo with README.md and folders deals/, portfolio/, people/, notes/, plans/. Follow the structure of github.com/lossless-group/event-hog-mcp. Walk me through deploying it and adding it to the Claude app.

Then read what it wrote before you deploy. The whole point is that this is **your** home.
