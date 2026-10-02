import { useState, type ReactNode } from "react";
import { Eye, Pencil } from "lucide-react";
import { MarkdownPreview } from "./MarkdownPreview";

type View = "edit" | "preview";

// GitHub-style Edit / Preview switcher around an existing editor. The editor
// (children) stays owned by the tool; this only adds the rendered view.
export function MarkdownTabs({
    content,
    children,
    label,
    defaultView = "edit",
}: {
    content: string;
    children: ReactNode;
    label?: string;
    defaultView?: View;
}) {
    const [view, setView] = useState<View>(defaultView);

    return (
        <div className="flex-1 flex flex-col min-h-[440px] overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            <div className="flex items-end justify-between gap-2 border-b border-border bg-surface/60 px-2 pt-2">
                <div role="tablist" aria-label="Editor view" className="flex gap-1">
                    {(["edit", "preview"] as const).map((v) => (
                        <button
                            key={v}
                            type="button"
                            role="tab"
                            aria-selected={view === v}
                            onClick={() => setView(v)}
                            className={`-mb-px inline-flex items-center gap-1.5 rounded-t-lg border px-3 py-1.5 text-sm font-medium transition-colors ${view === v
                                ? "border-border border-b-card bg-card text-foreground"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            {v === "edit" ? <Pencil className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            {v === "edit" ? "Edit" : "Preview"}
                        </button>
                    ))}
                </div>
                {label && <span className="hidden truncate pb-2 pr-2 font-mono text-[11px] text-muted-foreground sm:inline">{label}</span>}
            </div>
            {view === "edit" ? (
                <div className="flex-1 flex flex-col">{children}</div>
            ) : (
                <MarkdownPreview content={content} title={label ? `${label} preview` : undefined} />
            )}
        </div>
    );
}
