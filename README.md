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

**Gitset v2** is a rebuild. No subscription tiers, no token metering, no proprietary AI lock-in. Bring your own API key, use the suite from the web or your terminal, inspect every line of code.

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
| **README Generator** | Context-aware documentation for any public or private repo |
| **Issues Crafter** | Structured issue drafting with template support |
| **PR Maker** | Branch comparison, AI descriptions, full PR lifecycle |
| **Tags & Releases Manager** | Release creation with AI-assisted notes |
| **Gitignore Builder** | Stack-aware `.gitignore` assembly |
| **Repo Profiler** | Repository analysis and insights |
| **Backup Automator** | Scheduled backups for your repositories |

### CLI

A standalone command-line companion. Install once, use everywhere.

```bash
npm install -g gitset
```

```
gitset auth                    # link your account
gitset commit                  # AI commit messages from staged changes
gitset gitignore               # generate or extend .gitignore
gitset release                 # release workflow helpers
gitset repo                    # repo utilities (badges, licenses, analysis)
gitset labelspack              # bulk label management
gitset dependabot-resolver     # triage and resolve Dependabot alerts
```

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
