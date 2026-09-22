import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

function resolveSsl(databaseUrl: string): false | "require" {
  const sslSetting = process.env.DATABASE_SSL?.toLowerCase();
  const isInternalRailwayHost = databaseUrl.includes(".railway.internal");

  if (isInternalRailwayHost) {
    return false;
  }
  if (sslSetting === "false") {
    return false;
  }
  if (sslSetting === "true") {
    return "require";
  }
  return databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1") ? false : "require";
}

export function createDbClient(): PostgresJsDatabase | null {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  return drizzle(postgres(process.env.DATABASE_URL, { ssl: resolveSsl(process.env.DATABASE_URL) }));
}
