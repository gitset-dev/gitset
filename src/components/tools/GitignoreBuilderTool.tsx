import React, { useState, useEffect } from 'react';
import { RepositorySelector } from '../RepositorySelector';
import { ghFetch } from '@/lib/githubProxy';
import { Loader2, Save, FileCode, Check, AlertTriangle, FolderGit2, X, Copy, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PostGenerationSuccessModal } from "@/components/modals/PostGenerationSuccessModal";
import ToolErrorNotice from './ToolErrorNotice';

interface GitignoreBuilderToolProps {
    user: any;
    backendUrl: string;
}

export function GitignoreBuilderTool({ user, backendUrl }: GitignoreBuilderToolProps) {
    const [repoContext, setRepoContext] = useState('');
    const [branch, setBranch] = useState('');

    const [allTemplates, setAllTemplates] = useState<string[]>([]);
    const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [loadingTemplates, setLoadingTemplates] = useState(false);

    const [generatedContent, setGeneratedContent] = useState('');
    const [existingContent, setExistingContent] = useState<string | null>(null);
    const [existingSha, setExistingSha] = useState<string | null>(null);
    const [finalPreviewContent, setFinalPreviewContent] = useState('');

    const [activeTab, setActiveTab] = useState("composer");
    const [saving, setSaving] = useState(false);
    const [mergeStrategy, setMergeStrategy] = useState<'replace' | 'append'>('replace');
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [successModalOpen, setSuccessModalOpen] = useState(false);
    const [generatedFileUrl, setGeneratedFileUrl] = useState<string | null>(null);

    const [copied, setCopied] = useState(false);

    useEffect(() => {
        loadTemplates();
    }, []);

    useEffect(() => {
        if (repoContext && branch) {
            checkExistingFile();
        } else {
            setExistingContent(null);
            setExistingSha(null);
        }
    }, [repoContext, branch]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (selectedTemplates.size > 0) {
                generateContent();
            } else {
                setGeneratedContent('');
            }
        }, 500);
        return () => clearTimeout(timeout);
    }, [selectedTemplates]);

    useEffect(() => {
        const content = getCalculatedPreview();
        setFinalPreviewContent(content);
    }, [generatedContent, existingContent, mergeStrategy]);

    const loadTemplates = async () => {
        setLoadingTemplates(true);
        try {
            const res = await fetch(`${backendUrl}?action=list&gitset_key=${user.gitsetKey}`);
            if (!res.ok) throw new Error('Failed to load templates');
            const data = await res.json();

            const rawTemplates = (data.templates || []).map((t: any) => t.name);
            const uniqueTemplates = Array.from(new Set(rawTemplates)) as string[];
            setAllTemplates(uniqueTemplates);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingTemplates(false);
        }
    };

    const checkExistingFile = async () => {
        if (!user.githubOauthToken || !repoContext || !branch) return;

        try {
            const res = await ghFetch(`/repos/${repoContext}/contents/.gitignore?ref=${branch}`, {
                headers: {
                    Accept: "application/vnd.github.v3+json",
                }
            });

            if (res.status === 404) {
                setExistingContent(null);
                setExistingSha(null);
                return;
            }

            if (!res.ok) throw new Error("Failed to check .gitignore");

            const data = await res.json();

            const content = atob(data.content.replace(/\n/g, ''));
            setExistingContent(content);
            setExistingSha(data.sha);
        } catch (err) {
            console.error("Error fetching existing file:", err);
        }
    };

    const generateContent = async () => {
        if (selectedTemplates.size === 0) return;

        try {
            const res = await fetch(backendUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "generate",
                    gitset_key: user.gitsetKey,
                    identifiers: Array.from(selectedTemplates)
                })
            });

            if (!res.ok) throw new Error("Failed to generate");
            const data = await res.json();
            setGeneratedContent(data.content);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSave = async () => {
        if (!user.githubOauthToken) {
            alert("Please link your GitHub account first.");
            return;
        }
        if (!repoContext || !branch) {
            alert("Please select a repository and branch.");
            return;
        }

        setSaving(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const finalContent = finalPreviewContent;

            const message = existingContent
                ? `docs: Update .gitignore via Gitset`
                : `docs: Create .gitignore via Gitset`;

            const payload: any = {
                message: message,
                content: btoa(finalContent),
                branch: branch
            };

            if (existingSha) {
                payload.sha = existingSha;
            }

            const res = await ghFetch(`/repos/${repoContext}/contents/.gitignore`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || "Failed to save file");
            }

            setSuccessMessage("Successfully saved .gitignore!");
            setGeneratedFileUrl(`https://github.com/${repoContext}/blob/${branch}/.gitignore`);
            setSuccessModalOpen(true);

            checkExistingFile();
            setActiveTab('composer');

            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const toggleTemplate = (t: string) => {
        const next = new Set(selectedTemplates);
        if (next.has(t)) next.delete(t);
        else next.add(t);
        setSelectedTemplates(next);
    };

    const filteredTemplates = allTemplates.filter(t =>
        t.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedContent).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const getCalculatedPreview = () => {
        if (!existingContent) return generatedContent;
        if (mergeStrategy === 'append') return existingContent + "\n\n" + generatedContent;
        return generatedContent;
    };

    return (
        <div className="flex flex-col gap-6 h-full pb-20">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                <div className="mb-6">
                    <TabsList>
                        <TabsTrigger value="composer" className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            Composer
                        </TabsTrigger>
                        <TabsTrigger value="review" disabled={!generatedContent || !repoContext || !branch} className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-square-diff"><path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z" /><path d="M10 15h4" /><path d="M10 9h4" /><path d="M12 7v4" /></svg>
                            Review & Save
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="composer" className="flex-1 flex flex-col gap-6 mt-0">
                    {}
                    <div className="space-y-4 p-6 border rounded-xl bg-card">
                        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                            <div>
                                <h2 className="text-sm font-semibold flex items-center gap-2">
                                    <FolderGit2 className="h-4 w-4" /> Repository Context
                                </h2>
                            </div>
                            {repoContext && branch && (
                                <div className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-full border ${existingContent ? "bg-amber-500/10 border-amber-500/20 text-amber-600" : "bg-brand/10 border-brand/20 text-brand"}`}>
                                    {existingContent ? (
                                        <>
                                            <AlertTriangle className="h-3.5 w-3.5" />
                                            <span className="font-medium">.gitignore already exists in this branch</span>
                                        </>
                                    ) : (
                                        <>
                                            <Check className="h-3.5 w-3.5" />
                                            <span className="font-medium">No .gitignore found (Safe to create)</span>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="max-w-xl">
                            <RepositorySelector
                                githubToken={user.githubOauthToken}
                                value={repoContext}
                                onChange={setRepoContext}
                                branchValue={branch}
                                onBranchChange={setBranch}
                                showBranchSelector={true}
                                placeholder="Select Repository"
                            />
                        </div>
                    </div>

                    <div className="grid gap-8 lg:grid-cols-2 flex-1 items-start">
                        {}
                        <div className="flex flex-col gap-4 h-[600px] lg:h-full min-h-[500px]">
                            <div className="flex items-center justify-between">
                                <h3 className="font-medium">Available Templates</h3>
                                <div className="flex items-center gap-2">
                                    <Badge variant="default" className="px-2 py-1">
                                        {selectedTemplates.size} selected
                                    </Badge>
                                    {selectedTemplates.size > 0 && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground"
                                            onClick={() => setSelectedTemplates(new Set())}
                                        >
                                            <X className="h-3 w-3" />
                                            Clear
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <Input
                                placeholder="Search templates (e.g. Node, Python, MacOS)..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />

                            <div className="flex-1 border rounded-md bg-muted/10 overflow-y-auto p-4 content-start min-h-[400px] max-h-[600px]">
                                {loadingTemplates ? (
                                    <div className="flex items-center justify-center h-40">
                                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                    </div>
                                ) : filteredTemplates.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">No templates found</div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {filteredTemplates.map(t => (
                                            <Badge
                                                key={t}
                                                variant={selectedTemplates.has(t) ? "default" : "outline"}
                                                className={`cursor-pointer hover:opacity-80 transition-all text-sm py-1 px-3 ${!selectedTemplates.has(t) && 'bg-background hover:bg-accent'}`}
                                                onClick={() => toggleTemplate(t)}
                                            >
                                                {t}
                                                {selectedTemplates.has(t) && <Check className="ml-1 h-3 w-3" />}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {}
                        <div className="flex flex-col gap-4 h-[600px] lg:h-full min-h-[500px]">
                            <div className="flex items-center justify-between">
                                <h3 className="font-medium">Generated Preview</h3>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="ghost" onClick={copyToClipboard} disabled={!generatedContent}>
                                        {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                                        Copy
                                    </Button>
                                    {generatedContent && repoContext && branch && (
                                        <Button size="sm" onClick={() => setActiveTab('review')}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z" /><path d="M10 15h4" /><path d="M10 9h4" /><path d="M12 7v4" /></svg>
                                            Review & Save
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 rounded-md border bg-card relative overflow-hidden flex flex-col h-full">
                                {!generatedContent ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center min-h-[400px]">
                                        <FileCode className="h-10 w-10 mb-2 opacity-20" />
                                        <p>Select templates to see the content here.</p>
                                    </div>
                                ) : (
                                    <textarea
                                        value={generatedContent}
                                        onChange={(e) => setGeneratedContent(e.target.value)}
                                        className="flex-1 w-full h-full p-4 font-mono text-xs bg-transparent resize-none focus:outline-none min-h-[400px]"
                                        placeholder="Generated content will appear here..."
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="review" className="flex-1 flex flex-col gap-6 mt-0">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold">Review Changes</h2>
                        <div className="flex items-center gap-2">
                            {}
                        </div>
                    </div>

                    {existingContent && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <label className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${mergeStrategy === 'replace' ? 'border-brand bg-brand/5' : 'border-border hover:border-brand/50'}`}>
                                <div className="flex items-center gap-3 mb-2">
                                    <input
                                        type="radio"
                                        name="strategy"
                                        checked={mergeStrategy === 'replace'}
                                        onChange={() => setMergeStrategy('replace')}
                                        className="accent-primary h-4 w-4"
                                    />
                                    <span className="font-semibold">Replace Entire File</span>
                                </div>
                                <p className="text-sm text-muted-foreground ml-7">
                                    Overwrite the existing .gitignore completely. Previous content will be lost.
                                </p>
                            </label>

                            <label className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${mergeStrategy === 'append' ? 'border-brand bg-brand/5' : 'border-border hover:border-brand/50'}`}>
                                <div className="flex items-center gap-3 mb-2">
                                    <input
                                        type="radio"
                                        name="strategy"
                                        checked={mergeStrategy === 'append'}
                                        onChange={() => setMergeStrategy('append')}
                                        className="accent-primary h-4 w-4"
                                    />
                                    <span className="font-semibold">Append to Existing</span>
                                </div>
                                <p className="text-sm text-muted-foreground ml-7">
                                    Add the new rules to the end of the file. Existing rules are preserved.
                                </p>
                            </label>
                        </div>
                    )}

                    {}
                    <div className="flex-1 border rounded-lg overflow-hidden bg-card flex flex-col min-h-[500px]">
                        <div className="p-3 bg-muted/30 border-b flex justify-between items-center">
                            <span className="font-mono text-sm">.gitignore</span>
                            <span className="text-xs text-muted-foreground">
                                {existingContent ? (mergeStrategy === 'append' ? 'Merging changes...' : 'Overwriting file...') : 'Creating new file...'}
                            </span>
                        </div>
                        <div className="flex-1 flex relative">
                            {existingContent && (
                                <div className="w-1/2 border-r flex flex-col">
                                    <div className="p-2 text-xs font-semibold text-center bg-muted/20 border-b text-red-500">Current (Remote)</div>
                                    <textarea
                                        readOnly
                                        value={existingContent}
                                        className="flex-1 p-4 font-mono text-xs bg-red-500/5 resize-none focus:outline-none"
                                    />
                                </div>
                            )}
                            <div className={existingContent ? "w-1/2 flex flex-col" : "w-full flex flex-col"}>
                                <div className="p-2 text-xs font-semibold text-center bg-muted/20 border-b text-brand">
                                    {existingContent ? "Resulting File" : "New File Content"}
                                </div>
                                <textarea
                                    value={finalPreviewContent}
                                    onChange={(e) => setFinalPreviewContent(e.target.value)}
                                    className="flex-1 p-4 font-mono text-xs bg-brand/5 resize-none focus:outline-none"
                                    placeholder="Final content..."
                                />
                            </div>
                        </div>
                    </div>

                    {}
                    <div className="flex justify-end gap-4 py-4 border-t mt-4">
                        <Button variant="outline" onClick={() => setActiveTab('composer')}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={saving} className="min-w-[150px]">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            {existingContent ? 'Push Changes' : 'Create File'}
                        </Button>
                    </div>

                    {error && <ToolErrorNotice error={error} />}

                    {successMessage && (
                        <div className="p-4 bg-brand/10 border border-brand/20 rounded-lg text-brand flex items-center gap-2">
                            <Check className="h-5 w-5" />
                            {successMessage}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            <PostGenerationSuccessModal
                isOpen={successModalOpen}
                onClose={() => setSuccessModalOpen(false)}
                gitignoreUrl={generatedFileUrl}
            />
        </div>
    );
}
