import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
    try {
        const url = new URL(request.url);
        const queryString = url.search;

        const response = await fetch(`${process.env.CORE_API_URL}/api/templates${queryString}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        const data = await response.json();

        return new Response(JSON.stringify(data), {
            status: response.status,
            headers: {
                "Content-Type": "application/json"
            }
        });
    } catch (error) {
        console.error("Templates proxy error:", error);
        return new Response(JSON.stringify({ error: "Failed to connect to backend" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();

        const response = await fetch(`${process.env.CORE_API_URL}/api/templates`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        return new Response(JSON.stringify(data), {
            status: response.status,
            headers: {
                "Content-Type": "application/json"
            }
        });
    } catch (error) {
        console.error("Templates proxy error:", error);
        return new Response(JSON.stringify({ error: "Failed to connect to backend" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};
