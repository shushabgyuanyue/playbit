import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export function createDbClient(): PostgresJsDatabase | null {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  const ssl = process.env.DATABASE_SSL === "false" ? false : "require";
  return drizzle(postgres(process.env.DATABASE_URL, { ssl }));
}

