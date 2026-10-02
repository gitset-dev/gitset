import React, { useState } from 'react';
import { TemplateEditorModal } from './TemplateEditorModal';
import { LayoutTemplate } from 'lucide-react';

interface TemplateManagerIslandProps {
    type: 'pr' | 'release' | 'readme' | 'issue';
    elementId: string;
}

export function TemplateManagerIsland({ type, elementId }: TemplateManagerIslandProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleApply = (content: string) => {
        const input = document.getElementById(elementId) as HTMLInputElement;
        if (input) {
            input.value = content;

            input.dispatchEvent(new Event('change', { bubbles: true }));
        }
        setIsModalOpen(false);
    };

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:pointer-events-none disabled:opacity-50 border border-input bg-card/60 shadow-xs hover:bg-accent hover:text-accent-foreground hover:border-brand/30 h-9 px-4 py-2"
                type="button"
            >
                <LayoutTemplate className="h-4 w-4" />
                Templates
            </button>

            <TemplateEditorModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onApply={handleApply}
                type={type}
            />
        </>
    );
}
