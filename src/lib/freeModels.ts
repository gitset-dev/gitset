/**
 * Server-side reader for the OpenRouter free-model snapshot that the AI
 * Providers modal and the CLI also read (gitset-dev/gitset#56).
 *
 * Cached in-process because this runs on the landing page, the highest-traffic
 * page there is, while the underlying data changes once a day. Without a cache
 * every visitor pays the round-trip, and a core that hangs rather than refuses
 * would block each render for the full timeout.
 *
 * Failures are cached too, briefly: during an outage the page should stop
 * retrying on every request instead of making each visitor wait.
 *
 * Asks for `limit=all` rather than the picker's short list: this displays
 * every model fit to use that day instead of asking anyone to choose one.
 * "Fit" is the server's call — the daily probe asks each model to write a
 * real commit message and drops the ones that can't, so nothing unfit
 * reaches this list to be filtered again here.
 */
export interface FreeModel {
    id: string;
    label: string;
    contextTokens?: number;
    maxOutputTokens?: number;
    goodFor?: string;
    recommended?: boolean;
}

const TTL_OK_MS = 10 * 60_000;
const TTL_EMPTY_MS = 60_000;
const TIMEOUT_MS = 2000;

export interface FreeModelsSnapshot {
    models: FreeModel[];
    /** When the daily refresh last ran, for showing how fresh the list is. */
    updatedAt: string | null;
}

let cache: { at: number; snapshot: FreeModelsSnapshot } | null = null;

export async function getFreeModels(): Promise<FreeModelsSnapshot> {
    const now = Date.now();
    if (cache) {
        const ttl = cache.snapshot.models.length ? TTL_OK_MS : TTL_EMPTY_MS;
        if (now - cache.at < ttl) return cache.snapshot;
    }

    let models: FreeModel[] = [];
    let updatedAt: string | null = null;
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
        const res = await fetch(`${process.env.CORE_API_URL}/api/openrouter-free-models?limit=all`, {
            signal: controller.signal,
        }).finally(() => clearTimeout(timer));
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data?.models)) models = data.models;
            if (typeof data?.updatedAt === 'string') updatedAt = data.updatedAt;
        }
    } catch {
        // Rendering no banner is strictly better than a slow or broken page.
    }

    const snapshot: FreeModelsSnapshot = { models, updatedAt };
    cache = { at: now, snapshot };
    return snapshot;
}
