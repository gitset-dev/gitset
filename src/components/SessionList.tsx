import { useState } from "react";
import {
    Monitor,
    Smartphone,
    Globe,
    Unplug,
    LogOut,
} from "lucide-react";
import { Loader } from "./ui/Loader";

interface Session {
    id: string;
    userId: number | null;
    expiresAt: number | string | Date;
    loginLog?: {
        device?: string | null;
        os?: string | null;
        browser?: string | null;
        ip?: string | null;
        loggedInAt?: string | null;
    } | null;
}

interface SessionListProps {
    sessions: Session[];
    currentSessionId?: string;
}

export default function SessionList({ sessions, currentSessionId }: SessionListProps) {
    const [revokingId, setRevokingId] = useState<string | null>(null);
    const [isRevokingAll, setIsRevokingAll] = useState(false);

    const handleRevoke = (sessionId: string, e: React.FormEvent) => {
        setRevokingId(sessionId);
    };

    const handleRevokeAll = (e: React.FormEvent) => {
        setIsRevokingAll(true);
    };

    return (
        <div className="rounded-3xl border border-border bg-card text-card-foreground shadow-sm">
            <div className="flex flex-col space-y-1.5 p-6">
                <h3 className="font-semibold leading-none tracking-tight flex items-center gap-2 text-xl">
                    <Monitor className="h-5 w-5 text-brand" />
                    Active Sessions
                </h3>
                <p className="text-sm text-muted-foreground">
                    Manage devices where you're currently logged in.
                </p>
            </div>
            <div className="p-6 pt-0">
                <div className="space-y-4">
                    {sessions.map((session) => (
                        <div
                            key={session.id}
                            className="flex items-center justify-between p-4 rounded-lg border border-border bg-background/50 hover:bg-accent/5 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-brand/10 flex items-center justify-center text-brand">
                                    {session.loginLog?.device === "mobile" || session.loginLog?.os === "Android" || session.loginLog?.os === "iOS" ? (
                                        <Smartphone className="h-5 w-5" />
                                    ) : (
                                        <Monitor className="h-5 w-5" />
                                    )}
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">
                                        {session.loginLog?.os || "Unknown OS"} •{" "}
                                        {session.loginLog?.browser || "Unknown Browser"}
                                    </p>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                        <span
                                            className="flex items-center gap-1"
                                            title="IP Address"
                                        >
                                            <Globe className="h-3 w-3" />
                                            {session.loginLog?.ip || "Unknown IP"}
                                        </span>
                                        <span>
                                            Last active:{" "}
                                            {(() => {
                                                const dateStr = session.loginLog?.loggedInAt;
                                                if (!dateStr) return "Unknown";

                                                const date = new Date(dateStr.endsWith("Z") ? dateStr : dateStr + "Z");

                                                return date.toLocaleDateString("en-US", {
                                                    year: "numeric",
                                                    month: "2-digit",
                                                    day: "2-digit",
                                                });
                                            })()}
                                        </span>
                                        {session.id === currentSessionId && (
                                            <span className="inline-flex items-center rounded-full border border-transparent bg-brand/15 px-2 py-0.5 text-xs font-semibold text-brand">
                                                Current Session
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {session.id !== currentSessionId && (
                                <form
                                    method="POST"
                                    onSubmit={(e) => handleRevoke(session.id, e)}
                                >
                                    <input type="hidden" name="action" value="revoke" />
                                    <input
                                        type="hidden"
                                        name="sessionId"
                                        value={session.id}
                                    />
                                    <button
                                        type="submit"
                                        disabled={revokingId === session.id}
                                        className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-destructive hover:text-destructive-foreground h-8 px-3"
                                        title="Revoke Session"
                                    >
                                        {revokingId === session.id ? (
                                            <Loader className="h-4 w-4 mr-2" />
                                        ) : (
                                            <Unplug className="h-4 w-4 mr-2" />
                                        )}
                                        {revokingId === session.id ? "Revoking..." : "Revoke"}
                                    </button>
                                </form>
                            )}
                        </div>
                    ))}
                </div>

                {sessions.length > 1 && (
                    <div className="mt-6 pt-6 border-t border-border">
                        <form method="POST" onSubmit={handleRevokeAll}>
                            <input type="hidden" name="action" value="revoke_all" />
                            <button
                                type="submit"
                                disabled={isRevokingAll}
                                className="text-sm text-destructive hover:underline flex items-center gap-1"
                            >
                                {isRevokingAll ? (
                                    <Loader className="h-3 w-3 mr-1" />
                                ) : (
                                    <LogOut className="h-3 w-3" />
                                )}
                                {isRevokingAll ? "Revoking all..." : "Revoke all other sessions"}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
