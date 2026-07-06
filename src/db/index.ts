import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { requireEnv } from "@/lib/env";
import * as schema from "./schema";

const client = createClient({
  url: requireEnv("DB_URL"),
  authToken: requireEnv("DB_TOKEN"),
});

export const db = drizzle(client, { schema });
