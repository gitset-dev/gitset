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

let cache: { at: number; models: FreeModel[] } | null = null;

export async function getFreeModels(): Promise<FreeModel[]> {
    const now = Date.now();
    if (cache) {
        const ttl = cache.models.length ? TTL_OK_MS : TTL_EMPTY_MS;
        if (now - cache.at < ttl) return cache.models;
    }

    let models: FreeModel[] = [];
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
        const res = await fetch(`${process.env.CORE_API_URL}/api/openrouter-free-models`, {
            signal: controller.signal,
        }).finally(() => clearTimeout(timer));
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data?.models)) models = data.models;
        }
    } catch {
        // Rendering no banner is strictly better than a slow or broken page.
    }

    cache = { at: now, models };
    return models;
}
