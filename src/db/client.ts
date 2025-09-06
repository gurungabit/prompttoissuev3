import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../lib/env";
import * as schema from "./schema";

let pool: Pool | null = null;
let initialized = false;

function makePool() {
  if (pool) return pool;
  if (env.DATABASE_URL) {
    pool = new Pool({ connectionString: env.DATABASE_URL });
  } else if (env.POSTGRES_HOST) {
    pool = new Pool({
      host: env.POSTGRES_HOST,
      port: env.POSTGRES_PORT ?? 5432,
      user: env.POSTGRES_USER ?? "postgres",
      password: env.POSTGRES_PASSWORD ?? "postgres",
      database: env.POSTGRES_DB ?? "app",
      ssl:
        process.env.POSTGRES_SSL === "true"
          ? { rejectUnauthorized: false }
          : false,
    });
  } else {
    throw new Error(
      "No Postgres configuration found. Set DATABASE_URL or POSTGRES_* envs.",
    );
  }
  return pool;
}

export function getDb() {
  const p = makePool();
  if (!initialized) {
    initialized = true;
  }
  return drizzle(p, { schema });
}

export type DB = ReturnType<typeof getDb>;
