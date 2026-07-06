import { randomBytes } from "node:crypto";
import { UAParser } from "ua-parser-js";

import type { APIContext } from "astro";
import { requireEnv } from "@/lib/env";

import {
    createCredential,
    createLoginLog,
    createSession,
    getCredentialByEmail,
    updateCredentialToken,
} from "@/lib/auth";

export async function GET({ request, clientAddress, cookies }: APIContext) {
    const code = new URL(request.url).searchParams?.get("code");
    const state = new URL(request.url).searchParams?.get("state");

    const storedState = cookies.get("github_oauth_state")?.value;

    if (storedState !== state || !code) {
        cookies.delete("github_oauth_state", { path: "/" });
        return new Response(null, {
            status: 302,
            headers: { Location: "/login?error=Server+Error" },
        });
    }

    try {
        const params = new URLSearchParams({
            client_id: requireEnv("GITHUB_AUTH_CLIENT"),
            client_secret: requireEnv("GITHUB_AUTH_SECRET"),
            code: code,
        });

        const tokenUrl = `https://github.com/login/oauth/access_token?${params.toString()}`;

        const fetchToken = await fetch(tokenUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                accept: "application/json",
            },
        });

        const fetchTokenRes = await fetchToken.json();
        const accessToken = fetchTokenRes.access_token;

        if (!accessToken) {
            throw new Error("No access token received");
        }

        const fetchUser = await fetch("https://api.github.com/user", {
            headers: {
                accept: "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
        });

        const fetchUserRes = await fetchUser.json();

        const fetchEmail = await fetch("https://api.github.com/user/emails", {
            headers: {
                accept: "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
        });

        const fetchEmailRes = await fetchEmail.json();

        const userEmail = (() => {
            if (Array.isArray(fetchEmailRes)) {
                const primary = fetchEmailRes.find((e) => e.primary && e.verified);
                const verified = fetchEmailRes.find((e) => e.verified);
                return primary?.email || verified?.email || fetchEmailRes[0]?.email;
            }
            return null;
        })();

        if (!userEmail) {
            throw new Error("No email found");
        }

        let nextPath = "/dashboard";
        if (state && state.includes(":::")) {
            const candidate = state.split(":::").slice(1).join(":::");
            if (candidate.startsWith("/") && !candidate.startsWith("//")) {
                nextPath = candidate;
            }
        }

        let credential = await getCredentialByEmail(userEmail);

        if (credential) {
            await updateCredentialToken(credential.id, accessToken);
        } else {
            credential = await createCredential({
                userEmail,
                username: fetchUserRes.login,
                gitsetKey: `gs_${randomBytes(24).toString("hex")}`,
                githubOauthToken: accessToken,
                avatarUrl: fetchUserRes.avatar_url,
                userPlan: "basic",
            });
        }

        if (!credential) {
            throw new Error("Failed to create or retrieve credential");
        }

        const { sessionId, expiresAt } = await createSession({
            userId: credential.id,
        });

        const parser = new UAParser(request.headers.get("user-agent") || "");
        const result = parser.getResult();

        await createLoginLog({
            sessionId,
            userId: credential.id,
            strategy: "github",
            browser: result.browser.name || "unknown",
            device: result.device.type || "desktop",
            os: result.os.name || "unknown",
            ip: clientAddress || "unknown",
            userAgent: request.headers.get("user-agent"),
        });

        cookies.delete("github_oauth_state", { path: "/" });

        cookies.set("app_auth_token", sessionId, {
            path: "/",
            httpOnly: true,
            sameSite: "lax",
            secure: import.meta.env.PROD,
            expires: expiresAt,
        });

        return new Response(null, {
            status: 302,
            headers: {
                Location: nextPath,
            },
        });
    } catch (error) {
        console.error("GitHub Auth Error:", error);
        cookies.delete("github_oauth_state", { path: "/" });
        return new Response(null, {
            status: 302,
            headers: {
                Location: "/login?error=Auth+Failed",
            },
        });
    }
}
