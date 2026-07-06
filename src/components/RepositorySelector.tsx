import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, RotateCcw, Github, GitBranch, Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchAllBranches } from "@/lib/github";
import { ghFetch } from "@/lib/githubProxy";

interface Repository {
    id: number;
    full_name: string;
    private: boolean;
    default_branch: string;
}

interface Branch {
    name: string;
}

interface RepositorySelectorProps {
    githubToken?: string | null;
    value: string;
    onChange: (value: string) => void;
    branchValue?: string;
    onBranchChange?: (value: string) => void;
    placeholder?: string;
    showBranchSelector?: boolean;
    onRefresh?: () => void;
}

export function RepositorySelector({
    githubToken,
    value,
    onChange,
    branchValue,
    onBranchChange,
    placeholder = "Select a repository...",
    showBranchSelector = false,
    onRefresh,
}: RepositorySelectorProps) {
    const [repos, setRepos] = useState<Repository[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingBranches, setLoadingBranches] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<"select" | "manual">("select");

    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [branchOpen, setBranchOpen] = useState(false);
    const [branchSearchQuery, setBranchSearchQuery] = useState("");

    const [focusedIndex, setFocusedIndex] = useState(-1);
    const repoListRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setFocusedIndex(-1);
    }, [searchQuery, open]);

    useEffect(() => {
        if (open && focusedIndex >= 0 && repoListRef.current) {
            const list = repoListRef.current;
            const element = list.children[focusedIndex] as HTMLElement;
            if (element) {
                const containerTop = list.scrollTop;
                const containerBottom = containerTop + list.clientHeight;
                const elementTop = element.offsetTop;
                const elementBottom = elementTop + element.offsetHeight;

                if (elementTop < containerTop) {
                    list.scrollTop = elementTop;
                } else if (elementBottom > containerBottom) {
                    list.scrollTop = elementBottom - list.clientHeight;
                }
            }
        }
    }, [focusedIndex, open]);

    useEffect(() => {
        if (githubToken && mode === "select") {
            fetchRepos();
        }

        if (githubToken && mode === "manual") {
            setMode("select");
        }
    }, [githubToken, mode]);

    useEffect(() => {
        if (githubToken && value && mode === "select" && showBranchSelector) {
            fetchBranches(value);
        }
    }, [githubToken, value, mode, showBranchSelector]);

    const fetchAllPages = async (url: string): Promise<any[]> => {
        const results: any[] = [];
        let nextUrl: string | null = url;
        let isFirstPage = true;
        while (nextUrl) {
            const currentUrl: string = nextUrl;
            const res: Response = await ghFetch(currentUrl, {
                headers: {
                    Accept: "application/vnd.github.v3+json",
                },
            });
            if (!res.ok) {
                if (isFirstPage) throw new Error(`GitHub API error: ${res.status}`);
                break;
            }
            isFirstPage = false;
            const data: unknown = await res.json();
            if (Array.isArray(data)) results.push(...data);

            const linkHeader: string | null = res.headers.get("Link");
            const nextMatch: RegExpMatchArray | null = linkHeader?.match(/<([^>]+)>;\s*rel="next"/) ?? null;
            nextUrl = nextMatch ? nextMatch[1] : null;
        }
        return results;
    };

    const fetchRepos = async () => {
        setLoading(true);
        setError(null);
        try {
            const userRepos = await fetchAllPages(
                "https://api.github.com/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member"
            );

            try {
                const orgs = await fetchAllPages("https://api.github.com/user/orgs?per_page=100");

                if (orgs.length > 0) {
                    const orgReposArrays = await Promise.allSettled(
                        orgs.map((org: any) =>
                            fetchAllPages(`https://api.github.com/orgs/${org.login}/repos?sort=updated&per_page=100&type=all`)
                        )
                    );

                    const orgRepos = orgReposArrays
                        .filter((r): r is PromiseFulfilledResult<any[]> => r.status === "fulfilled")
                        .flatMap(r => r.value);

                    const allRepos = [...userRepos, ...orgRepos];

                    const uniqueRepos = Array.from(new Map(allRepos.map(item => [item.id, item])).values());

                    setRepos(uniqueRepos);
                } else {
                    setRepos(userRepos);
                }
            } catch (e) {
                console.warn("Failed to fetch org repos, showing only user repos", e);
                setRepos(userRepos);
            }
        } catch (err) {
            console.error(err);
            setError("Failed to load repositories");
            setMode("manual");
        } finally {
            setLoading(false);
        }
    };

    const fetchBranches = async (repoFullName: string) => {
        setLoadingBranches(true);
        try {
            const [owner, repo] = repoFullName.split('/');
            if (!owner || !repo || !githubToken) {
                throw new Error("Invalid repository or missing token");
            }

            const branchNames = await fetchAllBranches(owner, repo, githubToken);
            const data = branchNames.map(name => ({ name }));
            setBranches(data);

            if (onBranchChange && !branchValue) {
                const repoObj = repos.find(r => r.full_name === repoFullName);
                if (repoObj) {
                    onBranchChange(repoObj.default_branch);
                } else if (data.length > 0) {
                    onBranchChange(data[0].name);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingBranches(false);
        }
    };

    const filteredRepos = repos.filter((repo) =>
        repo.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredBranches = branches.filter((branch) =>
        branch.name.toLowerCase().includes(branchSearchQuery.toLowerCase())
    );

    if (!githubToken || mode === "manual") {
        return (
            <div className="space-y-2">
                <div className="flex gap-2">
                    <Input
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        className="flex-1"
                    />
                    {showBranchSelector && (
                        <Input
                            value={branchValue || ""}
                            onChange={(e) => onBranchChange?.(e.target.value)}
                            placeholder="Branch (e.g. main)"
                            className="w-1/3"
                        />
                    )}
                    {githubToken && (
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setMode("select")}
                            title="Select from list"
                        >
                            <Github className="h-4 w-4" />
                        </Button>
                    )}
                </div>
                {!githubToken && (
                    <p className="text-xs text-muted-foreground">
                        Link your GitHub account in settings to select from your repositories.
                    </p>
                )}
            </div>
        );
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        const totalItems = filteredRepos.length + 1;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setFocusedIndex((prev) => (prev + 1) % totalItems);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setFocusedIndex((prev) => (prev - 1 + totalItems) % totalItems);
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (focusedIndex >= 0 && focusedIndex < filteredRepos.length) {
                const repo = filteredRepos[focusedIndex];
                onChange(repo.full_name);
                setOpen(false);
                setSearchQuery("");
            } else if (focusedIndex === filteredRepos.length) {
                setMode("manual");
                setOpen(false);
            }
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex gap-2">
                <div className="relative flex-1 min-w-0">
                    {}
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between font-normal"
                        onClick={() => setOpen(!open)}
                        disabled={loading}
                        title={value || placeholder}
                    >
                        <span className="truncate min-w-0 flex-1 text-left">
                            {value ? (
                                value
                            ) : (
                                <span className="text-muted-foreground">{loading ? "Loading..." : placeholder}</span>
                            )}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>

                    {}
                    {open && (
                        <>
                            <div
                                className="fixed inset-0 z-40"
                                onClick={() => setOpen(false)}
                            />
                            <div className="absolute top-full mt-1 z-50 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95">
                                <div className="flex items-center border-b px-3">
                                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                    <input
                                        className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                                        placeholder="Search repositories..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        autoFocus
                                    />
                                </div>
                                <div
                                    className="max-h-[300px] overflow-y-auto p-1"
                                    ref={repoListRef}
                                >
                                    {error && (
                                        <div role="alert" className="py-3 px-2 text-center text-sm text-destructive">
                                            {error}
                                        </div>
                                    )}
                                    {!error && filteredRepos.length === 0 && (
                                        <div className="py-6 text-center text-sm text-muted-foreground">
                                            No repositories found.
                                        </div>
                                    )}
                                    {filteredRepos.map((repo, index) => (
                                        <div
                                            key={repo.id}
                                            className={cn(
                                                "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
                                                (value === repo.full_name || index === focusedIndex) && "bg-accent text-accent-foreground"
                                            )}
                                            onClick={() => {
                                                onChange(repo.full_name);
                                                setOpen(false);
                                                setSearchQuery("");
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    value === repo.full_name ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            <span className="truncate">
                                                {repo.full_name}
                                                {repo.private && <span className="ml-2 text-xs text-muted-foreground">(Private)</span>}
                                            </span>
                                        </div>
                                    ))}
                                    <div className="border-t my-1"></div>
                                    <div
                                        className={cn(
                                            "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground font-medium text-brand",
                                            focusedIndex === filteredRepos.length && "bg-accent text-accent-foreground"
                                        )}
                                        onClick={() => {
                                            setMode("manual");
                                            setOpen(false);
                                        }}
                                    >
                                        <span className="ml-6">+ Enter manually</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                        fetchRepos();
                        onRefresh?.();
                    }}
                    disabled={loading}
                    title="Refresh repositories"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
            </div>

            {showBranchSelector && value && (
                <div className="flex gap-2 items-center min-w-0">
                    <GitBranch className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="relative flex-1 min-w-0">
                        {}
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={branchOpen}
                            className="w-full justify-between font-normal"
                            onClick={() => setBranchOpen(!branchOpen)}
                            disabled={loadingBranches}
                            title={branchValue || "Select a branch..."}
                        >
                            <span className="truncate min-w-0 flex-1 text-left">
                                {branchValue ? (
                                    branchValue
                                ) : (
                                    <span className="text-muted-foreground">{loadingBranches ? "Loading..." : "Select a branch..."}</span>
                                )}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>

                        {}
                        {branchOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setBranchOpen(false)}
                                />
                                <div className="absolute top-full mt-1 z-50 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95">
                                    <div className="flex items-center border-b px-3">
                                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                        <input
                                            className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                                            placeholder="Search branches..."
                                            value={branchSearchQuery}
                                            onChange={(e) => setBranchSearchQuery(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto p-1">
                                        {filteredBranches.length === 0 && (
                                            <div className="py-6 text-center text-sm text-muted-foreground">
                                                No branches found.
                                            </div>
                                        )}
                                        {filteredBranches.map((branch) => (
                                            <div
                                                key={branch.name}
                                                className={cn(
                                                    "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
                                                    branchValue === branch.name && "bg-accent text-accent-foreground"
                                                )}
                                                onClick={() => {
                                                    onBranchChange?.(branch.name);
                                                    setBranchOpen(false);
                                                    setBranchSearchQuery("");
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        branchValue === branch.name ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                <span className="truncate">{branch.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
