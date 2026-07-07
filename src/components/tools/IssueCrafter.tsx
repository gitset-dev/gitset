import React, { useState, useRef, useEffect } from 'react';
import { RepositorySelector } from '../RepositorySelector';
import { ghFetch } from '@/lib/githubProxy';
import { TemplateEditorModal } from '../TemplateEditorModal';
import { LabelManagerModal } from '../LabelManagerModal';
import { IssueManager } from './IssueManager';
import { Modal } from '../Modal';
import { LayoutTemplate, Loader2, Copy, Check, RefreshCw, ArrowRight, Sparkles, History, Github, Tag, User as UserIcon, Calendar, ListTodo, ExternalLink, CheckCircle2, GitBranch, Terminal, Hash, X } from 'lucide-react';
import { fetchAllBranches } from '@/lib/github';
import ToolErrorNotice from './ToolErrorNotice';
import CollapsibleComposer from './CollapsibleComposer';

interface User {
    gitsetKey: string;
    githubOauthToken?: string | null;
    plan?: string;
}

interface IssueCrafterProps {
    user: User;
    backendUrl: string;
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

export function IssueCrafter({ user, backendUrl }: IssueCrafterProps) {
    const [mode, setMode] = useState<'crafter' | 'manager'>('crafter');

    const [description, setDescription] = useState('');
    const [repoContext, setRepoContext] = useState('');
    const [customTemplate, setCustomTemplate] = useState('');
    const [generationMode, setGenerationMode] = useState<'auto' | 'manual'>('auto');
    const [manualTitle, setManualTitle] = useState('');
    const [manualBody, setManualBody] = useState('');

    const [metadata, setMetadata] = useState<Metadata>({ labels: [], assignees: [], milestones: [] });
    const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
    const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
    const [selectedMilestone, setSelectedMilestone] = useState<number | null>(null);
    const [metadataLoading, setMetadataLoading] = useState(false);

    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
    const [successModal, setSuccessModal] = useState<{ isOpen: boolean; url: string; issueNumber?: number }>({ isOpen: false, url: '' });

    const [issueNumber, setIssueNumber] = useState<number | null>(null);
    const [issueNodeId, setIssueNodeId] = useState<string | null>(null);
    const [branches, setBranches] = useState<string[]>([]);
    const [sourceBranch, setSourceBranch] = useState('main');
    const [newBranchName, setNewBranchName] = useState('');
    const [isCreatingBranch, setIsCreatingBranch] = useState(false);
    const [branchCreationError, setBranchCreationError] = useState<string | null>(null);
    const [branchCreatedName, setBranchCreatedName] = useState<string | null>(null);
    const [loadingBranches, setLoadingBranches] = useState(false);
    const [branchCommandCopied, setBranchCommandCopied] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [draftId, setDraftId] = useState<string | null>(null);

    const [versions, setVersions] = useState<Version[]>([]);
    const [selectedVersionIndex, setSelectedVersionIndex] = useState<number>(-1);

    const [refinementPrompt, setRefinementPrompt] = useState('');
    const [refining, setRefining] = useState(false);

    const [editedTitle, setEditedTitle] = useState('');
    const [editedBody, setEditedBody] = useState('');

    const [copiedBody, setCopiedBody] = useState(false);
    const [creatingIssue, setCreatingIssue] = useState(false);
    const [issueCreatedUrl, setIssueCreatedUrl] = useState<string | null>(null);

    const currentVersion = selectedVersionIndex >= 0 ? versions[selectedVersionIndex] : null;

    useEffect(() => {
        if (currentVersion) {
            setEditedTitle(currentVersion.title);
            setEditedBody(currentVersion.body);
        }
    }, [currentVersion]);

    useEffect(() => {
        if (repoContext) {
            fetchMetadata();
        }
    }, [repoContext]);

    const fetchMetadata = async () => {
        setMetadataLoading(true);
        try {
            const [owner, repo] = repoContext.split('/');
            if (!owner || !repo) {
                console.error("Invalid repository format");
                return;
            }

            const [labelsRes, assigneesRes, milestonesRes] = await Promise.all([
                fetch(backendUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'list_labels', owner, repo }) }),
                fetch(backendUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'list_assignees', owner, repo }) }),
                fetch(backendUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'list_milestones', owner, repo }) })
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

    const handleManualDraft = () => {
        if (!manualTitle.trim() || !manualBody.trim()) {
            setError("Please provide both a title and a body for the manual draft.");
            return;
        }

        setError(null);
        setVersions([]);
        setSelectedVersionIndex(-1);
        setDraftId(null);
        setIssueCreatedUrl(null);

        const initialVersion: Version = {
            version: 1,
            title: manualTitle,
            body: manualBody,
            prompt: "Manual Entry",
            timestamp: Date.now()
        };

        setVersions([initialVersion]);
        setSelectedVersionIndex(0);
    };

    const handleGenerate = async () => {
        if (generationMode === 'manual') {
            handleManualDraft();
            return;
        }

        if (!description.trim()) {
            setError("Please provide an issue description");
            return;
        }

        const MAX_DESCRIPTION_LENGTH = 100000;

        if (description.length > MAX_DESCRIPTION_LENGTH) {
            setError(`Description is too large (max ${MAX_DESCRIPTION_LENGTH.toLocaleString()} characters). Please reduce the size to prevent processing errors.`);
            return;
        }

        setLoading(true);
        setError(null);
        setVersions([]);
        setSelectedVersionIndex(-1);
        setDraftId(null);
        setIssueCreatedUrl(null);
        try {
            const response = await fetch(backendUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "generate",
                    description: description,
                    repoContext: repoContext,
                    custom_template: customTemplate || undefined,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                const error = new Error(data.error || "Failed to generate Issue");
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
            const response = await fetch(backendUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "refine",
                    draftId: draftId,
                    field: 'description',
                    currentContent: editedBody,
                    instruction: refinementPrompt,
                    fullIssueContext: {
                        title: editedTitle,
                        body: editedBody
                    },
                    custom_template: customTemplate || undefined
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                const error = new Error(data.error || "Failed to refine Issue");
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

    const handleCreateIssue = async () => {
        if (!repoContext || !editedTitle || !editedBody) return;
        setCreatingIssue(true);
        try {
            const [owner, repo] = repoContext.split('/');
            const response = await fetch(backendUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "create_issue",
                    owner,
                    repo,
                    title: editedTitle,
                    body: editedBody,
                    labels: selectedLabels,
                    assignees: selectedAssignees,
                    milestone: selectedMilestone
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                const error = new Error(data.error || "Failed to create issue");
                throw error;
            }

            setIssueCreatedUrl(data.html_url);
            setIssueNumber(data.number);
            setIssueNodeId(data.node_id);
            setSuccessModal({ isOpen: true, url: data.html_url, issueNumber: data.number });

            if (data.number && editedTitle) {
                const slug = editedTitle
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');
                setNewBranchName(`${data.number}-${slug}`);
            }
        } catch (err: any) {
            alert(`Error creating issue: ${err.message}`);
        } finally {
            setCreatingIssue(false);
        }
    };

    const fetchBranches = async () => {
        if (!repoContext || !user.githubOauthToken) return;
        setLoadingBranches(true);
        try {
            const [owner, repo] = repoContext.split('/');
            const branchNames = await fetchAllBranches(owner, repo, user.githubOauthToken);
            setBranches(branchNames);

            const defaultBranch = branchNames.find((b: string) => b === 'main' || b === 'master');
            if (defaultBranch) setSourceBranch(defaultBranch);
            else if (branchNames.length > 0) setSourceBranch(branchNames[0]);
        } catch (err) {
            console.error("Failed to fetch branches", err);
        } finally {
            setLoadingBranches(false);
        }
    };

    useEffect(() => {
        if (successModal.isOpen && repoContext) {
            fetchBranches();
        }
    }, [successModal.isOpen, repoContext]);

    const createBranch = async () => {
        if (!repoContext || !user.githubOauthToken || !sourceBranch || !newBranchName || !issueNodeId) return;

        if (newBranchName.includes(' ') || /[^a-zA-Z0-9._\-/]/.test(newBranchName)) {
            setBranchCreationError("Branch name contains invalid characters");
            return;
        }

        setIsCreatingBranch(true);
        setBranchCreationError(null);
        try {
            const refRes = await ghFetch(`/repos/${repoContext}/git/ref/heads/${sourceBranch}`);
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
                        issueId: issueNodeId,
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

    const copyToClipboard = (text: string, setCopied: (val: boolean) => void) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const resetForm = () => {
        setDescription('');
        setRepoContext('');
        setCustomTemplate('');
        setMetadata({ labels: [], assignees: [], milestones: [] });
        setSelectedLabels([]);
        setSelectedAssignees([]);
        setSelectedMilestone(null);
        setVersions([]);
        setSelectedVersionIndex(-1);
        setDraftId(null);
        setIssueCreatedUrl(null);
        setEditedTitle('');
        setEditedBody('');
        setIssueNumber(null);
        setBranchCreatedName(null);
        setNewBranchName('');
        setBranchCreationError(null);
    };

    return (
        <div className="flex flex-col h-full gap-6">
            {}
            <div className="flex items-center gap-4 border-b pb-4 justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setMode('crafter')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${mode === 'crafter' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
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
                <IssueManager user={user} backendUrl={backendUrl} repoContext={repoContext} />
            ) : (
                <div className="grid gap-8 lg:grid-cols-2 h-full">
                    {}
                    <div className="space-y-6 flex flex-col">
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none">
                                Repository Context
                            </label>
                            <RepositorySelector
                                githubToken={user.githubOauthToken}
                                value={repoContext}
                                onChange={setRepoContext}
                                placeholder="Select or enter repository (owner/repo)"
                                showBranchSelector={false}
                            />
                        </div>

                        {}
                        {repoContext && (
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
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium leading-none">
                                    {generationMode === 'auto' ? 'Issue Description' : 'Issue Details'}
                                </label>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">Mode:</span>
                                    <div className="flex bg-muted rounded-md p-0.5">
                                        <button
                                            onClick={() => setGenerationMode('auto')}
                                            className={`px-2 py-0.5 text-xs rounded-sm transition-all ${generationMode === 'auto' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                        >
                                            Auto
                                        </button>
                                        <button
                                            onClick={() => setGenerationMode('manual')}
                                            className={`px-2 py-0.5 text-xs rounded-sm transition-all ${generationMode === 'manual' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                        >
                                            Manual
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <CollapsibleComposer collapsed={loading}>
                                {generationMode === 'auto' ? (
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Describe the bug or feature request..."
                                        disabled={loading}
                                        className="field-sizing-content flex min-h-[150px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none"
                                    ></textarea>
                                ) : (
                                    <div className="space-y-4">
                                        <input
                                            value={manualTitle}
                                            onChange={(e) => setManualTitle(e.target.value)}
                                            placeholder="Issue Title"
                                            disabled={loading}
                                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                        />
                                        <textarea
                                            value={manualBody}
                                            onChange={(e) => setManualBody(e.target.value)}
                                            placeholder="Issue Body..."
                                            disabled={loading}
                                            className="field-sizing-content flex min-h-[150px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none"
                                        ></textarea>
                                    </div>
                                )}
                            </CollapsibleComposer>
                        </div>
                        <button
                            onClick={handleGenerate}
                            disabled={loading || (generationMode === 'auto' ? !description.trim() : (!manualTitle.trim() || !manualBody.trim()))}
                            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 w-full"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (generationMode === 'auto' ? <Sparkles className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />)}
                            {generationMode === 'auto' ? 'Generate Issue' : 'Draft Issue'}
                        </button>
                    </div>

                    {}
                    <div className="space-y-6 flex flex-col h-full">
                        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm h-full flex flex-col overflow-hidden">
                            <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
                                <h3 className="font-semibold leading-none tracking-tight flex items-center gap-2">
                                    Generated Issue
                                    {versions.length > 1 && (
                                        <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
                                            v{currentVersion?.version}
                                        </span>
                                    )}
                                </h3>
                                <div className="flex gap-2">
                                    {currentVersion && repoContext && (
                                        <button
                                            onClick={handleCreateIssue}
                                            disabled={creatingIssue}
                                            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3"
                                        >
                                            {creatingIssue ? <Loader2 className="h-3 w-3 animate-spin" /> : <Github className="h-3 w-3" />}
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
                                            <p className="text-sm text-muted-foreground">Structuring issue...</p>
                                        </div>
                                    </div>
                                )}

                                {!currentVersion && !loading && !error && (
                                    <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-8 flex-1">
                                        <Sparkles className="h-12 w-12 mb-4 opacity-20" />
                                        <p>Describe the problem and let AI handle the formatting.</p>
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
                                        {issueCreatedUrl && (
                                            <div className="bg-brand/10 border-b border-brand/20 p-3 flex items-center justify-between animate-in slide-in-from-top-2">
                                                <div className="flex items-center gap-2 text-brand">
                                                    <CheckCircle2 className="h-4 w-4" />
                                                    <span className="text-sm font-medium">Issue created successfully!</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    {!branchCreatedName && (
                                                        <button
                                                            onClick={() => setSuccessModal({ isOpen: true, url: issueCreatedUrl || '', issueNumber: issueNumber || undefined })}
                                                            className="text-xs bg-secondary text-secondary-foreground border border-secondary/50 px-2 py-1 rounded-md hover:bg-secondary/80 flex items-center gap-1"
                                                        >
                                                            <GitBranch className="h-3 w-3" />
                                                            Create Branch
                                                        </button>
                                                    )}
                                                    <a
                                                        href={issueCreatedUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-md hover:bg-primary/90 flex items-center gap-1"
                                                    >
                                                        View Issue <ExternalLink className="h-3 w-3" />
                                                    </a>
                                                </div>
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
                                                <div className="relative">
                                                    <textarea
                                                        value={editedBody}
                                                        onChange={(e) => setEditedBody(e.target.value)}
                                                        className="w-full font-mono text-sm whitespace-pre-wrap p-4 rounded-md bg-background border border-border overflow-hidden resize-none focus:outline-none focus:ring-1 focus:ring-brand min-h-[500px] field-sizing-content"
                                                    />
                                                    <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded border border-border">
                                                        {editedBody.length} chars
                                                    </div>
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
                                                        placeholder="e.g. Make it more technical, Add acceptance criteria..."
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
                        type="issue"
                        gitsetKey={user.gitsetKey}
                        backendUrl=""
                    />

                    <LabelManagerModal
                        isOpen={isLabelModalOpen}
                        onClose={() => setIsLabelModalOpen(false)}
                        backendUrl={backendUrl}
                        repoContext={repoContext}
                        onLabelsChange={fetchMetadata}
                        gitsetKey={user.gitsetKey}
                        githubToken={user.githubOauthToken}
                    />

                    <Modal
                        isOpen={successModal.isOpen}
                        onClose={() => setSuccessModal({ isOpen: false, url: '' })}
                        title="Issue Created Successfully!"
                        maxWidth="max-w-2xl"
                        footer={
                            <div className="flex justify-between w-full items-center">
                                <button
                                    onClick={() => {
                                        setSuccessModal({ isOpen: false, url: '' });
                                        resetForm();
                                    }}
                                    className="px-4 py-2 rounded-md border hover:bg-muted text-sm font-medium flex items-center gap-2"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                    Draft another Issue
                                </button>
                                <button
                                    onClick={() => setSuccessModal({ isOpen: false, url: '' })}
                                    className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium"
                                >
                                    Close
                                </button>
                            </div>
                        }
                    >
                        <div className="flex flex-col gap-6 py-2">
                            {}
                            <div className="flex flex-col items-center gap-2 text-center">
                                <div className="h-12 w-12 rounded-full bg-brand/10 flex items-center justify-center text-brand">
                                    <CheckCircle2 className="h-6 w-6" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-lg font-medium">Issue #{issueNumber} created!</p>
                                    <a
                                        href={successModal.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-brand hover:underline flex items-center justify-center gap-1"
                                    >
                                        View on GitHub <ExternalLink className="h-3 w-3" />
                                    </a>
                                </div>
                            </div>

                            <div className="border-t pt-6">
                                <h3 className="font-semibold mb-4 flex items-center gap-2">
                                    <GitBranch className="h-4 w-4" />
                                    Create Development Branch
                                </h3>

                                {!branchCreatedName ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
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
                                                    placeholder="feature/my-new-feature"
                                                    disabled={isCreatingBranch}
                                                />
                                            </div>
                                        </div>

                                        {branchCreationError && (
                                            <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                                                {branchCreationError}
                                            </div>
                                        )}

                                        <button
                                            onClick={createBranch}
                                            disabled={isCreatingBranch || !newBranchName || !sourceBranch}
                                            className="w-full flex items-center justify-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                                        >
                                            {isCreatingBranch ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />}
                                            Create Branch from Issue
                                        </button>
                                    </div>
                                ) : (
                                    <div className="bg-muted/50 rounded-lg p-4 space-y-3 border">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-brand font-medium text-sm">
                                                <Check className="h-4 w-4" />
                                                Branch created successfully!
                                            </div>
                                            <a
                                                href={`https://github.com/${repoContext}/tree/${branchCreatedName}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-brand hover:underline flex items-center gap-1"
                                            >
                                                View Branch <ExternalLink className="h-3 w-3" />
                                            </a>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground">The branch has been created on the remote repository. To switch to it locally:</p>
                                            <div className="bg-black/90 text-white p-3 rounded-md font-mono text-xs flex items-center justify-between group">
                                                <span>git fetch origin && git checkout {branchCreatedName}</span>
                                                <button
                                                    onClick={() => copyToClipboard(`git fetch origin && git checkout ${branchCreatedName}`, setBranchCommandCopied)}
                                                    className=""
                                                >
                                                    {branchCommandCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
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
