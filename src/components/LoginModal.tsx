import { useState, useEffect } from "react";
import { X, Github } from "lucide-react";
import { createPortal } from "react-dom";
import { Loader } from "./ui/Loader";

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    next?: string | null;
}

export default function LoginModal({ isOpen, onClose, next }: LoginModalProps) {
    const [mounted, setMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    if (!mounted) return null;

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div
                className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            <div className="relative w-full max-w-md transform overflow-hidden rounded-xl bg-card border border-border p-6 shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-200">
                <div className="absolute right-4 top-4">
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                        <X className="h-5 w-5" />
                        <span className="sr-only">Close</span>
                    </button>
                </div>

                <div className="flex flex-col items-center text-center">
                    <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-brand/10">
                        <Github className="h-6 w-6 text-brand" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                        Welcome back
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Sign in to your account to continue
                    </p>
                </div>

                <div className="mt-8 space-y-4">
                    <a
                        href={`/api/auth/github${next ? `?next=${encodeURIComponent(next)}` : ""}`}
                        onClick={() => setIsLoading(true)}
                        className={`flex w-full items-center justify-center gap-3 rounded-lg bg-[#24292F] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#24292F]/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#24292F] transition-all ${isLoading ? "opacity-80 pointer-events-none" : ""}`}
                    >
                        {isLoading ? (
                            <Loader className="h-5 w-5 text-white" />
                        ) : (
                            <svg
                                className="h-5 w-5"
                                aria-hidden="true"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        )}
                        {isLoading ? "Signing in..." : "Sign in with GitHub"}
                    </a>
                </div>

                <div className="mt-6 text-center text-xs text-muted-foreground">
                    By clicking continue, you agree to our{" "}
                    <a
                        href="/terms"
                        className="underline underline-offset-4 hover:text-brand"
                    >
                        Terms of Service
                    </a>{" "}
                    and{" "}
                    <a
                        href="/privacy"
                        className="underline underline-offset-4 hover:text-brand"
                    >
                        Privacy Policy
                    </a>
                    .
                </div>
            </div>
        </div>,
        document.body
    );
}
