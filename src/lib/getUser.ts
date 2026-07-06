import { and, eq, gte } from "drizzle-orm";
import { db } from "../db";
import { sessions } from "../db/schema";

async function getUser(authToken: string | undefined) {
    if (!authToken) return null;

    const session = await db.query.sessions.findFirst({
        where: and(
            eq(sessions.id, authToken),
            gte(sessions.expiresAt, new Date().getTime())
        ),
        with: {
            user: true,
        },
    });

    if (!session) {
        return null;
    }

    if (!session.user) {
        return null;
    }

    return {
        session,
        user: session.user,
    };
}

export default getUser;
