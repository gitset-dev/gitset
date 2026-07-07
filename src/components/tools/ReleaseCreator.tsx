import React, { useState, useEffect } from 'react';
import { RepositorySelector } from '../RepositorySelector';
import { ghFetch } from '@/lib/githubProxy';
import { TemplateEditorModal } from '../TemplateEditorModal';
import { ReferenceSelector } from '../common/ReferenceSelector';
import { CommitViewer } from '../common/CommitViewer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '../Modal';
import { Loader2, Copy, Sparkles, Tag, GitCommit, LayoutTemplate, Check, Github, ExternalLink, CheckCircle2, ArrowLeft, PenLine, FileText, ListTodo, RefreshCw, Info } from 'lucide-react';
import { ReleaseManager } from './ReleaseManager';
import ToolErrorNotice from './ToolErrorNotice';
import CollapsibleComposer from './CollapsibleComposer';

interface User {
    gitsetKey: string;
    githubOauthToken?: string | null;
    plan?: string;
}

interface ReleaseCreatorProps {
    user: User;
    initialRepo?: string;
}

interface Version {
    version_number: number;
    content: string;
    created_at?: string;
}

export function ReleaseCreator({ user, initialRepo = '' }: ReleaseCreatorProps) {
    const [mode, setMode] = useState<'composer' | 'manager'>('composer');

    const [repo, setRepo] = useState(initialRepo);

    const [fromRef, setFromRef] = useState('');
    const [toRef, setToRef] = useState('');
    const [refs, setRefs] = useState<{ branches: string[], tags: string[] }>({ branches: [], tags: [] });
    const [tagName, setTagName] = useState('');

    const [commits, setCommits] = useState<any[]>([]);
    const [rawCommits, setRawCommits] = useState('');
    const [manualMode, setManualMode] = useState(false);

    const [selectedCommits, setSelectedCommits] = useState<Set<string>>(new Set());

    const toggleCommit = (hash: string) => {
        const newSelection = new Set(selectedCommits);
        if (newSelection.has(hash)) {
            newSelection.delete(hash);
        } else {
            newSelection.add(hash);
        }
        setSelectedCommits(newSelection);
    };

    const selectAllCommits = () => {
        setSelectedCommits(new Set(commits.map(c => c.hash)));
    };

    const deselectAllCommits = () => {
        setSelectedCommits(new Set());
    };

    const [customTemplate, setCustomTemplate] = useState('');

    const [loading, setLoading] = useState(false);
    const [refsLoading, setRefsLoading] = useState(false);
    const [commitsLoading, setCommitsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [infoMessage, setInfoMessage] = useState<string | null>(null);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

    const [draftId, setDraftId] = useState<string | null>(null);
    const [versions, setVersions] = useState<Version[]>([]);
    const [currentVersionIndex, setCurrentVersionIndex] = useState<number>(-1);

    const [creatingRelease, setCreatingRelease] = useState(false);

    const [successModal, setSuccessModal] = useState<{ isOpen: boolean; url: string; tagName?: string }>({ isOpen: false, url: '' });

    const [copied, setCopied] = useState(false);

    const [refinementPrompt, setRefinementPrompt] = useState('');

    const currentVersion = currentVersionIndex >= 0 ? versions[currentVersionIndex] : null;

    useEffect(() => {
        if (repo && user.githubOauthToken && repo.includes('/')) {
            fetchRefs(repo);
        } else {
            setRefs({ branches: [], tags: [] });
            setFromRef('');
            setToRef('');
        }
    }, [repo, user.githubOauthToken]);

    const fetchRefs = async (repoFullName: string) => {
        setRefsLoading(true);
        try {
            let defaultBranchName = 'main';
            try {
                const repoRes = await ghFetch(`/repos/${repoFullName}`, {
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

            const [tagsRes, branchesRes] = await Promise.all([
                ghFetch(`/repos/${repoFullName}/tags?per_page=100`),
                ghFetch(`/repos/${repoFullName}/branches?per_page=100`)
            ]);

            const tags = tagsRes.ok ? await tagsRes.json() : [];
            const branches = branchesRes.ok ? await branchesRes.json() : [];

            const branchNames = branches.map((b: any) => b.name);

            if (!branchNames.includes(defaultBranchName)) {
                branchNames.unshift(defaultBranchName);
            }

            setRefs({
                branches: branchNames,
                tags: tags.map((t: any) => t.name)
            });

            if (tags.length > 0) setFromRef(tags[0].name);
            else if (branchNames.length > 0) setFromRef(branchNames[0]);

            setToRef(defaultBranchName);
        } catch (e) {
            console.error("Failed to fetch refs", e);
        } finally {
            setRefsLoading(false);
        }
    };

    const fetchCommits = async () => {
        if (!repo) return;

        setCommitsLoading(true);
        setError(null);
        setInfoMessage(null);
        setManualMode(false);

        try {
            let url = '';

            if (fromRef && toRef) {
                url = `https://api.github.com/repos/${repo}/compare/${fromRef}...${toRef}`;
            } else {
                url = `https://api.github.com/repos/${repo}/commits?per_page=100`;
            }

            const res = await ghFetch(url, {
                headers: {
                    Accept: "application/vnd.github.v3+json",
                },
            });

            if (!res.ok) throw new Error("Failed to fetch commits");

            const data = await res.json();
            let parsedCommits: any[] = [];

            if (fromRef && toRef) {
                if (data.commits.length === 0) {
                    const recentUrl = `https://api.github.com/repos/${repo}/commits?per_page=100`;
                    const recentRes = await ghFetch(recentUrl, {
                        headers: {
                            Accept: "application/vnd.github.v3+json",
                        },
                    });

                    if (recentRes.ok) {
                        const recentData = await recentRes.json();
                        if (Array.isArray(recentData) && recentData.length > 0) {
                            const fallbackCommits = recentData.map((c: any) => ({
                                hash: c.sha,
                                message: c.commit.message,
                                author: c.commit.author.name,
                                avatar_url: c.author?.avatar_url,
                                url: c.html_url
                            }));
                            setCommits(fallbackCommits);
                            setSelectedCommits(new Set(fallbackCommits.map((c: any) => c.hash)));
                            setRawCommits(fallbackCommits.map((c: any) => c.message).join('\n'));
                            setInfoMessage("No previous tags or branches detected. Analyzing recent commits from the current branch.");
                            setCommitsLoading(false);
                            return;
                        }
                    }

                    setError("No commits found between these references.");
                    setCommits([]);
                    setSelectedCommits(new Set());
                    setCommitsLoading(false);
                    return;
                }
                parsedCommits = data.commits.map((c: any) => ({
                    hash: c.sha,
                    message: c.commit.message,
                    author: c.commit.author.name,
                    avatar_url: c.author?.avatar_url,
                    url: c.html_url
                }));
            } else {
                if (data.length === 0) {
                    setError("No commits found.");
                    setCommits([]);
                    setSelectedCommits(new Set());
                    setCommitsLoading(false);
                    return;
                }
                parsedCommits = data.map((c: any) => ({
                    hash: c.sha,
                    message: c.commit.message,
                    author: c.commit.author.name,
                    avatar_url: c.author?.avatar_url,
                    url: c.html_url
                }));
            }

            setCommits(parsedCommits);
            setSelectedCommits(new Set(parsedCommits.map((c: any) => c.hash)));

            setRawCommits(parsedCommits.map((c: any) => c.message).join('\n'));
        } catch (e: any) {
            setError(e.message);
        } finally {
            setCommitsLoading(false);
        }
    };

    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        if (currentVersionIndex >= 0) {
            const updatedVersions = [...versions];
            updatedVersions[currentVersionIndex] = {
                ...updatedVersions[currentVersionIndex],
                content: newValue
            };
            setVersions(updatedVersions);
        }
    };

    const handleGenerate = async () => {
        if (!tagName) {
            setError("Tag Name / Version is required.");
            return;
        }

        if (manualMode && !rawCommits) {
            setError("Please provide commit messages or notes.");
            return;
        }

        if (!manualMode) {
            if (commits.length === 0) {
                setError("No commits loaded. Fetch commits or switch to Manual Mode.");
                return;
            }
            if (selectedCommits.size === 0) {
                setError("Please select at least one commit to generate notes.");
                return;
            }
        }

        setLoading(true);
        setError(null);

        try {
            let commitList;
            if (manualMode) {
                commitList = rawCommits.split('\n')
                    .filter(line => line.trim())
                    .map(line => ({ message: line.trim(), hash: 'manual', author: 'User' }));
            } else {
                commitList = commits.filter(c => selectedCommits.has(c.hash));
            }

            const repoInfo = repo && repo.includes('/')
                ? { owner: repo.split('/')[0], name: repo.split('/')[1] }
                : null;

            const res = await fetch('/api/release', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'generate',
                    gitset_key: user.gitsetKey,
                    commits: commitList,
                    tag_name: tagName,
                    repo_info: repoInfo,
                    custom_template: customTemplate || undefined
                })
            });

            const data = await res.json();

            if (!res.ok) {
                const error = new Error(data.error || "Failed to generate Release Notes");
                throw error;
            }

            setDraftId(data.draft_id);

            let content = data.release_notes;

            if (repo && !manualMode) {
                let changelogLink = '';

                const endRef = tagName || toRef;

                if (fromRef && endRef && fromRef !== endRef) {
                    changelogLink = `\n\n**Full Changelog**: https://github.com/${repo}/compare/${fromRef}...${endRef}`;
                } else {
                    changelogLink = `\n\n**Full Changelog**: https://github.com/${repo}/commits/${tagName || 'main'}`;
                }

                if (!content.includes('Full Changelog**:')) {
                    content += changelogLink;
                }
            }

            const newVersion: Version = {
                version_number: 1,
                content: content,
                created_at: new Date().toISOString()
            };

            setVersions([newVersion]);
            setCurrentVersionIndex(0);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRelease = async () => {
        if (!repo || !tagName || !currentVersion || !user.githubOauthToken) {
            setError("Missing required fields for release creation (Repo, Tag Name, Content, or Auth)");
            return;
        }

        setCreatingRelease(true);
        setError(null);

        try {
            const response = await ghFetch(`/repos/${repo}/releases`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/vnd.github.v3+json',
                },
                body: JSON.stringify({
                    tag_name: tagName,
                    name: tagName,
                    body: currentVersion.content,
                    draft: false,
                    prerelease: false,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                let errorMessage = data.message || "Failed to create release on GitHub";
                if (response.status === 404 || response.status === 403) {
                    errorMessage += ". If this is an organization repo, ensure you've granted 'Organization Access' in GitHub Settings > Applications > Authorized OAuth Apps.";
                }
                throw new Error(errorMessage);
            }

            setSuccessModal({ isOpen: true, url: data.html_url, tagName: tagName });
        } catch (e: any) {
            setError(e.message);
        } finally {
            setCreatingRelease(false);
        }
    };

    const handleRefine = async () => {
        if (!draftId || !currentVersion || !refinementPrompt) return;

        setLoading(true);
        setError(null);

        try {
            let commitList;
            if (manualMode) {
                commitList = rawCommits.split('\n')
                    .filter(line => line.trim())
                    .map(line => ({ message: line.trim(), hash: 'manual', author: 'User' }));
            } else {
                commitList = commits.filter(c => selectedCommits.has(c.hash));
            }

            const res = await fetch('/api/release', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'refine',
                    gitset_key: user.gitsetKey,
                    draft_id: draftId,
                    commits: commitList,
                    instruction: refinementPrompt,
                    tag_name: tagName,
                    repo_info: repo && repo.includes('/') ? { owner: repo.split('/')[0], name: repo.split('/')[1] } : undefined,
                    custom_template: customTemplate || undefined
                })
            });

            const data = await res.json();

            if (!res.ok) {
                const error = new Error(data.error || "Failed to refine Release Notes");
                throw error;
            }

            const newVersion: Version = {
                version_number: data.version_number,
                content: data.release_notes,
                created_at: new Date().toISOString()
            };

            setVersions(prev => [...prev, newVersion]);
            setCurrentVersionIndex(prev => prev + 1);
            setRefinementPrompt('');
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const resetForm = () => {
        setRepo('');
        setFromRef('');
        setToRef('');
        setRefs({ branches: [], tags: [] });
        setTagName('');
        setCommits([]);
        setSelectedCommits(new Set());
        setRawCommits('');
        setVersions([]);
        setCurrentVersionIndex(-1);
    };

    return (
        <div className="h-full flex flex-col gap-6">
            {}
            <div className="flex items-center gap-4 border-b pb-4 justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setMode('composer')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${mode === 'composer' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
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
                <div className="flex-1 overflow-hidden">
                    <ReleaseManager
                        user={user}
                        repoContext={repo}
                        onSwitchToCreator={() => setMode('composer')}
                    />
                </div>
            ) : (
                <div className="grid gap-8 lg:grid-cols-2 flex-1 overflow-y-auto pb-8">
                    {}
                    <div className="space-y-6">
                        <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                            <h3 className="font-semibold text-sm">Repository & Range</h3>

                            <div className="space-y-2">
                                <label className="text-xs font-medium leading-none text-muted-foreground">Repository</label>
                                <RepositorySelector
                                    githubToken={user.githubOauthToken}
                                    value={repo}
                                    onChange={setRepo}
                                    placeholder="Select repository"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium leading-none text-muted-foreground">From (Previous)</label>
                                    <ReferenceSelector
                                        value={fromRef}
                                        onChange={setFromRef}
                                        branches={refs.branches}
                                        tags={refs.tags}
                                        placeholder="Select ref..."
                                        disabled={!repo}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium leading-none text-muted-foreground">To (Current)</label>
                                    <ReferenceSelector
                                        value={toRef}
                                        onChange={setToRef}
                                        branches={refs.branches}
                                        tags={refs.tags}
                                        placeholder="Select ref..."
                                        disabled={!repo}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Button
                                    onClick={fetchCommits}
                                    disabled={!repo || commitsLoading}
                                    variant="secondary"
                                    className="w-full"
                                >
                                    {commitsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GitCommit className="mr-2 h-4 w-4" />}
                                    Fetch Commits
                                </Button>
                                {(!fromRef || !toRef) && repo && (
                                    <p className="text-[10px] text-muted-foreground text-center animate-in fade-in slide-in-from-top-1">
                                        No references selected. All recent commits will be analyzed.
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none flex gap-1">
                                New Tag Name / Version <span className="text-red-500">*</span>
                            </label>
                            <Input
                                placeholder="e.g. v1.2.0"
                                value={tagName}
                                onChange={(e) => setTagName(e.target.value)}
                                className={!tagName && error?.includes("Tag Name") ? "border-red-500" : ""}
                            />
                        </div>

                        <div className="flex items-center justify-between gap-4">
                            <Button variant="outline" onClick={() => setIsTemplateModalOpen(true)} className="flex-1">
                                <LayoutTemplate className="mr-2 h-4 w-4" />
                                Manage Templates
                            </Button>
                            {customTemplate && (
                                <span className="text-xs text-brand font-medium">Custom Template Active</span>
                            )}
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium leading-none">Commits / Content</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">Mode:</span>
                                    <div className="flex bg-muted rounded-md p-0.5">
                                        <button
                                            onClick={() => setManualMode(false)}
                                            className={`px-2 py-0.5 text-xs rounded-sm transition-all ${!manualMode ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                        >
                                            Auto
                                        </button>
                                        <button
                                            onClick={() => setManualMode(true)}
                                            className={`px-2 py-0.5 text-xs rounded-sm transition-all ${manualMode ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                        >
                                            Manual
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {manualMode ? (
                                <CollapsibleComposer collapsed={loading || Boolean(currentVersion) || Boolean(error)} dimmed={loading}>
                                    <Textarea
                                        placeholder="Paste commits or write notes manually..."
                                        value={rawCommits}
                                        onChange={(e) => setRawCommits(e.target.value)}
                                        disabled={loading}
                                        className="min-h-[300px] font-mono text-xs resize-none"
                                    />
                                </CollapsibleComposer>
                            ) : (
                                <CommitViewer
                                    commits={commits}
                                    repoFullName={repo}
                                    selectedCommits={selectedCommits}
                                    onToggleCommit={toggleCommit}
                                    onSelectAll={selectAllCommits}
                                    onDeselectAll={deselectAllCommits}
                                />
                            )}
                        </div>

                        {error && <ToolErrorNotice error={error} />}

                        {infoMessage && (
                            <div className="text-sm text-blue-500 bg-blue-500/10 p-3 rounded-md border border-blue-200 flex items-start gap-2">
                                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                                <span>{infoMessage}</span>
                            </div>
                        )}

                        <Button
                            onClick={handleGenerate}
                            disabled={loading || (!manualMode && commits.length === 0) || (manualMode && !rawCommits)}
                            className="w-full"
                        >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                            Generate Release Notes
                        </Button>
                    </div>

                    {}
                    <div className="space-y-6">
                        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm h-full flex flex-col">
                            <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
                                <h3 className="font-semibold leading-none tracking-tight">Generated Notes</h3>
                                <div className="flex gap-2">
                                    {currentVersion && repo && tagName && (
                                        <button
                                            onClick={handleCreateRelease}
                                            disabled={creatingRelease}
                                            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3"
                                        >
                                            {creatingRelease ? <Loader2 className="h-3 w-3 animate-spin" /> : <Github className="h-3 w-3" />}
                                            Create Release
                                        </button>
                                    )}
                                    {currentVersion && (
                                        <button
                                            onClick={() => copyToClipboard(currentVersion.content)}
                                            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3"
                                        >
                                            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                            Copy
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="p-6 flex-1 bg-muted/30 relative group min-h-[400px] flex flex-col">
                                {loading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="h-8 w-8 animate-spin text-brand" />
                                            <p className="text-sm text-muted-foreground">Compiling release notes...</p>
                                        </div>
                                    </div>
                                )}

                                {!currentVersion ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-8 flex-1">
                                        <Tag className="h-12 w-12 mb-4 opacity-20" />
                                        <p>Paste your commits to generate structured release notes.</p>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col flex-1">
                                        {}
                                        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
                                            {versions.map((v, idx) => (
                                                <button
                                                    key={v.version_number}
                                                    onClick={() => setCurrentVersionIndex(idx)}
                                                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${idx === currentVersionIndex
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                                        }`}
                                                >
                                                    v{v.version_number}
                                                    {idx === 0 && ' (Original)'}
                                                </button>
                                            ))}
                                        </div>

                                        <textarea
                                            className="flex-1 font-mono text-sm whitespace-pre-wrap p-4 rounded-md bg-background border border-border overflow-auto resize-none focus:outline-none focus:ring-1 focus:ring-brand w-full"
                                            value={currentVersion.content}
                                            onChange={handleNotesChange}
                                        />

                                        {}
                                        <div className="mt-4 pt-4 border-t border-border space-y-3 bg-background p-4 rounded-md">
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm font-medium">Refine Notes</label>
                                            </div>
                                            <div className="flex gap-2">
                                                <input
                                                    placeholder="Refine with AI (e.g., 'Group by component', 'Highlight breaking changes')"
                                                    value={refinementPrompt}
                                                    onChange={(e) => setRefinementPrompt(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
                                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                                />
                                                <button
                                                    onClick={handleRefine}
                                                    disabled={loading || !refinementPrompt}
                                                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 h-9 px-4 py-2"
                                                >
                                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                                    Refine
                                                </button>
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
                        type="release"
                        onApply={(content) => {
                            setCustomTemplate(content);
                            setIsTemplateModalOpen(false);
                        }}
                        gitsetKey={user.gitsetKey}
                        backendUrl=""
                    />

                    <Modal
                        isOpen={successModal.isOpen}
                        onClose={() => {
                            setSuccessModal({ isOpen: false, url: '' });
                            setMode('manager');
                        }}
                        title="Release Created Successfully!"
                        maxWidth="max-w-2xl"
                        footer={
                            <div className="flex justify-end w-full items-center">
                                <button
                                    onClick={() => {
                                        setSuccessModal({ isOpen: false, url: '' });
                                        setMode('manager');
                                    }}
                                    className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium"
                                >
                                    Close
                                </button>
                            </div>
                        }
                    >
                        <div className="flex flex-col gap-6 py-2">
                            <div className="flex flex-col items-center gap-2 text-center">
                                <div className="h-12 w-12 rounded-full bg-brand/10 flex items-center justify-center text-brand">
                                    <CheckCircle2 className="h-6 w-6" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-lg font-medium">Release {successModal.tagName} created!</p>
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
                        </div>
                    </Modal>
                </div>
            )}
        </div>
    );
}
