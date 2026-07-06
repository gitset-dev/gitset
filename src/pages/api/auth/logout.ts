import type { APIContext } from "astro";
import { invalidateSession } from "@/lib/auth";
import getUser from "@/lib/getUser";
import { db } from "@/db";
import { credentials } from "@/db/schema";
import { eq } from "drizzle-orm";

async function revokeGitHubGrant(token: string) {
    const clientId = process.env.GITHUB_AUTH_CLIENT;
    const clientSecret = process.env.GITHUB_AUTH_SECRET;

    try {
        await fetch(`https://api.github.com/applications/${clientId}/grant`, {
            method: "DELETE",
            headers: {
                Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
                Accept: "application/vnd.github.v3+json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ access_token: token }),
        });
    } catch (e) {
        console.warn("Failed to revoke GitHub grant:", e);
    }
}

export async function GET({ cookies }: APIContext) {
    const sessionId = cookies.get("app_auth_token")?.value;

    if (sessionId) {
        const userInfo = await getUser(sessionId);

        if (userInfo?.user?.githubOauthToken) {
            await revokeGitHubGrant(userInfo.user.githubOauthToken);

            await db
                .update(credentials)
                .set({ githubOauthToken: null })
                .where(eq(credentials.id, userInfo.user.id));
        }

        await invalidateSession(sessionId);
    }

    cookies.delete("app_auth_token", {
        path: "/",
    });

    return new Response(null, {
        status: 302,
        headers: {
            Location: "/",
        },
    });
}

export const POST = GET;
