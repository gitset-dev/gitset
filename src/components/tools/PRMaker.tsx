import React, { useState, useEffect } from 'react';
import { RepositorySelector } from '../RepositorySelector';
import { ghFetch } from '@/lib/githubProxy';
import { BranchSelector } from '../BranchSelector';
import { TemplateEditorModal } from '../TemplateEditorModal';
import { LabelManagerModal } from '../LabelManagerModal';
import { PRManager } from './PRManager';
import { Modal } from '../Modal';
import { LayoutTemplate, Loader2, Copy, Check, Sparkles, History, Github, Tag, User as UserIcon, Calendar, ListTodo, ExternalLink, CheckCircle2, FileDiff, AlertTriangle, GitPullRequest, RefreshCw, Hash, X } from 'lucide-react';
import { fetchAllBranches } from '@/lib/github';
import ToolErrorNotice from './ToolErrorNotice';
import CollapsibleComposer from './CollapsibleComposer';

interface User {
    gitsetKey: string;
    githubOauthToken?: string | null;
    plan?: string;
}

interface PRMakerProps {
    user: User;
}

interface Version {
    version: number;
    title: string;
    body: string;
    prompt: string;
    timestamp: number;
}

interface Metadata {
    labels: any[];
    assignees: any[];
    milestones: any[];
}

