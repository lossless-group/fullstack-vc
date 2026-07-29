---
title: "How To: Getting Unafraid and Setting Up Your Terminal"
lede: "The terminal is where the best agents live, and it's far less scary than it looks. Set up Ghostty and Oh My Posh the way Michael runs them and you get a beautiful, glanceable command line that tells you where you are, what's changed, and what it's doing — the fear mostly evaporates on its own."
kind: how-to
tools:
  - ghostty
  - oh-my-posh
prerequisites:
  - "A Mac (everything here works on Linux too, but the commands below assume macOS + Homebrew)"
  - "Homebrew installed (brew.sh — one paste-and-run command)"
  - "About 25 minutes, none of which can break your computer"
estimated_minutes: 25
difficulty: beginner
video: ""
order: 20
status: Draft
publish: true
date_created: 2026-07-29
date_modified: 2026-07-29
authors:
  - Michael Staton
augmented_with: "Claude Code on Fable 5"
tags:
  - Terminal-Emulators
  - Developer-Experience
  - Ghostty
  - Oh-My-Posh
  - Getting-Started
---

> [!tip] Skip doing the setup yourself
> Install [[tools/claude-code|Claude Code]] (`brew install --cask claude-code`), open it in your terminal with `claude`, and paste it the link below. After you log in and grant permissions, Claude will do all of this setup *for* you — it reads this article, writes the configs, and installs the tools while you watch.

```text
Please read https://fullstack-vc.com/guides/terminal-setup-ghostty-oh-my-posh and set up my terminal exactly as it describes: install Ghostty and Oh My Posh via Homebrew, write the Ghostty config, save the my-tokyo theme from the article, and wire it into my ~/.zshrc. Then offer me the optional Step 5 tools one at a time. Ask before overwriting anything that already exists.
```

> [!info] Why a VC needs a terminal at all
> Because the most capable agent you can hire right now — [[tools/claude-code|Claude Code]] — lives there. The terminal is its native habitat: it can traverse your folders, read your files, and do real work on your machine. If the black window has kept you on the sidelines, this guide is the on-ramp. Companion read: [[guides/claude-desktop-vs-claude-code/index|Orientation: Claude Desktop vs Claude Code]].

## The fear, addressed directly

Three things make terminals scary: they're ugly, they're silent, and you're convinced one wrong keystroke will delete your life.

Take them in reverse order. **You will not break your computer** by looking around. `ls` (list files), `cd` (change directory), and `pwd` (where am I?) are read-only. The genuinely dangerous commands are rare, specific, and never something you type by accident.

**The silence** — the blank prompt that tells you nothing — is a configuration problem, not a fact of life. By the end of this guide your prompt will show you who you are, what machine you're on, what time it is, what folder you're in, what git branch you're on and whether it has uncommitted changes, how long your last command took, and your battery level. A cockpit, not a void.

**The ugliness** is the easiest fix of all. That's step one.

## Step 1 — Install Ghostty, a terminal that's actually pleasant

[[tools/ghostty|Ghostty]] is a fast, GPU-accelerated, platform-native terminal emulator. It looks gorgeous out of the box and its config is one small plain-text file.

```bash
brew install --cask ghostty
```

Open it. You now have a terminal. The rest of this guide happens inside it.

## Step 2 — Make it yours (Michael's actual config)

Ghostty reads one file: `~/.config/ghostty/config`. Create it:

```bash
mkdir -p ~/.config/ghostty
open -e ~/.config/ghostty/config
```

Paste this — it's the setup running on Michael's machine, verbatim:

```ini
theme = carbonfox
background-opacity = 0.60
background-blur-radius = 40
font-family = "Menlo"
font-size = 14

adjust-cell-height = 10%
adjust-cursor-thickness = 12
keybind = shift+enter=text:\n
```

Line by line:

