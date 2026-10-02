import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    maxWidth?: string;
}

export function Modal({ isOpen, onClose, title, children, footer, maxWidth = "max-w-md" }: ModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200">
            <div
                ref={modalRef}
                className={`bg-popover text-foreground rounded-t-3xl sm:rounded-2xl shadow-2xl border w-full ${maxWidth} flex flex-col max-h-[92dvh] sm:max-h-[90vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 sm:slide-in-from-bottom-0 duration-200`}
                role="dialog"
                aria-modal="true"
            >
                <div className="flex items-center justify-between gap-4 px-5 py-4 border-b">
                    <h2 className="text-base font-semibold tracking-tight">{title}</h2>
                    <button
                        onClick={onClose}
                        className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="p-5 overflow-y-auto">
                    {children}
                </div>

                {footer && (
                    <div className="px-5 py-4 border-t bg-muted/40 flex flex-wrap justify-end gap-2 sm:rounded-b-2xl">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
