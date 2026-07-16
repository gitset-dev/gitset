"use client";

import { useState, useEffect, useCallback } from "react";
import {
    LogOut,
    LayoutDashboard,
    Moon,
    Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface UserNavProps {
    user: {
        username?: string | null;
        userEmail?: string;
        avatarUrl?: string | null;
        userPlan?: string;
        gitsetKey?: string;
        [key: string]: any;
    };
}

const THEME_STORAGE_KEY = "theme";
type Theme = "light" | "dark";

export function UserNav({ user }: UserNavProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [theme, setTheme] = useState<Theme>("light");

    const applyTheme = useCallback((value: Theme) => {
        const root = document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(value);
        localStorage.setItem(THEME_STORAGE_KEY, value);
        setTheme(value);
    }, []);

    useEffect(() => {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const initialTheme: Theme =
            stored === "light" || stored === "dark" ? stored : prefersDark ? "dark" : "light";
        setTheme(initialTheme);
    }, []);

    const toggleTheme = () => {
        applyTheme(theme === "dark" ? "light" : "dark");
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest(".user-nav-container")) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const username = user.username || "User";
    let avatarSrc = user.avatarUrl;

    if (!avatarSrc) {
        if (user.username) {
            avatarSrc = `https://github.com/${user.username}.png`;
        } else {
            avatarSrc = `https://ui-avatars.com/api/?name=${username}`;
        }
    }

    return (
        <div className="relative user-nav-container">
            <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-full p-0 overflow-hidden border-0 dark:border-2 dark:border-foreground/60 dark:hover:border-foreground transition-all duration-300 trigger-button"
                onClick={() => setIsOpen(!isOpen)}
            >
                <img
                    src={avatarSrc}
                    alt={username}
                    className="h-full w-full object-cover"
                    loading="lazy"
                />
            </Button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-3xl border border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-4 py-3 border-b border-border/50">
                        <p className="text-sm font-semibold text-foreground truncate">
                            {username}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                            {user.userEmail}
                        </p>
                    </div>

                    <div className="p-1">
                        <a
                            href="/dashboard"
                            className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm text-foreground hover:bg-accent/50 transition-colors"
                            onClick={() => setIsOpen(false)}
                        >
                            <LayoutDashboard className="h-4 w-4 text-brand" />
                            Dashboard
                        </a>

                        <button
                            onClick={toggleTheme}
                            className="flex items-center justify-between w-full rounded-lg px-3 py-2 text-sm text-foreground hover:bg-accent/50 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                {theme === 'dark' ? (
                                    <Moon className="h-4 w-4 text-brand" />
                                ) : (
                                    <Sun className="h-4 w-4 text-brand" />
                                )}
                                <span>Theme</span>
                            </div>
                            <span className="text-xs text-muted-foreground capitalize bg-secondary px-2 py-0.5 rounded-md">
                                {theme}
                            </span>
                        </button>
                    </div>

                    <div className="p-1 border-t border-border/50">
                        <a
                            href="/api/auth/logout"
                            className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                        >
                            <LogOut className="h-4 w-4" />
                            Logout
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}
