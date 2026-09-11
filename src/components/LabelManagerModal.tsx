import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, Edit2, Check, Loader2, Save, AlertTriangle, FileText, Wand2, Package, Search, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    /** Names currently chosen for the draft. Omit to run the modal as manage-only. */
    selectedLabels?: string[];
    onSelectionChange?: (names: string[]) => void;
    /** What the labels are being put on, so the modal can say so. */
    target?: 'issue' | 'pull request';
}

/**
 * Labels for the draft in progress, and the labels that exist to choose from.
 *
 * The previous version opened straight into edit/delete with no way to choose
 * a label at all — the one thing someone opening it from Issues Crafter or PR
 * Maker actually wants (gitset-dev/gitset#58). Choosing is now the primary
 * gesture: the row itself is the toggle, and editing hides behind a hover
 * affordance rather than competing with it.
 *
 * Transfers between the repository and the saved pack were also ambiguous —
 * "Import" and "Export to Pack" sat on opposite tabs and neither said which
 * way anything moved. Both now live with the pack, named for their direction
 * and their endpoints.
 */
export function LabelManagerModal({
    isOpen,
    onClose,
    backendUrl,
    repoContext,
    onLabelsChange,
    gitsetKey,
    githubToken,
    selectedLabels,
    onSelectionChange,
    target = 'issue',
}: LabelManagerModalProps) {
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
    const [query, setQuery] = useState('');

    const [packLabels, setPackLabels] = useState<Label[]>([]);
    const [packLoading, setPackLoading] = useState(false);
    const [packError, setPackError] = useState<string | null>(null);
    const [editingPackLabel, setEditingPackLabel] = useState<number | null>(null);
    const [packFormData, setPackFormData] = useState<Label>({ name: '', color: 'ffffff', description: '' });
    const [packActionLoading, setPackActionLoading] = useState(false);
    const [packSaved, setPackSaved] = useState(false);

    const [showAutoGenerateConfirm, setShowAutoGenerateConfirm] = useState(false);
    const [isSingleGenerating, setIsSingleGenerating] = useState(false);

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [labelToDelete, setLabelToDelete] = useState<string | null>(null);

    const [isImporting, setIsImporting] = useState(false);
    const [importContent, setImportContent] = useState("");
    const [importNotice, setImportNotice] = useState<string | null>(null);
    const [showImportConfirm, setShowImportConfirm] = useState(false);
    const [showApplyConfirm, setShowApplyConfirm] = useState(false);

    const selectable = typeof onSelectionChange === 'function';
    const selected = useMemo(() => new Set(selectedLabels || []), [selectedLabels]);

    useEffect(() => {
        if (isOpen && repoContext) {
            fetchRepoLabels();
            if (gitsetKey) {
                fetchLabelPack();
            }
        }
    }, [isOpen, repoContext, gitsetKey]);

    const toggleSelected = (name: string) => {
        if (!onSelectionChange) return;
        const next = new Set(selectedLabels || []);
        if (next.has(name)) next.delete(name); else next.add(name);
        onSelectionChange([...next]);
    };

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
                throw new Error(data.error || 'Failed to save label');
            }

            // A rename has to follow through to the draft, or the selection
            // would silently point at a label that no longer exists.
            if (!isCreatingRepoLabel && editingRepoLabel && onSelectionChange
                && editingRepoLabel.name !== repoFormData.name
                && (selectedLabels || []).includes(editingRepoLabel.name)) {
                onSelectionChange((selectedLabels || []).map((n) => (n === editingRepoLabel.name ? repoFormData.name : n)));
            }

            resetRepoForm();
            await fetchRepoLabels();
            onLabelsChange();
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
            // Deleting it from the repo has to drop it from the draft too.
            if (onSelectionChange && (selectedLabels || []).includes(labelToDelete)) {
                onSelectionChange((selectedLabels || []).filter((n) => n !== labelToDelete));
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
            setImportNotice(null);
            setPackSaved(true);
            setTimeout(() => setPackSaved(false), 2500);
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
        setImportNotice(`${parsed.length} labels read from the pasted text. Nothing is saved until you choose Save pack.`);
    };

    const importFromRepo = () => {
        if (repoLabels.length === 0) return;
        if (packLabels.length > 0) {
            setShowImportConfirm(true);
            return;
        }
        applyRepoImport('replace');
    };

    const applyRepoImport = (mode: 'replace' | 'merge') => {
        const imported = repoLabels.map(l => ({ name: l.name, color: l.color, description: l.description || '' }));
        if (mode === 'merge') {
            const existing = new Set(packLabels.map(l => l.name.toLowerCase()));
            const added = imported.filter(l => !existing.has(l.name.toLowerCase()));
            setPackLabels([...packLabels, ...added]);
            setImportNotice(`${added.length} labels added from ${repoContext}. Nothing is saved until you choose Save pack.`);
        } else {
            setPackLabels(imported);
            setImportNotice(`${imported.length} labels copied from ${repoContext}. Nothing is saved until you choose Save pack.`);
        }
        setShowImportConfirm(false);
        setIsImporting(false);
        setImportContent("");
        setActiveTab('pack');
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

    const applyPackToRepo = async (mode: 'missing' | 'replace') => {
        if (!gitsetKey) return;
        setShowApplyConfirm(false);
        setPackActionLoading(true);
        try {
            const [owner, repo] = repoContext.split('/');

            if (mode === 'replace') {
                for (const label of repoLabels) {
                    await fetch(backendUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'delete_label', owner, repo, name: label.name, gitset_key: gitsetKey, token: githubToken })
                    });
                }
            }

            const existingNames = mode === 'replace' ? [] : repoLabels.map(l => l.name);

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

            // Replacing wipes the repo's labels first, so anything chosen for
            // the draft that the pack does not bring back no longer exists.
            if (mode === 'replace' && onSelectionChange) {
                const packNames = new Set(packLabels.map((l) => l.name));
                onSelectionChange((selectedLabels || []).filter((n) => packNames.has(n)));
            }

            await fetchRepoLabels();
            onLabelsChange();
            setActiveTab('repo');
        } catch (error: any) {
            setPackError(error.message);
        } finally {
            setPackActionLoading(false);
        }
    };

    const visibleLabels = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return repoLabels;
        return repoLabels.filter((l) =>
            l.name.toLowerCase().includes(q) || (l.description || '').toLowerCase().includes(q));
    }, [repoLabels, query]);

    if (!isOpen) return null;

    const selectedCount = selected.size;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-3xl rounded-lg border bg-card shadow-lg max-h-[90vh] flex flex-col relative overflow-hidden">

                {showAutoGenerateConfirm && (
                    <ConfirmOverlay
                        icon={<Wand2 className="h-5 w-5 text-foreground" />}
                        title="Write descriptions with AI"
                        body={<>Gitset will write a description for each of the {repoLabels.length} labels in {repoContext} and save them to GitHub, replacing any description already there.</>}
                        actions={[
                            { label: 'Cancel', variant: 'outline', onClick: () => setShowAutoGenerateConfirm(false) },
                            { label: 'Write descriptions', onClick: handleAutoGenerate },
                        ]}
                    />
                )}

                {showImportConfirm && (
                    <ConfirmOverlay
                        icon={<ArrowDownToLine className="h-5 w-5 text-foreground" />}
                        title="Copy into your pack"
                        body={<>Your pack already holds <strong>{packLabels.length}</strong> labels. Add only the ones it is missing from <strong>{repoContext}</strong>, or replace the pack with that repository's <strong>{repoLabels.length}</strong> labels?</>}
                        actions={[
                            { label: 'Cancel', variant: 'ghost', onClick: () => setShowImportConfirm(false) },
                            { label: 'Add missing', variant: 'outline', onClick: () => applyRepoImport('merge') },
                            { label: 'Replace pack', onClick: () => applyRepoImport('replace') },
                        ]}
                    />
                )}

                {showApplyConfirm && (
                    <ConfirmOverlay
                        icon={<ArrowUpFromLine className="h-5 w-5 text-foreground" />}
                        title={`Apply your pack to ${repoContext}`}
                        body={<>Create the pack's <strong>{packLabels.length}</strong> labels on <strong>{repoContext}</strong>. Adding leaves the repository's existing labels alone. Replacing <strong>deletes all {repoLabels.length} of them first</strong>, including on issues already using them.</>}
                        actions={[
                            { label: 'Cancel', variant: 'ghost', onClick: () => setShowApplyConfirm(false) },
                            { label: 'Add missing', variant: 'outline', onClick: () => applyPackToRepo('missing') },
                            { label: 'Replace all', variant: 'destructive', onClick: () => applyPackToRepo('replace') },
                        ]}
                    />
                )}

                {showDeleteConfirm && (
                    <ConfirmOverlay
                        icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
                        title="Delete this label?"
                        body={<>"{labelToDelete}" will be removed from {repoContext} and from every issue and pull request using it. This cannot be undone.</>}
                        actions={[
                            { label: 'Cancel', variant: 'outline', onClick: () => setShowDeleteConfirm(false) },
                            { label: 'Delete', variant: 'destructive', onClick: executeDelete },
                        ]}
                    />
                )}

                <div className="flex items-start justify-between gap-4 border-b px-6 py-4">
                    <div className="min-w-0">
                        <h2 className="text-lg font-semibold">Labels</h2>
                        <p className="text-xs text-muted-foreground truncate">
                            {selectable
                                ? <>Choose the labels for the {target} you're drafting in <span className="font-medium text-foreground">{repoContext || 'this repository'}</span></>
                                : <>Manage the labels in <span className="font-medium text-foreground">{repoContext || 'this repository'}</span></>}
                        </p>
                    </div>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-muted shrink-0" aria-label="Close">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-6 pt-4">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="repo">This repository</TabsTrigger>
                            <TabsTrigger value="pack">My label pack</TabsTrigger>
                        </TabsList>
                    </div>

                    {/* ── THIS REPOSITORY ─────────────────────────────────── */}
                    <TabsContent value="repo" className="flex-1 flex flex-col overflow-hidden data-[state=inactive]:hidden px-6 pb-2 pt-4 mt-0">
                        {repoError && (
                            <div className="mb-3 rounded bg-destructive/10 px-3 py-2 text-sm text-destructive">{repoError}</div>
                        )}

                        <div className="mb-3 flex items-center gap-2">
                            <div className="relative flex-1">
                                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder={`Search ${repoLabels.length} labels`}
                                    className="h-8 pl-8 text-sm"
                                />
                            </div>
                            <Button size="sm" className="h-8 shrink-0 text-xs" onClick={startRepoCreate}>
                                <Plus className="mr-1 h-3 w-3" /> New label
                            </Button>
                        </div>

                        {(isCreatingRepoLabel || editingRepoLabel) && (
                            <form onSubmit={handleRepoSubmit} className="mb-3 space-y-2 rounded-lg border bg-muted/30 p-3">
                                <div className="flex items-center gap-2">
                                    <Input
                                        value={repoFormData.name}
                                        onChange={(e) => setRepoFormData({ ...repoFormData, name: e.target.value })}
                                        placeholder="Label name"
                                        className="h-8 flex-1 text-sm"
                                        required
                                    />
                                    <label className="flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2" title="Label colour">
                                        <input
                                            type="color"
                                            value={`#${repoFormData.color.replace('#', '')}`}
                                            onChange={(e) => setRepoFormData({ ...repoFormData, color: e.target.value.replace('#', '') })}
                                            className="h-4 w-6 cursor-pointer border-0 bg-transparent p-0"
                                        />
                                        <span className="font-mono text-[10px] text-muted-foreground">{repoFormData.color.replace('#', '')}</span>
                                    </label>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Textarea
                                        value={repoFormData.description}
                                        onChange={(e) => setRepoFormData({ ...repoFormData, description: e.target.value })}
                                        placeholder="What this label means"
                                        className="min-h-[56px] flex-1 text-sm"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8 shrink-0 text-xs"
                                        onClick={handleSingleLabelGenerate}
                                        disabled={!repoFormData.name || isSingleGenerating}
                                        title="Write this description with AI"
                                    >
                                        {isSingleGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                                    </Button>
                                </div>
                                <div className="flex gap-2">
                                    <Button type="submit" size="sm" className="h-8 flex-1 text-xs" disabled={repoActionLoading}>
                                        {repoActionLoading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Check className="mr-1 h-3 w-3" />}
                                        {isCreatingRepoLabel ? 'Create label' : 'Save changes'}
                                    </Button>
                                    <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={resetRepoForm}>Cancel</Button>
                                </div>
                            </form>
                        )}

                        <div className="flex-1 overflow-y-auto -mx-1 px-1">
                            {repoLoading ? (
                                <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading labels…
                                </div>
                            ) : visibleLabels.length === 0 ? (
                                <p className="py-10 text-center text-sm text-muted-foreground">
                                    {repoLabels.length === 0 ? 'This repository has no labels yet.' : 'No labels match that search.'}
                                </p>
                            ) : (
                                <ul className="space-y-1">
                                    {visibleLabels.map((label) => {
                                        const isSelected = selected.has(label.name);
                                        const Row = selectable ? 'button' : 'div';
                                        return (
                                            <li key={label.id ?? label.name} className="group relative">
                                                <Row
                                                    {...(selectable ? { type: 'button' as const, onClick: () => toggleSelected(label.name), 'aria-pressed': isSelected } : {})}
                                                    className={`flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors ${
                                                        selectable ? 'hover:border-brand/50 hover:bg-accent/50' : ''
                                                    } ${isSelected ? 'border-brand/60 bg-brand/5' : 'border-transparent'}`}
                                                >
                                                    {selectable && (
                                                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${isSelected ? 'border-brand bg-brand text-background' : 'border-muted-foreground/40'}`}>
                                                            {isSelected && <Check className="h-3 w-3" />}
                                                        </span>
                                                    )}
                                                    <span
                                                        className="shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium"
                                                        style={{ backgroundColor: `#${label.color}`, borderColor: `#${label.color}40`, color: getContrastColor(label.color) }}
                                                    >
                                                        {label.name}
                                                    </span>
                                                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                                                        {label.description || <span className="italic opacity-60">No description</span>}
                                                    </span>
                                                    <span className="w-[52px] shrink-0" aria-hidden="true" />
                                                </Row>
                                                {/* Editing sits outside the selection target so a click
                                                    to edit can never be read as a click to choose. */}
                                                <span className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                                                    <button
                                                        type="button"
                                                        onClick={() => startRepoEdit(label)}
                                                        className="rounded p-1 text-muted-foreground hover:bg-background hover:text-brand"
                                                        title={`Edit "${label.name}"`}
                                                    >
                                                        <Edit2 className="h-3 w-3" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRepoDelete(label.name)}
                                                        className="rounded p-1 text-muted-foreground hover:bg-background hover:text-destructive"
                                                        title={`Delete "${label.name}"`}
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </button>
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>

                        {repoLabels.length > 0 && generateCount < 3 && (
                            <button
                                type="button"
                                onClick={confirmAutoGenerate}
                                disabled={isGenerating}
                                className="mt-2 flex items-center gap-1.5 self-start text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                            >
                                {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                                {isGenerating ? 'Writing descriptions…' : 'Write missing descriptions with AI'}
                            </button>
                        )}
                    </TabsContent>

                    {/* ── MY LABEL PACK ───────────────────────────────────── */}
                    <TabsContent value="pack" className="flex-1 flex flex-col overflow-hidden data-[state=inactive]:hidden px-6 pb-2 pt-4 mt-0">
                        {packError && (
                            <div className="mb-3 rounded bg-destructive/10 px-3 py-2 text-sm text-destructive">{packError}</div>
                        )}

                        <p className="mb-3 text-xs text-muted-foreground">
                            A set of labels saved to your account, so you can put the same ones on any repository.
                            It is not connected to {repoContext || 'this repository'} until you move labels between them below.
                        </p>

                        {/* Both transfers live here, named for their direction. They
                            used to sit on opposite tabs as "Import" and "Export to
                            Pack", which said nothing about what moved where. */}
                        <div className="mb-3 grid gap-2 sm:grid-cols-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-auto justify-start gap-2 py-2 text-left text-xs"
                                onClick={importFromRepo}
                                disabled={!gitsetKey || repoLabels.length === 0}
                            >
                                <ArrowDownToLine className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                <span className="min-w-0">
                                    <span className="block font-medium">Copy into pack</span>
                                    <span className="block truncate text-[11px] font-normal text-muted-foreground">from {repoContext || 'this repository'}</span>
                                </span>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-auto justify-start gap-2 py-2 text-left text-xs"
                                onClick={() => setShowApplyConfirm(true)}
                                disabled={!gitsetKey || packLabels.length === 0 || packActionLoading}
                            >
                                {packActionLoading
                                    ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                                    : <ArrowUpFromLine className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                                <span className="min-w-0">
                                    <span className="block font-medium">Apply pack</span>
                                    <span className="block truncate text-[11px] font-normal text-muted-foreground">to {repoContext || 'this repository'}</span>
                                </span>
                            </Button>
                        </div>

                        {importNotice && (
                            <div className="mb-3 flex items-start gap-2 rounded border border-brand/30 bg-brand/5 px-3 py-2 text-xs">
                                <span className="flex-1">{importNotice}</span>
                                <button onClick={() => setImportNotice(null)} className="shrink-0 text-muted-foreground hover:text-foreground">
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        )}

                        {isImporting && (
                            <div className="mb-3 space-y-2 rounded-lg border bg-muted/30 p-3">
                                <Textarea
                                    placeholder={'Paste labels as YAML:\n- name: "bug"\n  color: "d73a4a"\n  description: "Something is broken"'}
                                    className="min-h-[110px] font-mono text-xs"
                                    value={importContent}
                                    onChange={(e) => setImportContent(e.target.value)}
                                />
                                <div className="flex justify-end gap-2">
                                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setIsImporting(false)}>Cancel</Button>
                                    <Button size="sm" className="h-7 text-xs" onClick={handleImport} disabled={!importContent.trim()}>
                                        Replace pack with this
                                    </Button>
                                </div>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto -mx-1 px-1">
                            {packLoading ? (
                                <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading your pack…
                                </div>
                            ) : packLabels.length === 0 ? (
                                <p className="py-10 text-center text-sm text-muted-foreground">
                                    Your pack is empty. Copy this repository's labels into it, or add them one at a time.
                                </p>
                            ) : (
                                <ul className="space-y-1">
                                    {packLabels.map((label, i) => (
                                        <li key={`${label.name}-${i}`} className="group flex items-center gap-3 rounded-md border border-transparent px-3 py-2 hover:bg-accent/40">
                                            {editingPackLabel === i ? (
                                                <>
                                                    <Input className="h-7 w-32 text-xs" value={packFormData.name} onChange={(e) => setPackFormData({ ...packFormData, name: e.target.value })} placeholder="Name" />
                                                    <Input className="h-7 flex-1 text-xs" value={packFormData.description} onChange={(e) => setPackFormData({ ...packFormData, description: e.target.value })} placeholder="Description" />
                                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-brand" onClick={handlePackSaveEdit}><Check className="h-3 w-3" /></Button>
                                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingPackLabel(null)}><X className="h-3 w-3" /></Button>
                                                </>
                                            ) : (
                                                <>
                                                    <span
                                                        className="shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium"
                                                        style={{ backgroundColor: `#${label.color}`, borderColor: `#${label.color}40`, color: getContrastColor(label.color) }}
                                                    >
                                                        {label.name}
                                                    </span>
                                                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                                                        {label.description || <span className="italic opacity-60">No description</span>}
                                                    </span>
                                                    <span className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                                                        <button type="button" onClick={() => { setEditingPackLabel(i); setPackFormData(label); }} className="rounded p-1 text-muted-foreground hover:text-brand" title={`Edit "${label.name}"`}>
                                                            <Edit2 className="h-3 w-3" />
                                                        </button>
                                                        <button type="button" onClick={() => handlePackDelete(i)} className="rounded p-1 text-muted-foreground hover:text-destructive" title={`Remove "${label.name}" from the pack`}>
                                                            <Trash2 className="h-3 w-3" />
                                                        </button>
                                                    </span>
                                                </>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="mt-2 flex items-center gap-3 text-xs">
                            <button type="button" onClick={handlePackAdd} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                                <Plus className="h-3 w-3" /> Add label
                            </button>
                            <button type="button" onClick={() => setIsImporting(!isImporting)} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                                <FileText className="h-3 w-3" /> Paste YAML
                            </button>
                            <Button
                                size="sm"
                                variant={packSaved ? 'outline' : 'default'}
                                className="ml-auto h-7 text-xs"
                                onClick={saveLabelPack}
                                disabled={!gitsetKey || packActionLoading}
                            >
                                {packSaved ? <Check className="mr-1 h-3 w-3" /> : <Save className="mr-1 h-3 w-3" />}
                                {packSaved ? 'Saved' : 'Save pack'}
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>

                <div className="flex items-center justify-between gap-4 border-t px-6 py-3">
                    <p className="text-xs text-muted-foreground">
                        {selectable
                            ? (selectedCount === 0
                                ? `No labels on this ${target} yet`
                                : <><span className="font-medium text-foreground">{selectedCount}</span> {selectedCount === 1 ? 'label' : 'labels'} on this {target}</>)
                            : <>{repoLabels.length} labels in this repository</>}
                    </p>
                    <div className="flex items-center gap-2">
                        {selectable && selectedCount > 0 && (
                            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => onSelectionChange?.([])}>
                                Clear
                            </Button>
                        )}
                        <Button size="sm" className="h-8 text-xs" onClick={onClose}>Done</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ConfirmOverlay({ icon, title, body, actions }: {
    icon: React.ReactNode;
    title: string;
    body: React.ReactNode;
    actions: { label: string; onClick: () => void; variant?: 'outline' | 'ghost' | 'destructive' }[];
}) {
    return (
        <div className="absolute inset-0 z-[60] flex items-center justify-center rounded-lg bg-background/60 p-4 backdrop-blur-[2px]">
            <div className="w-full max-w-sm space-y-4 rounded-lg border bg-background p-6 shadow-xl animate-in fade-in zoom-in duration-200">
                <div className="flex flex-col items-center space-y-2 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">{icon}</div>
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <p className="text-sm text-muted-foreground">{body}</p>
                </div>
                <div className="flex gap-2 pt-2">
                    {actions.map((a) => (
                        <Button key={a.label} variant={a.variant} className="flex-1 text-xs" onClick={a.onClick}>
                            {a.label}
                        </Button>
                    ))}
                </div>
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
