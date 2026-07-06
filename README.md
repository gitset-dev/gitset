<div align="center">
  <a href="https://gitset.dev" target="_blank">
    <img src="public/favicon-192.png" alt="Gitset" width="88" />
  </a>

  <h1>Gitset</h1>

  <p><strong><code>Draft. Refine. Ship.</code></strong></p>

  <p>
    <img src="https://img.shields.io/badge/license-MPL--2.0-blue?style=flat-square" alt="MPL-2.0" />
    <img src="https://img.shields.io/badge/model-BYOAI-white?style=flat-square" alt="BYOAI" />
    <a href="https://gitset.dev"><img src="https://img.shields.io/badge/web-gitset.dev-2dd4bf?style=flat-square" alt="gitset.dev" /></a>
  </p>
</div>

---

Gitset is an open-source toolkit for everything around your code on GitHub:
commit messages, issues, pull requests, release notes, READMEs, labels, and
repository upkeep. Every tool drafts from your repository's real context; you
refine the draft in plain language until it ships. Bring your own AI key —
Anthropic, OpenAI, Gemini, or any compatible endpoint. No subscriptions. No
metering.

This repository is the **web app**: the interface at [gitset.dev](https://gitset.dev),
its GitHub OAuth flow, and its GitHub integration. The same tools also run in
your terminal — see [the CLI](#the-cli).

## The toolkit

| Tool | What disappears from your day |
|---|---|
| **Issue Crafter** | Writing the same structured bug report for the third time. One sentence in, a complete labeled issue out. |
| **PR Maker** | PR descriptions nobody reads twice. Drafted from your branch diff, published when you approve. |
| **Release Manager** | Release notes assembled from memory. Drafted from your actual commit range, in your format. |
| **README Generator** | The README that went stale two features ago. Drafted from your tracked files, refined until it reads right. |
| **Commit Generator** | Commit messages written at 2 a.m. Conventional Commits (or your style) from any diff. |
| **Label Pack** | Recreating your label set on every new repository. Define it once, apply it anywhere. |
| **Backup Automator** | Wondering if you'd survive losing GitHub. A scheduled mirror backup that runs inside *your* GitHub. |
| **Repo Profiler** | Empty description and topics fields. Drafted from your code, applied in one click. |
| **Gitignore Builder** | Copy-pasting `.gitignore` snippets. Stack-aware, generated in seconds. |

Every generator accepts **your own template** — define your format once and
every draft follows it — and includes a curated library (Conventional
Commits, Keep a Changelog, gitmoji, and more) that never overwrites your
saved templates.

## How your data is treated

- Your AI provider keys are encrypted at rest (AES-256-GCM), never sent to
  the browser, never logged.
- Your code is read transiently to build drafts and is not retained. Nothing
  is used for model training.
- No analytics, no trackers, exactly two cookies (session + OAuth state).
- Account deletion is self-service, from the dashboard.

Details: [Privacy Policy](https://gitset.dev/privacy) ·
[Terms](https://gitset.dev/terms). Every claim is checkable in this codebase.

## The CLI

<img src="public/cli/favicon-48.png" alt="" width="20" align="center" /> The
Gitset CLI runs the same tools entirely on your machine — no account, no
telemetry, your keys in `~/.gitset`, your code going to your provider and
nowhere else.

```sh
npm install -g @gitset-dev/cli
gitset config set anthropic --key sk-... --default
gitset commit
```

Docs: [gitset.dev/docs/cli](https://gitset.dev/docs/cli) · Source:
[gitset-dev/gitset-cli-v2](https://github.com/gitset-dev/gitset-cli-v2)

## Development

Stack: [Astro](https://astro.build) (SSR, Node adapter) · React ·
Tailwind CSS · [Turso](https://turso.tech) (libSQL) with Drizzle ORM.

```sh
pnpm install
cp .env.example .env   # fill in: Turso DB, GitHub OAuth app, API base URL
pnpm dev               # http://localhost:4321
```

`pnpm build` builds for production; `pnpm start` serves `dist/`. The AI
generation endpoints are served by the Gitset API (configured via
`CORE_API_URL`); everything else — auth, GitHub integration, UI — lives in
this repository.

## Contributing

Issues and pull requests are welcome. Keep the voice of any user-facing copy
consistent with the existing pages, and run `pnpm astro check` before
submitting.

## License

[MPL-2.0](LICENSE) © Iván Luna. The Gitset name and logo are not covered by
the code license.
