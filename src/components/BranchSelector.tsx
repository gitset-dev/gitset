import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface BranchSelectorProps {
    value: string;
    onChange: (value: string) => void;
    branches: string[];
    placeholder?: string;
    disabled?: boolean;
    loading?: boolean;
}

export function BranchSelector({
    value,
    onChange,
    branches,
    placeholder = "Select a branch...",
    disabled = false,
    loading = false,
}: BranchSelectorProps) {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const filteredBranches = branches.filter((branch) =>
        branch.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                {value ? (
                    <span className="truncate">{value}</span>
                ) : (
                    <span className="text-muted-foreground">{loading ? "Loading..." : placeholder}</span>
                )}
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
                    <div className="absolute top-full mt-1 z-50 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95">
                        <div className="flex items-center border-b px-3">
                            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                            <input
                                className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="Search branches..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="max-h-[300px] overflow-y-auto p-1">
                            {filteredBranches.length === 0 && (
                                <div className="py-6 text-center text-sm text-muted-foreground">
                                    No branches found.
                                </div>
                            )}
                            {filteredBranches.map((branch) => (
                                <div
                                    key={branch}
                                    className={cn(
                                        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
                                        value === branch && "bg-accent text-accent-foreground"
                                    )}
                                    onClick={() => {
                                        onChange(branch);
                                        setOpen(false);
                                        setSearchQuery("");
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === branch ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <span className="truncate">{branch}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
