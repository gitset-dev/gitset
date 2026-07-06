import type { APIRoute } from 'astro';
import getUser from '@/lib/getUser';

async function proxy(action: string, payload: Record<string, unknown>, gitsetKey: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    try {
        const res = await fetch(`${process.env.CORE_API_URL}/api/gitignore`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, ...payload, gitset_key: gitsetKey }),
            signal: controller.signal,
        });
        const data = await res.json();
        return new Response(JSON.stringify(data), {
            status: res.status,
            headers: { 'Content-Type': 'application/json' },
        });
    } finally {
        clearTimeout(timeout);
    }
}

export const GET: APIRoute = async ({ url, cookies }) => {
    const user = await getUser(cookies.get('app_auth_token')?.value);
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    const action = url.searchParams.get('action') || 'list';
    try {
        return await proxy(action, {}, user.user.gitsetKey);
    } catch {
        return new Response(JSON.stringify({ error: 'Failed to connect to backend' }), { status: 502 });
    }
};

export const POST: APIRoute = async ({ request, cookies }) => {
    const user = await getUser(cookies.get('app_auth_token')?.value);
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    try {
        const body = await request.json();
        const { action = 'generate', ...payload } = body;
        delete (payload as any).gitset_key;
        return await proxy(action, payload, user.user.gitsetKey);
    } catch {
        return new Response(JSON.stringify({ error: 'Failed to connect to backend' }), { status: 502 });
    }
};
