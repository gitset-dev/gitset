import React, { useState, useEffect } from 'react';
import { RepositorySelector } from '../RepositorySelector';
import { ghFetch } from '@/lib/githubProxy';

import { Modal } from '../Modal';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Tag, Calendar, Edit2, Trash2, ExternalLink, Sparkles, AlertTriangle, RefreshCw, Check } from 'lucide-react';
import ToolErrorNotice from './ToolErrorNotice';

interface User {
    gitsetKey: string;
    githubOauthToken?: string | null;
    plan?: string;
}

interface ReleaseManagerProps {
    user: User;
    repoContext?: string;
    onSwitchToCreator?: () => void;
}

interface Release {
    id: number;
    tag_name: string;
    name: string;
    body: string;
    html_url: string;
    created_at: string;
    published_at: string;
    draft: boolean;
    prerelease: boolean;
    author: {
        login: string;
        avatar_url: string;
    };
}

export function ReleaseManager({ user, repoContext, onSwitchToCreator }: ReleaseManagerProps) {
    const [repo, setRepo] = useState(repoContext || '');

    const [releases, setReleases] = useState<Release[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [editingRelease, setEditingRelease] = useState<Release | null>(null);
    const [editBody, setEditBody] = useState('');
    const [refinementPrompt, setRefinementPrompt] = useState('');
    const [isRefining, setIsRefining] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [deletingRelease, setDeletingRelease] = useState<Release | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (repo && user.githubOauthToken) {
            fetchReleases();
        } else if (!repo) {
            setReleases([]);
        }
    }, [repo, user.githubOauthToken]);

    const fetchReleases = async () => {
        if (!repo) return;
        setLoading(true);
        setError(null);
        try {
            const res = await ghFetch(`/repos/${repo}/releases?per_page=30`);
            if (!res.ok) throw new Error("Failed to fetch releases");
            const data = await res.json();
            setReleases(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (release: Release) => {
        setEditingRelease(release);
        setEditBody(release.body);
        setRefinementPrompt('');
    };

    const handleSaveEdit = async () => {
        if (!editingRelease || !repo) return;
        setIsSaving(true);
        try {
            const res = await ghFetch(`/repos/${repo}/releases/${editingRelease.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    body: editBody
                })
            });
            if (!res.ok) throw new Error("Failed to update release");

            setReleases(prev => prev.map(r => r.id === editingRelease.id ? { ...r, body: editBody } : r));
            setEditingRelease(null);
        } catch (e: any) {
            setError(e.message || "Failed to save release");
            console.error("Failed to save: ", e);
        } finally {
            setIsSaving(false);
        }
    };

    const handleRefine = async () => {
        if (!refinementPrompt || !editBody) return;
        setIsRefining(true);
        try {
            const res = await fetch('/api/release', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'generate',
                    gitset_key: user.gitsetKey,
                    commits: [],
                    instruction: `Refine the following release notes based on this instruction: "${refinementPrompt}"\n\nNOTES TO REFINE:\n${editBody}`,
                    tagName: editingRelease?.tag_name || 'vNext',
                    repo_info: repo ? { owner: repo.split('/')[0], name: repo.split('/')[1] } : undefined
                })
            });

            const data = await res.json();
            if (!res.ok) {
                const error = new Error(data.error || "Failed to refine");
                throw error;
            }

            setEditBody(data.release_notes);
            setRefinementPrompt('');
        } catch (e: any) {
            setError(e.message || "Refinement failed");
            console.error("Refinement failed: ", e);
        } finally {
            setIsRefining(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingRelease || !repo) return;
        setIsDeleting(true);
        try {
            const res = await ghFetch(`/repos/${repo}/releases/${deletingRelease.id}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error("Failed to delete release");

            setReleases(prev => prev.filter(r => r.id !== deletingRelease.id));
            setDeletingRelease(null);
        } catch (e: any) {
            console.error("Failed to delete: ", e);
        } finally {
            setIsDeleting(false);
        }
    };

    useEffect(() => {
        if (repoContext) {
            setRepo(repoContext);
        }
    }, [repoContext]);

    return (
        <div className="h-full flex flex-col space-y-4">
            {}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg bg-card shadow-sm">
                <div className="flex-1 w-full sm:max-w-md min-w-0">
                    <RepositorySelector
                        githubToken={user.githubOauthToken}
                        value={repo}
                        onChange={setRepo}
                        placeholder="Select repository"
                        onRefresh={fetchReleases}
                    />
                </div>
                <div className="flex items-center max-[600px]:justify-center justify-end gap-2 w-full sm:w-auto">
                    <Button onClick={onSwitchToCreator}>
                        <Plus className="max-[600px]:mr-0 mr-1 h-4 w-4" />
                        <span>New Release</span>
                    </Button>
                </div>
            </div>

            {}
            {error && /no ai provider configured/i.test(error) && <ToolErrorNotice error={error} />}
            {error && !/no ai provider configured/i.test(error) && (
                <div role="alert" className="flex items-start justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    <span className="break-words">{error}</span>
                    <button onClick={() => setError(null)} className="shrink-0 font-medium underline underline-offset-2 hover:opacity-80">
                        Dismiss
                    </button>
                </div>
            )}

            {}
            <div className="flex-1 border rounded-lg bg-card overflow-hidden flex flex-col">
                <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Releases & Tags</span>
                    <span className="text-xs text-muted-foreground">{releases.length} items</span>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {!repo ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
                            <Tag className="h-8 w-8 opacity-20" />
                            <p>Select a repository to view releases.</p>
                        </div>
                    ) : loading && releases.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin" />
                            <p>Loading releases...</p>
                        </div>
                    ) : releases.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
                            <Tag className="h-8 w-8 opacity-20" />
                            <p>No releases found.</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {releases.map(release => (
                                <div key={release.id} className="group flex flex-col sm:flex-row items-start gap-3 sm:gap-4 p-4 hover:bg-muted/50 transition-colors">
                                    <div className="flex flex-1 gap-3 w-full min-w-0">
                                        <div className="mt-1 shrink-0">
                                            <Tag className="h-5 w-5 text-brand" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <h3 className="font-medium text-base break-words">{release.name || release.tag_name}</h3>
                                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                                                    {release.tag_name}
                                                </span>
                                                {release.draft && (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                                        Draft
                                                    </span>
                                                )}
                                                {release.prerelease && (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/10 text-purple-600 border border-purple-500/20">
                                                        Pre-release
                                                    </span>
                                                )}
                                            </div>

                                            <div className="text-xs text-muted-foreground flex items-center gap-3 mb-2 flex-wrap">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {new Date(release.published_at || release.created_at).toLocaleDateString()}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <img src={release.author.avatar_url} className="h-4 w-4 rounded-full" alt="" />
                                                    {release.author.login}
                                                </span>
                                            </div>
                                            <div className="text-sm text-muted-foreground line-clamp-2 truncate font-mono bg-muted/30 p-2 rounded break-all sm:break-normal">
                                                {release.body || "No description"}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end mt-2 sm:mt-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-border/50">
                                        <a
                                            href={release.html_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 hover:bg-background rounded-md border shadow-sm text-muted-foreground hover:text-foreground"
                                            title="View on GitHub"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                        </a>
                                        <button
                                            onClick={() => handleEdit(release)}
                                            className="p-2 hover:bg-background rounded-md border shadow-sm text-muted-foreground hover:text-brand"
                                            title="Edit Release"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => setDeletingRelease(release)}
                                            className="p-2 hover:bg-background rounded-md border shadow-sm text-muted-foreground hover:text-destructive"
                                            title="Delete Release"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {}
            <Modal
                isOpen={!!editingRelease}
                onClose={() => setEditingRelease(null)}
                title={`Edit Release: ${editingRelease?.tag_name}`}
                maxWidth="max-w-4xl"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setEditingRelease(null)}>Cancel</Button>
                        <Button onClick={handleSaveEdit} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                            Save Changes
                        </Button>
                    </>
                }
            >
                <div className="flex flex-col gap-4 h-[60vh]">
                    <div className="flex gap-2 items-center bg-muted/30 p-2 rounded-md">
                        <Sparkles className="h-4 w-4 text-brand" />
                        <input
                            className="flex-1 bg-transparent border-none text-sm focus:outline-none"
                            placeholder="Refine with AI (e.g. 'Fix typos', 'Make it more professional')..."
                            value={refinementPrompt}
                            onChange={(e) => setRefinementPrompt(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
                        />
                        <Button size="sm" variant="secondary" onClick={handleRefine} disabled={isRefining || !refinementPrompt}>
                            {isRefining ? <Loader2 className="h-3 w-3 animate-spin" /> : "Refine"}
                        </Button>
                    </div>
                    <textarea
                        className="flex-1 font-mono text-sm p-4 rounded-md border resize-none focus:outline-none focus:ring-1 focus:ring-brand"
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                    />
                </div>
            </Modal>

            {}
            <Modal
                isOpen={!!deletingRelease}
                onClose={() => setDeletingRelease(null)}
                title="Delete Release"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setDeletingRelease(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Delete Release
                        </Button>
                    </>
                }
            >
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 text-destructive bg-destructive/10 p-3 rounded-lg">
                        <AlertTriangle className="h-5 w-5" />
                        <p className="text-sm font-medium">This action cannot be undone.</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Are you sure you want to delete the release <strong>{deletingRelease?.tag_name}</strong>?
                        This will remove the release from GitHub, but the git tag may remain.
                    </p>
                </div>
            </Modal>
        </div>
    );
}
