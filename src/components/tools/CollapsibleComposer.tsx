import React from 'react';

/**
 * Wraps a tool's input fields (which auto-grow via field-sizing-content).
 * The composer and output columns sit in the same stretched grid row, so an
 * uncapped input forces the output panel to match its full height, leaving
 * a short result (or an error message) stranded in a mostly-empty box.
 *
 * `collapsed` caps the height — pass `loading || hasResult || hasError` so
 * it stays capped once a request settles, not just while it's in flight
 * (an error clearing `loading` alone would otherwise snap it back open).
 * `dimmed` (in-flight only) adds the blur/opacity/inert treatment on top.
 */
export default function CollapsibleComposer({ collapsed, dimmed = false, children }: { collapsed: boolean; dimmed?: boolean; children: React.ReactNode }) {
    return (
        <div
            className={`relative transition-all duration-300 ease-in-out ${collapsed ? 'max-h-32 overflow-y-auto' : ''
                } ${dimmed ? 'opacity-40 blur-[1px] pointer-events-none select-none' : ''}`}
        >
            {children}
            {collapsed && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 flex items-end justify-center pb-1 bg-gradient-to-t from-background to-transparent">
                    <span className="text-muted-foreground text-lg leading-none tracking-[0.3em]">···</span>
                </div>
            )}
        </div>
    );
}
