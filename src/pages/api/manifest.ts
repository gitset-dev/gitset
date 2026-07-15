import type { APIRoute } from 'astro';
import getUser from '@/lib/getUser';

const CORE_URL = `${process.env.CORE_API_URL}/api/manifest`;

export const GET: APIRoute = async ({ request, cookies }) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        const response = await fetch(CORE_URL, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
            signal: controller.signal,
        });
        clearTimeout(timeout);
        const data = await response.json();
        return new Response(JSON.stringify(data), {
            status: response.status,
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: "Failed to fetch supported manifests" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};

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

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        const response = await fetch(CORE_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
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
        return new Response(JSON.stringify({ error: "Failed to process manifest request" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