- `theme = carbonfox` — a dark, high-contrast color scheme. Ghostty ships **hundreds** of built-in themes; run `ghostty +list-themes` to browse them interactively and pick your own.
- `background-opacity = 0.60` + `background-blur-radius = 40` — the frosted-glass look. Your desktop glows through softly. This is the single biggest "oh, terminals can be *pretty*" moment.
- `font-family = "Menlo"` / `font-size = 14` — a clean built-in mono font at a readable size.
- `adjust-cell-height = 10%` — a little breathing room between lines.
- `adjust-cursor-thickness = 12` — a chunky cursor you can actually find.
- `keybind = shift+enter=text:\n` — Shift+Enter inserts a newline instead of running the command. Sounds tiny; it's essential once you're writing multi-line prompts to a terminal agent like [[tools/claude-code|Claude Code]].

Save the file, then reload with **Cmd+Shift+,** (or just open a new window). Instant new terminal.

> [!tip] The tofu-boxes problem, pre-solved
> Fancy prompts use special icon glyphs that normally require installing a patched "Nerd Font" — skip that step and you get rows of empty boxes. Ghostty bundles the Nerd Font symbols as an automatic fallback, which is why plain Menlo works here. One classic setup landmine, already defused.

## Step 3 — Install Oh My Posh, the instrument panel

