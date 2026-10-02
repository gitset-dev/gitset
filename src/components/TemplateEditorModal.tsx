import React, { useState, useEffect } from 'react';
import { X, Save, FileText, AlertTriangle, Check, Loader2, Library, RotateCcw, BookmarkCheck, Info } from 'lucide-react';

interface TemplateInfo {
    id: string;
    name: string;
    description: string;
}

interface FullTemplate extends TemplateInfo {
    content: string;
}

const TYPE_LABELS: Record<TemplateEditorModalProps['type'], string> = {
    pr: 'Pull request',
    release: 'Release notes',
    readme: 'README',
    issue: 'Issue',
};

interface TemplateEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (templateContent: string) => void;
    type: 'pr' | 'release' | 'readme' | 'issue';
    backendUrl?: string;
    gitsetKey?: string;
}

export function TemplateEditorModal({ isOpen, onClose, onApply, type, backendUrl = '', gitsetKey }: TemplateEditorModalProps) {
    const [templateContent, setTemplateContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const [savedTemplate, setSavedTemplate] = useState<string>('');

    const [libraryTemplates, setLibraryTemplates] = useState<TemplateInfo[]>([]);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
    const [isLoadingPick, setIsLoadingPick] = useState(false);

    const [previewingLibraryTemplate, setPreviewingLibraryTemplate] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setError(null);
            setSaveSuccess(false);
            setPreviewingLibraryTemplate(null);
            loadTemplate();
            loadLibrary();
        }
    }, [isOpen, type]);

    const getToolEndpoint = () => {
        return `${backendUrl}/api/${type}`;
    };

    const getLibraryEndpoint = () => {
        return `${backendUrl}/api/templates`;
    };

    const loadTemplate = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(getToolEndpoint(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'get_template',
                    gitset_key: gitsetKey
                })
            });

            if (!response.ok) {
                setTemplateContent('');
                setSavedTemplate('');
                setHasChanges(false);
                return;
            }

            const data = await response.json();
            const content = data.template || '';
            setTemplateContent(content);
            setSavedTemplate(content);
            setHasChanges(false);
        } catch (err: any) {
            console.warn('Could not load saved template:', err.message);
            setTemplateContent('');
            setSavedTemplate('');
        } finally {
            setIsLoading(false);
        }
    };

    const loadLibrary = async () => {
        setIsLoadingLibrary(true);
        try {
            const response = await fetch(`${getLibraryEndpoint()}?action=list&tool=${type}`);
            if (!response.ok) throw new Error('Failed to load template library');
            const data = await response.json();
            setLibraryTemplates(data.templates || []);
        } catch (err: any) {
            console.warn('Could not load template library:', err.message);
            setLibraryTemplates([]);
        } finally {
            setIsLoadingLibrary(false);
        }
    };

    const pickTemplate = async (templateId: string) => {
        setIsLoadingPick(true);
        setError(null);
        try {
            const response = await fetch(getLibraryEndpoint(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get', tool: type, template_id: templateId })
            });
            if (!response.ok) throw new Error('Failed to load template');
            const data = await response.json();
            const tmpl: FullTemplate = data.template;
            setTemplateContent(tmpl.content);
            setHasChanges(true);
            setPreviewingLibraryTemplate(tmpl.name);
        } catch (err: any) {
            console.error('Error picking template:', err);
            setError(err.message || 'Failed to load template');
        } finally {
            setIsLoadingPick(false);
        }
    };

    const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);

    const restoreSavedTemplate = () => {
        setTemplateContent(savedTemplate);
        setHasChanges(false);
        setPreviewingLibraryTemplate(null);
    };

    const handleSaveClick = () => {
        if (savedTemplate && savedTemplate.trim() && templateContent !== savedTemplate) {
            setShowOverwriteConfirm(true);
        } else {
            saveTemplate();
        }
    };

    const saveTemplate = async () => {
        setShowOverwriteConfirm(false);
        setIsSaving(true);
        setError(null);
        setSaveSuccess(false);
        try {
            const response = await fetch(getToolEndpoint(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'save_template',
                    gitset_key: gitsetKey,
                    template: templateContent
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save template');
            }

            setSavedTemplate(templateContent);
            setHasChanges(false);
            setPreviewingLibraryTemplate(null);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        } catch (err: any) {
            console.error('Error saving template:', err);
            setError(err.message || 'Failed to save template');
        } finally {
            setIsSaving(false);
        }
    };

    const canRestore = savedTemplate && templateContent !== savedTemplate;

    if (!isOpen) return null;

    const label = TYPE_LABELS[type];
    const hasSaved = !!savedTemplate.trim();
    const sourceLabel = previewingLibraryTemplate
        ? previewingLibraryTemplate
        : hasSaved
            ? 'Your saved default'
            : 'Blank template';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md sm:p-4 animate-in fade-in duration-200">
            <div role="dialog" aria-modal="true" aria-labelledby="template-editor-title" className="w-full max-w-5xl h-[100dvh] sm:h-[88vh] bg-popover border-border sm:border sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 px-4 py-4 sm:px-6 border-b border-border">
                    <div className="flex min-w-0 items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand/25 bg-brand/10"><FileText className="h-5 w-5 text-brand" /></span>
                        <div className="min-w-0">
                            <h2 id="template-editor-title" className="truncate text-base font-semibold tracking-tight sm:text-lg">{label} template</h2>
                            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                                Pick a starting point, adjust it, then use it for this draft or save it as your default.
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} aria-label="Close" className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Body: starting points + editor */}
                <div className="flex-1 flex overflow-hidden relative">
                    {isLoading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-popover z-10">
                            <Loader2 className="h-6 w-6 animate-spin text-brand" />
                            <p className="text-sm text-muted-foreground">Loading your template…</p>
                        </div>
                    ) : (
                        <>
                            <aside className={`${isLibraryOpen ? 'flex absolute inset-0 z-20 w-full animate-in fade-in slide-in-from-left-2 duration-200' : 'hidden'} md:static md:z-auto md:flex md:w-72 lg:w-80 shrink-0 flex-col border-r border-border bg-surface`}>
                                <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
                                    <p className="font-mono text-[11px] font-medium text-muted-foreground uppercase tracking-[0.12em]">
                                        Starting points
                                    </p>
                                    <button onClick={() => setIsLibraryOpen(false)} aria-label="Close starting points" className="md:hidden inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground">
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
                                    {hasSaved && (
                                        <button
                                            onClick={() => { restoreSavedTemplate(); setIsLibraryOpen(false); }}
                                            className={`w-full text-left rounded-xl border p-3 transition-colors ${!previewingLibraryTemplate ? 'border-brand/40 bg-brand/10' : 'border-transparent hover:border-border hover:bg-card'}`}
                                        >
                                            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                                <BookmarkCheck className="h-4 w-4 shrink-0 text-brand" />
                                                Your saved default
                                            </div>
                                            <div className="mt-0.5 pl-6 text-xs text-muted-foreground">The template stored in your account.</div>
                                        </button>
                                    )}
                                    {hasSaved && <div className="mx-3 my-2 h-px bg-border" />}
                                    {isLoadingLibrary ? (
                                        <div className="flex items-center justify-center p-6">
                                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : libraryTemplates.length === 0 ? (
                                        <div className="p-4 text-center text-sm text-muted-foreground">
                                            No templates available.
                                        </div>
                                    ) : (
                                        libraryTemplates.map((tmpl) => {
                                            const active = previewingLibraryTemplate === tmpl.name;
                                            return (
                                                <button
                                                    key={tmpl.id}
                                                    onClick={() => { pickTemplate(tmpl.id); setIsLibraryOpen(false); }}
                                                    disabled={isLoadingPick}
                                                    aria-pressed={active}
                                                    className={`w-full text-left rounded-xl border p-3 transition-colors group disabled:opacity-60 ${active ? 'border-brand/40 bg-brand/10' : 'border-transparent hover:border-border hover:bg-card'}`}
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className={`text-sm font-medium transition-colors ${active ? 'text-brand' : 'text-foreground group-hover:text-brand'}`}>{tmpl.name}</span>
                                                        {active && <Check className="h-3.5 w-3.5 shrink-0 text-brand" />}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                                        {tmpl.description}
                                                    </div>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </aside>

                            <div className="flex-1 flex flex-col min-w-0 bg-card">
                                {/* Editor toolbar: what is loaded right now */}
                                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 sm:px-5 border-b border-border">
                                    <div className="flex min-w-0 items-center gap-2 text-xs">
                                        <span className="text-muted-foreground">Editing:</span>
                                        <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-0.5 font-medium text-foreground">
                                            <span className="truncate">{sourceLabel}</span>
                                        </span>
                                        {hasChanges && (
                                            <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Unsaved
                                            </span>
                                        )}
                                        {isLoadingPick && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        {canRestore && (
                                            <button
                                                onClick={restoreSavedTemplate}
                                                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                            >
                                                <RotateCcw className="h-3 w-3" />
                                                Restore saved
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setIsLibraryOpen(true)}
                                            className="md:hidden inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent"
                                        >
                                            <Library className="h-3.5 w-3.5" />
                                            Starting points
                                        </button>
                                    </div>
                                </div>
                                {error && (
                                    <div role="alert" className="mx-4 mt-3 sm:mx-5 flex items-center gap-2 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                                        <AlertTriangle className="h-4 w-4 shrink-0" />
                                        {error}
                                    </div>
                                )}
                                {saveSuccess && (
                                    <div role="status" className="mx-4 mt-3 sm:mx-5 flex items-center gap-2 rounded-lg border border-brand/25 bg-brand/10 px-3 py-2 text-sm text-brand">
                                        <Check className="h-4 w-4 shrink-0" />
                                        Saved as your default {label.toLowerCase()} template.
                                    </div>
                                )}
                                <div className="flex-1 p-3 sm:p-5">
                                    <textarea
                                        value={templateContent}
                                        onChange={(e) => {
                                            setTemplateContent(e.target.value);
                                            setHasChanges(true);
                                        }}
                                        spellCheck={false}
                                        aria-label={`${label} template content`}
                                        className="w-full h-full resize-none font-mono text-[13px] leading-relaxed p-4 border border-border rounded-xl bg-background/40 transition-colors focus:outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/20"
                                        placeholder="Start from scratch, or choose a starting point…"
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer: the two actions, explained */}
                <div className="px-4 py-4 sm:px-6 border-t border-border bg-surface/60 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground md:max-w-md">
                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                        <span><strong className="font-medium text-foreground">Use template</strong> applies it to your drafts here. <strong className="font-medium text-foreground">Save as default</strong> stores it in your account for every new {label.toLowerCase()}.</span>
                    </p>
                    <div className="flex items-center gap-2 [&>button]:flex-1 [&>button]:justify-center md:[&>button]:flex-none">
                        <button
                            onClick={handleSaveClick}
                            disabled={!hasChanges || isSaving || isLoading}
                            className="flex h-10 items-center gap-2 px-4 rounded-lg border border-input bg-card text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:border-brand/30 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save as default
                        </button>
                        <button
                            onClick={() => onApply(templateContent)}
                            className="flex h-10 items-center gap-2 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-semibold shadow-sm hover:bg-primary/90 transition-colors"
                        >
                            <Check className="h-4 w-4" />
                            Use template
                        </button>
                    </div>
                </div>
            </div>

            {}
            {showOverwriteConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-md p-4 animate-in fade-in duration-150">
                    <div className="w-full max-w-sm bg-popover border border-border rounded-2xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-sm font-semibold">Replace your saved default?</h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                    This overwrites the {label.toLowerCase()} template stored in your account. This action cannot be undone.
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowOverwriteConfirm(false)}
                                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-secondary hover:bg-secondary/70 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveTemplate}
                                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 transition-colors"
                            >
                                Replace & Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
