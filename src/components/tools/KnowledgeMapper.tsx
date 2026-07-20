import React, { useState, useEffect, useMemo } from 'react';
import { RepositorySelector } from '../RepositorySelector';
import { ghFetch } from '@/lib/githubProxy';
import {
    Loader2, Copy, Check, ExternalLink, RefreshCw, Search, Terminal,
    FileText, ChevronDown, ChevronRight, CheckCircle2, AlertTriangle,
    Network, BookOpen, ShieldCheck, Coins, Workflow, GitPullRequest, XCircle,
} from 'lucide-react';

interface User {
    gitsetKey: string;
    githubOauthToken?: string | null;
    plan?: string;
}

interface FileSummary {
    path: string;
    purpose: string;
    exports: string[];
    dependencies: string[];
    notes: string;
}

interface KnowledgeState {
    version: number;
    generatedAt: string;
    provider: string | null;
    model: string | null;
    tag: string | null;
    commit: string | null;
    fileHashes: Record<string, string>;
    moduleSummaries: Record<string, FileSummary[] | string>;
}

interface Drift {
    aheadBy: number;
    changedMapped: string[];
    byModule: Record<string, number>;
    truncated: boolean;
}

interface Automation {
    status: 'none' | 'configured';
    mode?: 'push' | 'releases' | 'weekly' | 'custom';
    sync?: 'commit' | 'pr';
    branch?: string;
    nextRunAt?: string | null;
    lastRun?: { conclusion: string | null; status: string; at: string; url: string } | null;
    updatePr?: { number: number; url: string } | null;
}

type Status = 'idle' | 'loading' | 'missing' | 'loaded' | 'error';

const KNOWLEDGE_DIR = 'docs/gitset-knowledge';
const DOC_FILES = ['index.md', 'architecture.md', 'developer-guide.md', 'commands-and-workflows.md', 'module-map.md'];
const CONTAINER_DIRS = new Set(['src', 'lib', 'app', 'packages', 'pkg', 'internal', 'cmd', 'api', 'server', 'client']);

function moduleKeyFor(filePath: string): string {
    const segments = filePath.split('/');
    if (segments.length === 1) return '(root)';
    if (CONTAINER_DIRS.has(segments[0]) && segments.length > 2) return `${segments[0]}/${segments[1]}`;
    return segments[0];
}

function decodeBase64Utf8(base64: string): string {
    return decodeURIComponent(escape(atob(base64.replace(/\n/g, ''))));
}

const WORKFLOW_FILE = '.github/workflows/gitset-knowledge.yml';

function parseWorkflowTrigger(yaml: string): { mode: Automation['mode']; branch?: string; cron?: string } {
    if (/\brelease:/.test(yaml) && /types:\s*\[published\]/.test(yaml)) return { mode: 'releases' };
    const cron = yaml.match(/cron:\s*'([^']+)'/);
    if (/\bschedule:/.test(yaml) && cron) return { mode: 'weekly', cron: cron[1] };
    const branches = yaml.match(/\bpush:\s*\r?\n\s*branches:\s*\[([^\]]+)\]/);
    if (branches) return { mode: 'push', branch: branches[1].trim() };
    return { mode: 'custom' };
}

function nextCronRun(cron: string): Date | null {
    const parts = cron.trim().split(/\s+/);
    if (parts.length !== 5 || parts[2] !== '*' || parts[3] !== '*') return null;
    const minute = parseInt(parts[0], 10);
    const hour = parseInt(parts[1], 10);
    if (Number.isNaN(minute) || Number.isNaN(hour)) return null;
    const dow = parts[4] === '*' ? null : parseInt(parts[4], 10);
    if (parts[4] !== '*' && Number.isNaN(dow)) return null;
    const now = new Date();
    const base = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, minute, 0);
    for (let i = 0; i < 8; i += 1) {
        const candidate = new Date(base + i * 86400000);
        if (candidate.getTime() <= now.getTime()) continue;
        if (dow === null || candidate.getUTCDay() === dow) return candidate;
    }
    return null;
}

function relativeFuture(date: Date): string {
    const mins = Math.round((date.getTime() - Date.now()) / 60000);
    if (mins < 60) return `in ${Math.max(mins, 1)} min`;
    const hours = Math.round(mins / 60);
    if (hours < 48) return `in ${hours}h`;
    return `in ${Math.round(hours / 24)} days`;
}

function relativeTime(iso: string): string {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return iso;
    const mins = Math.round((Date.now() - then) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.round(mins / 60);
    if (hours < 48) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days < 60) return `${days} days ago`;
    return new Date(iso).toLocaleDateString();
}

