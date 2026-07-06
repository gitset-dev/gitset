import { createId } from "@paralleldrive/cuid2";
import type { APIContext } from "astro";
import { requireEnv } from "@/lib/env";

export async function GET({ cookies, request }: APIContext) {
    const state = createId();

    const rawNext = new URL(request.url).searchParams.get("next") || "";
    const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "";

    cookies.set("github_oauth_state", next ? `${state}:::${next}` : state, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: import.meta.env.PROD,
        maxAge: 60 * 10,
    });

    const params = new URLSearchParams({
        scope: "user:email repo read:org",
        response_type: "code",
        client_id: requireEnv("GITHUB_AUTH_CLIENT"),
        redirect_uri: requireEnv("GITHUB_AUTH_CALLBACK_URL"),
        state: next ? `${state}:::${next}` : state,
    });

    return new Response(null, {
        status: 302,
        headers: {
            Location: `https://github.com/login/oauth/authorize?${params.toString()}`,
        },
    });
}
