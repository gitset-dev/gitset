import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

// Rotating, shimmering status line shown while the AI drafts — the first
// message is the tool's own label, the rest narrate what's happening.
export function GeneratingStatus({ messages, interval = 2600 }: { messages: string[]; interval?: number }) {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (messages.length < 2) return;
        const id = setInterval(() => setIndex((i) => (i + 1) % messages.length), interval);
        return () => clearInterval(id);
    }, [messages.length, interval]);

    return (
        <div role="status" aria-live="polite" className="flex flex-col items-center gap-4 px-6 text-center">
            <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-brand/25 bg-card shadow-lg">
                <span aria-hidden="true" className="absolute inset-0 rounded-2xl bg-brand/10 animate-pulse" />
                <Sparkles className="relative h-5 w-5 text-brand animate-[thin-pulse_1.6s_ease-in-out_infinite]" />
            </span>
            <p key={index} className="text-shimmer text-sm font-medium animate-[fade-up_0.45s_cubic-bezier(0.16,1,0.3,1)_both]">
                {messages[index]}
            </p>
        </div>
    );
}
