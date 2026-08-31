/**
 * A backend timeout/outage can mean the browser receives a raw, non-JSON
 * body straight from the hosting platform (a gateway error page, plain
 * text) instead of ever reaching this app's own proxy code — which always
 * returns clean JSON, success or failure. Plain `await res.json()` throws
 * a raw SyntaxError in that case ("Unexpected token '<'... is not valid
 * JSON"), which is exactly the kind of message this app promises a
 * non-technical user they'll never have to read.
 *
 * Parses defensively and normalizes to the shape callers already expect:
 * `{ error: string }` on any failure, so existing `data.error` reads keep
 * working unchanged.
 */
export async function safeFetchJson(res: Response): Promise<any> {
    const raw = await res.text();
    try {
        return JSON.parse(raw);
    } catch {
        return {
            error: res.ok
                ? "The server sent back something unexpected. Try again in a moment."
                : `The server didn't respond properly (HTTP ${res.status}). Try again in a moment.`,
        };
    }
}
