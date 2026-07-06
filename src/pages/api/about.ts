import type { APIContext } from "astro";
import getUser from "@/lib/getUser";

const CORE_API_URL = `${process.env.CORE_API_URL}/api/about`;

export async function POST({ request, cookies }: APIContext) {
    const user = await getUser(cookies.get("app_auth_token")?.value);
    if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    try {
        const body = await request.json();
        const { action, ...payload } = body;
        delete (payload as any).gitset_key;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120000);
        const response = await fetch(CORE_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action,
                ...payload,
                gitset_key: user.user.gitsetKey,
            }),
            signal: controller.signal,
        });
        clearTimeout(timeout);

        const data = await response.json();
        return new Response(JSON.stringify(data), {
            status: response.status,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error: any) {
        console.error("Error in About proxy:", error?.message || error);
        return new Response(JSON.stringify({ error: "Failed to connect to backend" }), { status: 502 });
    }
}
