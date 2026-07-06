import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

import { Loader2, Check, ChevronsUpDown, Search, GitBranch, Tag, GitCommit } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReferenceSelectorProps {
    value: string;
    onChange: (value: string) => void;
    branches: string[];
    tags: string[];
    placeholder?: string;
    disabled?: boolean;
    loading?: boolean;
}

type Tab = 'branches' | 'tags';

export function ReferenceSelector({
    value,
    onChange,
    branches,
    tags,
    placeholder = "Select reference...",
    disabled = false,
    loading = false,
}: ReferenceSelectorProps) {
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('branches');
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (tags.includes(value)) {
            setActiveTab('tags');
        } else if (branches.includes(value)) {
            setActiveTab('branches');
        }
    }, [value, branches, tags]);

    const filteredItems = activeTab === 'branches'
        ? branches.filter(b => b.toLowerCase().includes(searchQuery.toLowerCase()))
        : tags.filter(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="relative flex-1 min-w-0">
            {}
            <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between font-normal"
                onClick={() => setOpen(!open)}
                disabled={disabled || loading}
                title={value || placeholder}
            >
                <div className="flex items-center gap-2 truncate">
                    {value ? (
                        <>
                            {tags.includes(value) ? <Tag className="h-3 w-3 opacity-50" /> :
                                branches.includes(value) ? <GitBranch className="h-3 w-3 opacity-50" /> :
                                    <GitCommit className="h-3 w-3 opacity-50" />}
                            <span className="truncate">{value}</span>
                        </>
                    ) : (
                        <span className="text-muted-foreground">{loading ? "Loading..." : placeholder}</span>
                    )}
                </div>
                {loading ? (
                    <Loader2 className="ml-2 h-4 w-4 animate-spin opacity-50 shrink-0" />
                ) : (
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                )}
            </Button>

            {}
            {open && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setOpen(false)}
                    />
                    <div className="absolute top-full mt-1 z-50 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95 overflow-hidden flex flex-col">

                        {}
                        <div className="flex border-b">
                            <button
                                onClick={() => setActiveTab('branches')}
                                className={cn(
                                    "flex-1 px-3 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1",
                                    activeTab === 'branches' ? "bg-accent text-accent-foreground" : "hover:bg-muted text-muted-foreground"
                                )}
                            >
                                <GitBranch className="h-3 w-3" /> Branches
                            </button>
                            <button
                                onClick={() => setActiveTab('tags')}
                                className={cn(
                                    "flex-1 px-3 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1",
                                    activeTab === 'tags' ? "bg-accent text-accent-foreground" : "hover:bg-muted text-muted-foreground"
                                )}
                            >
                                <Tag className="h-3 w-3" /> Tags
                            </button>
                        </div>

                        {}
                        <div className="p-2">
                            <div className="flex items-center border rounded-md px-3 mb-2">
                                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                <input
                                    className="flex h-9 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder={`Search ${activeTab}...`}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="max-h-[200px] overflow-y-auto">
                                {filteredItems.length === 0 && (
                                    <div className="py-6 text-center text-sm text-muted-foreground">
                                        No {activeTab} found.
                                    </div>
                                )}
                                {filteredItems.map((item) => (
                                    <div
                                        key={item}
                                        className={cn(
                                            "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
                                            value === item && "bg-accent text-accent-foreground"
                                        )}
                                        onClick={() => {
                                            onChange(item);
                                            setOpen(false);
                                            setSearchQuery("");
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value === item ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        <span className="truncate">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
