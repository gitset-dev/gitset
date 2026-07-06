import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';

interface Release {
    version: string;
    date: string;
    title: string;
    description: string;
    type: 'prerelease' | 'latest' | 'release';
    html_url: string;
}

export function ChangelogReleaseItem({ release }: { release: Release }) {
    const [isModifiedFilesExpanded, setIsModifiedFilesExpanded] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (contentRef.current) {
            const links = contentRef.current.querySelectorAll('a');
            links.forEach(link => {
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer');
            });
        }
    }, [release.description]);

    const modifiedFilesH2Regex = /<h2[^>]*>\s*Modified Files\s*<\/h2>/i;
    const modifiedFilesMatch = release.description.match(modifiedFilesH2Regex);

    let beforeModifiedFiles = '';
    let modifiedFilesContent = '';
    let afterModifiedFiles = '';
    let hasModifiedFiles = false;

    if (modifiedFilesMatch) {
        hasModifiedFiles = true;
        const h2StartIndex = release.description.indexOf(modifiedFilesMatch[0]);
        const contentStartIndex = h2StartIndex + modifiedFilesMatch[0].length;

        beforeModifiedFiles = release.description.substring(0, h2StartIndex);

        const afterH2Content = release.description.substring(contentStartIndex);
        const nextH2Match = afterH2Content.match(/<h2[^>]*>/);

        if (nextH2Match) {
            const nextH2Index = afterH2Content.indexOf(nextH2Match[0]);
            modifiedFilesContent = afterH2Content.substring(0, nextH2Index);
            afterModifiedFiles = afterH2Content.substring(nextH2Index);
        } else {
            modifiedFilesContent = afterH2Content;
            afterModifiedFiles = '';
        }
    } else {
        beforeModifiedFiles = release.description;
    }

    return (
        <div className="mb-10 ml-8 relative">
            <span
                className={`absolute -left-11 flex h-6 w-6 items-center justify-center rounded-full ring-8 ring-background ${release.type === 'prerelease'
                    ? "bg-orange-500"
                    : release.type === 'latest'
                        ? "bg-blue-500"
                        : "bg-foreground"
                    }`}
            />
            <div className="rounded-lg border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xl font-semibold text-foreground">
                            {release.version}
                        </h3>
                        {release.type === 'prerelease' && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-orange-500/10 text-orange-600 border border-orange-500/20">
                                Pre-release
                            </span>
                        )}
                        {release.type === 'latest' && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
                                Latest Release
                            </span>
                        )}
                    </div>
                    <time className="text-sm text-muted-foreground">
                        {release.date}
                    </time>
                </div>
                <h4 className="text-lg font-medium mb-2 text-foreground">
                    {release.title}
                </h4>
                <div
                    ref={contentRef}
                    className="text-sm text-muted-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2 prose-p:text-muted-foreground prose-p:my-2 prose-a:text-brand prose-a:underline prose-strong:text-foreground prose-strong:font-semibold prose-code:text-foreground prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-ul:my-2 prose-ul:list-disc prose-ul:pl-6 prose-ol:my-2 prose-ol:list-decimal prose-ol:pl-6 prose-li:text-muted-foreground prose-li:my-1"
                >
                    <div dangerouslySetInnerHTML={{ __html: beforeModifiedFiles }} />

                    {hasModifiedFiles && (
                        <div className="my-4">
                            <button
                                onClick={() => setIsModifiedFilesExpanded(!isModifiedFilesExpanded)}
                                className="flex items-center gap-2 w-full text-left font-semibold text-foreground hover:text-brand transition-colors py-2 px-3 rounded-md hover:bg-muted/50"
                            >
                                <ChevronDown
                                    className={`h-4 w-4 transition-transform ${isModifiedFilesExpanded ? 'rotate-180' : ''}`}
                                />
                                <span className="text-sm">Modified Files</span>
                            </button>
                            {isModifiedFilesExpanded && (
                                <div
                                    className="mt-2 pl-6 animate-in slide-in-from-top-2 duration-200"
                                    dangerouslySetInnerHTML={{ __html: modifiedFilesContent }}
                                />
                            )}
                        </div>
                    )}

                    <div dangerouslySetInnerHTML={{ __html: afterModifiedFiles }} />
                </div>
                <div className="mt-4 pt-4 border-t border-border">
                    <a
                        href={release.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline"
                    >
                        View on GitHub
                        <ExternalLink className="h-4 w-4" />
                    </a>
                </div>
            </div>
        </div>
    );
}