"use client";

import { useEffect, useRef, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import ProviderKeysManager from "@/components/ProviderKeysManager";
import { Button } from "@/components/ui/button";
import {
    BookText,
    CircleDot,
    GitBranchPlus,
    Github,
    GitPullRequest,
    History,
    Menu,
    Moon,
    Sun,
    Tag,
    Terminal,
    X,
    Zap,
    Hammer,
    ArrowLeft,
    LayoutDashboard,
    LogIn,
    LogOut,
    ChevronDown,
    Network,
} from "lucide-react";

const GitBranchMinus = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M15 6a9 9 0 0 0-9 9V3" />
        <path d="M21 18h-6" />
        <circle cx="18" cy="6" r="3" />
        <circle cx="6" cy="18" r="3" />
    </svg>
);

interface SiteHeaderProps {
    showBackButton?: boolean;
    user?: {
        id: string | number;
    } | null;
}

import LoginModal from "./LoginModal";
import { UserNav } from "./UserNav";

export function SiteHeader({ showBackButton = true, user }: SiteHeaderProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isToolsOpen, setIsToolsOpen] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [loginNext, setLoginNext] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Tools require a session. Anonymous clicks open the login modal (and the
    // OAuth flow returns the user to the tool they wanted via ?next=).
    const handleToolClick = (e: React.MouseEvent, href: string) => {
        setIsToolsOpen(false);
        setIsMobileMenuOpen(false);
        if (!user) {
            e.preventDefault();
            setLoginNext(href);
            setIsLoginModalOpen(true);
        }
    };

    const toolsItems = [
        {
            name: "README Generator",
            href: "/tools/readme-generator",
            icon: BookText,
        },
        {
            name: "Issue Crafter",
            href: "/tools/issues-crafter",
            icon: CircleDot,
        },
        {
            name: "PR Maker",
            href: "/tools/pr-maker",
            icon: GitPullRequest,
        },
        {
            name: "Release Manager",
            href: "/tools/tags-releases-manager",
            icon: Tag,
        },
        {
            name: "Commit Generator",
            href: "/tools/commit-messages-generator",
            icon: Terminal,
        },
        {
            name: "Gitignore Builder",
            href: "/tools/gitignore-builder",
            icon: GitBranchMinus,
        },
        {
            name: "Backup Automator",
            href: "/tools/backup-automator",
            icon: History,
        },
        {
            name: "Repo Profiler",
            href: "/tools/repo-profiler",
            icon: Github,
        },
        {
            name: "Knowledge Mapper",
            href: "/tools/knowledge-mapper",
            icon: Network,
        },
    ];

    // Tool pages bounce anonymous visitors to /?login=1&next=<tool> — surface
    // the login modal on arrival and clean the params from the address bar.
    useEffect(() => {
        if (user) return;
        const params = new URLSearchParams(window.location.search);
        if (params.get("login") !== "1") return;
        const next = params.get("next");
        if (next && next.startsWith("/") && !next.startsWith("//")) {
            setLoginNext(next);
        }
        setIsLoginModalOpen(true);
        params.delete("login");
        params.delete("next");
        const rest = params.toString();
        window.history.replaceState(
            null,
            "",
            window.location.pathname + (rest ? `?${rest}` : "") + window.location.hash,
        );
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsToolsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const avatarFor = (u: any) =>
        u.avatarUrl ||
        u.avatar_url ||
        (u.username
            ? `https://github.com/${u.username}.png`
            : `https://ui-avatars.com/api/?name=${u.username || "User"}`);

    const navLink =
        "inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";

    return (
        <>
            <header className="glass sticky top-0 z-50 w-full border-b border-border/70">
                <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
                    <div className="flex min-w-0 items-center gap-3">
                        {showBackButton && (
                            <a
                                href="/"
                                className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card/60 text-muted-foreground shadow-xs transition-colors hover:border-brand/40 hover:text-foreground"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                <span className="sr-only">Back</span>
                            </a>
                        )}
                        <a href="/" className="group flex items-center gap-2.5">
                            <img
                                src="/favicon-192.png"
                                alt="Gitset Logo"
                                className="h-8 w-8 rounded-lg ring-1 ring-border transition-transform duration-300 group-hover:rotate-[-6deg]"
                            />
                            <span className="text-[17px] font-semibold tracking-tight">Gitset</span>
                        </a>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2">
                        <nav className="hidden md:flex items-center gap-1">
                            <a href="/docs" className={navLink}>Docs</a>
                            <a href="/changelog" className={navLink}>Changelog</a>
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setIsToolsOpen(!isToolsOpen)}
                                    aria-label="Tools"
                                    aria-expanded={isToolsOpen}
                                    className={`${navLink} ${isToolsOpen ? "bg-accent text-foreground" : ""}`}
                                >
                                    <Hammer className="h-4 w-4" />
                                    Tools
                                    <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isToolsOpen ? "rotate-180" : ""}`} />
                                </button>
                                {isToolsOpen && (
                                    <div className="absolute right-0 top-full z-50 mt-2 w-[26rem] origin-top-right rounded-2xl border border-border bg-popover p-2 shadow-xl animate-in fade-in zoom-in-95 slide-in-from-top-1 duration-150">
                                        <p className="eyebrow px-3 pb-1 pt-2">Toolkit</p>
                                        <div className="grid grid-cols-2 gap-1">
                                            {toolsItems.map((item, index) => (
                                                <a
                                                    key={index}
                                                    href={item.href}
                                                    className="group flex items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent"
                                                    onClick={(e) => handleToolClick(e, item.href)}
                                                >
                                                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-brand/20 bg-brand/10 transition-colors group-hover:border-brand/40">
                                                        <item.icon className="h-4 w-4 text-brand" />
                                                    </span>
                                                    <span className="truncate font-medium">{item.name}</span>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </nav>

                        <span className="mx-1 hidden h-5 w-px bg-border md:block" aria-hidden="true" />

                        {!user && (
                            <>
                                <ThemeToggle />
                                <button
                                    onClick={() => setIsLoginModalOpen(true)}
                                    className="hidden md:inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
                                >
                                    <LogIn className="h-4 w-4" />
                                    Login
                                </button>
                            </>
                        )}

                        {user && (
                            <div className="hidden md:flex items-center gap-2">
                                <ProviderKeysManager
                                    triggerLabel="AI Providers"
                                    triggerClassName="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card/60 px-3 text-sm font-medium text-muted-foreground shadow-xs transition-colors hover:border-brand/40 hover:text-foreground"
                                />
                                <UserNav user={user as any} />
                            </div>
                        )}

                        <Button
                            variant="ghost"
                            size="icon"
                            className={`md:hidden overflow-hidden transition-all duration-300 ${user ? "rounded-full p-0 ring-2 ring-border hover:ring-brand/50" : "rounded-lg border border-border bg-card/60"}`}
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            aria-label="Toggle menu"
                            aria-expanded={isMobileMenuOpen}
                        >
                            {user ? (
                                <img
                                    src={avatarFor(user)}
                                    alt="Menu"
                                    className="h-full w-full object-cover"
                                />
                            ) : isMobileMenuOpen ? (
                                <X className="h-4 w-4" />
                            ) : (
                                <Menu className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </div>
                {isMobileMenuOpen && (
                    <div className="absolute inset-x-0 top-full z-50 h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain border-t border-border bg-background md:hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6">
                            {user && (
                                <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                                    <img
                                        src={avatarFor(user)}
                                        alt={(user as any).username || "User"}
                                        className="h-11 w-11 rounded-full object-cover ring-2 ring-brand/30"
                                    />
                                    <div className="flex min-w-0 flex-col">
                                        <span className="truncate text-sm font-semibold text-foreground">
                                            {(user as any).username}
                                        </span>
                                        <span className="truncate text-xs text-muted-foreground">
                                            {(user as any).userEmail || (user as any).user_email}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {user && (
                                <div className="grid grid-cols-2 gap-2">
                                    <a
                                        href="/dashboard"
                                        className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-brand/40"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        <LayoutDashboard className="h-4 w-4 text-brand" />
                                        Dashboard
                                    </a>
                                    <ProviderKeysManager
                                        triggerLabel="AI Providers"
                                        triggerClassName="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-brand/40 text-left"
                                    />
                                </div>
                            )}

                            <div className="flex flex-col gap-2">
                                <span className="eyebrow flex items-center gap-2">
                                    <Hammer className="h-3.5 w-3.5" />
                                    Tools
                                </span>
                                <div className="grid grid-cols-1 gap-1 min-[420px]:grid-cols-2">
                                    {toolsItems.map((item, index) => (
                                        <a
                                            key={index}
                                            href={item.href}
                                            className="flex items-center gap-3 rounded-xl px-2 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent"
                                            onClick={(e) => handleToolClick(e, item.href)}
                                        >
                                            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-brand/20 bg-brand/10">
                                                <item.icon className="h-4 w-4 text-brand" />
                                            </span>
                                            {item.name}
                                        </a>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                                <a href="/docs" className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">Docs</a>
                                <a href="/changelog" className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">Changelog</a>
                            </div>

                            {!user && (
                                <button
                                    onClick={() => {
                                        setIsMobileMenuOpen(false);
                                        setIsLoginModalOpen(true);
                                    }}
                                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                                >
                                    <LogIn className="h-4 w-4" />
                                    Login
                                </button>
                            )}
                            {user && (
                                <a
                                    href="/api/auth/logout"
                                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                                >
                                    <LogOut className="h-4 w-4" />
                                    Logout
                                </a>
                            )}
                        </div>
                    </div>
                )}
            </header>
            <LoginModal
                isOpen={isLoginModalOpen}
                next={loginNext}
                onClose={() => {
                    setIsLoginModalOpen(false);
                    setLoginNext(null);
                }}
            />
        </>
    );
}
