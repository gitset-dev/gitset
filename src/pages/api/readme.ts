import type { APIRoute } from 'astro';
import getUser from '@/lib/getUser';

export const POST: APIRoute = async ({ request, cookies }) => {
    const authToken = cookies.get("app_auth_token")?.value;
    const user = await getUser(authToken);

    if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" }
        });
    }

    try {
        const body = await request.json();

        const payload = {
            ...body,
            gitset_key: user.user.gitsetKey
        };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120000);
        const response = await fetch(`${process.env.CORE_API_URL}/api/readme`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });
        clearTimeout(timeout);

        const data = await response.json();

        return new Response(JSON.stringify(data), {
            status: response.status,
            headers: {
                "Content-Type": "application/json"
            }
        });
    } catch (error) {
        console.error("Proxy error:", error);
        return new Response(JSON.stringify({ error: "Failed to connect to backend" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
