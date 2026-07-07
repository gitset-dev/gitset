import React, { useState } from 'react';
import { RepositorySelector } from '../RepositorySelector';
import { ghFetch } from '@/lib/githubProxy';
import { TemplateEditorModal } from '../TemplateEditorModal';
import { PostGenerationSuccessModal } from '@/components/modals/PostGenerationSuccessModal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2, Copy, Sparkles, FileText, Github, Check, AlertCircle, Scale, Eraser } from 'lucide-react';
import { BranchSelector } from '../BranchSelector';
import ToolErrorNotice from './ToolErrorNotice';
import CollapsibleComposer from './CollapsibleComposer';

interface User {
    gitsetKey: string;
    githubOauthToken?: string | null;
    plan?: string;
}

interface ReadmeGeneratorProps {
    user: User;
}

interface Version {
    version_number: number;
    content: string;
    created_at?: string;
}

interface License {
    id: string;
    name: string;
    description: string;
    requiresOwner: boolean;
}

export function ReadmeGenerator({ user }: ReadmeGeneratorProps) {
    const [projectName, setProjectName] = useState('');
    const [description, setDescription] = useState('');
    const [dependencies, setDependencies] = useState('');
    const [repo, setRepo] = useState('');
    const [customTemplate, setCustomTemplate] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

    const [draftId, setDraftId] = useState<string | null>(null);
    const [versions, setVersions] = useState<Version[]>([]);
    const [currentVersionIndex, setCurrentVersionIndex] = useState<number>(-1);

    const [refinementPrompt, setRefinementPrompt] = useState('');
    const [refining, setRefining] = useState(false);

    const [branches, setBranches] = useState<string[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<string>('');
    const [branchLoading, setBranchLoading] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [publishError, setPublishError] = useState<string | null>(null);
    const [publishSuccess, setPublishSuccess] = useState<string | null>(null);

    const [licenseStatus, setLicenseStatus] = useState<'checking' | 'exists' | 'missing'>('checking');
    const [existingLicense, setExistingLicense] = useState<{ name: string; url: string; spdx_id?: string } | null>(null);
    const [selectedLicense, setSelectedLicense] = useState<string>('');
    const [licenseHolder, setLicenseHolder] = useState<string>('');
    const [creatingLicense, setCreatingLicense] = useState(false);
    const [isChangingLicense, setIsChangingLicense] = useState(false);

    const [licenses, setLicenses] = useState<License[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [generatedUrls, setGeneratedUrls] = useState<{ readmeUrl?: string, licenseUrl?: string }>({});

    const [copySuccess, setCopySuccess] = useState<string | null>(null);

    const currentVersion = currentVersionIndex >= 0 ? versions[currentVersionIndex] : null;

    React.useEffect(() => {
        if (repo && user.githubOauthToken) {
            fetchBranches();
            checkLicense();
        } else {
            setBranches([]);
            setSelectedBranch('');
            setLicenseStatus('checking');
        }
    }, [repo, user.githubOauthToken]);

    React.useEffect(() => {
        fetch('/api/licenses')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setLicenses(data);
            })
            .catch(err => console.error("Failed to fetch licenses", err));
    }, []);

    const checkLicense = async () => {
        if (!repo || !user.githubOauthToken) return;
        setLicenseStatus('checking');
        setExistingLicense(null);
        setIsChangingLicense(false);
        try {
            const [owner, name] = repo.split('/');

            const repoRes = await ghFetch(`/repos/${owner}/${name}`);

            if (repoRes.ok) {
                const repoData = await repoRes.json();
                if (repoData.license) {
                    setLicenseStatus('exists');
                    setExistingLicense({
                        name: repoData.license.name,
                        url: repoData.license.url,
                        spdx_id: repoData.license.spdx_id
                    });
                    return;
                }
            }

            const licenseNames = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'COPYING'];
            let found = false;

            for (const filename of licenseNames) {
                const res = await ghFetch(`/repos/${owner}/${name}/contents/${filename}`, {
                    method: 'HEAD'
                });
                if (res.ok) {
                    found = true;
                    break;
                }
            }

            if (found) {
                setLicenseStatus('exists');
                setExistingLicense({ name: 'Custom / Unknown', url: '' });
            } else {
                setLicenseStatus('missing');
            }
        } catch (error) {
            console.error("Failed to check license", error);
            setLicenseStatus('missing');
        }
    };

    const createLicense = async () => {
        const licenseObj = licenses.find(l => l.id === selectedLicense);
        if (!repo || !selectedLicense || !user.githubOauthToken || (licenseObj?.requiresOwner && !licenseHolder)) return;
        setCreatingLicense(true);
        try {
            const [owner, name] = repo.split('/');
            const year = new Date().getFullYear();

            const licenseRes = await fetch('/api/licenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'generate',
                    licenseId: selectedLicense,
                    year,
                    owner: licenseHolder
                })
            });

            const licenseData = await licenseRes.json();
            if (!licenseRes.ok) throw new Error(licenseData.error || "Failed to generate license content");

            const licenseContent = licenseData.content;

            const content = btoa(licenseContent);

            const res = await ghFetch(`/repos/${owner}/${name}/contents/LICENSE`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: existingLicense ? `docs: Update LICENSE via Gitset` : `docs: Create LICENSE via Gitset`,
                    content: content,
                    branch: selectedBranch || 'main'
                })
            });

            if (res.ok) {
                setLicenseStatus('exists');
                setPublishSuccess(existingLicense ? "License updated successfully!" : "License created successfully!");
                setIsChangingLicense(false);

                const newLicenseObj = licenses.find(l => l.id === selectedLicense);
                setExistingLicense({ name: newLicenseObj?.name || 'Updated License', url: '' });

                setGeneratedUrls(prev => ({ ...prev, licenseUrl: `https://github.com/${repo}/blob/${selectedBranch || 'main'}/LICENSE` }));
                setModalOpen(true);

                setTimeout(() => setPublishSuccess(null), 3000);
            } else {
                throw new Error("Failed to create license");
            }
        } catch (error) {
            console.error("Failed to create license", error);
            setPublishError("Failed to create license");
        } finally {
            setCreatingLicense(false);
        }
    };

    const fetchBranches = async () => {
        if (!repo || !user.githubOauthToken) return;
        setBranchLoading(true);
        try {
            const [owner, name] = repo.split('/');
            const res = await ghFetch(`/repos/${owner}/${name}/branches`);
            if (res.ok) {
                const data = await res.json();
                const branchNames = Array.isArray(data) ? data.map((b: any) => b.name) : [];
                setBranches(branchNames);

                if (branchNames.includes('main')) setSelectedBranch('main');
                else if (branchNames.includes('master')) setSelectedBranch('master');
                else if (branchNames.length > 0) setSelectedBranch(branchNames[0]);
            }
        } catch (error) {
            console.error("Failed to fetch branches", error);
        } finally {
            setBranchLoading(false);
        }
    };

    const handlePublish = async () => {
        if (!repo || !selectedBranch || !currentVersion || !user.githubOauthToken) return;

        setPublishing(true);
        setPublishError(null);
        setPublishSuccess(null);

        try {
            const [owner, name] = repo.split('/');
            const path = 'README.md';
            const content = btoa(unescape(encodeURIComponent(currentVersion.content)));

            let sha = undefined;
            try {
                const getRes = await ghFetch(`/repos/${owner}/${name}/contents/${path}?ref=${selectedBranch}`);
                if (getRes.ok) {
                    const getData = await getRes.json();
                    sha = getData.sha;
                }
            } catch (e) {
            }

            const res = await ghFetch(`/repos/${owner}/${name}/contents/${path}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: `docs: Update README.md via Gitset`,
                    content: content,
                    branch: selectedBranch,
                    sha: sha
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Failed to publish to GitHub");
            }

            setPublishSuccess(`Successfully published to ${selectedBranch}!`);

            setGeneratedUrls(prev => ({ ...prev, readmeUrl: `https://github.com/${repo}/blob/${selectedBranch}/README.md` }));
            setModalOpen(true);

            setTimeout(() => setPublishSuccess(null), 5000);
        } catch (e: any) {
            setPublishError(e.message);
        } finally {
            setPublishing(false);
        }
    };

    const handleGenerate = async () => {
        if (!projectName && !description) {
            setError("Please provide at least a project name or description.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            let fileContext = null;

            if (repo && user.githubOauthToken) {
                try {
                    const [owner, name] = repo.split('/');

                    const filesRes = await ghFetch(`/repos/${owner}/${name}/git/trees/HEAD?recursive=1`);

                    if (filesRes.ok) {
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

                        const fetchFile = async (path: string) => {
                            try {
                                const res = await ghFetch(`/repos/${owner}/${name}/contents/${path}`, {
                                    headers: { Accept: "application/vnd.github.raw" }
                                });
                                return res.ok ? { path, content: await res.text() } : null;
                            } catch { return null; }
                        };

                        const filesToFetch = new Set([...keyFiles, 'README.md', 'package.json', 'LICENSE', 'LICENSE.md', 'LICENSE.txt', 'COPYING']);
                        const validFilesToFetch = Array.from(filesToFetch).filter(f => fileList.includes(f) || fileList.find((existing: string) => existing.toLowerCase() === f.toLowerCase()));

                        const fileContents = await Promise.all(validFilesToFetch.map(f => fetchFile(f)));
                        const validContents = fileContents.filter(f => f !== null);

                        let contextString = "";
                        validContents.forEach((file: any) => {
                            const content = file.content.length > 8000 ? file.content.substring(0, 8000) + "\n...(truncated)" : file.content;
                            contextString += `\n\n--- FILE: ${file.path} ---\n${content}`;
                        });

                        fileContext = { userContext: contextString };
                    }
                } catch (err) {
                    console.warn("Smart Context failed, falling back to basic generation", err);
                }
            }

            const analysis = {
                name: projectName,
                description: description,
                dependencies: dependencies ? { main: dependencies } : {},
                scripts: {},
            };

            const repoInfo = repo && repo.includes('/')
                ? { owner: repo.split('/')[0], name: repo.split('/')[1] }
                : null;

            const res = await fetch('/api/readme', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'generate',
                    analysis: analysis,
                    repo_info: repoInfo,
                    custom_template: customTemplate || undefined,
                    file_context: fileContext,
                    license_info: selectedLicense ? {
                        id: selectedLicense,
                        name: licenses.find(l => l.id === selectedLicense)?.name,
                        holder: licenseHolder
                    } : undefined
                })
            });

            const data = await res.json();

            if (!res.ok) {
                const error: any = new Error(data.error || "Failed to generate Readme");
                throw error;
            }

            setDraftId(data.draftId);

            const newVersion: Version = {
                version_number: 1,
                content: data.content,
                created_at: new Date().toISOString()
            };

            setVersions([newVersion]);
            setCurrentVersionIndex(0);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRefine = async () => {
        if (!draftId || !currentVersion || !refinementPrompt) return;

        setRefining(true);
        setError(null);

        try {
            const res = await fetch('/api/readme', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'refine',
                    draftId,
                    currentContent: currentVersion.content,
                    instruction: refinementPrompt,
                    custom_template: customTemplate || undefined
                })
            });

            const data = await res.json();

            if (!res.ok) {
                const error: any = new Error(data.error || "Failed to refine Readme");
                throw error;
            }

            const newVersion: Version = {
                version_number: data.version,
                content: data.content,
                created_at: new Date().toISOString()
            };

            setVersions(prev => [...prev, newVersion]);
            setCurrentVersionIndex(prev => prev + 1);
            setRefinementPrompt('');
        } catch (e: any) {
            setError(e.message);
        } finally {
            setRefining(false);
        }
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopySuccess(id);
            setTimeout(() => setCopySuccess(null), 2000);
        }).catch(err => {
            console.error('Failed to copy:', err);
        });
    };

    const resetForm = () => {
        setProjectName('');
        setDescription('');
        setDependencies('');
        setRepo('');
        setCustomTemplate('');
        setDraftId(null);
        setVersions([]);
        setCurrentVersionIndex(-1);
        setRefinementPrompt('');
        setBranches([]);
        setSelectedBranch('');
        setLicenseStatus('checking');
        setExistingLicense(null);
        setIsChangingLicense(false);
        setSelectedLicense('');
        setLicenseHolder('');
        setGeneratedUrls({});
        setError(null);
        setPublishError(null);
        setPublishSuccess(null);
    };

    return (
        <div className="grid gap-8 lg:grid-cols-2">
            {}
            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">Repository Info (Optional)</label>
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <RepositorySelector
                                githubToken={user.githubOauthToken}
                                value={repo}
                                onChange={setRepo}
                                placeholder="Select repository"
                                showBranchSelector={true}
                                branchValue={selectedBranch}
                                onBranchChange={setSelectedBranch}
                            />
                        </div>
                    </div>
                </div>

                {}
                {repo && (
                    <div className={`p-4 border rounded-lg space-y-4 ${licenseStatus === 'missing' ? 'bg-amber-50/50 dark:bg-amber-950/10 border-amber-200/50' : 'bg-card'}`}>
                        {licenseStatus === 'checking' ? (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                <span className="text-xs">Checking license...</span>
                            </div>
                        ) : licenseStatus === 'exists' && !isChangingLicense ? (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-brand/10 flex items-center justify-center text-brand">
                                        <Scale className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">Current License</p>
                                        <p className="text-xs text-muted-foreground">{existingLicense?.name || 'Unknown'}</p>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsChangingLicense(true)}
                                    className="h-8"
                                >
                                    Change License
                                </Button>
                            </div>
                        ) : (

                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                                        <AlertCircle className="h-4 w-4" />
                                        <span className="text-sm font-medium">
                                            {isChangingLicense ? "Change License" : "No license detected"}
                                        </span>
                                    </div>
                                    {isChangingLicense && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={() => setIsChangingLicense(false)}
                                        >
                                            <span className="sr-only">Cancel</span>
                                            <Eraser className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>

                                <div className="grid gap-4">
                                    <div className="space-y-2">
                                        <div className="relative">
                                            <Scale className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <select
                                                className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                value={selectedLicense}
                                                onChange={(e) => setSelectedLicense(e.target.value)}
                                            >
                                                <option value="">Select a license...</option>
                                                {licenses.map(l => (
                                                    <option key={l.id} value={l.id}>{l.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        {selectedLicense && (
                                            <p className="text-xs text-muted-foreground px-1">
                                                {licenses.find(l => l.id === selectedLicense)?.description}
                                            </p>
                                        )}
                                    </div>

                                    {selectedLicense && licenses.find(l => l.id === selectedLicense)?.requiresOwner && (
                                        <Input
                                            placeholder="Copyright Holder (Name)"
                                            value={licenseHolder}
                                            onChange={(e) => setLicenseHolder(e.target.value)}
                                        />
                                    )}
                                </div>

                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={createLicense}
                                    disabled={!selectedLicense || (licenses.find(l => l.id === selectedLicense)?.requiresOwner && !licenseHolder) || creatingLicense}
                                    className="w-full bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100 dark:hover:bg-amber-900/50 border-0"
                                >
                                    {creatingLicense ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <FileText className="mr-2 h-3 w-3" />}
                                    {isChangingLicense ? "Update License" : "Create License"}
                                </Button>
                                {isChangingLicense && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsChangingLicense(false)}
                                        className="w-full h-8 text-xs text-muted-foreground"
                                    >
                                        Cancel
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                )}
                <div className="flex items-start gap-2">
                    <div className="flex-1">
                        <Button variant="outline" onClick={() => setIsTemplateModalOpen(true)} className="w-full">
                            Manage Templates
                        </Button>
                        {customTemplate && (
                            <p className="text-xs text-muted-foreground mt-1">
                                <span className="text-brand font-medium">Active Template:</span> Custom
                            </p>
                        )}
                    </div>
                    {currentVersion && (
                        <Button
                            variant="outline"
                            onClick={resetForm}
                            className="px-3 text-muted-foreground hover:text-foreground"
                            title="Clear Form"
                        >
                            <Eraser className="h-4 w-4 mr-2" />
                            Clear
                        </Button>
                    )}
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">Project Name</label>
                    <Input
                        placeholder="e.g. My Awesome Project"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                    />
                </div>

                <CollapsibleComposer collapsed={loading}>
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none">Description</label>
                        <p className="text-xs text-muted-foreground">What does your project do?</p>
                        <Textarea
                            placeholder="A brief description of the project's purpose and features..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={loading}
                            className="min-h-[100px] resize-none"
                        />
                    </div>

                    <div className="space-y-2 mt-4">
                        <label className="text-sm font-medium leading-none">Dependencies / Tech Stack</label>
                        <p className="text-xs text-muted-foreground">List main technologies (e.g. React, Node.js, Tailwind)</p>
                        <Textarea
                            placeholder="React, TypeScript, Vite, etc."
                            value={dependencies}
                            onChange={(e) => setDependencies(e.target.value)}
                            disabled={loading}
                            className="min-h-[80px] resize-none"
                        />
                    </div>
                </CollapsibleComposer>

                {error && <ToolErrorNotice error={error} />}

                <Button
                    onClick={handleGenerate}
                    disabled={loading || (!projectName && !description)}
                    className="w-full"
                >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Generate Readme
                </Button>
            </div>

            {}
            <div className="space-y-6">
                <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm h-full flex flex-col">
                    <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
                        <h3 className="font-semibold leading-none tracking-tight">Generated Readme</h3>
                        <div className="flex items-center gap-2">
                            {currentVersion && repo && selectedBranch && (
                                <Button
                                    variant="default"
                                    size="sm"
                                    onClick={handlePublish}
                                    disabled={publishing}
                                    className="h-8 px-3 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                                >
                                    {publishing ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Github className="h-3 w-3" />}
                                    Create on GitHub
                                </Button>
                            )}
                            {currentVersion && (
                                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(currentVersion.content, 'top-copy')}>
                                    {copySuccess === 'top-copy' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                    {copySuccess === 'top-copy' ? 'Copied!' : 'Copy'}
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="p-6 flex-1 bg-muted/30 relative group min-h-[400px]">
                        {loading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
                                <div className="flex flex-col items-center gap-2">
                                    <Loader2 className="h-8 w-8 animate-spin text-brand" />
                                    <p className="text-sm text-muted-foreground">Crafting documentation...</p>
                                </div>
                            </div>
                        )}

                        {!currentVersion ? (
                            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-8">
                                <FileText className="h-12 w-12 mb-4 opacity-20" />
                                <p>Provide project details to generate a professional README.</p>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col">
                                {publishError && (
                                    <div className="mb-4 p-3 bg-red-500/10 border border-red-200 rounded-md flex items-center gap-2 text-sm text-red-600">
                                        <AlertCircle className="h-4 w-4 shrink-0" />
                                        {publishError}
                                    </div>
                                )}
                                {publishSuccess && (
                                    <div className="mb-4 p-3 bg-brand/10 border border-brand/20 rounded-md flex items-center gap-2 text-sm text-brand">
                                        <Check className="h-4 w-4 shrink-0" />
                                        {publishSuccess}
                                    </div>
                                )}
                                {}
                                <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
                                    {versions.map((v, idx) => (
                                        <button
                                            key={v.version_number}
                                            onClick={() => setCurrentVersionIndex(idx)}
                                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${idx === currentVersionIndex
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                                }`}
                                        >
                                            v{v.version_number}
                                            {idx === 0 && ' (Original)'}
                                        </button>
                                    ))}
                                </div>

                                <Textarea
                                    value={currentVersion.content}
                                    onChange={(e) => {
                                        const newContent = e.target.value;
                                        setVersions(prev => prev.map((v, i) =>
                                            i === currentVersionIndex ? { ...v, content: newContent } : v
                                        ));
                                    }}
                                    className="flex-1 font-mono text-sm min-h-[400px] bg-background border-border resize-none p-4"
                                />

                                {}
                                <div className="p-4 border-t border-border bg-background">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-medium">Refine Content</label>
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                value={refinementPrompt}
                                                onChange={(e) => setRefinementPrompt(e.target.value)}
                                                placeholder="e.g. Add installation steps, Make it more concise..."
                                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        handleRefine();
                                                    }
                                                }}
                                            />
                                            <button
                                                onClick={handleRefine}
                                                disabled={refining || !refinementPrompt.trim()}
                                                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 h-9 px-4 py-2"
                                            >
                                                {refining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                                Refine
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <TemplateEditorModal
                isOpen={isTemplateModalOpen}
                onClose={() => setIsTemplateModalOpen(false)}
                type="readme"
                onApply={(content) => {
                    setCustomTemplate(content);
                    setIsTemplateModalOpen(false);
                }}
                gitsetKey={user.gitsetKey}
                backendUrl=""
            />

            <PostGenerationSuccessModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                readmeUrl={generatedUrls.readmeUrl}
                licenseUrl={generatedUrls.licenseUrl}
            />
        </div>
    );
}
