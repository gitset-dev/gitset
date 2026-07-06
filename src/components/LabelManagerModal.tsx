import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, Check, RefreshCw, Loader2, Save, Upload, AlertTriangle, FileText, Wand2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";

interface Label {
    id?: number;
    name: string;
    color: string;
    description?: string;
}

interface LabelManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    backendUrl: string;
    repoContext: string;
    onLabelsChange: () => void;
    gitsetKey?: string;
    githubToken?: string | null;
}

export function LabelManagerModal({ isOpen, onClose, backendUrl, repoContext, onLabelsChange, gitsetKey, githubToken }: LabelManagerModalProps) {
    const [activeTab, setActiveTab] = useState("repo");

    const [repoLabels, setRepoLabels] = useState<Label[]>([]);
    const [repoLoading, setRepoLoading] = useState(false);
    const [repoError, setRepoError] = useState<string | null>(null);
    const [editingRepoLabel, setEditingRepoLabel] = useState<Label | null>(null);
    const [isCreatingRepoLabel, setIsCreatingRepoLabel] = useState(false);
    const [repoFormData, setRepoFormData] = useState<Label>({ name: '', color: 'ffffff', description: '' });
    const [repoActionLoading, setRepoActionLoading] = useState(false);
    const [generateCount, setGenerateCount] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);

    const [packLabels, setPackLabels] = useState<Label[]>([]);
    const [packLoading, setPackLoading] = useState(false);
    const [packError, setPackError] = useState<string | null>(null);
    const [editingPackLabel, setEditingPackLabel] = useState<number | null>(null);
    const [packFormData, setPackFormData] = useState<Label>({ name: '', color: 'ffffff', description: '' });
    const [packActionLoading, setPackActionLoading] = useState(false);
    const [applyMode, setApplyMode] = useState<'missing' | 'replace'>('missing');
    const [showReplaceWarning, setShowReplaceWarning] = useState(false);

    const [showAutoGenerateConfirm, setShowAutoGenerateConfirm] = useState(false);
    const [isSingleGenerating, setIsSingleGenerating] = useState(false);

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [labelToDelete, setLabelToDelete] = useState<string | null>(null);

    const [isImporting, setIsImporting] = useState(false);
    const [importContent, setImportContent] = useState("");

    useEffect(() => {
        if (isOpen && repoContext) {
            fetchRepoLabels();
            if (gitsetKey) {
                fetchLabelPack();
            }
        }
    }, [isOpen, repoContext, gitsetKey]);

    const fetchRepoLabels = async () => {
        setRepoLoading(true);
        setRepoError(null);
        try {
            const [owner, repo] = repoContext.split('/');
            if (!owner || !repo) throw new Error("Invalid repository context");

            const res = await fetch(backendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'list_labels', owner, repo, gitset_key: gitsetKey, token: githubToken })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to fetch labels');
            setRepoLabels(data);
        } catch (err: any) {
            setRepoError(err.message);
        } finally {
            setRepoLoading(false);
        }
    };

    const handleRepoSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setRepoActionLoading(true);
        try {
            const [owner, repo] = repoContext.split('/');
            const action = isCreatingRepoLabel ? 'create_label' : 'update_label';
            const payload: any = {
                action,
                owner,
                repo,
                name: repoFormData.name,
                color: repoFormData.color.replace('#', ''),
                description: repoFormData.description,
                gitset_key: gitsetKey,
                token: githubToken
            };

            if (!isCreatingRepoLabel && editingRepoLabel) {
                payload.current_name = editingRepoLabel.name;
            }

            const res = await fetch(backendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (!res.ok) {
                if (res.status === 422 && Array.isArray(data.errors) && data.errors.some((e: any) => e.code === 'already_exists')) {
                    throw new Error(`Label "${repoFormData.name}" already exists.`);
                }

                if (res.status === 422) {
                    throw new Error(`Label "${repoFormData.name}" already exists or is invalid.`);
                }
                throw new Error(data.error || 'Failed to save label');
            }

            await fetchRepoLabels();
            onLabelsChange();
            resetRepoForm();
        } catch (err: any) {
            setRepoError(err.message);
        } finally {
            setRepoActionLoading(false);
        }
    };

    const handleRepoDelete = (labelName: string) => {
        setLabelToDelete(labelName);
        setShowDeleteConfirm(true);
    };

    const executeDelete = async () => {
        if (!labelToDelete) return;
        setRepoActionLoading(true);
        setShowDeleteConfirm(false);
        try {
            const [owner, repo] = repoContext.split('/');
            const res = await fetch(backendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete_label', owner, repo, name: labelToDelete, gitset_key: gitsetKey, token: githubToken })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to delete label');
            }
            await fetchRepoLabels();
            onLabelsChange();
        } catch (err: any) {
            setRepoError(err.message);
        } finally {
            setRepoActionLoading(false);
            setLabelToDelete(null);
        }
    };

    const resetRepoForm = () => {
        setIsCreatingRepoLabel(false);
        setEditingRepoLabel(null);
        setRepoFormData({ name: '', color: 'ffffff', description: '' });
    };

    const startRepoEdit = (label: Label) => {
        setEditingRepoLabel(label);
        setRepoFormData({ ...label });
        setIsCreatingRepoLabel(false);
    };

    const startRepoCreate = () => {
        resetRepoForm();
        setIsCreatingRepoLabel(true);
        const randomColor = Math.floor(Math.random() * 16777215).toString(16);
        setRepoFormData({ name: '', color: randomColor, description: '' });
    };

    const confirmAutoGenerate = () => {
        if (generateCount >= 3 || repoLabels.length === 0) return;
        setShowAutoGenerateConfirm(true);
    };

    const handleAutoGenerate = async () => {
        setIsGenerating(true);
        setShowAutoGenerateConfirm(false);
        try {
            const res = await fetch(backendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'generate_label_descriptions',
                    labels: repoLabels.map(l => ({ name: l.name, description: l.description })),
                    gitset_key: gitsetKey
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to generate descriptions");
            }

            const newDescriptions = await res.json();

            const [owner, repo] = repoContext.split('/');

            const updates = repoLabels.map(async (label) => {
                const newDesc = newDescriptions[label.name];
                if (newDesc && newDesc !== label.description) {
                    await fetch(backendUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'update_label',
                            owner,
                            repo,
                            current_name: label.name,
                            name: label.name,
                            color: label.color,
                            description: newDesc,
                            gitset_key: gitsetKey,
                            token: githubToken
                        })
                    });
                }
            });

            await Promise.all(updates);

            setGenerateCount(prev => prev + 1);
            await fetchRepoLabels();
            onLabelsChange();
        } catch (err: any) {
            setRepoError(err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSingleLabelGenerate = async () => {
        if (!repoFormData.name) return;
        setIsSingleGenerating(true);
        try {
            const res = await fetch(backendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'generate_label_descriptions',
                    labels: [{ name: repoFormData.name, description: repoFormData.description }],
                    gitset_key: gitsetKey
                })
            });

            if (!res.ok) throw new Error("Failed to generate description");

            const data = await res.json();
            if (data[repoFormData.name]) {
                setRepoFormData(prev => ({ ...prev, description: data[repoFormData.name] }));
            }
        } catch (error) {
            console.error("Single generate failed", error);
        } finally {
            setIsSingleGenerating(false);
        }
    };

    const parseYamlLabels = (content: string): Label[] => {
        const yamlMatch = content.match(/```yaml([\s\S]*?)```/);
        const yamlContent = yamlMatch ? yamlMatch[1] : content;

        const parsedLabels: Label[] = [];
        const lines = yamlContent.split('\n');
        let currentLabel: any = {};

        lines.forEach((line: string) => {
            const nameMatch = line.match(/- name: "(.*?)"/) || line.match(/- name: (.*)/);
            const colorMatch = line.match(/  color: "(.*?)"/) || line.match(/  color: (.*)/);
            const descMatch = line.match(/  description: "(.*?)"/) || line.match(/  description: (.*)/);

            if (nameMatch) {
                if (currentLabel.name) parsedLabels.push(currentLabel);
                currentLabel = { name: nameMatch[1].replace(/^"|"$/g, '').trim() };
            }
            if (colorMatch && currentLabel.name) currentLabel.color = colorMatch[1].replace(/^"|"$/g, '').replace('#', '').trim();
            if (descMatch && currentLabel.name) currentLabel.description = descMatch[1].replace(/^"|"$/g, '').trim();
        });
        if (currentLabel.name) parsedLabels.push(currentLabel);
        return parsedLabels;
    };

    const fetchLabelPack = async () => {
        if (!gitsetKey) return;
        setPackLoading(true);
        try {
            const res = await fetch("/api/repo", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "get_settings", gitset_key: gitsetKey }),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.labels_template) {
                    const parsed = parseYamlLabels(data.labels_template);
                    setPackLabels(parsed);
                }
            }
        } catch (error) {
            console.error("Failed to fetch settings", error);
            setPackError("Failed to load Label Pack");
        } finally {
            setPackLoading(false);
        }
    };

    const saveLabelPack = async () => {
        if (!gitsetKey) return;
        setPackActionLoading(true);
        const content = `<!-- gitset-labels-customized: true -->
\`\`\`yaml
${packLabels.map(l => `- name: "${l.name}"
  color: "${l.color}"
  description: "${l.description || ''}"`).join('\n')}
\`\`\`
`;
        try {
            await fetch("/api/repo", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "update_labels",
                    gitset_key: gitsetKey,
                    content: content
                }),
            });
        } catch (error) {
            setPackError("Failed to save Label Pack");
        } finally {
            setPackActionLoading(false);
        }
    };

    const handleImport = () => {
        if (!importContent.trim()) return;
        const parsed = parseYamlLabels(importContent);
        setPackLabels(parsed);
        setIsImporting(false);
        setImportContent("");
    };

    const handlePackAdd = () => {
        const newLabel = { name: 'new-label', color: 'cccccc', description: 'New label description' };
        setPackLabels([...packLabels, newLabel]);
        setEditingPackLabel(packLabels.length);
        setPackFormData(newLabel);
    };

    const handlePackSaveEdit = () => {
        if (editingPackLabel === null) return;
        const newLabels = [...packLabels];
        newLabels[editingPackLabel] = packFormData;
        setPackLabels(newLabels);
        setEditingPackLabel(null);
    };

    const handlePackDelete = (index: number) => {
        const newLabels = [...packLabels];
        newLabels.splice(index, 1);
        setPackLabels(newLabels);
    };

    const applyPackToRepo = async () => {
        if (!gitsetKey) return;
        setPackActionLoading(true);
        try {
            const [owner, repo] = repoContext.split('/');

            if (applyMode === 'replace') {
                for (const label of repoLabels) {
                    await fetch(backendUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'delete_label', owner, repo, name: label.name, gitset_key: gitsetKey, token: githubToken })
                    });
                }
            }

            const existingNames = applyMode === 'replace' ? [] : repoLabels.map(l => l.name);

            for (const label of packLabels) {
                if (existingNames.includes(label.name)) continue;

                await fetch(backendUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'create_label',
                        owner,
                        repo,
                        name: label.name,
                        color: label.color,
                        description: label.description,
                        gitset_key: gitsetKey,
                        token: githubToken
                    })
                });
            }

            await fetchRepoLabels();
            onLabelsChange();
            setShowReplaceWarning(false);
            setApplyMode('missing');
        } catch (error: any) {
            setPackError(error.message);
        } finally {
            setPackActionLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="w-full max-w-4xl rounded-lg border bg-card p-6 shadow-lg max-h-[90vh] flex flex-col relative"> {}

                {}
                {showAutoGenerateConfirm && (
                    <div className="absolute inset-0 z-60 bg-background/50 backdrop-blur-[2px] flex items-center justify-center rounded-lg">
                        <div className="w-full max-w-sm bg-background border rounded-lg shadow-xl p-6 space-y-4 animate-in fade-in zoom-in duration-200">
                            <div className="flex flex-col items-center text-center space-y-2">
                                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                    <Wand2 className="h-5 w-5 text-foreground" />
                                </div>
                                <h3 className="text-lg font-semibold">Auto-Generate Descriptions</h3>
                                <p className="text-sm text-muted-foreground">
                                    This action will generate professional descriptions for {repoLabels.length} labels using AI, standardizing the repository's metadata.
                                </p>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setShowAutoGenerateConfirm(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-1"
                                    onClick={handleAutoGenerate}
                                >
                                    Continue
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {}
                {showDeleteConfirm && (
                    <div className="absolute inset-0 z-60 bg-background/50 backdrop-blur-[2px] flex items-center justify-center rounded-lg">
                        <div className="w-full max-w-sm bg-background border rounded-lg shadow-xl p-6 space-y-4 animate-in fade-in zoom-in duration-200">
                            <div className="flex flex-col items-center text-center space-y-2">
                                <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                                    <AlertTriangle className="h-5 w-5 text-destructive" />
                                </div>
                                <h3 className="text-lg font-semibold">Delete Label?</h3>
                                <p className="text-sm text-muted-foreground">
                                    Are you sure you want to delete the label <strong>"{labelToDelete}"</strong>? This action cannot be undone.
                                </p>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setShowDeleteConfirm(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    className="flex-1"
                                    onClick={executeDelete}
                                >
                                    Delete
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Label Manager</h2>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-muted">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <Tabs defaultValue="repo" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="repo">Repository Labels</TabsTrigger>
                        <TabsTrigger value="pack">Label Pack (Global)</TabsTrigger>
                    </TabsList>

                    {}
                    <TabsContent value="repo" className="flex-1 flex flex-col overflow-hidden data-[state=inactive]:hidden">
                        {repoError && (
                            <div className="mb-4 p-3 rounded bg-destructive/10 text-destructive text-sm">
                                {repoError}
                            </div>
                        )}
                        <div className="flex gap-6 flex-1 overflow-hidden">
                            {}
                            <div className="flex-1 flex flex-col overflow-hidden border-r pr-4">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-sm font-medium text-muted-foreground">Current Repository Labels</h3>
                                    <div className="flex items-center gap-2">
                                        {repoLabels.length > 0 && generateCount < 3 && (
                                            <button
                                                onClick={confirmAutoGenerate}
                                                disabled={isGenerating}
                                                className="h-6 px-2 text-xs font-medium rounded-md border bg-background hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                                title="Auto-generate descriptions with AI"
                                            >
                                                {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3 text-muted-foreground" />}
                                                Auto-generate
                                            </button>
                                        )}
                                        <button
                                            onClick={startRepoCreate}
                                            className="h-6 px-2 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5"
                                        >
                                            <Plus className="h-3 w-3" /> New Label
                                        </button>
                                    </div>
                                </div>

                                {repoLoading ? (
                                    <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
                                ) : (
                                    <div className="overflow-y-auto space-y-1 flex-1 pr-2">
                                        {repoLabels.map(label => (
                                            <div key={label.id || label.name} className="flex items-center justify-between p-2 rounded hover:bg-muted/50 group">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="px-2 py-0.5 rounded-full text-xs font-medium border"
                                                        style={{ backgroundColor: `#${label.color}`, borderColor: `#${label.color}40`, color: getContrastColor(label.color) }}
                                                    >
                                                        {label.name}
                                                    </span>
                                                    {label.description && <span className="text-xs text-muted-foreground truncate max-w-[200px]">{label.description}</span>}
                                                </div>
                                                <div className="flex gap-1 pl-2">
                                                    <button onClick={() => startRepoEdit(label)} className="p-1 hover:text-brand"><Edit2 className="h-3 w-3" /></button>
                                                    <button onClick={() => handleRepoDelete(label.name)} className="p-1 hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {}
                            {(isCreatingRepoLabel || editingRepoLabel) && (
                                <div className="w-1/3 flex flex-col">
                                    <h3 className="text-sm font-medium mb-4">{isCreatingRepoLabel ? 'Create Label' : 'Edit Label'}</h3>
                                    <form onSubmit={handleRepoSubmit} className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium">Name</label>
                                            <Input
                                                required
                                                value={repoFormData.name}
                                                onChange={e => setRepoFormData({ ...repoFormData, name: e.target.value })}
                                                className="h-8"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium">Color (Hex)</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="color"
                                                    value={`#${repoFormData.color}`}
                                                    onChange={e => setRepoFormData({ ...repoFormData, color: e.target.value.replace('#', '') })}
                                                    className="h-8 w-8 p-0 border-0 rounded cursor-pointer"
                                                />
                                                <Input
                                                    value={repoFormData.color}
                                                    onChange={e => setRepoFormData({ ...repoFormData, color: e.target.value.replace('#', '') })}
                                                    className="h-8 font-mono"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium flex justify-between">
                                                Description
                                                {repoFormData.name && (
                                                    <button
                                                        type="button"
                                                        onClick={handleSingleLabelGenerate}
                                                        disabled={isSingleGenerating}
                                                        className="text-[10px] flex items-center gap-1 text-muted-foreground hover:text-foreground font-medium disabled:opacity-50"
                                                    >
                                                        {isSingleGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                                                        Auto-fill
                                                    </button>
                                                )}
                                            </label>
                                            <Input
                                                value={repoFormData.description}
                                                onChange={e => setRepoFormData({ ...repoFormData, description: e.target.value })}
                                                className="h-8"
                                                placeholder="Label description"
                                            />
                                        </div>

                                        <div className="pt-2 flex gap-2">
                                            <Button type="submit" disabled={repoActionLoading} size="sm" className="flex-1">
                                                {repoActionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                                                Save
                                            </Button>
                                            <Button type="button" variant="outline" onClick={resetRepoForm} size="sm">
                                                Cancel
                                            </Button>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    {}
                    <TabsContent value="pack" className="flex-1 flex flex-col overflow-hidden data-[state=inactive]:hidden">
                        {!gitsetKey ? (
                            <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground">
                                <AlertTriangle className="h-8 w-8 mb-2 opacity-50" />
                                <p>Gitset Key required to manage Label Packs.</p>
                            </div>
                        ) : (
                            <div className="flex gap-6 flex-1 overflow-hidden">
                                {}
                                <div className="flex-1 flex flex-col overflow-hidden border-r pr-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="text-sm font-medium text-muted-foreground">Global Label Pack</h3>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" onClick={() => setIsImporting(!isImporting)} className="h-7 text-xs">
                                                <FileText className="h-3 w-3 mr-1" /> Import
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={saveLabelPack} disabled={packActionLoading} className="h-7 text-xs">
                                                <Save className="h-3 w-3 mr-1" /> Save Pack
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={handlePackAdd} className="h-7 text-xs text-brand">
                                                <Plus className="h-3 w-3 mr-1" /> Add
                                            </Button>
                                        </div>
                                    </div>

                                    {isImporting ? (
                                        <div className="flex-1 flex flex-col gap-4 p-1 min-h-0">
                                            <div className="flex-1 min-h-0 border rounded-md overflow-hidden">
                                                <Textarea
                                                    className="w-full h-full font-mono text-xs resize-none border-0 focus-visible:ring-0 p-4"
                                                    placeholder="Paste your labels.md content here..."
                                                    value={importContent}
                                                    onChange={e => setImportContent(e.target.value)}
                                                />
                                            </div>
                                            <div className="flex gap-2 justify-end shrink-0">
                                                <Button size="sm" variant="ghost" onClick={() => setIsImporting(false)}>Cancel</Button>
                                                <Button size="sm" onClick={handleImport}>Parse & Import</Button>
                                            </div>
                                        </div>
                                    ) : (
                                        packLoading ? (
                                            <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
                                        ) : (
                                            <div className="overflow-y-auto space-y-1 flex-1 pr-2">
                                                {packLabels.length === 0 && (
                                                    <div className="text-center p-4 text-sm text-muted-foreground">No labels in pack. Add some!</div>
                                                )}
                                                {packLabels.map((label, i) => (
                                                    <div key={i} className="flex items-center justify-between p-2 rounded hover:bg-muted/50 group">
                                                        {editingPackLabel === i ? (
                                                            <div className="flex items-center gap-2 w-full">
                                                                <div className="flex items-center gap-1">
                                                                    <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: `#${packFormData.color}` }} />
                                                                    <Input className="h-6 w-16 text-xs font-mono p-1" value={packFormData.color} onChange={e => setPackFormData({ ...packFormData, color: e.target.value })} />
                                                                </div>
                                                                <Input className="h-6 w-24 text-xs p-1" value={packFormData.name} onChange={e => setPackFormData({ ...packFormData, name: e.target.value })} placeholder="Name" />
                                                                <Input className="h-6 flex-1 text-xs p-1" value={packFormData.description} onChange={e => setPackFormData({ ...packFormData, description: e.target.value })} placeholder="Description" />
                                                                <Button size="icon" variant="ghost" className="h-6 w-6 text-brand" onClick={handlePackSaveEdit}><Check className="h-3 w-3" /></Button>
                                                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingPackLabel(null)}><X className="h-3 w-3" /></Button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="flex items-center gap-2">
                                                                    <span
                                                                        className="px-2 py-0.5 rounded-full text-xs font-medium border"
                                                                        style={{ backgroundColor: `#${label.color}`, borderColor: `#${label.color}40`, color: getContrastColor(label.color) }}
                                                                    >
                                                                        {label.name}
                                                                    </span>
                                                                    {label.description && <span className="text-xs text-muted-foreground truncate max-w-[150px]">{label.description}</span>}
                                                                </div>
                                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button onClick={() => { setEditingPackLabel(i); setPackFormData(label); }} className="p-1 hover:text-brand"><Edit2 className="h-3 w-3" /></button>
                                                                    <button onClick={() => handlePackDelete(i)} className="p-1 hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )
                                    )}
                                </div>

                                {}
                                <div className="w-1/3 flex flex-col border-l pl-4">
                                    <h3 className="text-sm font-medium mb-4">Apply to Repository</h3>
                                    <div className="space-y-4">
                                        <div className="p-3 bg-muted/30 rounded-md text-sm">
                                            <p className="mb-2 font-medium">Pack Stats:</p>
                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                <span>Total Labels:</span>
                                                <span>{packLabels.length}</span>
                                            </div>
                                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                                <span>New to Repo:</span>
                                                <span>{packLabels.filter(pl => !repoLabels.some(rl => rl.name === pl.name)).length}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Button
                                                variant={applyMode === 'missing' ? 'default' : 'outline'}
                                                className="w-full justify-start"
                                                onClick={() => { setApplyMode('missing'); setShowReplaceWarning(false); }}
                                            >
                                                <Upload className="mr-2 h-4 w-4" /> Add Missing Labels
                                            </Button>
                                            <Button
                                                variant={applyMode === 'replace' ? 'destructive' : 'outline'}
                                                className="w-full justify-start"
                                                onClick={() => { setApplyMode('replace'); setShowReplaceWarning(true); }}
                                            >
                                                <RefreshCw className="mr-2 h-4 w-4" /> Replace All Labels
                                            </Button>
                                        </div>

                                        {showReplaceWarning && applyMode === 'replace' && (
                                            <Alert variant="destructive">
                                                <AlertTriangle className="h-4 w-4" />
                                                <AlertTitle>Warning</AlertTitle>
                                                <AlertDescription>
                                                    This will delete ALL existing labels in <strong>{repoContext}</strong> and replace them with this pack. This action cannot be undone.
                                                </AlertDescription>
                                            </Alert>
                                        )}

                                        <Button
                                            className="w-full mt-4"
                                            disabled={packActionLoading || packLabels.length === 0}
                                            variant={applyMode === 'replace' ? 'destructive' : 'default'}
                                            onClick={applyPackToRepo}
                                        >
                                            {packActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                                            Confirm & Apply
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
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
