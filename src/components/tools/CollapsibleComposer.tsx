import React from 'react';

/**
 * Wraps a tool's input fields (which auto-grow via field-sizing-content).
 * While `collapsed` (generation in flight), caps the visual height instead
 * of leaving it at whatever a long pasted input grew to — the composer and
 * output columns sit in the same stretched grid row, so an uncapped input
 * forces the output panel to match its full height, leaving small results
 * (or an error message) stranded in a mostly-empty box.
 */
export default function CollapsibleComposer({ collapsed, children }: { collapsed: boolean; children: React.ReactNode }) {
    return (
        <div
            className={`relative transition-all duration-300 ease-in-out ${collapsed ? 'max-h-32 overflow-hidden opacity-40 blur-[1px] pointer-events-none select-none' : ''
                }`}
        >
            {children}
            {collapsed && (
                <div className="absolute inset-x-0 bottom-0 h-16 flex items-end justify-center pb-2 bg-gradient-to-t from-background to-transparent">
                    <span className="text-muted-foreground text-2xl leading-none tracking-[0.3em]">···</span>
                </div>
            )}
        </div>
    );
}
