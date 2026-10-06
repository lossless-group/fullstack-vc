---
title: "A Few Easy Steps to Turn Your Mac into an Agent-Native Dev Machine"
lede: "A brand-new Mac is missing the plumbing every coding agent quietly assumes is there. Lay that foundation once — Apple's developer tools first — and everything after it (Homebrew, a good terminal, Claude Code) installs without the cryptic errors."
kind: how-to
tools:
  - claude-code
  - github
prerequisites:
  - "A Mac running a current version of macOS"
  - "Your Apple Account (for the App Store) and your Mac's admin password"
  - "A good internet connection: Xcode is a 10+ GB download"
estimated_minutes: 60
difficulty: beginner
video: ""
order: 10
status: Draft
publish: true
date_created: 2026-10-03
date_modified: 2026-10-06
authors:
  - Michael Staton
augmented_with: "Claude Code on Opus 5.5"
tags:
  - Developer-Experience
  - Getting-Started
  - Xcode
  - macOS
---

> [!info] Why this comes first
> Most setup instructions, including our own for [[tools/claude-code|Claude Code]], assume Apple's developer tools are already on your Mac: the compilers, `git`, and the SDKs that almost everything else is built on. A new Mac doesn't have them. Install them first and the later steps just work.

## Before you start: how to open Terminal

Most of this guide happens in **Terminal**, the app where you type commands instead of clicking. It comes with every Mac. If you've never opened it, or haven't since a college course 15 years ago, here's how:

1. Press **Cmd+Space** to open Spotlight search.
2. Type **Terminal**.
3. Press **Enter**.

A window opens with a line of text ending in `%` and a blinking cursor. That's the **prompt**, and it means Terminal is waiting for you to type a command. To run a command from this guide, copy it from a gray code box, paste it into Terminal (**Cmd+V**), and press **Enter**. Lines that start with `#` are notes for you, and Terminal ignores them if you paste them along with the commands.

Two things that surprise everyone the first time:

- **Password prompts show nothing while you type.** No dots, no stars. That's normal: type your Mac login password and press **Enter**.
- **Most commands print little or nothing when they work.** If nothing comes back and you get a fresh prompt, it worked. Errors are usually loud about it.

> [!tip] Keep Terminal in your Dock
> While Terminal is open, Control-click its icon in the Dock and choose **Options → Keep in Dock**. You'll be back.

## Step 1: Install Xcode and Apple's developer tools

Xcode is Apple's developer suite. It includes the **Command Line Tools**, the part that agents and Homebrew actually depend on.

### 1a. Download Xcode from the App Store

Open the **App Store**, search for **Xcode**, and click **Get**, then **Install**. It's free, but it's a big download (10+ GB), so start it and go do something else.

### 1b. Open Xcode once and let it finish setting up

When the download finishes, open Xcode from your Applications folder. On first launch it will:

1. Ask you to **agree to the Xcode and Apple SDKs license**.
2. Ask for your **admin password** so it can install additional components.
3. Offer to download **platforms** (iOS, macOS, and so on). You can skip the extras unless you plan to build Apple apps; you can always add them later in **Xcode → Settings → Components**.

Once you see the "Welcome to Xcode" window, you can quit Xcode. You won't need to open it again for this guide.

### 1c. Confirm it from the terminal

