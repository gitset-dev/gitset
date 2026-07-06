import type { APIContext } from "astro";
import { db } from "@/db";
import { repoSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import getUser from "@/lib/getUser";

export async function POST({ request, cookies }: APIContext) {
    try {
        const session = await getUser(cookies.get("app_auth_token")?.value);
        if (!session) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }
        const user = session.user;
        const userEmail = user.userEmail;

        const body = await request.json();
        const { action, content } = body;

        if (action === "get_settings") {
            const settings = await db.query.repoSettings.findFirst({
                where: eq(repoSettings.userEmail, userEmail),
            });

            return new Response(JSON.stringify({
                settings: settings || {}
            }), { status: 200 });
        }

        if (action === "update_labels") {
            await db.insert(repoSettings).values({
                userEmail,
                labelsTemplate: content,
                updatedAt: new Date().toISOString()
            }).onConflictDoUpdate({
                target: repoSettings.userEmail,
                set: {
                    labelsTemplate: content,
                    updatedAt: new Date().toISOString()
                }
            });

            return new Response(JSON.stringify({ success: true }), { status: 200 });
        }

        return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });
    } catch (error) {
        console.error("API Error:", error);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
    }
}