[Oh My Posh](https://ohmyposh.dev) replaces your blank prompt with a configurable, information-dense one.

```bash
brew install jandedobbeleer/oh-my-posh/oh-my-posh
```

Wire it into zsh (macOS's default shell) by adding one line to `~/.zshrc`:

```bash
eval "$(oh-my-posh init zsh --config ~/.config/oh-my-posh/themes/my-tokyo.omp.json)"
```

Oh My Posh ships ~100 stock themes (`oh-my-posh get themes` previews them). Michael's `my-tokyo` is a customized fork of the stock `tokyo` theme. You can start from stock and edit — or skip ahead and paste his exact theme, below.

```bash
mkdir -p ~/.config/oh-my-posh/themes
```

### The template itself (copy-paste Michael's exact prompt)

This is the stylized multi-line frame you saw in the screenshots — what Oh My Posh calls a **theme**: a JSON file where every visual chunk is a segment with a `template` string. Save this verbatim as `~/.config/oh-my-posh/themes/my-tokyo.omp.json` and the `eval` line from above brings it to life:

```json
{
  "$schema": "https://raw.githubusercontent.com/JanDeDobbeleer/oh-my-posh/main/themes/schema.json",
  "valid_line": {
    "template": "> ",
    "background": "transparent"
  },
  "secondary_prompt": {
    "template": " ",
    "background": "transparent"
  },
  "error_line": {
    "template": "<#ff0000>ERROR:</> ",
    "background": "transparent"
  },
  "blocks": [
    {
      "type": "prompt",
      "alignment": "left",
      "leading_diamond": "<#7eb8da>\u250f</>",
      "segments": [
        {
          "template": "[<#ffffff>\uf108 </>:<#ffffff>\uf8ff</>{{ .HostName }}:<#ffffff>\ueb99 </>{{ .UserName }}]",
          "foreground": "#7eb8da",
          "type": "session",
          "style": "plain"
        },
        {
          "options": {
            "time_format": "20060102@15:04:05"
          },
          "template": "[<#ffffff>\uf073</> {{ .CurrentDate | date .Format }}]",
          "foreground": "#7eb8da",
          "type": "time",
          "style": "diamond"
        }
      ]
    },
    {
      "type": "prompt",
      "alignment": "left",
      "leading_diamond": "<#7eb8da>\u2523</>",
      "segments": [
        {
          "template": "[<#ffffff>\uebd8</> Subscription: <#ffff00>{{ .Name }}</>]",
          "foreground": "#7eb8da",
          "type": "az",
          "style": "diamond"
        },
        {
          "template": "[<#ffffff>\uebd8</> Azure Developer CLI Environment: <#ffff00>{{ .DefaultEnvironment  }}</> :: <#ffff00>{{ .Version }}</>]",
          "foreground": "#7eb8da",
          "type": "azd",
          "style": "diamond"
        },
        {
          "template": "[<#ffffff>\uf270</> <#ffff00>{{ .Profile }}</>{{if .Region}}@<#ffff00>{{ .Region }}</>{{ end }}]",
          "foreground": "#7eb8da",
          "type": "aws",
          "style": "diamond"
        },
        {
          "template": "[{{ if .Error }}{{ .Error }}{{ else }}<#ffffff>\uf1a0</> <#ffff00>{{ .Project }}</> :: <#ffff00>{{.Account}}</>{{ end }}]",
          "foreground": "#7eb8da",
          "type": "gcp",
          "style": "diamond"
        },
        {
          "template": "[<#ffffff>\uf10fe</> <#ffff00>{{.Context}}</>{{if .Namespace}} :: <#ffff00>{{.Namespace}}</>{{end}}]",
          "foreground": "#ffa5d8",
          "type": "kubectl",
          "style": "diamond"
        },
        {
          "template": "[{{ if .Error }}{{ .Error }}{{ else }}{{ if .Name }}<#ffffff>\uf487</> {{ .Name }}{{ end }}{{ if .Target }} {{ .Target }}{{ end }}{{ end }}]",
          "foreground": "#ffa5d8",
          "type": "project",
          "style": "diamond"
        },
        {
          "options": {
            "fetch_stash_count": true,
            "fetch_status": true,
            "fetch_upstream_icon": true
          },
          "template": "[<#ffffff>{{ .UpstreamIcon }} </>{{ .HEAD }}{{if .BranchStatus }} {{ .BranchStatus }}{{ end }}{{ if .Working.Changed }} <#ffffff>\uf044</> {{ .Working.String }}{{ end }}{{ if and (.Working.Changed) (.Staging.Changed) }} |{{ end }}{{ if .Staging.Changed }} <#ffffff>\uf046</> {{ .Staging.String }}{{ end }}{{ if gt .StashCount 0 }} <#ffffff>\ueb4b</> {{ .StashCount }}{{ end }}]",
          "foreground": "#ffa5d8",
          "type": "git",
          "style": "plain"
        }
      ],
      "newline": true
    },
    {
      "type": "prompt",
      "alignment": "left",
      "leading_diamond": "<#7eb8da>\u2523</>",
      "segments": [
        {
          "options": {
            "style": "full"
          },
          "template": "[<#ffffff>\uf115</> <#98bfad>{{ .Path }}</>]",
          "foreground": "#7eb8da",
          "type": "path",
          "style": "diamond"
        }
      ],
      "newline": true
    },
    {
      "type": "prompt",
      "alignment": "right",
      "leading_diamond": "<#7eb8da>\u2523</>",
      "segments": [
        {
          "options": {
            "style": "dallas",
            "threshold": 0
          },
          "template": "[<#ffffff>\uf252</> {{ .FormattedMs }}s]",
          "foreground": "#be9ddf",
          "type": "executiontime",
          "style": "diamond"
        },
        {
          "template": "[<#ffffff>\ue266</> RAM: {{ (div ((sub .PhysicalTotalMemory .PhysicalAvailableMemory)|float64) 1073741824.0) }}/{{ (div .PhysicalTotalMemory 1073741824.0) }}GB]",
          "foreground": "#be9ddf",
          "type": "sysinfo",
          "style": "diamond"
        },
        {
          "options": {
            "charged_icon": "<#ffffff>\ue22f</> ",
            "charging_icon": "\ueb2d ",
            "discharging_icon": "<#ffff00>\uf244</> "
          },
          "template": "[{{ if not .Error }}{{ .Icon }}{{ .Percentage }}{{ end }}{{ .Error }}\uf295]",
          "foreground": "#f36943",
          "type": "battery",
          "style": "plain",
          "foreground_templates": [
            "{{if eq \"Charging\" .State.String}}#40c4ff{{end}}",
            "{{if eq \"Discharging\" .State.String}}#ff5722{{end}}",
            "{{if eq \"Full\" .State.String}}#4caf50{{end}}"
          ]
        }
      ],
      "newline": true
    },
    {
      "type": "prompt",
      "alignment": "left",
      "leading_diamond": "<#7eb8da>\u2514\u2500</>",
      "segments": [
        {
          "template": "<#ffff00>[#]</>",
          "type": "root",
          "style": "diamond"
        },
        {
          "template": "[Error, check your command]",
          "foreground": "#ffa5d8",
          "type": "status",
          "style": "diamond"
        },
        {
          "template": ">",
          "type": "text",
          "style": "diamond"
        }
      ],
      "newline": true
    }
  ],
  "version": 4,
  "final_space": true
}
```

What you're pasting, in plain language: the `blocks` array is the prompt, top to bottom. Block one is the header line — machine, user, timestamp. Block two is the context line — the cloud segments (Azure, AWS, GCP, Kubernetes) stay invisible unless you're actually in one of those contexts, and the git segment lights up inside repositories. Block three is the full path. Block four is right-aligned telemetry — execution time, RAM, battery. Block five is the `└─>` you type after. Every color is an inline hex code (`#7eb8da` is the frame's blue) — change one string, get a different prompt.

## Step 4 — Understand what the prompt is telling you

Michael's theme draws a connected multi-line frame down the left margin (those `┏ ┣ └─` box-drawing characters) with a segment per line. Reading top to bottom:

1. **Who / where / when** — machine name, username, and a timestamp. The timestamp is sneaky-useful: your scrollback becomes a log of when you did things.
2. **Context line** — git status when you're in a repository: current branch, whether you're ahead/behind the remote, counts of modified and staged files, stash count. Cloud segments (AWS, GCP, Azure, Kubernetes) only appear when you're actually in one of those contexts — the prompt stays quiet about things that don't apply.
3. **Full path** — exactly where you are, no abbreviations. For a terminal beginner this is the single most fear-reducing feature: you are never lost.
4. **Right side** — how long the last command took, current RAM usage, battery level with color-coded charge state.
5. **Status line** — a yellow `[#]` if you're running as root, and a plain-language `[Error, check your command]` if the last command failed. No memorizing exit codes.

The theme file is just JSON — each segment is a block you can delete, recolor, or reorder. Don't want the RAM readout? Delete that block. Prompt customization is a gateway drug; you have been warned.

## Step 5 — Optional quality-of-life layer (the rest of Michael's stack)

None of these are required, but each one removes a paper cut. They're all small tools that upgrade a command you already use — same muscle memory, better output. Install the lot in one shot:

```bash
brew install eza bat zsh-autosuggestions zsh-syntax-highlighting atuin fzf ripgrep yazi
```

Then paste the config below into `~/.zshrc` (these are the lines from Michael's actual file), open a new shell with `exec zsh`, and try each one.

### eza — `ls` you can read at a glance

Colors, file-type icons, git-status column, and a tree mode. Aliased over the commands your fingers already know:

```bash
alias ls='eza --icons'
alias ll='eza -l --icons --git'
alias la='eza -la --icons --git'
alias lt='eza --tree --icons'
```

Try `ll` in a git repo — the extra column shows per-file modified/staged state. `lt` prints a directory tree, which is the fastest way to *see* a project's shape.

### bat — `cat` with syntax highlighting

```bash
alias cat='bat --paging=never'
export MANPAGER="sh -c 'col -bx | bat -l man -p'"
```

`cat some-file.ts` now prints highlighted, line-numbered output. The `MANPAGER` line is a sleeper hit: man pages get the same treatment, which makes built-in documentation dramatically more readable.

### zsh-autosuggestions + zsh-syntax-highlighting — the guardrails

```bash
# Ghost-text completion from your own history — press → to accept
if [ -f /opt/homebrew/share/zsh-autosuggestions/zsh-autosuggestions.zsh ]; then
    source /opt/homebrew/share/zsh-autosuggestions/zsh-autosuggestions.zsh
fi

# Valid commands turn green, typos turn red — before you press Enter
if [ -f /opt/homebrew/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh ]; then
    source /opt/homebrew/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh
fi
```

These two do more for terminal confidence than anything else on this page. Autosuggestions means you rarely retype a long command — start typing and yesterday's version appears as ghost text; → accepts it. Syntax highlighting is a typo-catcher that works at the speed of sight: if the command name is red, don't bother pressing Enter. (Keep the syntax-highlighting `source` line near the bottom of `.zshrc` — it wants to load after other plugins.)

### atuin — history that's actually a database

```bash
eval "$(atuin init zsh)"

export ATUIN_NOBIND="true"
bindkey '^r' _atuin_search_widget
export ATUIN_FILTER_MODE="global"  # Show history from all sessions
export ATUIN_FILTER_EXCLUDE_EXIT=0 # Include failed commands in history
export ATUIN_FILTER_EXCLUDE_PATH=0 # Include commands from all paths
```

Press **Ctrl+R** and instead of zsh's clunky one-line reverse search you get a full-screen, fuzzy-searchable database of every command you've ever run — across every session and every window, with timestamps and exit codes. "What was that flag I used last month?" stops being a Google search. The `NOBIND` + `bindkey` pair claims Ctrl+R explicitly; `global` filter mode means one shared history instead of per-session silos; the two `EXCLUDE` settings keep even your failed commands (failures are often exactly what you're trying to remember).

### fzf + ripgrep — find anything, from anywhere

```bash
[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh
export FZF_DEFAULT_COMMAND='rg --files --hidden --follow --glob "!.git/*"'
export FZF_DEFAULT_OPTS='--height 40% --layout=reverse --border'
```

fzf is a fuzzy finder; ripgrep (`rg`) is a very fast file searcher. Wired together as above, **Ctrl+T** drops a fuzzy file-picker into whatever command you're typing — type a few letters of a filename, hit Enter, and the full path lands at your cursor. The `FZF_DEFAULT_COMMAND` line makes it index hidden files too (your dotfiles) while skipping `.git` internals. Run `$(brew --prefix)/opt/fzf/install` once to create the `~/.fzf.zsh` keybindings file the first line loads.

### yazi — a file manager inside the terminal

```bash
function y() {
    local tmp="$(mktemp -t "yazi-cwd.XXXXX")"
    yazi "$@" --cwd-file="$tmp"
    if cwd="$(cat -- "$tmp")" && [ -n "$cwd" ] && [ "$cwd" != "$PWD" ]; then
        cd -- "$cwd"
    fi
    rm -f -- "$tmp"
}
```

Type `y` and you get a three-pane, arrow-key file browser with image and text previews — Finder, but it never leaves the terminal. The function wrapper is the important part: when you quit yazi, your shell **lands in whatever directory you navigated to**. Browse your way somewhere instead of `cd`-ing blind; press `q` and you're there.

> [!tip] Adopt these incrementally
> You don't need all six on day one. The order Michael would recommend: the two zsh guardrails first (biggest confidence gain), then eza and bat (free upgrades to commands you already run), then atuin once you've built up some history worth searching, then fzf and yazi when "where is that file" becomes your bottleneck.

## Verify it's working

1. Open a fresh Ghostty window. You should see the framed multi-line prompt, not `yourname@machine %`.
2. `cd` into any git repository — a branch segment should appear. Edit a file — a modified-files counter should show up next to the branch.
3. Run `sleep 3` — the right side should report ~3s execution time.
4. Type a nonsense command like `asdfgh` — you should get the friendly `[Error, check your command]` on the next prompt, not just silence.

## Troubleshooting

- **Boxes/question marks instead of icons** — you're likely in a different terminal app (Terminal.app, VS Code's terminal) that lacks Nerd Font fallback. Either use Ghostty or install a Nerd Font (`brew install font-jetbrains-mono-nerd-font`) and set it in that app.
- **Prompt didn't change** — the `eval "$(oh-my-posh init zsh ...)"` line has to be in `~/.zshrc` and you need a *new* shell: run `exec zsh` or open a new window.
- **Prompt feels slow in huge repos** — the git segment's status scan is the usual culprit. In the theme JSON, set `fetch_status` to `false` in the git segment's options.
- **Changed the Ghostty config, nothing happened** — reload with Cmd+Shift+, or open a new window; config is read at startup.

## Where this leads

A terminal you like looking at is the prerequisite for the actually-transformative step: running [[tools/claude-code|Claude Code]] in it and letting an agent work across your files. That's the subject of [[guides/claude-desktop-vs-claude-code/index|Orientation: Claude Desktop vs Claude Code]] — read that next.

## Related

- Tool: [[tools/ghostty|Ghostty]]
- Tool: [[tools/oh-my-posh|Oh My Posh]]
- Next up: [[guides/claude-desktop-vs-claude-code/index|Orientation: Claude Desktop vs Claude Code]]
- Adjacent: [[tools/warp-terminal|Warp Terminal]] — a different philosophy: an AI-native terminal that does some of this out of the box
