import { NextResponse } from "next/server";
import { createClient } from "@libsql/client/web";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

    const dbUrl = process.env.DB_URL;
    const dbToken = process.env.DB_TOKEN;

    if (!dbUrl || !dbToken) {
      console.error("Database credentials not configured");
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 }
      );
    }

    const client = createClient({
      url: dbUrl,
      authToken: dbToken,
    });

    // Ensure the waitlist table exists
    await client.execute(`
      CREATE TABLE IF NOT EXISTS waitlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert the email into the waitlist table
    try {
      await client.execute({
        sql: "INSERT INTO waitlist (email) VALUES (?)",
        args: [email],
      });
      return NextResponse.json({ success: true }, { status: 200 });
    } catch (e: any) {
      if (e.message?.includes("UNIQUE constraint failed") || e.code === "SQLITE_CONSTRAINT") {
        // Email already exists, that's fine for a waitlist
        return NextResponse.json({ success: true, message: "Already on the waitlist" }, { status: 200 });
      }
      throw e;
    }

  } catch (error) {
    console.error("Waitlist API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
