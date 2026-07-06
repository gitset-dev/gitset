import { KeyRound, AlertCircle } from 'lucide-react';

export default function ToolErrorNotice({ error }: { error: string }) {
    if (/no ai provider configured|add your own ai provider key/i.test(error)) {
        return (
            <div role="alert" className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 space-y-2">
                <p className="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400">
                    <KeyRound className="h-4 w-4 shrink-0" /> No AI provider configured
                </p>
                <p className="text-sm opacity-80">
                    Gitset is BYOAI — connect your own key (OpenAI, Anthropic, Gemini,
                    OpenRouter, or a custom endpoint) and every tool unlocks. Your key is
                    encrypted and never leaves the server.
                </p>
                <a
                    href="/account"
                    className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 dark:text-amber-400 underline underline-offset-4 hover:opacity-80"
                >
                    Add your AI provider key →
                </a>
            </div>
        );
    }
    return (
        <div role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-4">
            <p className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> <span>{error}</span>
            </p>
        </div>
    );
}
