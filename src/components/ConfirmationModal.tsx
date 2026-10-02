import { useState, useEffect } from "react";
import { X, AlertTriangle } from "lucide-react";
import { createPortal } from "react-dom";

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "warning" | "info";
}

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = "Confirm",
    cancelText = "Cancel",
    variant = "danger",
}: ConfirmationModalProps) {
    const [mounted, setMounted] = useState(false);

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
                className="absolute inset-0 bg-black/50 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
                onClick={onClose}
            />
            <div className="relative w-full max-w-md transform overflow-hidden rounded-3xl bg-popover border border-border p-6 sm:p-8 shadow-2xl transition-all animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200">
                <div className="absolute right-4 top-4">
                    <button
                        onClick={onClose}
                        className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                    </button>
                </div>

                <div className="flex flex-col items-center text-center">
                    <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border ${variant === "danger" ? "border-destructive/25 bg-destructive/10 text-destructive" : "border-brand/25 bg-brand/10 text-brand"
                        }`}>
                        <AlertTriangle className="h-6 w-6" />
                    </div>
                    <h2 className="text-xl font-semibold tracking-tight text-foreground">
                        {title}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {description}
                    </p>
                </div>

                <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 h-10 rounded-lg border border-input bg-card/60 px-4 text-sm font-medium shadow-xs hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 h-10 rounded-lg px-4 text-sm font-semibold shadow-sm transition-colors ${variant === "danger"
                                ? "bg-destructive text-white hover:bg-destructive/90"
                                : "bg-primary text-primary-foreground hover:bg-primary/90"
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
