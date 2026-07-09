import React from 'react';

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="border-t bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
            <div className="flex flex-col gap-8 py-8 md:py-12 px-4 sm:px-8">
                <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
                    <div className="col-span-2 flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <img src="/favicon-96.png" alt="Gitset Logo" className="h-8 w-8" />
                            <span className="text-xl font-bold">Gitset</span>
                        </div>
                        <p className="text-sm font-mono font-medium text-foreground">
                            Draft. Refine. Ship.
                        </p>
                        <p className="text-sm text-muted-foreground max-w-xs">
                            Open-source toolkit for everything around your code
                            on GitHub.
                        </p>
                    </div>

                    <div className="flex flex-col gap-2 2xl:justify-self-center">
                        <h3 className="text-sm font-semibold">Products</h3>
                        <a href="/tools/readme-generator" className="text-sm text-muted-foreground hover:text-foreground transition-colors">README Generator</a>
                        <a href="/tools/issues-crafter" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Issue Crafter</a>
                        <a href="/tools/pr-maker" className="text-sm text-muted-foreground hover:text-foreground transition-colors">PR Maker</a>
                        <a href="/tools/tags-releases-manager" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Release Manager</a>
                        <a href="/tools/commit-messages-generator" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Commit Generator</a>
                        <a href="/tools/gitignore-builder" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Gitignore Builder</a>
                        <a href="/tools/repo-profiler" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Repo Profiler</a>
                        <a href="/tools/backup-automator" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Backup Automator</a>
                    </div>

                    <div className="flex flex-col gap-2 2xl:justify-self-center">
                        <h3 className="text-sm font-semibold">Resources</h3>
                        <a href="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Documentation</a>
                        <a href="/changelog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Changelog</a>
                        <a href="/faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
                        <a href="/status" className="text-sm text-muted-foreground hover:text-foreground transition-colors">GitHub Status</a>
                        <button
                            onClick={() => window.dispatchEvent(new CustomEvent('open-feedback-widget'))}
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left"
                        >
                            Feedback
                        </button>
                        <a href="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</a>
                        <a href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</a>
                        <a href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms of Service</a>
                    </div>
                </div>

                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-t pt-8">
                    <p className="text-xs text-muted-foreground">
                        © {currentYear} Gitset. All rights reserved.
                    </p>
                    <div className="flex gap-4">
                        <a href="https://github.com/gitset-dev" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                            <span className="sr-only">GitHub</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>
                        </a>
                        <a href="https://linkedin.com/company/gitset-dev" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                            <span className="sr-only">LinkedIn</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect width="4" height="12" x="2" y="9" /><circle cx="4" cy="4" r="2" /></svg>
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}