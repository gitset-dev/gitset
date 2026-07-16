import React, { useState, useEffect } from 'react';
import { X, Save, FileText, AlertTriangle, Check, Loader2, ChevronDown, Library, RotateCcw } from 'lucide-react';

interface TemplateInfo {
    id: string;
    name: string;
    description: string;
}

interface FullTemplate extends TemplateInfo {
    content: string;
}

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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="w-full max-w-4xl h-[80vh] bg-card border border-border rounded-3xl shadow-lg flex flex-col overflow-hidden">
                {}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-brand" />
                        <h2 className="text-lg font-semibold">Edit {type.toUpperCase()} Template</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsLibraryOpen(!isLibraryOpen)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isLibraryOpen
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted hover:bg-muted/80 text-foreground'
                            }`}
                        >
                            <Library className="h-4 w-4" />
                            Templates
                            <ChevronDown className={`h-3 w-3 transition-transform ${isLibraryOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-muted rounded-md">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {}
                <div className="flex-1 flex overflow-hidden bg-background relative">
                    {isLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                            <Loader2 className="h-8 w-8 animate-spin text-brand" />
                        </div>
                    ) : (
                        <>
                            {}
                            {isLibraryOpen && (
                                <div className="w-72 border-r border-border flex flex-col bg-muted/30 shrink-0">
                                    <div className="p-3 border-b border-border">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                            Choose a starting point
                                        </p>
                                    </div>
                                    <div className="flex-1 overflow-y-auto">
                                        {isLoadingLibrary ? (
                                            <div className="flex items-center justify-center p-6">
                                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                            </div>
                                        ) : libraryTemplates.length === 0 ? (
                                            <div className="p-4 text-center text-sm text-muted-foreground">
                                                No templates available.
                                            </div>
                                        ) : (
                                            <div className="p-2 space-y-1">
                                                {libraryTemplates.map((tmpl) => (
                                                    <button
                                                        key={tmpl.id}
                                                        onClick={() => pickTemplate(tmpl.id)}
                                                        disabled={isLoadingPick}
                                                        className="w-full text-left p-2.5 rounded-md hover:bg-muted transition-colors group"
                                                    >
                                                        <div className="text-sm font-medium text-foreground group-hover:text-brand transition-colors">
                                                            {tmpl.name}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                                            {tmpl.description}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {}
                            <div className="flex-1 flex flex-col min-w-0">
                                {error && (
                                    <div className="p-2 bg-destructive/10 text-destructive text-sm text-center border-b border-destructive/20">
                                        {error}
                                    </div>
                                )}
                                {saveSuccess && (
                                    <div className="p-2 bg-brand/10 text-brand text-sm text-center border-b border-brand/20">
                                        Template saved successfully
                                    </div>
                                )}
                                {previewingLibraryTemplate && canRestore && (
                                    <div className="p-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between">
                                        <span className="text-xs text-amber-500">
                                            Previewing: <strong>{previewingLibraryTemplate}</strong> — your saved template is not lost
                                        </span>
                                        <button
                                            onClick={restoreSavedTemplate}
                                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-600 hover:text-amber-500 hover:bg-amber-500/10 rounded transition-colors"
                                        >
                                            <RotateCcw className="h-3 w-3" />
                                            Restore saved
                                        </button>
                                    </div>
                                )}
                                <div className="flex-1 p-4">
                                    <textarea
                                        value={templateContent}
                                        onChange={(e) => {
                                            setTemplateContent(e.target.value);
                                            setHasChanges(true);
                                        }}
                                        className="w-full h-full resize-none bg-transparent font-mono text-sm focus:outline-none p-2 border border-border rounded-md focus:border-brand/50 transition-colors"
                                        placeholder="Start from scratch or pick a template from the library..."
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {}
                <div className="p-4 border-t border-border bg-muted/10 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground max-w-md">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                        <p>
                            This template will be saved to your cloud settings and used as the default for new {type} generations.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSaveClick}
                            disabled={!hasChanges || isSaving || isLoading}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${hasChanges
                                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                : 'bg-muted text-muted-foreground cursor-not-allowed'
                            }`}
                        >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save to Cloud
                        </button>
                        <button
                            onClick={() => onApply(templateContent)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                        >
                            <Check className="h-4 w-4" />
                            Apply & Use
                        </button>
                    </div>
                </div>
            </div>

            {}
            {showOverwriteConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm">
                    <div className="w-full max-w-sm bg-card border border-border rounded-3xl shadow-lg p-6 space-y-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-sm font-semibold">Replace saved template?</h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                    This will permanently overwrite your current saved template. This action cannot be undone.
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowOverwriteConfirm(false)}
                                className="px-3 py-1.5 text-sm font-medium rounded-md bg-muted hover:bg-muted/80 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveTemplate}
                                className="px-3 py-1.5 text-sm font-medium rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
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