Open **Terminal** (Cmd+Space, type "Terminal", press Enter; see [Before you start](#before-you-start-how-to-open-terminal)) and paste these one at a time. Each one asks for your admin password the first time, and nothing appears on screen while you type it.

```bash
# Point the command-line tools at the Xcode you just installed
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer

# Accept the license (if the first launch didn't already)
sudo xcodebuild -license accept

# Finish installing any first-launch components
sudo xcodebuild -runFirstLaunch
```

Then check that it worked:

```bash
xcode-select -p   # should print /Applications/Xcode.app/Contents/Developer
git --version     # should print a version number, not an install prompt
```

> [!tip] In a hurry, or short on disk space?
> If you'll never build an iPhone or Mac app, you can skip the full Xcode download and install only the **Command Line Tools** (a few hundred MB):
>
> ```bash
> xcode-select --install
> ```
>
> Click **Install** in the dialog that appears and agree to the license. That's everything Homebrew and Claude Code need. You can install full Xcode later if you ever want it.

## Step 2: Install Homebrew, the Mac's package manager

A **package manager** is an app store for the command line. You ask it for a tool by name, and it downloads the right version, installs it in the right place, sets up anything that tool depends on, and later updates or removes it with one command. That replaces hunting for download links, dragging things into folders, and wondering which version you have. [Homebrew](https://brew.sh) is the de facto package manager for macOS. Almost every developer tool's install instructions start with `brew install`, and so do most of the steps after this one. It's also how agents like Claude Code install software for you: one command they can run and check.

Paste this into Terminal exactly as written. Copy it from here or from [brew.sh](https://brew.sh), not from a chatbot, because chat apps sometimes turn the straight quotes into curly ones and break the command:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

> [!note] It will ask for your password, but don't add `sudo` yourself
> The installer needs admin rights to create its folders, so partway through it asks for your Mac login password (the `sudo` prompt). As before, nothing appears on screen while you type; press Enter when you're done. Your user account must be an **Administrator** (check in **System Settings → Users & Groups**). **Don't** put `sudo` in front of the whole command. Homebrew refuses to run as root.

### Don't skip the "Next steps"

When the install finishes, it prints a **Next steps** section with two commands. Run them, or `brew` won't be found the next time you open Terminal. On Apple Silicon Macs (M1 and later) they are:

```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

Then confirm:

```bash
brew --version   # should print "Homebrew 4.x.x" or similar
brew doctor      # should end with "Your system is ready to brew."
```

## Step 3: Install Claude Code, and let it help with the rest

With Xcode and Homebrew in place, installing [[tools/claude-code|Claude Code]] is one command:

```bash
brew install --cask claude-code
```

Start it from your home folder for now:

```bash
cd ~
claude
```

The first run walks you through logging in. From here on, you don't have to do the remaining steps by hand: paste a step (or the link to this guide) into Claude Code and ask it to do that step for you. It runs the commands, explains what each one does, and asks before changing anything. You still type your own passwords. For what Claude Code is and how it differs from the Claude Desktop app, read [[guides/claude-desktop-vs-claude-code/index|Orientation: Claude Desktop vs Claude Code]].

## Step 4: Install the GitHub CLI (`gh`)

[[tools/github|GitHub]] is where code (and, increasingly, documents and agent skills) lives. `gh` is GitHub's official command-line tool. It lets you, and your agents, clone repos, open pull requests, and file issues without leaving the terminal. It also handles logging in to GitHub, so `git` stops asking for your password.

```bash
brew install gh
```

Then connect it to your GitHub account:

```bash
gh auth login
```

Answer the prompts: choose **GitHub.com**, then **HTTPS**, say **Yes** to authenticating Git with your GitHub credentials, and choose **Login with a web browser**. It shows a one-time code, opens your browser, and you paste the code in. Confirm it worked:

```bash
gh auth status   # should say "Logged in to github.com account <you>"
```

No GitHub account yet? Make one at [github.com/signup](https://github.com/signup) first. It's free.

> [!tip] Or let Claude Code do this step
> In Claude Code, ask: *"Install the GitHub CLI with Homebrew, log me in, and set my git name and email to match my GitHub account."* It handles the install and the git settings. The login asks you questions and opens a browser, so Claude will have you run that one yourself by typing `! gh auth login` into Claude Code. The `!` runs it right there in your session.

### Make git's name and email match your GitHub account

Logging in with `gh` lets `git` *push* to GitHub, but it doesn't tell `git` who *you* are. Every commit is stamped with a name and email, and GitHub uses that email to link commits to your profile. If it doesn't match an email on your GitHub account, your work shows up as an anonymous gray avatar instead of you.

Copy both values straight from your GitHub account:

```bash
git config --global user.name "$(gh api user --jq '.name // .login')"
git config --global user.email "$(gh api user --jq '"\(.id)+\(.login)@users.noreply.github.com"')"
```

The email line uses your GitHub **private noreply address** (something like `12345678+yourname@users.noreply.github.com`). It's linked to your account, so your commits are credited to you, but your real inbox stays out of every public repo's history. Prefer your real email? Use one that's listed under [GitHub → Settings → Emails](https://github.com/settings/emails) instead:

```bash
git config --global user.email "you@example.com"
```

Check both:

```bash
git config --global user.name
git config --global user.email
```

## Step 5: Give your Mac and your user account short names

Your terminal prompt shows your **username** and **computer name** on every single line, something like this:

```text
michaelstaton@Michaels-MacBook-Pro-2 ~ %
```

That's a lot of noise before you've typed anything. Short names leave the prompt readable:

```text
mps@m4 ~ %
```

They also matter because your username is part of your **home folder path** (`/Users/michaelstaton`), which shows up in every file path you and your agents see. Use lowercase with no spaces. We recommend **your initials** for the username and **the chip or model** for the computer name. Michael is `mps@m4`.

> [!tip] Do this now, while the Mac is new
> Renaming is easiest before you've built up years of files and settings. Steps 1 through 4 are unaffected: Homebrew and Claude Code live in `/opt/homebrew`, not your home folder, and your `gh` login is stored in your Keychain. Claude Code just starts a fresh session history under the new folder name.

### 4a. Rename the computer (easy)

Pick a short name, such as your chip (`m4`) or model (`mbp`, `air`, `studio`), and run these three commands, replacing `m4` with your choice:

```bash
sudo scutil --set ComputerName m4
sudo scutil --set LocalHostName m4
sudo scutil --set HostName m4
```

These set, in order, the name other people see on the network, the name used for `m4.local` on your local network, and the name your terminal prompt shows. You can also change the first two in **System Settings → General → Sharing** (Local hostname → Edit), but only the command line sets all three. Open a new Terminal window to see the change.

### 4b. Rename your user account (careful)

This one takes more care. If you get it wrong, you can lock yourself out of your account, so **back up first** (Time Machine, or at least make sure nothing on the new Mac is irreplaceable yet). These are [Apple's official steps](https://support.apple.com/102547):

1. **Create a temporary admin account.** In **System Settings → Users & Groups**, click **Add User**, and make it an **Administrator**. You can't rename the account you're logged in to.
2. **Log out** of your main account (Apple menu → Log Out) and **log in to the temporary admin account**.
3. **Rename your home folder.** In Finder, choose **Go → Go to Folder**, type `/Users`, and press Return. Select your home folder, press Return, and type the new short name (we recommend your initials, for example `mps`). Enter the admin password when asked.
4. **Rename the account to match.** Go to **System Settings → Users & Groups**, Control-click your main account, and choose **Advanced Options**. Change **User name** (sometimes labeled "Account name") to the *exact same* new short name, and change **Home directory** to match (for example, `/Users/mps`). Click OK.
5. **Restart**, then log back in to your main account. Open Terminal and check:
   ```bash
   whoami   # should print your new short name
   echo ~   # should print /Users/<new short name>
   ```
6. Once everything looks right, **delete the temporary admin account** in Users & Groups.

Your full name (the one on the login screen) doesn't change, and neither does your password.

## Step 6: Make a home for your projects: `~/code`

Give every project one predictable home. Our convention is a single folder called `code` in your home folder:

```bash
mkdir ~/code
```

Websites, apps, agent harnesses, skill libraries: anything you clone or build goes in `~/code/<project-name>`. Your documents, downloads, and desktop stay out of it.

This matters more with agents than it would otherwise. You'll often start Claude Code *inside* a project folder, and it treats that folder as its world. A tidy `~/code` means you always know where to point it. It also keeps agents out of `~/Documents` and `~/Desktop`, where your personal files are.

## Step 7: Give your agent a head start with Lossless agent skills

An **agent skill** is a folder with a `SKILL.md` file that teaches an agent how to do one kind of task *your* way: how to word commit messages, how to structure a changelog, how to make a link unfurl nicely in iMessage. Claude Code reads the short description of every installed skill and loads the full instructions only when a task calls for it. Skills follow an [open standard](https://agentskills.io/specification), so the same folder works in Claude Code and other agents.

The Lossless Group publishes its skills at [lossless-group/lossless-agent-skills](https://github.com/lossless-group/lossless-agent-skills). Clone the whole library into `~/code`:

```bash
cd ~/code
gh repo clone lossless-group/lossless-agent-skills
```

Then link in the ones that apply to anyone doing development work, whatever you're building. Claude Code looks for skills in `~/.claude/skills`, with one folder per skill. Linking (rather than copying) means a later `git pull` updates every installed skill at once.

```bash
mkdir -p ~/.claude/skills

for skill in \
  git-conventions changelog-conventions context-vigilance \
  maintain-splash-pages astro-knots theme-system maintain-design-md \
  open-graph-share-seo-geo generate-consistent-og-images overlay-svg-text prep-images-for-embed
do
  ln -s ~/code/lossless-agent-skills/$skill ~/.claude/skills/$skill
done
```

Claude Code picks up newly linked skills the next time you start it.

What that set gives you:

| Skill | What it teaches your agent |
|---|---|
| `git-conventions` | Commit messages that explain *why*, not just *what*, so they still make sense a year later. |
| `changelog-conventions` | Keeping a dated `changelog/` of what shipped, ready to show to clients and collaborators. |
| `context-vigilance` | Keeping specs, plans, and prompts in a `context-v/` folder so context survives between agent sessions. |
| `maintain-splash-pages` | Building a small Astro site for a repo that publishes to GitHub Pages. Uses `astro-knots` (our Astro rules) and `theme-system` (light, dark, and vibrant modes). |
| `maintain-design-md` | Writing down a project's colors, fonts, and spacing in a `DESIGN.md` file the agent can read. |
| `open-graph-share-seo-geo` | Making links unfurl properly in iMessage, WhatsApp, Slack, and LinkedIn, and making pages easy for search engines and LLMs to find. |
| `generate-consistent-og-images` + `overlay-svg-text` | Generating on-brand share images, with text overlaid on top. Needs an [Ideogram](https://ideogram.ai) API key (`IDEOGRAM_API_KEY`) for the illustrated style. |
| `prep-images-for-embed` | Turning screenshots into resized, CDN-hosted images with real alt text. Needs [ImageKit](https://imagekit.io) keys. |

The rest of the library is specific to particular kinds of work (VC research, our CRM, our multi-repo setup). Browse the [README](https://github.com/lossless-group/lossless-agent-skills#readme) and link more any time with the same `ln -s` line. To pick up new versions later:

```bash
git -C ~/code/lossless-agent-skills pull
```

## Step 8 (optional): Make your terminal a pleasure to use

Everything so far works in the plain Terminal app that comes with your Mac. If you want a *sweet* setup, follow our companion guide, [[guides/terminal-setup-ghostty-oh-my-posh/index|Getting Unafraid and Setting Up Your Terminal]]. It walks you through:

- [[tools/ghostty|Ghostty]], a fast, good-looking terminal app that replaces Terminal,
- Michael's exact Ghostty config (frosted-glass background, readable font, Shift+Enter for multi-line agent prompts),
- his `my-tokyo` prompt template, which shows who you are and which machine you're on, your folder, git branch, uncommitted changes, and how long the last command took. It comes in two versions that look the same: one for [Oh My Posh](https://ohmyposh.dev) and one for [Starship](https://starship.rs). Pick either.

Homebrew from Step 2 is already in place, so you can start that guide at its Step 1. This is also where the short names from Step 5 pay off: they're the first thing on every prompt line.

## Step 9: Give your agents a memory with Context Vigilance

Every agent session starts with amnesia. Whatever you and Claude worked out yesterday (the plan, the decisions, the dead ends) is gone today unless it was written down somewhere the agent will look. **Context Vigilance** is the practice Lossless built for this: every project gets a `context-v/` folder of plain markdown files (specs, plans, prompts, blueprints, reminders, explorations, issues), and you treat those files with the same care as code. A new session, a collaborator, or you in six months can read them and pick up where the work left off. It's agent memory you can read, edit, and version.

You already have the practice's rulebook: the `context-vigilance` skill from Step 7. Open Claude Code in any project in `~/code` and ask:

```text
Set up a context-v/ folder for this project following the context-vigilance skill, and write a first spec for what we're building.
```

To see what the practice looks like at scale, browse the [Context Vigilance corpus](https://lossless-group.github.io/context-v-corpus/): the collected `context-v/` documents from across The Lossless Group's repos, searchable in one catalog.

> [!note] Coming soon: the Context Vigilance Kit
> A one-command install is on the way. The [context-vigilance-kit](https://github.com/lossless-group/context-vigilance-kit) will be a Claude Code plugin with the skill, `/cv:*` commands, document templates, and a starter `context-v/` folder for new projects. It isn't installable yet. Until then, the skill from Step 7 does the job.

<!-- Revisit Step 9 when context-vigilance-kit ships an install command. -->
