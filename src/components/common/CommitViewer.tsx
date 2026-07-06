import React from 'react';
import { GitCommit, ExternalLink, User } from 'lucide-react';

interface Commit {
    hash: string;
    message: string;
    author: string;
    avatar_url?: string;
    url?: string;
}

export interface CommitViewerProps {
    commits: Commit[];
    repoFullName?: string;
    selectedCommits?: Set<string>;
    onToggleCommit?: (hash: string) => void;
    onSelectAll?: () => void;
    onDeselectAll?: () => void;
}

export function CommitViewer({
    commits,
    repoFullName,
    selectedCommits,
    onToggleCommit,
    onSelectAll,
    onDeselectAll
}: CommitViewerProps) {
    if (!commits || commits.length === 0) {
        return (
            <div className="text-center p-8 text-muted-foreground border rounded-md bg-muted/20 border-dashed">
                <GitCommit className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No commits to display</p>
            </div>
        );
    }

    const selectionEnabled = !!selectedCommits && !!onToggleCommit;
    const selectedCount = selectedCommits ? selectedCommits.size : commits.length;

    return (
        <div className="border rounded-md bg-card overflow-hidden flex flex-col max-h-[400px]">
            <div className="p-2 border-b bg-muted/30 text-xs font-medium text-muted-foreground flex justify-between items-center sticky top-0 z-10 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    {selectionEnabled && (
                        <input
                            type="checkbox"
                            className="rounded border-gray-300 text-brand focus:ring-brand h-3.5 w-3.5"
                            checked={selectedCount === commits.length && commits.length > 0}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    onSelectAll?.();
                                } else {
                                    onDeselectAll?.();
                                }
                            }}
                            title={selectedCount === commits.length ? "Deselect All" : "Select All"}
                        />
                    )}
                    <span>{selectedCount} selected / {commits.length} total</span>
                </div>
                {selectionEnabled && (
                    <div className="flex gap-2">
                        <button
                            onClick={onSelectAll}
                            className="hover:text-foreground hover:bg-muted px-2 py-0.5 rounded transition-colors"
                        >
                            All
                        </button>
                        <button
                            onClick={onDeselectAll}
                            className="hover:text-foreground hover:bg-muted px-2 py-0.5 rounded transition-colors"
                        >
                            None
                        </button>
                    </div>
                )}
            </div>
            <div className="overflow-y-auto p-0 divide-y">
                {commits.map((commit, idx) => {
                    const commitUrl = commit.url || (repoFullName && commit.hash !== 'manual' ? `https://github.com/${repoFullName}/commit/${commit.hash}` : '#');
                    const isSelected = selectedCommits ? selectedCommits.has(commit.hash) : true;

                    return (
                        <div
                            key={commit.hash || idx}
                            className={`p-3 hover:bg-muted/50 transition-colors flex gap-3 group items-start ${!isSelected ? 'opacity-60 bg-muted/10' : ''}`}
                            onClick={(e) => {
                                if (selectionEnabled &&
                                    onToggleCommit &&
                                    (e.target as HTMLElement).tagName !== 'INPUT' &&
                                    (e.target as HTMLElement).tagName !== 'A' &&
                                    !(e.target as HTMLElement).closest('a')) {
                                    onToggleCommit(commit.hash);
                                }
                            }}
                            style={{ cursor: selectionEnabled ? 'pointer' : 'default' }}
                        >
                            {selectionEnabled && onToggleCommit && (
                                <div className="mt-0.5">
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => onToggleCommit(commit.hash)}
                                        className="rounded border-gray-300 text-brand focus:ring-brand h-4 w-4 cursor-pointer"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                            )}

                            {!selectionEnabled && (
                                <div className="mt-0.5">
                                    <GitCommit className="h-4 w-4 text-muted-foreground" />
                                </div>
                            )}

                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium truncate ${!isSelected ? 'text-muted-foreground line-through' : ''}`} title={commit.message}>
                                    {commit.message}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                    <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">
                                        {commit.hash.substring(0, 7)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        {commit.avatar_url ? (
                                            <img src={commit.avatar_url} alt={commit.author} className="h-3.5 w-3.5 rounded-full" />
                                        ) : (
                                            <User className="h-3 w-3" />
                                        )}
                                        {commit.author}
                                    </span>
                                </div>
                            </div>
                            {commit.hash !== 'manual' && (
                                <a
                                    href={commitUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 hover:bg-background rounded-full border shadow-sm transition-all self-center text-muted-foreground hover:text-foreground"
                                    title="View commit on GitHub"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <ExternalLink className="h-3 w-3" />
                                </a>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
