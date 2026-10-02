import React, { useState, useEffect } from 'react';
import { RepositorySelector } from '../RepositorySelector';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Sparkles, Save, RefreshCw, Globe, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ghFetch } from "@/lib/githubProxy";

interface User {
    gitsetKey: string;
    githubOauthToken?: string | null;
    plan?: string;
}

interface RepoProfilerProps {
    user: User;
}

export function RepoProfiler({ user }: RepoProfilerProps) {
    const [repo, setRepo] = useState("");
    const [activeTab, setActiveTab] = useState("about");
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const [website, setWebsite] = useState("");
    const [description, setDescription] = useState("");
    const [topics, setTopics] = useState<string[]>([]);
    const [refining, setRefining] = useState(false);
    const [refineInstruction, setRefineInstruction] = useState("");
    const [analyzing, setAnalyzing] = useState(false);

    const handleAnalyze = async () => {
        if (!repo || !user.githubOauthToken) return;
        setAnalyzing(true);
        try {
            const [owner, name] = repo.split('/');

            const filesRes = await ghFetch(`/repos/${owner}/${name}/git/trees/HEAD?recursive=1`);

            if (!filesRes.ok) throw new Error("Failed to fetch file list");
            const filesData = await filesRes.json();

            const fileList = Array.isArray(filesData.tree)
                ? filesData.tree.filter((f: any) => f.type === 'blob').map((f: any) => f.path)
                : [];

            const analyzeRes = await fetch("/api/about", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "analyze_files",
                    gitset_key: user.gitsetKey,
                    file_list: fileList
                }),
            });
            const analyzeData = await analyzeRes.json();

            const keyFiles = analyzeData.key_files || [];

            toast({ title: "Analysis Complete", description: `Reading ${keyFiles.length} key files for deep context...` });

            const fetchFile = async (path: string) => {
                try {
                    const res = await ghFetch(`/repos/${owner}/${name}/contents/${path}`, {
                        headers: { Accept: "application/vnd.github.raw" }
                    });
                    return res.ok ? { path, content: await res.text() } : null;
                } catch { return null; }
            };

            const filesToFetch = new Set([...keyFiles, 'README.md', 'package.json']);

            const validFilesToFetch = Array.from(filesToFetch).filter(f => fileList.includes(f) || fileList.find((existing: string) => existing.toLowerCase() === f.toLowerCase()));

            const fileContents = await Promise.all(validFilesToFetch.map(f => fetchFile(f)));
            const validContents = fileContents.filter(f => f !== null);

            let contextString = "";
            validContents.forEach((file: any) => {
                const content = file.content.length > 8000 ? file.content.substring(0, 8000) + "\n...(truncated)" : file.content;
                contextString += `\n\n--- FILE: ${file.path} ---\n${content}`;
            });

            const genRes = await fetch("/api/about", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "generate",
                    gitset_key: user.gitsetKey,
                    repo_info: { owner, name },
                    file_context: {
                        userContext: contextString
                    }
                }),
            });

            const genData = await genRes.json();

            if (!genRes.ok) {
                const error: any = new Error(genData.error || "Failed to generate description");
                throw error;
            }

            setDescription(genData.description);
            setTopics(genData.topics || []);
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setAnalyzing(false);
        }
    };

    const handleRefine = async () => {
        if (!refineInstruction) return;
        setRefining(true);
        try {
            const res = await fetch("/api/about", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "refine",
                    gitset_key: user.gitsetKey,
                    current_description: description,
                    current_topics: topics,
                    instruction: refineInstruction
                }),
            });
            const data = await res.json();

            if (!res.ok) {
                const error: any = new Error(data.error || "Failed to refine description");
                throw error;
            }

            setDescription(data.description);
            setTopics(data.topics || []);
            setRefineInstruction("");
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to refine content", variant: "destructive" });
        } finally {
            setRefining(false);
        }
    };

    const handleSaveAbout = async () => {
        if (!repo || !user.githubOauthToken) return;
        setLoading(true);
        try {
            const [owner, name] = repo.split('/');

            const updateRes = await ghFetch(`/repos/${owner}/${name}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    description: description,
                    homepage: website || undefined
                })
            });

            if (!updateRes.ok) throw new Error("Failed to update repository description");

            const topicsRes = await ghFetch(`/repos/${owner}/${name}/topics`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/vnd.github.mercy-preview+json"
                },
                body: JSON.stringify({ names: topics })
            });

            if (!topicsRes.ok) throw new Error("Failed to update topics");

            toast({ title: "Success", description: "Repository updated successfully!" });
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Tabs defaultValue="about" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-1 sm:w-auto sm:inline-grid">
                    <TabsTrigger value="about">About & Topics</TabsTrigger>
                </TabsList>

                <TabsContent value="about" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-lg border border-brand/25 bg-brand/10"><Globe className="h-4 w-4 text-brand" /></span>Repository Details</CardTitle>
                            <CardDescription>Analyze your project to generate an optimized description and topics.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>Repository</Label>
                                <RepositorySelector
                                    value={repo}
                                    onChange={setRepo}
                                    placeholder="Select a repository..."
                                    githubToken={user.githubOauthToken}
                                />
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                <div className="flex-1 space-y-2">
                                    <Label>Website URL</Label>
                                    <div className="relative">
                                        <Globe className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="https://..."
                                            className="pl-8"
                                            value={website}
                                            onChange={(e) => setWebsite(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <Button onClick={handleAnalyze} disabled={analyzing || !repo} variant="secondary" className="w-full sm:w-auto border border-brand/25 bg-brand/10 text-brand hover:bg-brand/15">
                                    {analyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                    Analyze & Generate
                                </Button>
                            </div>

                            <div className="space-y-2">
                                <Label>Description</Label>
                                <textarea
                                    className="flex min-h-[80px] w-full rounded-xl border border-input bg-card/60 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Repository description..."
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Topics</Label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {topics.map((topic, i) => (
                                        <Badge key={i} variant="default" className="flex items-center gap-1 font-mono">
                                            {topic}
                                            <X
                                                className="h-3 w-3 cursor-pointer hover:text-destructive"
                                                onClick={() => setTopics(topics.filter((_, idx) => idx !== i))}
                                            />
                                        </Badge>
                                    ))}
                                    <Input
                                        className="h-7 w-36 rounded-full text-xs"
                                        placeholder="+ Add topic"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const val = e.currentTarget.value.trim();
                                                if (val && !topics.includes(val)) {
                                                    setTopics([...topics, val]);
                                                    e.currentTarget.value = '';
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 items-center p-3 border bg-surface/60 rounded-xl">
                                <Input
                                    placeholder="Refinement instruction (e.g., 'Make it more formal', 'Focus on API')"
                                    value={refineInstruction}
                                    onChange={(e) => setRefineInstruction(e.target.value)}
                                />
                                <Button size="sm" variant="outline" onClick={handleRefine} disabled={refining || !description}>
                                    {refining ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                </Button>
                            </div>
                        </CardContent>
                        <CardFooter className="justify-end border-t bg-surface/60 pt-6 rounded-b-xl [&>button]:w-full sm:[&>button]:w-auto">
                            <Button onClick={handleSaveAbout} disabled={loading || !repo}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save to GitHub
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
