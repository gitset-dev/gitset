import { eq } from "drizzle-orm";
import { db } from "../db";
import { credentials, sessions, loginLogs } from "../db/schema";

const DAY_IN_MS = 1000 * 60 * 60 * 24;

export async function createSession({ userId }: { userId: number }) {
    const expiresAt = new Date(Date.now() + DAY_IN_MS * 30);

    const [session] = await db
        .insert(sessions)
        .values({
            userId,
            expiresAt: expiresAt.getTime(),
        })
        .returning();

    return {
        sessionId: session.id,
        expiresAt,
    };
}

export async function validateSession(sessionId: string) {
    const [session] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, sessionId));

    if (!session) {
        return null;
    }

    if (Date.now() > session.expiresAt) {
        await db.delete(sessions).where(eq(sessions.id, sessionId));
        return null;
    }

    return session;
}

export async function invalidateSession(sessionId: string) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function createCredential(data: {
    userEmail: string;
    username?: string;
    gitsetKey: string;
    githubOauthToken?: string;
    avatarUrl?: string;
    userPlan?: "basic" | "pro" | "enterprise";
}) {
    const [credential] = await db
        .insert(credentials)
        .values({
            userEmail: data.userEmail,
            username: data.username,
            gitsetKey: data.gitsetKey,
            githubOauthToken: data.githubOauthToken,
            avatarUrl: data.avatarUrl,
            userPlan: data.userPlan ?? "basic",
        })
        .returning();

    return credential;
}

export async function getCredentialByEmail(email: string) {
    const [credential] = await db
        .select()
        .from(credentials)
        .where(eq(credentials.userEmail, email));

    return credential;
}

export async function updateCredentialToken(id: number, token: string) {
    await db
        .update(credentials)
        .set({ githubOauthToken: token })
        .where(eq(credentials.id, id));
}

export async function createLoginLog(data: {
    sessionId: string;
    userId: number;
    strategy: "github" | "google" | "credentials" | "magic_link";
    browser: string;
    device: string;
    os: string;
    ip: string;
    userAgent?: string | null;
}) {
    const browser = data.browser || "unknown";
    const device = data.device || "unknown";
    const os = data.os || "unknown";

    await db.insert(loginLogs).values({
        sessionId: data.sessionId,
        userId: data.userId,
        strategy: data.strategy,
        browser,
        device,
        os,
        ip: data.ip,
    });
}
