import React from 'react';

const productLinks = [
    { href: '/tools/readme-generator', label: 'Readme Generator' },
    { href: '/tools/issues-crafter', label: 'Issue Crafter' },
    { href: '/tools/pr-maker', label: 'PR Maker' },
    { href: '/tools/tags-releases-manager', label: 'Release Manager' },
    { href: '/tools/commit-messages-generator', label: 'Commit Generator' },
    { href: '/tools/gitignore-builder', label: 'Gitignore Builder' },
    { href: '/tools/repo-profiler', label: 'Repo Profiler' },
    { href: '/tools/backup-automator', label: 'Backup Automator' },
    { href: '/tools/knowledge-mapper', label: 'Knowledge Mapper' },
];

const linkClass = 'text-sm text-muted-foreground transition-colors hover:text-foreground';

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="relative mt-auto border-t border-border bg-surface/60">
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent" />
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-12 sm:px-6 md:py-16 lg:px-8">
                <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-12">
                    <div className="col-span-2 flex flex-col gap-4 md:col-span-5">
                        <div className="flex items-center gap-2.5">
                            <img src="/favicon-96.png" alt="Gitset Logo" className="h-8 w-8 rounded-lg ring-1 ring-border" />
                            <span className="text-lg font-semibold tracking-tight">Gitset</span>
                        </div>
                        <p className="font-mono text-sm font-medium text-foreground">
                            Draft. Refine. <span className="text-brand">Ship.</span>
                        </p>
                        <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
                            Open-source toolkit for everything around your code
                            on GitHub.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 md:col-span-4">
                        <h3 className="eyebrow !text-muted-foreground">Products</h3>
                        <div className="grid gap-2.5 sm:grid-cols-1 lg:grid-cols-2 lg:gap-x-6">
                            {productLinks.map((l) => (
                                <a key={l.href} href={l.href} className={linkClass}>{l.label}</a>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 md:col-span-3">
                        <h3 className="eyebrow !text-muted-foreground">Resources</h3>
                        <div className="grid gap-2.5">
                            <a href="/changelog" className={linkClass}>Changelog</a>
                            <a href="/faq" className={linkClass}>FAQ</a>
                            <a href="/docs" className={linkClass}>Documentation</a>
                            <button
                                onClick={() => window.dispatchEvent(new CustomEvent('open-feedback-widget'))}
                                className={`${linkClass} text-left`}
                            >
                                Feedback
                            </button>
                            <a href="/status" className={linkClass}>GitHub Status</a>
                            <a href="/terms" className={linkClass}>Terms of Service</a>
                            <a href="/privacy" className={linkClass}>Privacy Policy</a>
                            <a href="/contact" className={linkClass}>Contact</a>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col-reverse gap-4 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-muted-foreground">
                        © {currentYear} Gitset. All rights reserved.
                    </p>
                    <div className="flex gap-2">
                        <a href="https://github.com/gitset-dev" target="_blank" rel="noreferrer" className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-brand/40 hover:text-foreground">
                            <span className="sr-only">GitHub</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>
                        </a>
                        <a href="https://linkedin.com/company/gitset-dev" target="_blank" rel="noreferrer" className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-brand/40 hover:text-foreground">
                            <span className="sr-only">LinkedIn</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect width="4" height="12" x="2" y="9" /><circle cx="4" cy="4" r="2" /></svg>
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
