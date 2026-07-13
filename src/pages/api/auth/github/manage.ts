import type { APIContext } from "astro";
import { requireEnv } from "@/lib/env";

export async function GET(_context: APIContext) {
    const clientId = requireEnv("GITHUB_AUTH_CLIENT");
    return new Response(null, {
        status: 302,
        headers: {
            Location: `https://github.com/settings/connections/applications/${clientId}`,
        },
    });
}
