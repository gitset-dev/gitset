import React from 'react';
import { X, ExternalLink, FileText, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PostGenerationSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    readmeUrl?: string | null;
    licenseUrl?: string | null;
    gitignoreUrl?: string | null;
}

export function PostGenerationSuccessModal({ isOpen, onClose, readmeUrl, licenseUrl, gitignoreUrl }: PostGenerationSuccessModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="relative w-full max-w-md rounded-xl border border-border bg-background shadow-2xl animate-in zoom-in-95 duration-200 p-6"
                role="dialog"
                aria-modal="true"
            >
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </button>

                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="h-12 w-12 rounded-full bg-brand/10 flex items-center justify-center mb-2">
                        <CheckCircle className="h-6 w-6 text-brand" />
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-lg font-semibold tracking-tight">Documentation Updated</h2>
                        <p className="text-sm text-muted-foreground">
                            The following files have been successfully pushed to your repository.
                        </p>
                    </div>

                    <div className="w-full grid gap-3 mt-4">
                        {readmeUrl && (
                            <a
                                href={readmeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={readmeUrl}
                                className="flex items-center justify-between w-full p-3 rounded-lg border border-border bg-card hover:bg-accent hover:text-accent-foreground transition-colors group"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-8 w-8 rounded-md bg-brand/10 shrink-0 flex items-center justify-center text-brand">
                                        <FileText className="h-4 w-4" />
                                    </div>
                                    <div className="flex flex-col items-start min-w-0">
                                        <span className="font-medium text-sm">README.md</span>
                                        <span className="text-xs text-muted-foreground truncate w-full max-w-[250px]">
                                            {readmeUrl.replace(/^https?:\/\//, '')}
                                        </span>
                                    </div>
                                </div>
                                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0" />
                            </a>
                        )}

                        {licenseUrl && (
                            <a
                                href={licenseUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={licenseUrl}
                                className="flex items-center justify-between w-full p-3 rounded-lg border border-border bg-card hover:bg-accent hover:text-accent-foreground transition-colors group"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-8 w-8 rounded-md bg-orange-500/10 shrink-0 flex items-center justify-center text-orange-600 dark:text-orange-500">
                                        <FileText className="h-4 w-4" />
                                    </div>
                                    <div className="flex flex-col items-start min-w-0">
                                        <span className="font-medium text-sm">LICENSE</span>
                                        <span className="text-xs text-muted-foreground truncate w-full max-w-[250px]">
                                            {licenseUrl.replace(/^https?:\/\//, '')}
                                        </span>
                                    </div>
                                </div>
                                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0" />
                            </a>
                        )}

                        {gitignoreUrl && (
                            <a
                                href={gitignoreUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={gitignoreUrl}
                                className="flex items-center justify-between w-full p-3 rounded-lg border border-border bg-card hover:bg-accent hover:text-accent-foreground transition-colors group"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-8 w-8 rounded-md bg-slate-500/10 shrink-0 flex items-center justify-center text-slate-600 dark:text-slate-500">
                                        <FileText className="h-4 w-4" />
                                    </div>
                                    <div className="flex flex-col items-start min-w-0">
                                        <span className="font-medium text-sm">.gitignore</span>
                                        <span className="text-xs text-muted-foreground truncate w-full max-w-[250px]">
                                            {gitignoreUrl.replace(/^https?:\/\//, '')}
                                        </span>
                                    </div>
                                </div>
                                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0" />
                            </a>
                        )}
                    </div>

                    <div className="w-full pt-4">
                        <Button onClick={onClose} className="w-full" variant="default">
                            Done
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