function CopyableCommand({ command }: { command: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 font-mono text-xs">
            <Terminal className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="flex-1 overflow-x-auto whitespace-nowrap">{command}</span>
            <button
                type="button"
                onClick={() => {
                    navigator.clipboard.writeText(command).then(() => {
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                    });
                }}
                className="shrink-0 rounded p-1 hover:bg-background"
                aria-label={`Copy ${command}`}
            >
                {copied ? <Check className="h-3.5 w-3.5 text-brand" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
        </div>
    );
}

export function KnowledgeMapper({ user }: { user: User }) {
    const [repo, setRepo] = useState('');
    const [status, setStatus] = useState<Status>('idle');
    const [error, setError] = useState<string | null>(null);
    const [state, setState] = useState<KnowledgeState | null>(null);
    const [branch, setBranch] = useState('main');
    const [drift, setDrift] = useState<Drift | null>(null);
    const [automation, setAutomation] = useState<Automation | null>(null);
    const [search, setSearch] = useState('');
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    const loadAutomation = async (repoFullName: string, defaultBranch: string) => {
        try {
            const wfRes = await ghFetch(`/repos/${repoFullName}/contents/${WORKFLOW_FILE}?ref=${defaultBranch}`);
            if (wfRes.status === 404) {
                setAutomation({ status: 'none' });
                return;
            }
            if (!wfRes.ok) return;
            const wfData = await wfRes.json();
            const wfYaml = decodeBase64Utf8(wfData.content);
            const trigger = parseWorkflowTrigger(wfYaml);
            const sync: Automation['sync'] = wfYaml.includes('gh pr create') ? 'pr' : 'commit';

            let lastRun: Automation['lastRun'] = null;
            const runsRes = await ghFetch(`/repos/${repoFullName}/actions/workflows/gitset-knowledge.yml/runs?per_page=1`);
            if (runsRes.ok) {
                const runs = await runsRes.json();
                const run = (runs.workflow_runs || [])[0];
                if (run) {
                    lastRun = {
                        conclusion: run.conclusion,
                        status: run.status,
                        at: run.updated_at || run.created_at,
                        url: run.html_url,
                    };
                }
            }

            let updatePr: Automation['updatePr'] = null;
            const owner = repoFullName.split('/')[0];
            const prRes = await ghFetch(`/repos/${repoFullName}/pulls?state=open&head=${encodeURIComponent(`${owner}:gitset/knowledge-update`)}`);
            if (prRes.ok) {
                const prs = await prRes.json();
                if (Array.isArray(prs) && prs[0]) updatePr = { number: prs[0].number, url: prs[0].html_url };
            }

            const next = trigger.cron ? nextCronRun(trigger.cron) : null;
            setAutomation({
                status: 'configured',
                mode: trigger.mode,
                sync,
                branch: trigger.branch,
                nextRunAt: next ? next.toISOString() : null,
                lastRun,
                updatePr,
            });
        } catch {
            setAutomation(null);
        }
    };

    const load = async (repoFullName: string) => {
        setStatus('loading');
        setError(null);
        setState(null);
        setDrift(null);
        setAutomation(null);
        setExpanded(new Set());
        try {
            let defaultBranch = 'main';
            const repoRes = await ghFetch(`/repos/${repoFullName}`);
            if (repoRes.ok) {
                const repoData = await repoRes.json();
                defaultBranch = repoData.default_branch || 'main';
            }
            setBranch(defaultBranch);

            const stateRes = await ghFetch(`/repos/${repoFullName}/contents/${KNOWLEDGE_DIR}/.state.json?ref=${defaultBranch}`);
            if (stateRes.status === 404) {
                setStatus('missing');
                return;
            }
            if (!stateRes.ok) throw new Error(`GitHub returned ${stateRes.status} while looking for the knowledge base.`);

            const stateData = await stateRes.json();
            const parsed: KnowledgeState = JSON.parse(decodeBase64Utf8(stateData.content));
            setState(parsed);
            setStatus('loaded');
            loadAutomation(repoFullName, defaultBranch);

            if (parsed.commit) {
                const cmpRes = await ghFetch(`/repos/${repoFullName}/compare/${parsed.commit}...${defaultBranch}`);
                if (cmpRes.ok) {
                    const cmp = await cmpRes.json();
                    const mapped = new Set(Object.keys(parsed.fileHashes || {}));
                    const changedMapped: string[] = [];
                    const byModule: Record<string, number> = {};
                    for (const f of cmp.files || []) {
                        if (!mapped.has(f.filename)) continue;
                        changedMapped.push(f.filename);
                        const mod = moduleKeyFor(f.filename);
                        byModule[mod] = (byModule[mod] || 0) + 1;
                    }
                    setDrift({
                        aheadBy: cmp.ahead_by || 0,
                        changedMapped,
                        byModule,
                        truncated: (cmp.files || []).length >= 300,
                    });
                }
            }
        } catch (e: any) {
            setError(e.message || 'Failed to load the knowledge base.');
            setStatus('error');
        }
    };

    useEffect(() => {
        if (repo && repo.includes('/')) load(repo);
        else {
            setStatus('idle');
            setState(null);
            setDrift(null);
            setAutomation(null);
        }
    }, [repo]);

    const modules = useMemo(() => {
        if (!state) return [];
        const entries = Object.entries(state.moduleSummaries || {});
        const term = search.trim().toLowerCase();
        return entries
            .map(([name, summary]) => {
                const files = Array.isArray(summary) ? summary : [];
                const raw = typeof summary === 'string' ? summary : null;
                return { name, files, raw, driftCount: drift?.byModule[name] || 0 };
            })
            .filter((m) => {
                if (!term) return true;
                if (m.name.toLowerCase().includes(term)) return true;
                return m.files.some((f) => f.path.toLowerCase().includes(term) || f.purpose.toLowerCase().includes(term));
            })
            .sort((a, b) => b.driftCount - a.driftCount || a.name.localeCompare(b.name));
    }, [state, drift, search]);

    const toggleModule = (name: string) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });
    };

    const mappedFileCount = state ? Object.keys(state.fileHashes || {}).length : 0;
    const moduleCount = state ? Object.keys(state.moduleSummaries || {}).length : 0;

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Repository</label>
                <RepositorySelector
                    githubToken={user.githubOauthToken}
                    value={repo}
                    onChange={setRepo}
                    placeholder="Select repository"
                />
            </div>

            {status === 'idle' && (
                <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
                    <Network className="mx-auto mb-3 h-10 w-10 opacity-20" />
                    <p className="text-sm">Select a repository to view its knowledge base — or set one up in two minutes.</p>
                </div>
            )}

            {status === 'loading' && (
                <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card p-8 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Checking {repo} for a knowledge base…</span>
                </div>
            )}

            {status === 'error' && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {status === 'missing' && (
                <div className="space-y-4">
                    <div className="rounded-lg border border-brand/30 bg-brand/5 p-4">
                        <p className="text-sm font-medium">No knowledge base in this repository yet.</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Knowledge Mapper builds <code>{KNOWLEDGE_DIR}/</code> — an always-current map of your codebase
                            (architecture, modules, workflows) that both developers and AI agents read before touching your code.
                            It is generated from source code, never from existing docs, so it can't inherit their drift.
                        </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                        <div className="flex items-start gap-2 rounded-lg border border-border bg-card p-3">
                            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                            <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Private by design.</span> Runs on your machine with your own AI key. Secrets are redacted locally before any AI call.</p>
                        </div>
                        <div className="flex items-start gap-2 rounded-lg border border-border bg-card p-3">
                            <Coins className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                            <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Cost-honest.</span> Shows the exact call/token estimate and asks before spending. Typical repo: cents.</p>
                        </div>
                        <div className="flex items-start gap-2 rounded-lg border border-border bg-card p-3">
                            <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                            <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Incremental.</span> Updates re-analyze only what changed — you never pay twice for the same code.</p>
                        </div>
                    </div>

                    <section className="space-y-3 rounded-lg border border-border bg-card p-5">
                        <h2 className="flex items-center gap-2 text-sm font-semibold">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/10 text-xs text-brand">1</span>
                            Install the CLI and connect your AI key
                        </h2>
                        <CopyableCommand command="npm i -g @gitset-dev/cli" />
                        <CopyableCommand command="gitset config" />
                    </section>

                    <section className="space-y-3 rounded-lg border border-border bg-card p-5">
                        <h2 className="flex items-center gap-2 text-sm font-semibold">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/10 text-xs text-brand">2</span>
                            Preview the plan — free, zero AI calls
                        </h2>
                        <p className="text-xs text-muted-foreground">Inside your repository, see exactly what would be analyzed and what it would cost:</p>
                        <CopyableCommand command="gitset knowledge scan" />
                    </section>

                    <section className="space-y-3 rounded-lg border border-border bg-card p-5">
                        <h2 className="flex items-center gap-2 text-sm font-semibold">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/10 text-xs text-brand">3</span>
                            Generate, review, commit
                        </h2>
                        <CopyableCommand command="gitset knowledge generate" />
                        <p className="text-xs text-muted-foreground">
                            Review the generated <code>{KNOWLEDGE_DIR}/</code> and <code>AGENTS.md</code>, then commit and push them like any other change.
                            The knowledge base is meant to live in git — that's how agents, teammates and this dashboard find it.
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Optional: <code>gitset knowledge automate</code> writes a CI workflow (per-push, per-release or weekly) that keeps it fresh and opens a review PR when something actually changed.
                        </p>
                    </section>

                    <button
                        type="button"
                        onClick={() => load(repo)}
                        className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Already pushed it? Refresh
                    </button>
                </div>
            )}

            {status === 'loaded' && state && (
                <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-lg border border-border bg-card p-4">
                            <p className="text-xs text-muted-foreground">Generated</p>
                            <p className="mt-1 text-sm font-semibold" title={state.generatedAt}>{relativeTime(state.generatedAt)}</p>
                        </div>
                        <div className="rounded-lg border border-border bg-card p-4">
                            <p className="text-xs text-muted-foreground">Model</p>
                            <p className="mt-1 truncate text-sm font-semibold" title={`${state.provider} / ${state.model}`}>{state.provider}{state.model ? ` / ${state.model}` : ''}</p>
                        </div>
                        <div className="rounded-lg border border-border bg-card p-4">
                            <p className="text-xs text-muted-foreground">Coverage</p>
                            <p className="mt-1 text-sm font-semibold">{mappedFileCount} files · {moduleCount} modules</p>
                        </div>
                        <div className="rounded-lg border border-border bg-card p-4">
                            <p className="text-xs text-muted-foreground">Snapshot</p>
                            <p className="mt-1 truncate text-sm font-semibold" title={state.commit || undefined}>{state.tag || (state.commit ? state.commit.slice(0, 7) : '—')}</p>
                        </div>
                    </div>

                    {drift === null && state.commit === null && (
                        <div className="flex items-start gap-2 rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>This snapshot predates drift tracking. Regenerate with the latest CLI to enable it.</span>
                        </div>
                    )}

                    {drift && drift.changedMapped.length === 0 && (
                        <div className="flex items-start gap-2 rounded-lg border border-brand/30 bg-brand/5 p-4">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                            <div className="text-sm">
                                <p className="font-medium">Up to date</p>
                                <p className="text-xs text-muted-foreground">
                                    {drift.aheadBy === 0
                                        ? 'No commits since this knowledge base was generated.'
                                        : `${drift.aheadBy} commit${drift.aheadBy === 1 ? '' : 's'} since generation, but none touched mapped source files.`}
                                </p>
                            </div>
                        </div>
                    )}

                    {drift && drift.changedMapped.length > 0 && (
                        <div className="space-y-3 rounded-lg border border-amber-300/50 bg-amber-500/5 p-4">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                                <div className="text-sm">
                                    <p className="font-medium">Drift detected</p>
                                    <p className="text-xs text-muted-foreground">
                                        {drift.changedMapped.length}{drift.truncated ? '+' : ''} mapped file{drift.changedMapped.length === 1 ? '' : 's'} changed across {drift.aheadBy} commit{drift.aheadBy === 1 ? '' : 's'} since generation.
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {Object.entries(drift.byModule).sort((a, b) => b[1] - a[1]).map(([mod, count]) => (
                                    <span key={mod} className="rounded-full bg-amber-500/10 px-2 py-0.5 font-mono text-[11px] text-amber-700 dark:text-amber-400">
                                        {mod} · {count}
                                    </span>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground">Refresh only what changed (cached summaries are reused):</p>
                            <CopyableCommand command="gitset knowledge update" />
                        </div>
                    )}

                    {automation && automation.status === 'none' && (
                        <div className="space-y-2 rounded-lg border border-border bg-card p-4">
                            <div className="flex items-start gap-2">
                                <Workflow className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                <div className="text-sm">
                                    <p className="font-medium">CI automation is off</p>
                                    <p className="text-xs text-muted-foreground">Let CI keep this knowledge base fresh — zero setup: by default it commits refreshed docs directly when mapped source actually changed (or opens review PRs if you prefer). Choose per-push, per-release or weekly:</p>
                                </div>
                            </div>
                            <CopyableCommand command="gitset knowledge automate" />
                        </div>
                    )}

                    {automation && automation.status === 'configured' && (
                        <div className="space-y-2 rounded-lg border border-brand/30 bg-brand/5 p-4">
                            <div className="flex items-start gap-2">
                                <Workflow className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                                <div className="text-sm">
                                    <p className="font-medium">CI automation active</p>
                                    <p className="text-xs text-muted-foreground">
                                        {automation.mode === 'push' && `Runs on every push to ${automation.branch || 'the default branch'} that touches mapped source — pushes with no mapped changes cost zero AI calls.`}
                                        {automation.mode === 'releases' && 'Runs whenever a release is published.'}
                                        {automation.mode === 'weekly' && (automation.nextRunAt
                                            ? `Runs weekly — next run ${new Date(automation.nextRunAt).toLocaleString()} (${relativeFuture(new Date(automation.nextRunAt))}).`
                                            : 'Runs on a weekly schedule.')}
                                        {automation.mode === 'custom' && 'Custom trigger — the workflow file was edited manually.'}
                                        {automation.sync === 'commit' && ' Updates are committed directly to the branch.'}
                                        {automation.sync === 'pr' && ' Updates arrive as review pull requests.'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 pl-6">
                                {automation.lastRun && (
                                    <a
                                        href={automation.lastRun.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 rounded-full bg-background px-2.5 py-1 text-[11px] font-medium hover:bg-accent"
                                    >
                                        {automation.lastRun.status !== 'completed'
                                            ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                            : automation.lastRun.conclusion === 'success'
                                                ? <CheckCircle2 className="h-3 w-3 text-brand" />
                                                : <XCircle className="h-3 w-3 text-red-500" />}
                                        Last run: {automation.lastRun.status !== 'completed' ? 'running' : automation.lastRun.conclusion} · {relativeTime(automation.lastRun.at)}
                                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                    </a>
                                )}
                                {!automation.lastRun && (
                                    <span className="rounded-full bg-background px-2.5 py-1 text-[11px] text-muted-foreground">No runs yet</span>
                                )}
                                {automation.updatePr && (
                                    <a
                                        href={automation.updatePr.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-500/20 dark:text-amber-400"
                                    >
                                        <GitPullRequest className="h-3 w-3" />
                                        Update PR #{automation.updatePr.number} awaiting review
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                        {DOC_FILES.map((f) => (
                            <a
                                key={f}
                                href={`https://github.com/${repo}/blob/${branch}/${KNOWLEDGE_DIR}/${f}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-accent"
                            >
                                <FileText className="h-3 w-3 text-muted-foreground" />
                                {f}
                                <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            </a>
                        ))}
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="flex items-center gap-2 text-sm font-semibold">
                                <BookOpen className="h-4 w-4 text-brand" />
                                Module explorer
                            </h2>
                            <div className="relative w-56">
                                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Filter modules or files…"
                                    className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                            </div>
                        </div>

                        {modules.map((mod) => (
                            <div key={mod.name} className="rounded-lg border border-border bg-card">
                                <button
                                    type="button"
                                    onClick={() => toggleModule(mod.name)}
                                    className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-muted/40"
                                >
                                    {expanded.has(mod.name)
                                        ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                                    <span className="font-mono text-sm font-medium">{mod.name}</span>
                                    <span className="text-xs text-muted-foreground">{mod.files.length || '—'} files</span>
                                    {mod.driftCount > 0 && (
                                        <span className="ml-auto rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                                            {mod.driftCount} changed
                                        </span>
                                    )}
                                </button>
                                {expanded.has(mod.name) && (
                                    <div className="space-y-3 border-t border-border px-4 py-3">
                                        {mod.raw && <p className="whitespace-pre-wrap text-xs text-muted-foreground">{mod.raw}</p>}
                                        {mod.files.map((f) => (
                                            <div key={f.path} className="space-y-1">
                                                <a
                                                    href={`https://github.com/${repo}/blob/${branch}/${f.path}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="font-mono text-xs font-medium text-brand hover:underline"
                                                >
                                                    {f.path}
                                                </a>
                                                <p className="text-xs text-muted-foreground">{f.purpose}</p>
                                                {f.exports.length > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {f.exports.map((ex) => (
                                                            <code key={ex} className="rounded bg-muted px-1.5 py-0.5 text-[11px]">{ex}</code>
                                                        ))}
                                                    </div>
                                                )}
                                                {f.notes && <p className="text-[11px] italic text-muted-foreground/80">{f.notes}</p>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}

                        {modules.length === 0 && (
                            <p className="rounded-lg border border-border bg-card p-4 text-center text-xs text-muted-foreground">
                                No modules match “{search}”.
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
