<div align="center">
  <a href="https://github.com/gitset-dev" target="_blank">
    <img src="https://github.com/gitset-dev/gitset/blob/main/public/favicon-192.png" alt="Gitset" width="96" />
  </a>

  <h3>
    <a href="https://gitset.dev" target="_blank">Gitset v2 — Open Source, BYOAI, Built for Developers</a>
  </h3>

  <p>
    <a href="https://github.com/gitset-dev"><img src="https://img.shields.io/badge/status-coming%20soon-8EF0EE?style=flat-square" alt="status" /></a>
    <a href="https://github.com/gitset-dev"><img src="https://img.shields.io/badge/launch-June%201st%2C%202026-white?style=flat-square" alt="launch" /></a>
    <a href="https://github.com/gitset-dev/gitset/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MPL%202.0-blue?style=flat-square" alt="license" /></a>
  </p>
</div>

<hr>

### About

**Gitset** is a suite of AI-assisted tools for everything around your code on GitHub — docs, issues, pull requests, releases. Every tool drafts a first pass; you refine it in plain language until it ships.

No subscription tiers. No token metering. No AI vendor lock-in. Bring your own key. Use it on the web or in your terminal. Inspect every line.

Launching **June 1st, 2026**.

## What's new

### Bring Your Own AI (BYOAI)

The old token system is gone. Plug in your own provider key and Gitset routes every AI operation through it:

- **Anthropic** (Claude)
- **OpenAI** (ChatGPT)
- **Google** (Gemini)
- **OpenRouter** (multi-model gateway)

No per-operation quotas. No monthly caps enforced by us. You control the budget, the model, and the data.

### Free initially

During the rollout period, the hosted suite at [gitset.dev](https://gitset.dev) is free. No credit card, no gated features.

### Open Source

The full stack — web app and CLI — is public. Fork it, audit it, self-host it.

## The Suite

### Web

| Tool | What it does |
|---|---|
| **README Generator** | Full documentation drafts for any public or private repo. Iterate until it reads the way you want. |
| **Issues Crafter** | Structured, context-aware issue descriptions. Consistent format across the team. |
| **PR Maker** | Branch comparison, AI-written bodies, reviewers, labels, merge — the full lifecycle. |
| **Tags & Releases Manager** | Releases with AI-drafted notes tied to real code changes. |
| **Gitignore Builder** | Stack-aware `.gitignore` from a language and framework selection. |
| **Repo Profiler** | AI-generated `description`, `website`, and `topics` for your repositories. |
| **Backup Automator** | Scheduled repository backups. |

### Templating

Issues Crafter, PR Maker, README Generator, Tags & Releases Manager, and Gitignore Builder all support custom templates. Define your format once, reuse everywhere. AI fills the blanks; the shape stays yours.

### <img src="https://raw.githubusercontent.com/gitset-dev/gitset/main/public/cli/favicon-48.png" height="22" align="center" /> CLI

The full suite runs in your terminal. `issue`, `pr`, `readme`, and `release` cover the same lifecycle as the web — create, review, update, close, merge — with the same templates. `commit` is CLI-only.

```
gitset auth                    # link your account
gitset commit                  # AI commit messages from staged changes  (CLI only)
gitset issue                   # full issue lifecycle — create, close, manage
gitset pr                      # full pull request lifecycle — create, review, merge
gitset readme                  # generate and update READMEs
gitset release                 # tags and releases
gitset gitignore               # generate or extend .gitignore
gitset labelspack              # centralized label management
gitset dependabot-resolver     # triage and resolve Dependabot alerts
gitset template                # browse and apply the template library
```

> Distribution details coming with the June 1st launch.

## What's gone

The following v1 surfaces are **deprecated** and will not return:

- **Gitset MCP** — replaced by the standalone CLI
- **Desktop app** — the web and CLI cover every workflow
- **Code Decommenter** — out of scope for v2
- **Dependencies Handler** — superseded by `dependabot-resolver` in the CLI
- **Token-based plans** (Basic / Pro / Enterprise) — replaced by BYOAI

Active subscriptions from v1 have been refunded. Any leftover token credits roll over as free usage in v2.

## Waitlist

Reserve early access at [gitset.dev](https://gitset.dev).

## Development

This repository hosts the `coming-soon` landing page.

```bash
npm install
npm run dev
```

Built with Next.js, Tailwind, and Framer Motion.

## License

MPL 2.0. See [LICENSE](LICENSE).

---

<div align="center">
  <sub>Questions? <a href="mailto:support@gitset.dev">support@gitset.dev</a></sub>
</div>
