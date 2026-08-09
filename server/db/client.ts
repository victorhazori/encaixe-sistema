import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";

const databaseUrl = (process.env.DATABASE_URL || "").trim();

/** Local sem Docker/Postgres: DATABASE_URL=pglite — proibido em produção. */
export const usingPglite =
  !databaseUrl ||
  databaseUrl === "pglite" ||
  databaseUrl.startsWith("pglite:");

if (usingPglite && process.env.NODE_ENV === "production") {
  throw new Error(
    "DATABASE_URL=pglite não é permitido em produção. Use PostgreSQL real (postgresql://...) no .env do servidor.",
  );
}

type Closable = { end: () => Promise<void> };

let dbInstance: ReturnType<typeof drizzlePg> | ReturnType<typeof drizzlePglite>;
let poolShim: Closable;
let ready: Promise<void>;

if (usingPglite) {
  const dataDir = path.resolve(process.cwd(), ".data", "pglite");
  ready = (async () => {
    fs.mkdirSync(dataDir, { recursive: true });
    const client = new PGlite(dataDir);
    await client.waitReady;
    dbInstance = drizzlePglite(client, { schema });
    poolShim = {
      async end() {
        await client.close();
      },
    };
    console.log(`[encaixe-db] PGlite local em ${dataDir} (sem Docker/Postgres)`);
  })();
} else {
  ready = Promise.resolve().then(() => {
    const pool = new Pool({ connectionString: databaseUrl });
    dbInstance = drizzlePg(pool, { schema });
    poolShim = pool;
  });
}

await ready;

export const db = dbInstance!;
/** Compatível com código que chama pool.end() */
export const pool = poolShim!;
export async function closeDb() {
  await pool.end();
}
