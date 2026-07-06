import type { APIRoute } from 'astro';
import getUser from '@/lib/getUser';

export const POST: APIRoute = async ({ request, cookies }) => {
  const user = await getUser(cookies.get('app_auth_token')?.value);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(`${process.env.CORE_API_URL}/api/provider-keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, gitset_key: user.user.gitsetKey }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('provider-keys proxy error:', error instanceof Error ? error.message : error);
    return new Response(JSON.stringify({ error: 'Failed to connect to backend' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
