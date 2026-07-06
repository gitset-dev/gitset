import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, ExternalLink, Loader2, Filter, AlertTriangle, GitMerge, GitPullRequest, FileText } from 'lucide-react';
import { Modal } from '../Modal';
import { RepositorySelector } from '../RepositorySelector';

interface User {
    gitsetKey: string;
    githubOauthToken?: string | null;
    plan?: string;
}

interface PullRequest {
    number: number;
    title: string;
    state: 'open' | 'closed';
    draft: boolean;
    html_url: string;
    user: { login: string };
    created_at: string;
    labels: { name: string; color: string }[];
    head: { ref: string };
    base: { ref: string };
    merged: boolean;
    mergeable: boolean | null;
}

interface PRManagerProps {
    user: User;
    backendUrl: string;
    repoContext: string;
}

export function PRManager({ user, backendUrl, repoContext: initialRepoContext }: PRManagerProps) {
    const [localRepoContext, setLocalRepoContext] = useState(initialRepoContext);
    const [localBaseBranch, setLocalBaseBranch] = useState('');

    const [prs, setPrs] = useState<PullRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filterState, setFilterState] = useState<'open' | 'closed' | 'all'>('open');
    const [page, setPage] = useState(1);
    const [selectedPRs, setSelectedPRs] = useState<number[]>([]);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        action: 'close' | 'reopen' | 'merge' | 'draft' | 'ready' | null;
        count: number;
    }>({ isOpen: false, action: null, count: 0 });

    const [conflictModal, setConflictModal] = useState<{ isOpen: boolean; prNumber: number; htmlUrl: string }>({ isOpen: false, prNumber: 0, htmlUrl: '' });

    useEffect(() => {
        if (initialRepoContext) {
            setLocalRepoContext(initialRepoContext);
        }
    }, [initialRepoContext]);

    useEffect(() => {
        if (localRepoContext) {
            fetchPRs();
        } else {
            setPrs([]);
        }
    }, [localRepoContext, localBaseBranch, filterState, page]);

    const fetchPRs = async () => {
        if (!localRepoContext) return;
        setLoading(true);
        setError(null);
        try {
            const [owner, repo] = localRepoContext.split('/');
            if (!owner || !repo) throw new Error("Invalid repository context");

            const res = await fetch(backendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'list_prs',
                    owner,
                    repo,
                    state: filterState,
                    page,
                    base: localBaseBranch || undefined
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to fetch PRs');
            setPrs(data);
            setSelectedPRs([]);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const initiateBulkAction = (action: 'close' | 'reopen' | 'merge' | 'draft' | 'ready') => {
        if (selectedPRs.length === 0) return;
        setConfirmModal({ isOpen: true, action, count: selectedPRs.length });
    };

    const executeBulkAction = async () => {
        const { action } = confirmModal;
        if (!action) return;

        setActionLoading(action);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
            const [owner, repo] = localRepoContext.split('/');
            if (action === 'merge') {
                await Promise.all(selectedPRs.map(async num => {
                    const res = await fetch(backendUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'merge_pr',
                            owner, repo,
                            pr_number: num,
                            merge_method: 'merge'
                        })
                    });

                    if (!res.ok) {
                        const data = await res.json();
                        if (res.status === 405 || res.status === 409 || data.error?.includes('mergeable')) {
                            const pr = prs.find(p => p.number === num);
                            setConflictModal({
                                isOpen: true,
                                prNumber: num,
                                htmlUrl: pr?.html_url || `https://github.com/${owner}/${repo}/pull/${num}`
                            });
                            throw new Error("Merge conflict detected");
                        }
                        throw new Error(data.error || 'Failed to merge PR');
                    }
                    return res.json();
                }));
            } else if (action === 'draft') {
                await Promise.all(selectedPRs.map(num =>
                    fetch(backendUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'convert_to_draft',
                            owner, repo,
                            pr_number: num
                        })
                    })
                ));
            } else if (action === 'ready') {
                await Promise.all(selectedPRs.map(num =>
                    fetch(backendUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'mark_ready_for_review',
                            owner, repo,
                            pr_number: num
                        })
                    })
                ));
            } else {
                const state = action === 'close' ? 'closed' : 'open';
                await Promise.all(selectedPRs.map(num =>
                    fetch(backendUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'update_pr',
                            owner, repo,
                            pr_number: num,
                            state
                        })
                    })
                ));
            }

            await fetchPRs();
        } catch (err: any) {
            if (err.message !== "Merge conflict detected") {
                setError(err.message);
            }
        } finally {
            setActionLoading(null);
        }
    };

    const toggleSelection = (num: number) => {
        setSelectedPRs(prev =>
            prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]
        );
    };

    const toggleAll = () => {
        if (selectedPRs.length === prs.length) {
            setSelectedPRs([]);
        } else {
            setSelectedPRs(prs.map(pr => pr.number));
        }
    };

    return (
        <div className="space-y-4 h-full flex flex-col">
            {}
            <div className="p-4 border rounded-lg bg-card shadow-sm space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Working Repository & Base Branch</label>
                <RepositorySelector
                    githubToken={user.githubOauthToken}
                    value={localRepoContext}
                    onChange={(val) => { setLocalRepoContext(val); setPage(1); }}
                    branchValue={localBaseBranch}
                    onBranchChange={setLocalBaseBranch}
                    placeholder="Select repository to manage PRs..."
                    showBranchSelector={true}
                />
            </div>

            {}
            <div className="flex items-center justify-between gap-4 p-4 border rounded-lg bg-card shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="flex bg-muted rounded-lg p-1">
                        <button
                            onClick={() => { setFilterState('open'); setPage(1); }}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${filterState === 'open' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <div className="flex items-center gap-2">
                                <GitPullRequest className="h-4 w-4 text-brand" />
                                Open
                            </div>
                        </button>
                        <button
                            onClick={() => { setFilterState('closed'); setPage(1); }}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${filterState === 'closed' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <div className="flex items-center gap-2">
                                <GitMerge className="h-4 w-4 text-purple-500" />
                                Closed
                            </div>
                        </button>
                        <button
                            onClick={() => { setFilterState('all'); setPage(1); }}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${filterState === 'all' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            All
                        </button>
                    </div>
                    <button onClick={fetchPRs} className="p-2 hover:bg-muted rounded-md" title="Refresh">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    {selectedPRs.length > 0 && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-5">
                            <span className="text-sm text-muted-foreground">{selectedPRs.length} selected</span>
                            {filterState === 'open' && (
                                <>
                                    <button
                                        onClick={() => initiateBulkAction('close')}
                                        disabled={!!actionLoading}
                                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-md text-sm font-medium transition-colors"
                                    >
                                        {actionLoading === 'close' ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                                        Close
                                    </button>
                                    <button
                                        onClick={() => initiateBulkAction('merge')}
                                        disabled={!!actionLoading}
                                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand/10 text-brand hover:bg-brand/20 rounded-md text-sm font-medium transition-colors"
                                    >
                                        {actionLoading === 'merge' ? <Loader2 className="h-3 w-3 animate-spin" /> : <GitMerge className="h-3 w-3" />}
                                        Merge
                                    </button>
                                    <button
                                        onClick={() => initiateBulkAction('draft')}
                                        disabled={!!actionLoading}
                                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 rounded-md text-sm font-medium transition-colors"
                                    >
                                        {actionLoading === 'draft' ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                                        Convert to Draft
                                    </button>
                                </>
                            )}
                            {filterState === 'closed' && (
                                <button
                                    onClick={() => initiateBulkAction('reopen')}
                                    disabled={!!actionLoading}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand/10 text-brand hover:bg-brand/20 rounded-md text-sm font-medium transition-colors"
                                >
                                    {actionLoading === 'reopen' ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                                    Reopen
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {}
            {error && (
                <div className="p-4 rounded-lg bg-destructive/10 text-destructive flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{error}</span>
                </div>
            )}

            {}
            <div className="flex-1 border rounded-lg bg-card overflow-hidden flex flex-col">
                <div className="p-3 border-b bg-muted/30 flex items-center gap-3">
                    <input
                        type="checkbox"
                        checked={prs.length > 0 && selectedPRs.length === prs.length}
                        onChange={toggleAll}
                        className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-muted-foreground">Title</span>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loading && prs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin" />
                            <p>Loading pull requests...</p>
                        </div>
                    ) : prs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
                            <Filter className="h-8 w-8 opacity-20" />
                            <p>No {filterState} pull requests found.</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {prs.map(pr => (
                                <div key={pr.number} className={`group flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors ${selectedPRs.includes(pr.number) ? 'bg-muted/30' : ''}`}>
                                    <input
                                        type="checkbox"
                                        checked={selectedPRs.includes(pr.number)}
                                        onChange={() => toggleSelection(pr.number)}
                                        className="mt-1 h-4 w-4 rounded border-gray-300"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <a
                                                href={pr.html_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="font-medium hover:text-brand hover:underline break-words"
                                            >
                                                {pr.title}
                                            </a>
                                            {pr.draft && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-500/10 text-gray-600 border border-gray-500/20 shrink-0">
                                                    DRAFT
                                                </span>
                                            )}
                                            {pr.merged && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/10 text-purple-600 border border-purple-500/20 shrink-0">
                                                    MERGED
                                                </span>
                                            )}
                                            {pr.labels.map(label => (
                                                <span
                                                    key={label.name}
                                                    className="px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0"
                                                    style={{ backgroundColor: `#${label.color}`, borderColor: `#${label.color}40`, color: getContrastColor(label.color) }}
                                                >
                                                    {label.name}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
                                            <span>#{pr.number} opened by {pr.user.login}</span>
                                            <span>•</span>
                                            <span>{pr.head.ref} → {pr.base.ref}</span>
                                            <span>•</span>
                                            <span>{new Date(pr.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <a
                                        href={pr.html_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 hover:bg-background rounded-full border shadow-sm transition-all"
                                    >
                                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                    </a>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {}
                <div className="p-3 border-t bg-muted/30 flex justify-between items-center">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1 || loading}
                        className="text-sm px-3 py-1 rounded hover:bg-background disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <span className="text-xs text-muted-foreground">Page {page}</span>
                    <button
                        onClick={() => setPage(p => p + 1)}
                        disabled={prs.length < 30 || loading}
                        className="text-sm px-3 py-1 rounded hover:bg-background disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            </div>

            {}
            <Modal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                title={`Confirm ${confirmModal.action === 'close' ? 'Close' : confirmModal.action === 'reopen' ? 'Reopen' : confirmModal.action === 'merge' ? 'Merge' : confirmModal.action === 'draft' ? 'Convert to Draft' : 'Mark Ready'}`}
                footer={
                    <>
                        <button
                            onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                            className="px-4 py-2 rounded-md hover:bg-muted text-sm font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={executeBulkAction}
                            className={`px-4 py-2 rounded-md text-sm font-medium ${confirmModal.action === 'close' ?
                                'bg-destructive hover:bg-destructive/90 text-destructive-foreground' :
                                confirmModal.action === 'merge' ?
                                    'bg-primary hover:bg-primary/90 text-primary-foreground' :
                                    'bg-primary hover:bg-primary/90 text-primary-foreground'
                                }`}
                        >
                            Yes, {confirmModal.action} {confirmModal.count} PRs
                        </button>
                    </>
                }
            >
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 text-amber-500 bg-amber-500/10 p-3 rounded-lg">
                        <AlertTriangle className="h-5 w-5" />
                        <p className="text-sm font-medium">This action will affect {confirmModal.count} pull requests.</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Are you sure you want to {confirmModal.action} the selected pull requests?
                        {confirmModal.action === 'merge' && " This action cannot be undone."}
                    </p>
                </div>
            </Modal>
            {}
            <Modal
                isOpen={conflictModal.isOpen}
                onClose={() => setConflictModal({ isOpen: false, prNumber: 0, htmlUrl: '' })}
                title="Merge Conflict Detected"
                footer={
                    <button
                        onClick={() => setConflictModal({ isOpen: false, prNumber: 0, htmlUrl: '' })}
                        className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium"
                    >
                        Understood
                    </button>
                }
            >
                <div className="flex flex-col gap-4">
                    <div className="flex items-start gap-3 text-destructive bg-destructive/10 p-3 rounded-lg">
                        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-sm font-medium">Automatic merge failed.</p>
                            <p className="text-xs opacity-90">This usually happens when the branch has diverged (it is both ahead and behind) or has conflicting changes with the base branch.</p>
                        </div>
                    </div>

                    <div className="space-y-3 text-sm text-muted-foreground">
                        <p>To resolve this, you need to manually resolve the conflicts:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-1">
                            <li><strong>Option A (GitHub UI):</strong> Click the link below to open the PR in GitHub and use their web editor to resolve conflicts.</li>
                            <li><strong>Option B (CLI):</strong> Pull the latest changes locally, merge the base branch, resolve conflicts, and push.</li>
                        </ol>
                    </div>

                    {conflictModal.htmlUrl && (
                        <a
                            href={conflictModal.htmlUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 p-2 bg-secondary hover:bg-secondary/80 rounded-md text-sm font-medium transition-colors mt-2"
                        >
                            Resolve on GitHub <ExternalLink className="h-4 w-4" />
                        </a>
                    )}
                </div>
            </Modal>
        </div>
    );
}

function getContrastColor(hexcolor: string) {
    if (hexcolor.slice(0, 1) === '#') hexcolor = hexcolor.slice(1);
    var r = parseInt(hexcolor.substr(0, 2), 16);
    var g = parseInt(hexcolor.substr(2, 2), 16);
    var b = parseInt(hexcolor.substr(4, 2), 16);
    var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? 'black' : 'white';
}
