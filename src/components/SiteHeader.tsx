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

    return (
        <>
            <header className="sticky top-0 z-50 w-full border-b border-border bg-card/80 backdrop-blur-sm">
                <div className="flex h-16 items-center justify-between px-4 sm:px-8">
                    <div className="flex items-center gap-4">
                        {showBackButton && (
                            <a
                                href="/"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                <span className="sr-only">Back</span>
                            </a>
                        )}
                        <a href="/" className="flex items-center gap-2">
                            <img
                                src="/favicon-192.png"
                                alt="Gitset Logo"
                                className="h-8 w-8 rounded-full"
                            />
                            <span className="text-xl font-bold">Gitset</span>
                        </a>
                    </div>

                    <div className="flex items-center gap-6">
                        {}
                        <nav className="hidden md:flex items-center gap-6">
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setIsToolsOpen(!isToolsOpen)}
                                    aria-label="Tools"
                                    title="Tools"
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground hover:border-foreground/40"
                                >
                                    <Hammer className="h-4 w-4" />
                                </button>
                                {isToolsOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-48 rounded-md border border-border bg-card p-1 shadow-lg z-50">
                                        {toolsItems.map((item, index) => (
                                            <a
                                                key={index}
                                                href={item.href}
                                                className="flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-left text-sm text-foreground hover:bg-accent hover:text-accent-foreground"
                                                onClick={(e) => handleToolClick(e, item.href)}
                                            >
                                                <item.icon className="h-4 w-4 text-brand" />
                                                {item.name}
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </nav>

                        {!user && (
                            <>
                                <ThemeToggle />
                                <button
                                    onClick={() => setIsLoginModalOpen(true)}
                                    className="hidden md:flex text-sm font-medium text-muted-foreground transition-colors hover:text-foreground items-center gap-2"
                                >
                                    <LogIn className="h-4 w-4" />
                                    Login
                                </button>
                            </>
                        )}

                        {user && (
                            <div className="hidden md:flex items-center gap-6">
                                <ProviderKeysManager
                                    triggerLabel="AI Providers"
                                    iconOnly
                                    triggerClassName="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground hover:border-foreground/40"
                                />
                                <UserNav user={user as any} />
                            </div>
                        )}

                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden rounded-full overflow-hidden border-0 dark:border-2 dark:border-foreground/60 dark:hover:border-foreground transition-all duration-300"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            aria-label="Toggle menu"
                        >
                            {user ? (
                                <img
                                    src={
                                        (user as any).avatarUrl ||
                                        (user as any).avatar_url ||
                                        ((user as any).username
                                            ? `https://github.com/${(user as any).username}.png`
                                            : `https://ui-avatars.com/api/?name=${(user as any).username || "User"}`)
                                    }
                                    alt="Menu"
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <ChevronDown
                                    className={`h-4 w-4 transition-transform ${isMobileMenuOpen ? "rotate-180" : ""}`}
                                />
                            )}
                        </Button>
                    </div>
                </div>
                {isMobileMenuOpen && (
                    <div className="absolute top-full left-0 right-0 border-b border-border bg-card p-4 shadow-lg md:hidden flex flex-col gap-4 z-50 animate-in slide-in-from-top-2 duration-200">
                        {user && (
                            <div className="flex flex-col gap-1 pb-4 border-b border-border">
                                <div className="flex items-center gap-3">
                                    <img
                                        src={
                                            (user as any).avatarUrl ||
                                            (user as any).avatar_url ||
                                            ((user as any).username
                                                ? `https://github.com/${(user as any).username}.png`
                                                : `https://ui-avatars.com/api/?name=${(user as any).username || "User"}`)
                                        }
                                        alt={(user as any).username || "User"}
                                        className="h-10 w-10 rounded-full object-cover border border-border"
                                    />
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-sm font-semibold text-foreground truncate">
                                            {(user as any).username}
                                        </span>
                                        <span className="text-xs text-muted-foreground truncate">
                                            {(user as any).userEmail || (user as any).user_email}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {user && (
                            <a
                                href="/dashboard"
                                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <LayoutDashboard className="h-4 w-4" />
                                Dashboard
                            </a>
                        )}

                        {user && (
                            <ProviderKeysManager
                                triggerLabel="AI Providers"
                                triggerClassName="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors text-left"
                            />
                        )}

                        <div className="flex flex-col gap-2">
                            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                                <Hammer className="h-4 w-4" />
                                Tools
                            </span>
                            <div className="pl-4 flex flex-col gap-2 border-l border-border">
                                {toolsItems.map((item, index) => (
                                    <a
                                        key={index}
                                        href={item.href}
                                        className="flex items-center gap-2 text-left text-sm text-muted-foreground hover:text-foreground transition-colors"
                                        onClick={(e) => handleToolClick(e, item.href)}
                                    >
                                        <item.icon className="h-4 w-4 text-brand" />
                                        {item.name}
                                    </a>
                                ))}
                            </div>
                        </div>

                        {!user && (
                            <button
                                onClick={() => {
                                    setIsMobileMenuOpen(false);
                                    setIsLoginModalOpen(true);
                                }}
                                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors text-left"
                            >
                                <LogIn className="h-4 w-4" />
                                Login
                            </button>
                        )}
                        {user && (
                            <>
                                <div className="border-t border-border my-2" />
                                <a
                                    href="/api/auth/logout"
                                    className="flex items-center gap-2 text-sm font-medium text-destructive hover:text-destructive/90 transition-colors w-full text-left"
                                >
                                    <LogOut className="h-4 w-4" />
                                    Logout
                                </a>
                            </>
                        )}
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
