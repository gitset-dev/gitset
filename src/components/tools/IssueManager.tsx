import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, ExternalLink, Loader2, Filter, AlertTriangle, GitBranch, Copy, Check } from 'lucide-react';
import { Modal } from '../Modal';
import { RepositorySelector } from '../RepositorySelector';
import { fetchAllBranches } from '../../lib/github';
import { ghFetch } from '@/lib/githubProxy';

interface User {
    gitsetKey: string;
    githubOauthToken?: string | null;
    plan?: string;
}

interface Issue {
    number: number;
    title: string;
    state: 'open' | 'closed';
    html_url: string;
    user: { login: string };
    created_at: string;
    labels: { name: string; color: string }[];
    node_id: string;
}

interface IssueManagerProps {
    user: User;
    backendUrl: string;
    repoContext: string;
}

export function IssueManager({ user, backendUrl, repoContext: initialRepoContext }: IssueManagerProps) {
    const [localRepoContext, setLocalRepoContext] = useState(initialRepoContext);

    const [issues, setIssues] = useState<Issue[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filterState, setFilterState] = useState<'open' | 'closed'>('open');
    const [page, setPage] = useState(1);
    const [selectedIssues, setSelectedIssues] = useState<number[]>([]);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        action: 'close' | 'reopen' | null;
        count: number;
    }>({ isOpen: false, action: null, count: 0 });

    const [branchModalOpen, setBranchModalOpen] = useState(false);
    const [targetIssue, setTargetIssue] = useState<Issue | null>(null);
    const [branches, setBranches] = useState<string[]>([]);
    const [sourceBranch, setSourceBranch] = useState('main');
    const [newBranchName, setNewBranchName] = useState('');
    const [isCreatingBranch, setIsCreatingBranch] = useState(false);
    const [branchCreationError, setBranchCreationError] = useState<string | null>(null);
    const [branchCreatedName, setBranchCreatedName] = useState<string | null>(null);
    const [loadingBranches, setLoadingBranches] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (initialRepoContext) {
            setLocalRepoContext(initialRepoContext);
        }
    }, [initialRepoContext]);

    useEffect(() => {
        if (localRepoContext) {
            fetchIssues();
        } else {
            setIssues([]);
        }
    }, [localRepoContext, filterState, page]);

    const fetchIssues = async () => {
        if (!localRepoContext) return;
        setLoading(true);
        setError(null);
        try {
            const [owner, repo] = localRepoContext.split('/');
            if (!owner || !repo) throw new Error("Invalid repository context");

            const res = await fetch(backendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'list_issues', owner, repo, state: filterState, page })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to fetch issues');
            setIssues(data);
            setSelectedIssues([]);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const initiateBulkAction = (action: 'close' | 'reopen') => {
        if (selectedIssues.length === 0) return;
        setConfirmModal({ isOpen: true, action, count: selectedIssues.length });
    };

    const executeBulkAction = async () => {
        const { action } = confirmModal;
        if (!action) return;

        setActionLoading(action);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));

        try {
            const [owner, repo] = localRepoContext.split('/');
            if (!owner || !repo) throw new Error("Invalid repository context");
            const state = action === 'close' ? 'closed' : 'open';
            const state_reason = action === 'close' ? 'completed' : undefined;

            await Promise.all(selectedIssues.map(num =>
                fetch(backendUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'update_issue',
                        owner, repo,
                        issue_number: num,
                        state,
                        state_reason
                    })
                })
            ));
            await fetchIssues();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const toggleSelection = (num: number) => {
        setSelectedIssues(prev =>
            prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]
        );
    };

    const toggleAll = () => {
        if (selectedIssues.length === issues.length) {
            setSelectedIssues([]);
        } else {
            setSelectedIssues(issues.map(i => i.number));
        }
    };

    const openBranchModal = (issue: Issue) => {
        setTargetIssue(issue);
        setBranchCreatedName(null);
        setBranchCreationError(null);

        const slug = issue.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        setNewBranchName(`feature/${issue.number}-${slug}`);

        setBranchModalOpen(true);
        fetchBranches();
    };

    const fetchBranches = async () => {
        if (!localRepoContext || !user.githubOauthToken) return;
        setLoadingBranches(true);
        try {
            const [owner, repo] = localRepoContext.split('/');
            if (!owner || !repo) return;
            const branchNames = await fetchAllBranches(owner, repo, user.githubOauthToken);
            setBranches(branchNames);

            const defaultBranch = branchNames.find(b => b === 'main' || b === 'master') || branchNames[0];
            if (defaultBranch) setSourceBranch(defaultBranch);
        } catch (err) {
            console.error("Failed to fetch branches", err);
        } finally {
            setLoadingBranches(false);
        }
    };

    const createBranch = async () => {
        if (!localRepoContext || !user.githubOauthToken || !sourceBranch || !newBranchName || !targetIssue?.node_id) return;

        if (newBranchName.includes(' ') || /[^a-zA-Z0-9._\-/]/.test(newBranchName)) {
            setBranchCreationError("Branch name contains invalid characters");
            return;
        }

        setIsCreatingBranch(true);
        setBranchCreationError(null);
        try {
            const refRes = await ghFetch(`/repos/${localRepoContext}/git/ref/heads/${sourceBranch}`);
            if (!refRes.ok) throw new Error("Failed to get source branch info");
            const refData = await refRes.json();
            const sha = refData.object.sha;

            const query = `
                mutation CreateLinkedBranch($issueId: ID!, $name: String!, $oid: GitObjectID!) {
                    createLinkedBranch(input: {issueId: $issueId, name: $name, oid: $oid}) {
                        linkedBranch {
                            ref {
                                name
                            }
                        }
                    }
                }
            `;

            const graphqlRes = await ghFetch('/graphql', {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    query,
                    variables: {
                        issueId: targetIssue.node_id,
                        name: newBranchName,
                        oid: sha
                    }
                })
            });

            const gqlData = await graphqlRes.json();

            if (gqlData.errors && gqlData.errors.length > 0) {
                if (gqlData.errors[0].message.includes('already exists')) {
                    throw new Error("Branch already exists");
                }
                throw new Error(gqlData.errors[0].message || "Failed to create linked branch");
            }

            if (!gqlData.data?.createLinkedBranch?.linkedBranch?.ref?.name) {
                throw new Error("Failed to create linked branch (unknown error)");
            }

            setBranchCreatedName(newBranchName);
        } catch (err: any) {
            setBranchCreationError(err.message);
        } finally {
            setIsCreatingBranch(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="space-y-4 h-full flex flex-col">
            {}
            <div className="p-4 border rounded-lg bg-card shadow-sm space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Working Repository</label>
                <RepositorySelector
                    githubToken={user.githubOauthToken}
                    value={localRepoContext}
                    onChange={(val) => { setLocalRepoContext(val); setPage(1); }}
                    placeholder="Select repository to manage issues..."
                    showBranchSelector={false}
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
                                <CheckCircle2 className="h-4 w-4 text-brand" />
                                Open
                            </div>
                        </button>
                        <button
                            onClick={() => { setFilterState('closed'); setPage(1); }}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${filterState === 'closed' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-purple-500" />
                                Closed
                            </div>
                        </button>
                    </div>
                    <button onClick={fetchIssues} className="p-2 hover:bg-muted rounded-md" title="Refresh">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    {selectedIssues.length > 0 && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-5">
                            <span className="text-sm text-muted-foreground">{selectedIssues.length} selected</span>
                            {filterState === 'open' ? (
                                <button
                                    onClick={() => initiateBulkAction('close')}
                                    disabled={!!actionLoading}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-md text-sm font-medium transition-colors"
                                >
                                    {actionLoading === 'close' ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                                    Close Selected
                                </button>
                            ) : (
                                <button
                                    onClick={() => initiateBulkAction('reopen')}
                                    disabled={!!actionLoading}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand/10 text-brand hover:bg-brand/20 rounded-md text-sm font-medium transition-colors"
                                >
                                    {actionLoading === 'reopen' ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                                    Reopen Selected
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
                        checked={issues.length > 0 && selectedIssues.length === issues.length}
                        onChange={toggleAll}
                        className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-muted-foreground">Title</span>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loading && issues.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin" />
                            <p>Loading issues...</p>
                        </div>
                    ) : issues.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
                            <Filter className="h-8 w-8 opacity-20" />
                            <p>No {filterState} issues found.</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {issues.map(issue => (
                                <div key={issue.number} className={`group flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors ${selectedIssues.includes(issue.number) ? 'bg-muted/30' : ''}`}>
                                    <input
                                        type="checkbox"
                                        checked={selectedIssues.includes(issue.number)}
                                        onChange={() => toggleSelection(issue.number)}
                                        className="mt-1 h-4 w-4 rounded border-gray-300"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <a
                                                href={issue.html_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="font-medium hover:text-brand hover:underline break-words"
                                            >
                                                {issue.title}
                                            </a>
                                            {issue.labels.map(label => (
                                                <span
                                                    key={label.name}
                                                    className="px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0"
                                                    style={{ backgroundColor: `#${label.color}`, borderColor: `#${label.color}40`, color: getContrastColor(label.color) }}
                                                >
                                                    {label.name}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                                            <span>#{issue.number} opened by {issue.user.login}</span>
                                            <span>•</span>
                                            <span>{new Date(issue.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    {}
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => openBranchModal(issue)}
                                            className="p-2 hover:bg-background rounded-full border shadow-sm transition-all text-muted-foreground hover:text-brand"
                                            title="Create Git Branch for this Issue"
                                        >
                                            <GitBranch className="h-4 w-4" />
                                        </button>
                                        <a
                                            href={issue.html_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 hover:bg-background rounded-full border shadow-sm transition-all"
                                            title="Open on GitHub"
                                        >
                                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                        </a>
                                    </div>
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
                        disabled={issues.length < 30 || loading}
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
                title={`Confirm ${confirmModal.action === 'close' ? 'Close' : 'Reopen'}`}
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
                            className={`px-4 py-2 rounded-md text-white text-sm font-medium ${confirmModal.action === 'close' ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90'}`}
                        >
                            Yes, {confirmModal.action} {confirmModal.count} issues
                        </button>
                    </>
                }
            >
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 text-amber-500 bg-amber-500/10 p-3 rounded-lg">
                        <AlertTriangle className="h-5 w-5" />
                        <p className="text-sm font-medium">This action will affect {confirmModal.count} issues.</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Are you sure you want to {confirmModal.action} the selected issues?
                        {confirmModal.action === 'close' && " They will be marked as completed."}
                    </p>
                </div>
            </Modal>

            {}
            <Modal
                isOpen={branchModalOpen}
                onClose={() => setBranchModalOpen(false)}
                title="Create Branch from Issue"
                maxWidth="max-w-xl"
                footer={
                    branchCreatedName ? (
                        <button
                            onClick={() => setBranchModalOpen(false)}
                            className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium"
                        >
                            Done
                        </button>
                    ) : (
                        <div className="flex justify-end gap-2 w-full">
                            <button
                                onClick={() => setBranchModalOpen(false)}
                                className="px-4 py-2 rounded-md hover:bg-muted text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createBranch}
                                disabled={isCreatingBranch || !newBranchName || !sourceBranch}
                                className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium flex items-center gap-2"
                            >
                                {isCreatingBranch ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />}
                                Create Branch
                            </button>
                        </div>
                    )
                }
            >
                <div className="flex flex-col gap-4">
                    {!branchCreatedName ? (
                        <>
                            <div className="p-3 bg-muted/30 rounded-md border text-sm">
                                <span className="font-medium">Issue:</span> #{targetIssue?.number} {targetIssue?.title}
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground">Source Branch</label>
                                    <select
                                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                        value={sourceBranch}
                                        onChange={(e) => setSourceBranch(e.target.value)}
                                        disabled={loadingBranches || isCreatingBranch}
                                    >
                                        {branches.map(b => (
                                            <option key={b} value={b}>{b}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground">New Branch Name</label>
                                    <input
                                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                        value={newBranchName}
                                        onChange={(e) => setNewBranchName(e.target.value)}
                                        placeholder="feature/issue-slug"
                                        disabled={isCreatingBranch}
                                    />
                                </div>
                            </div>

                            {branchCreationError && (
                                <div className="text-xs text-destructive bg-destructive/10 p-2 rounded flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4" />
                                    {branchCreationError}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-brand/10 rounded-lg p-4 space-y-3 border border-brand/20">
                                <div className="flex items-center gap-2 text-brand font-medium text-sm">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Branch created successfully!
                                </div>
                                <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground">Run this in your terminal:</p>
                                    <div className="bg-black/90 text-white p-3 rounded-md font-mono text-xs flex items-center justify-between group">
                                        <span>git fetch origin && git checkout {branchCreatedName}</span>
                                        <button
                                            onClick={() => copyToClipboard(`git fetch origin && git checkout ${branchCreatedName}`)}
                                            className="opacity-50 hover:opacity-100 transition-opacity"
                                        >
                                            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="pt-2">
                                    <a
                                        href={`https://github.com/${localRepoContext}/tree/${branchCreatedName}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs flex items-center gap-1 text-brand hover:underline"
                                    >
                                        View branch on GitHub <ExternalLink className="h-3 w-3" />
                                    </a>
                                </div>
                            </div>
                        </div>
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
