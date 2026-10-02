import React, { useEffect, useState } from 'react';
import { MessageSquarePlus, Loader2, Check, AlertCircle, ExternalLink } from 'lucide-react';
import { Modal } from './Modal';

const API = '/api/feedback';

const TYPE_OPTIONS = [
    { value: 'bug', label: 'Bug Report' },
    { value: 'suggestion', label: 'Feature Suggestion' },
    { value: 'qos', label: 'Quality of Service / General Feedback' },
];

function toolFromRoute(pathname: string): string {
    const match = pathname.match(/^\/tools\/([a-z0-9-]+)/);
    if (match) return match[1];
    if (pathname === '/') return 'homepage';
    return pathname.replace(/^\//, '') || 'homepage';
}

export default function FeedbackWidget() {
    const [open, setOpen] = useState(false);
    const [type, setType] = useState('bug');
    const [title, setTitle] = useState('');
    const [tool, setTool] = useState('');
    const [message, setMessage] = useState('');
    const [consent, setConsent] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [issueUrl, setIssueUrl] = useState<string | null>(null);
    const [footerVisible, setFooterVisible] = useState(false);

    useEffect(() => {
        setTool(toolFromRoute(window.location.pathname));
        const handler = () => setOpen(true);
        window.addEventListener('open-feedback-widget', handler);
        return () => window.removeEventListener('open-feedback-widget', handler);
    }, []);

    useEffect(() => {
        const footer = document.querySelector('footer');
        if (!footer) return;
        const observer = new IntersectionObserver(([entry]) => setFooterVisible(entry.isIntersecting));
        observer.observe(footer);
        return () => observer.disconnect();
    }, []);

    function reset() {
        setType('bug');
        setTitle('');
        setMessage('');
        setConsent(true);
        setError(null);
        setIssueUrl(null);
    }

    function close() {
        setOpen(false);
        reset();
    }

    async function submit() {
        if (!title.trim()) {
            setError('Please add a short title.');
            return;
        }
        if (!message.trim()) {
            setError('Please describe your feedback.');
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            const metadata = consent
                ? { userAgent: navigator.userAgent, route: window.location.pathname }
                : undefined;
            const res = await fetch(API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, source: 'web', title, tool, message, metadata }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
            setIssueUrl(data.issueUrl);
        } catch (err: any) {
            setError(err.message || 'Failed to submit feedback.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                aria-label="Send feedback"
                className={`fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 sm:bottom-6 sm:right-6 z-40 inline-flex items-center gap-2 rounded-full border border-border bg-popover/90 backdrop-blur-xl text-foreground shadow-xl px-4 h-11 text-sm font-medium hover:border-brand/50 hover:-translate-y-0.5 transition-all duration-300 [&>svg]:text-brand ${footerVisible ? 'opacity-0 translate-y-2 pointer-events-none' : 'opacity-100'}`}
            >
                <MessageSquarePlus className="h-4 w-4" />
                Feedback
            </button>

            <Modal isOpen={open} onClose={close} title="Send Feedback" maxWidth="max-w-lg">
                {issueUrl ? (
                    <div className="p-6 flex flex-col items-center text-center gap-3">
                        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-brand/25 bg-brand/10"><Check className="h-7 w-7 text-brand" /></span>
                        <p className="font-medium">Thanks for the feedback!</p>
                        <a
                            href={issueUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-brand underline underline-offset-4"
                        >
                            View your issue <ExternalLink className="h-3 w-3" />
                        </a>
                        <button
                            onClick={close}
                            className="mt-2 inline-flex items-center justify-center rounded-lg text-sm font-medium bg-secondary hover:bg-secondary/70 h-9 px-4 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                ) : (
                    <div className="p-1 space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Feedback type</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="flex h-10 w-full rounded-lg border border-input bg-card/60 px-3 text-sm shadow-xs transition-colors hover:border-foreground/20 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
                            >
                                {TYPE_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Title</label>
                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Short summary of your feedback"
                                maxLength={120}
                                className="flex h-10 w-full rounded-lg border border-input bg-card/60 px-3 text-sm shadow-xs transition-colors hover:border-foreground/20 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Tool or page (optional)</label>
                            <input
                                value={tool}
                                onChange={(e) => setTool(e.target.value)}
                                className="flex h-10 w-full rounded-lg border border-input bg-card/60 px-3 text-sm shadow-xs transition-colors hover:border-foreground/20 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Your feedback</label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Describe the bug, suggestion, or feedback..."
                                rows={5}
                                className="flex w-full rounded-lg border border-input bg-card/60 px-3 py-2 text-sm shadow-xs resize-none transition-colors hover:border-foreground/20 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
                            />
                        </div>

                        <label className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
                            <input
                                type="checkbox"
                                checked={consent}
                                onChange={(e) => setConsent(e.target.checked)}
                                className="mt-0.5"
                            />
                            Include my browser and current page to help debugging. No personal data, keys, or file contents are ever collected.
                        </label>

                        {error && (
                            <div className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">
                                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            onClick={submit}
                            disabled={submitting || !title.trim() || !message.trim()}
                            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 h-10 px-4 w-full disabled:opacity-50 transition-colors"
                        >
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Submit feedback
                        </button>
                    </div>
                )}
            </Modal>
        </>
    );
}
