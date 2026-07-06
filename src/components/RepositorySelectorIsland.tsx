import { useState } from "react";
import { RepositorySelector } from "./RepositorySelector";

interface RepositorySelectorIslandProps {
    githubToken?: string | null;
    initialValue?: string;
    elementId: string;
    placeholder?: string;
    showBranchSelector?: boolean;
}

export function RepositorySelectorIsland({
    githubToken,
    initialValue = "",
    elementId,
    placeholder,
    showBranchSelector = true,
}: RepositorySelectorIslandProps) {
    const [value, setValue] = useState(initialValue);

    return (
        <>
            <RepositorySelector
                githubToken={githubToken}
                value={value}
                onChange={setValue}
                placeholder={placeholder}
                showBranchSelector={showBranchSelector}
            />
            <input type="hidden" id={elementId} value={value} />
        </>
    );
}