export function PRMaker({ user }: PRMakerProps) {
    const [mode, setMode] = useState<'maker' | 'manager'>('maker');

    const [repo, setRepo] = useState('');
    const [headBranch, setHeadBranch] = useState('');
    const [baseBranch, setBaseBranch] = useState('');
    const [baseBranches, setBaseBranches] = useState<string[]>([]);
    const [description, setDescription] = useState('');
    const [diff, setDiff] = useState('');
    const [customTemplate, setCustomTemplate] = useState('');

    const [metadata, setMetadata] = useState<Metadata>({ labels: [], assignees: [], milestones: [] });
    const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
    const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
    const [selectedReviewers, setSelectedReviewers] = useState<string[]>([]);
    const [selectedMilestone, setSelectedMilestone] = useState<number | null>(null);
    const [isDraft, setIsDraft] = useState(false);
    const [metadataLoading, setMetadataLoading] = useState(false);

    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
    const [successModal, setSuccessModal] = useState<{ isOpen: boolean; url: string }>({ isOpen: false, url: '' });

    const [loading, setLoading] = useState(false);
    const [diffLoading, setDiffLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [draftId, setDraftId] = useState<string | null>(null);
    const [diffStatus, setDiffStatus] = useState<{ type: 'success' | 'warning' | 'error' | 'neutral', message: string, detail?: string } | null>(null);

    const [versions, setVersions] = useState<Version[]>([]);
    const [selectedVersionIndex, setSelectedVersionIndex] = useState<number>(-1);

    const [refinementPrompt, setRefinementPrompt] = useState('');
    const [refining, setRefining] = useState(false);

    const [editedTitle, setEditedTitle] = useState('');
    const [editedBody, setEditedBody] = useState('');

    const [copiedBody, setCopiedBody] = useState(false);
    const [creatingPR, setCreatingPR] = useState(false);
    const [prCreatedUrl, setPrCreatedUrl] = useState<string | null>(null);

    const currentVersion = selectedVersionIndex >= 0 ? versions[selectedVersionIndex] : null;

    useEffect(() => {
        if (currentVersion) {
            setEditedTitle(currentVersion.title);
            setEditedBody(currentVersion.body);
        }
    }, [currentVersion]);

    useEffect(() => {
        if (repo) {
            fetchMetadata();
            fetchBranches();
        }
    }, [repo]);

    const fetchBranches = async () => {
        if (!user.githubOauthToken || !repo.includes('/')) return;
        try {
            let defaultBranchName = 'main';
            try {
                const repoRes = await ghFetch(`/repos/${repo}`, {
                    headers: {
                        Accept: "application/vnd.github.v3+json",
                    },
                });
                if (repoRes.ok) {
                    const repoData = await repoRes.json();
                    defaultBranchName = repoData.default_branch;
                }
            } catch (err) {
                console.error("Error fetching repo details, defaulting to main", err);
            }

            const [owner, repoName] = repo.split('/');
            if (!owner || !repoName) return;

            const branchNames = await fetchAllBranches(owner, repoName, user.githubOauthToken);

            if (!branchNames.includes(defaultBranchName)) {
                branchNames.unshift(defaultBranchName);
            }

            setBaseBranches(branchNames);
            setBaseBranch(defaultBranchName);
        } catch (e) {
            console.error("Failed to fetch branches", e);
        }
    };

    const fetchMetadata = async () => {
        setMetadataLoading(true);
        try {
            const [owner, repoName] = repo.split('/');
            if (!owner || !repoName) return;

            const backendUrl = '/api/pr';
            const [labelsRes, assigneesRes, milestonesRes] = await Promise.all([
                fetch(backendUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'list_labels', owner, repo: repoName }) }),
                fetch(backendUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'list_assignees', owner, repo: repoName }) }),
                fetch(backendUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'list_milestones', owner, repo: repoName }) })
            ]);

            const labels = await labelsRes.json();
            const assignees = await assigneesRes.json();
            const milestones = await milestonesRes.json();

            setMetadata({
                labels: Array.isArray(labels) ? labels : [],
                assignees: Array.isArray(assignees) ? assignees : [],
                milestones: Array.isArray(milestones) ? milestones : []
            });
        } catch (err) {
            console.error("Failed to fetch metadata", err);
        } finally {
            setMetadataLoading(false);
        }
    };

    const fetchDiff = async () => {
        if (!repo || !headBranch || !baseBranch) return;
        setDiffLoading(true);
        setDiffStatus(null);
        setDiff('');

        try {
            const compareRes = await ghFetch(`/repos/${repo}/compare/${baseBranch}...${headBranch}`, {
                headers: {
                    Accept: "application/vnd.github.v3+json",
                },
            });

            if (!compareRes.ok) throw new Error("Failed to compare branches");
            const compareData = await compareRes.json();

            if (compareData.ahead_by > 0) {
                setDiffStatus({
                    type: 'success',
                    message: 'Ready to PR',
                    detail: `Found ${compareData.ahead_by} commits${compareData.behind_by > 0 ? ` (and ${compareData.behind_by} commits behind)` : ''}.`
                });

                const diffRes = await ghFetch(`/repos/${repo}/compare/${baseBranch}...${headBranch}`, {
                    headers: {
                        Accept: "application/vnd.github.v3.diff",
                    },
                });

                if (diffRes.ok) {
                    const diffText = await diffRes.text();
                    setDiff(diffText);
                }
            } else if (compareData.behind_by > 0) {
                setDiffStatus({
                    type: 'warning',
                    message: 'Branch is behind',
                    detail: `Your branch is ${compareData.behind_by} commits behind ${baseBranch}.`
                });
            } else {
                setDiffStatus({
                    type: 'neutral',
                    message: 'No changes detected',
                    detail: 'The branches are identical.'
                });
            }
        } catch (e: any) {
            setDiffStatus({
                type: 'error',
                message: 'Error checking changes',
                detail: e.message
            });
        } finally {
            setDiffLoading(false);
        }
    };

    useEffect(() => {
        if (repo && headBranch && baseBranch && headBranch !== baseBranch) {
            fetchDiff();
        }
    }, [repo, headBranch, baseBranch]);

    const handleGenerate = async () => {
        setError(null);

        if (!description && !diff) {
            if (!repo || !headBranch || !baseBranch) {
                setError("Please select the repository and branches to compare. Either code changes or a description are required to generate the PR.");
            } else if (diffStatus?.type === 'neutral') {
                setError("No code changes detected between these branches. Please provide a description to generate the PR.");
            } else {
                setError("Unable to access the code changes (diff). Please provide a description so the AI has context to generate the PR.");
            }
            return;
        }

        const MAX_DESCRIPTION_LENGTH = 50000;
        const MAX_DIFF_LENGTH = 500000;

        if (description.length > MAX_DESCRIPTION_LENGTH) {
            setError(`Description is too large (max ${MAX_DESCRIPTION_LENGTH.toLocaleString()} characters). Please reduce size.`);
            return;
        }
        if (diff.length > MAX_DIFF_LENGTH) {
            setError(`The diff is too large (>${Math.floor(MAX_DIFF_LENGTH / 1000)}KB) to process safely. Please try a smaller PR or provide a description manually.`);
            return;
        }

        setLoading(true);
        setVersions([]);
        setSelectedVersionIndex(-1);
        setDraftId(null);
        setPrCreatedUrl(null);

        try {
            const response = await fetch('/api/pr', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "generate",
                    description: description,
                    diff: diff,
                    repoContext: repo,
                    custom_template: customTemplate || undefined,
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                const error = new Error(data.error || "Failed to generate PR");
                throw error;
            }

            const initialVersion: Version = {
                version: 1,
                title: data.title,
                body: data.body,
                prompt: "Initial Generation",
                timestamp: Date.now()
            };

            setVersions([initialVersion]);
            setSelectedVersionIndex(0);
            setDraftId(data.draftId);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRefine = async () => {
        if (!refinementPrompt.trim() || !draftId || !currentVersion) return;
        setRefining(true);
        setError(null);

        try {
            const response = await fetch('/api/pr', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "refine",
                    draftId: draftId,
                    field: 'description',
                    currentContent: editedBody,
                    instruction: refinementPrompt,
                    fullContext: {
                        title: editedTitle,
                        body: editedBody
                    },
                    custom_template: customTemplate || undefined
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                const error = new Error(data.error || "Failed to refine PR");
                throw error;
            }

            const newVersion: Version = {
                version: data.version,
                title: editedTitle,
                body: data.content,
                prompt: refinementPrompt,
                timestamp: Date.now()
            };

            setVersions(prev => [...prev, newVersion]);
            setSelectedVersionIndex(versions.length);
            setRefinementPrompt('');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setRefining(false);
        }
    };

    const handleCreatePR = async () => {
        if (!repo || !editedTitle || !editedBody || !headBranch || !baseBranch) return;
        setCreatingPR(true);
        try {
            const [owner, repoName] = repo.split('/');
            const response = await fetch('/api/pr', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "create_pr",
                    owner,
                    repo: repoName,
                    title: editedTitle,
                    body: editedBody,
                    head: headBranch,
                    base: baseBranch,
                    draft: isDraft,
                    labels: selectedLabels,
                    assignees: selectedAssignees,
                    reviewers: selectedReviewers,
                    milestone: selectedMilestone
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                const error = new Error(data.error || "Failed to create PR");
                throw error;
            }

            setPrCreatedUrl(data.html_url);
            setSuccessModal({ isOpen: true, url: data.html_url });
        } catch (err: any) {
            alert(`Error creating PR: ${err.message}`);
        } finally {
            setCreatingPR(false);
        }
    };

    const copyToClipboard = (text: string, setCopied: (val: boolean) => void) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const resetForm = () => {
        setRepo('');
        setHeadBranch('');
        setBaseBranch('');
        setDescription('');
        setDiff('');
        setCustomTemplate('');
        setMetadata({ labels: [], assignees: [], milestones: [] });
        setSelectedLabels([]);
        setSelectedAssignees([]);
        setSelectedReviewers([]);
        setSelectedMilestone(null);
        setIsDraft(false);
        setVersions([]);
        setSelectedVersionIndex(-1);
        setDraftId(null);
        setPrCreatedUrl(null);
        setDiffStatus(null);
        setEditedTitle('');
        setEditedBody('');
    };

    return (
        <div className="flex flex-col h-full gap-6">
            {}
            <div className="flex items-center gap-4 border-b pb-4 justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setMode('maker')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${mode === 'maker' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                    >
                        <Sparkles className="h-4 w-4" />
                        Composer
                    </button>
                    <button
                        onClick={() => setMode('manager')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${mode === 'manager' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                    >
                        <ListTodo className="h-4 w-4" />
                        Manager
                    </button>
                </div>
                <button
                    onClick={resetForm}
                    className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Reset Form"
                >
                    <RefreshCw className="h-4 w-4" />
                </button>
            </div>

            {mode === 'manager' ? (
                <PRManager user={user} backendUrl="/api/pr" repoContext={repo} />
            ) : (
                <div className="grid gap-8 lg:grid-cols-2 h-full">
                    {}
                    <div className="space-y-6 flex flex-col">
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none">
                                Repository & Head Branch (Source)
                            </label>
                            <RepositorySelector
                                githubToken={user.githubOauthToken}
                                value={repo}
                                onChange={setRepo}
                                branchValue={headBranch}
                                onBranchChange={setHeadBranch}
                                showBranchSelector={true}
                                placeholder="Select or enter repository (owner/repo)"
                            />
                        </div>

                        <div className="space-y-2 min-w-0">
                            <label className="text-sm font-medium leading-none">Base Branch (Target)</label>
                            <BranchSelector
                                value={baseBranch}
                                onChange={setBaseBranch}
                                branches={baseBranches}
                                placeholder="Select base branch..."
                                disabled={!repo || baseBranches.length === 0}
                            />
                        </div>

                        {diffStatus && (
                            <div className={`rounded-md border p-3 text-sm flex items-start gap-3 ${diffStatus.type === 'warning' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-200' :
                                diffStatus.type === 'success' ? 'bg-brand/10 text-brand border-brand/20' :
                                    diffStatus.type === 'error' ? 'bg-red-500/10 text-red-600 border-red-200' :
                                        'bg-muted/50 text-muted-foreground border-border'
                                }`}>
                                {diffStatus.type === 'warning' ? <AlertTriangle className="h-5 w-5 shrink-0" /> :
                                    diffStatus.type === 'success' ? <CheckCircle2 className="h-5 w-5 shrink-0" /> :
                                        diffStatus.type === 'error' ? <AlertTriangle className="h-5 w-5 shrink-0" /> :
                                            <Loader2 className="h-5 w-5 shrink-0" />}
                                <div>
                                    <p className="font-semibold">{diffStatus.message}</p>
                                    <p>{diffStatus.detail}</p>
                                </div>
                            </div>
                        )}

                        {}
                        {repo && (
                            <div className="p-4 border rounded-lg bg-card/50 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold flex items-center gap-2">
                                        <Tag className="h-4 w-4" /> Metadata
                                    </h3>
                                    <button
                                        onClick={() => setIsLabelModalOpen(true)}
                                        className="h-6 px-2 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5"
                                        title="Manage Labels"
                                    >
                                        <Hash className="h-3 w-3" />
                                        Manage
                                    </button>
                                </div>

                                {selectedLabels.length > 0 && (
                                    <div className="mb-4 space-y-2 p-2 bg-muted/30 rounded border">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-medium text-muted-foreground">Selected ({selectedLabels.length})</label>
                                            <button onClick={() => setSelectedLabels([])} className="text-[10px] text-muted-foreground hover:text-foreground">Clear all</button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedLabels.map(labelName => {
                                                const label = metadata.labels.find(l => l.name === labelName);
                                                if (!label) return null;
                                                return (
                                                    <button
                                                        key={label.name}
                                                        onClick={() => setSelectedLabels(prev => prev.filter(l => l !== label.name))}
                                                        className="px-2 py-0.5 rounded-full text-xs border flex items-center gap-1 hover:opacity-80 transition-opacity"
                                                        style={{ backgroundColor: `#${label.color}`, borderColor: `#${label.color}40`, color: getContrastColor(label.color) }}
                                                    >
                                                        {label.name}
                                                        <X className="h-3 w-3 opacity-50 hover:opacity-100" />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-medium text-muted-foreground">Labels</label>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {metadata.labels.map(label => (
                                            <button
                                                key={label.id}
                                                onClick={() => setSelectedLabels(prev => prev.includes(label.name) ? prev.filter(l => l !== label.name) : [...prev, label.name])}
                                                className={`px-2 py-0.5 rounded-full text-xs border transition-all ${selectedLabels.includes(label.name) ? 'ring-2 ring-brand ring-offset-1' : 'opacity-70 hover:opacity-100'}`}
                                                style={{ backgroundColor: `#${label.color}`, borderColor: `#${label.color}40`, color: getContrastColor(label.color) }}
                                            >
                                                {label.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {}
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground">Assignees</label>
                                    <div className="grid grid-cols-1 gap-1 max-h-[160px] overflow-y-auto pr-1 border rounded-md p-1 bg-background/50">
                                        {metadata.assignees.length === 0 ? (
                                            <p className="text-xs text-muted-foreground p-2 text-center">No assignees found.</p>
                                        ) : (
                                            metadata.assignees.map((user: any) => (
                                                <button
                                                    key={user.login}
                                                    onClick={() => setSelectedAssignees(prev => prev.includes(user.login) ? prev.filter(l => l !== user.login) : [...prev, user.login])}
                                                    className={`flex items-center gap-2 p-1.5 rounded-sm text-sm transition-all w-full text-left ${selectedAssignees.includes(user.login)
                                                        ? 'bg-accent text-accent-foreground font-medium'
                                                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                                                        }`}
                                                >
                                                    <div className="relative h-5 w-5 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0 border border-border">
                                                        {user.avatar_url ? (
                                                            <img src={user.avatar_url} alt={user.login} className="h-full w-full object-cover" />
                                                        ) : (
                                                            <UserIcon className="h-3 w-3 text-muted-foreground" />
                                                        )}
                                                    </div>
                                                    <span className="truncate flex-1">{user.login}</span>
                                                    {selectedAssignees.includes(user.login) && (
                                                        <Check className="h-3.5 w-3.5 shrink-0" />
                                                    )}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {}
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground">Reviewers</label>
                                    <div className="grid grid-cols-1 gap-1 max-h-[160px] overflow-y-auto pr-1 border rounded-md p-1 bg-background/50">
                                        {metadata.assignees.length === 0 ? (
                                            <p className="text-xs text-muted-foreground p-2 text-center">No reviewers found.</p>
                                        ) : (
                                            metadata.assignees.map((user: any) => (
                                                <button
                                                    key={user.login}
                                                    onClick={() => setSelectedReviewers(prev => prev.includes(user.login) ? prev.filter(l => l !== user.login) : [...prev, user.login])}
                                                    className={`flex items-center gap-2 p-1.5 rounded-sm text-sm transition-all w-full text-left ${selectedReviewers.includes(user.login)
                                                        ? 'bg-accent text-accent-foreground font-medium'
                                                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                                                        }`}
                                                >
                                                    <div className="relative h-5 w-5 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0 border border-border">
                                                        {user.avatar_url ? (
                                                            <img src={user.avatar_url} alt={user.login} className="h-full w-full object-cover" />
                                                        ) : (
                                                            <UserIcon className="h-3 w-3 text-muted-foreground" />
                                                        )}
                                                    </div>
                                                    <span className="truncate flex-1">{user.login}</span>
                                                    {selectedReviewers.includes(user.login) && (
                                                        <Check className="h-3.5 w-3.5 shrink-0" />
                                                    )}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {}
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground">Milestone</label>
                                    <select
                                        className="w-full rounded-md border bg-background px-3 py-1 text-sm"
                                        value={selectedMilestone || ''}
                                        onChange={(e) => setSelectedMilestone(e.target.value ? Number(e.target.value) : null)}
                                    >
                                        <option value="">No Milestone</option>
                                        {metadata.milestones.map(m => (
                                            <option key={m.number} value={m.number}>{m.title}</option>
                                        ))}
                                    </select>
                                </div>

                                {}
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="draft-checkbox"
                                        checked={isDraft}
                                        onChange={(e) => setIsDraft(e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300"
                                    />
                                    <label htmlFor="draft-checkbox" className="text-xs font-medium text-muted-foreground cursor-pointer">
                                        Create as draft
                                    </label>
                                </div>
                            </div>
                        )}

                        <div className="flex w-full items-center justify-between gap-4">
                            <div className="flex-1 w-full">
                                <button
                                    onClick={() => setIsTemplateModalOpen(true)}
                                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 w-full"
                                    type="button"
                                >
                                    <LayoutTemplate className="h-4 w-4" />
                                    Manage Templates
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none">
                                PR Description / Context (Optional)
                            </label>
                            <CollapsibleComposer collapsed={loading || Boolean(currentVersion) || Boolean(error)} dimmed={loading}>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Briefly describe what this PR does..."
                                    disabled={loading}
                                    className="field-sizing-content flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none"
                                ></textarea>
                            </CollapsibleComposer>
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={loading}
                            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 w-full disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                            Generate PR Description
                        </button>
                    </div>

                    {}
                    <div className="space-y-6 flex flex-col h-full">
                        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm h-full flex flex-col overflow-hidden">
                            <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
                                <h3 className="font-semibold leading-none tracking-tight flex items-center gap-2">
                                    Generated PR
                                    {versions.length > 1 && (
                                        <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
                                            v{currentVersion?.version}
                                        </span>
                                    )}
                                </h3>
                                <div className="flex gap-2">
                                    {currentVersion && repo && headBranch && baseBranch && (
                                        <button
                                            onClick={handleCreatePR}
                                            disabled={creatingPR}
                                            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3"
                                        >
                                            {creatingPR ? <Loader2 className="h-3 w-3 animate-spin" /> : <Github className="h-3 w-3" />}
                                            Create on GitHub
                                        </button>
                                    )}
                                    {currentVersion && (
                                        <button
                                            onClick={() => copyToClipboard(currentVersion.body, setCopiedBody)}
                                            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3"
                                        >
                                            {copiedBody ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                            Copy
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 bg-muted/30 relative group flex flex-col min-h-[400px]">
                                {loading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="h-8 w-8 animate-spin text-brand" />
                                            <p className="text-sm text-muted-foreground">Analyzing changes...</p>
                                        </div>
                                    </div>
                                )}

                                {!currentVersion && !loading && !error && (
                                    <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-8 flex-1">
                                        <GitPullRequest className="h-12 w-12 mb-4 opacity-20" />
                                        <p>Fill in the details and generate your PR description.</p>
                                    </div>
                                )}

                                {error && !loading && (
                                    <div className="h-full flex items-center justify-center p-8 flex-1">
                                        <ToolErrorNotice error={error} />
                                    </div>
                                )}

                                {currentVersion && !loading && (
                                    <div className="flex flex-col h-full">
                                        {}
                                        {prCreatedUrl && (
                                            <div className="bg-brand/10 border-b border-brand/20 p-3 flex items-center justify-between animate-in slide-in-from-top-2">
                                                <div className="flex items-center gap-2 text-brand">
                                                    <CheckCircle2 className="h-4 w-4" />
                                                    <span className="text-sm font-medium">PR created successfully!</span>
                                                </div>
                                                <a
                                                    href={prCreatedUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-md hover:bg-primary/90 flex items-center gap-1"
                                                >
                                                    View PR <ExternalLink className="h-3 w-3" />
                                                </a>
                                            </div>
                                        )}

                                        {}
                                        {versions.length > 0 && (
                                            <div className="flex items-center gap-1 p-2 border-b border-border bg-background/50 overflow-x-auto">
                                                <History className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
                                                {versions.map((v, idx) => (
                                                    <button
                                                        key={v.version}
                                                        onClick={() => setSelectedVersionIndex(idx)}
                                                        className={`px-3 py-1 text-xs rounded-full transition-colors whitespace-nowrap ${selectedVersionIndex === idx
                                                            ? 'bg-primary text-primary-foreground font-medium'
                                                            : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                                                            }`}
                                                    >
                                                        v{v.version} {v.version === 1 ? '(Original)' : ''}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        <div className="p-4 flex-1 overflow-auto">
                                            <div className="mb-4">
                                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Title</label>
                                                <input
                                                    value={editedTitle}
                                                    onChange={(e) => setEditedTitle(e.target.value)}
                                                    className="w-full font-semibold text-lg mt-1 bg-transparent border-b border-transparent hover:border-border focus:border-brand focus:outline-none px-1"
                                                />
                                            </div>
                                            <div className="flex-1 flex flex-col">
                                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Body</label>
                                                <textarea
                                                    value={editedBody}
                                                    onChange={(e) => setEditedBody(e.target.value)}
                                                    className="field-sizing-content flex-1 font-mono text-sm whitespace-pre-wrap p-4 rounded-md bg-background border border-border overflow-auto resize-none focus:outline-none focus:ring-1 focus:ring-brand min-h-[400px]"
                                                />
                                                <div className="text-xs text-muted-foreground text-right mt-1 px-1">
                                                    {editedBody.length} chars
                                                </div>
                                            </div>
                                        </div>

                                        {}
                                        <div className="p-4 border-t border-border bg-background">
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-sm font-medium">Refine Description</label>
                                                </div>
                                                <div className="flex gap-2">
                                                    <input
                                                        value={refinementPrompt}
                                                        onChange={(e) => setRefinementPrompt(e.target.value)}
                                                        placeholder="e.g. Make it more technical, Add testing section..."
                                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                                e.preventDefault();
                                                                handleRefine();
                                                            }
                                                        }}
                                                    />
                                                    <button
                                                        onClick={handleRefine}
                                                        disabled={refining || !refinementPrompt.trim()}
                                                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 h-9 px-4 py-2"
                                                    >
                                                        {refining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                                        Refine
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <TemplateEditorModal
                        isOpen={isTemplateModalOpen}
                        onClose={() => setIsTemplateModalOpen(false)}
                        onApply={(content) => {
                            setCustomTemplate(content);
                            setIsTemplateModalOpen(false);
                        }}
                        type="pr"
                        gitsetKey={user.gitsetKey}
                        backendUrl=""
                    />

                    <LabelManagerModal
                        isOpen={isLabelModalOpen}
                        onClose={() => setIsLabelModalOpen(false)}
                        backendUrl="/api/pr"
                        repoContext={repo}
                        onLabelsChange={fetchMetadata}
                        gitsetKey={user.gitsetKey}
                    />

                    {}
                    <Modal
                        isOpen={successModal.isOpen}
                        onClose={() => setSuccessModal({ isOpen: false, url: '' })}
                        title="PR Created Successfully!"
                        footer={
                            <button
                                onClick={() => setSuccessModal({ isOpen: false, url: '' })}
                                className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium"
                            >
                                Close
                            </button>
                        }
                    >
                        <div className="flex flex-col items-center gap-4 py-4 text-center">
                            <div className="h-12 w-12 rounded-full bg-brand/10 flex items-center justify-center text-brand">
                                <CheckCircle2 className="h-6 w-6" />
                            </div>
                            <div className="space-y-2">
                                <p className="text-lg font-medium">Your pull request has been created on GitHub.</p>
                                <p className="text-sm text-muted-foreground">You can view it by clicking the link below.</p>
                            </div>
                            <a
                                href={successModal.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-brand hover:underline font-medium p-2 bg-muted/50 rounded-md border w-full justify-center"
                            >
                                {successModal.url}
                                <ExternalLink className="h-4 w-4" />
                            </a>
                        </div>
                    </Modal>
                </div>
            )}
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
