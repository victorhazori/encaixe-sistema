import "dotenv/config";
import path from "node:path";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { closeDb, db, usingPglite } from "./client.js";

const migrationsFolder = path.resolve(process.cwd(), "drizzle");

async function main() {
  if (usingPglite) {
    await migratePglite(db as Parameters<typeof migratePglite>[0], { migrationsFolder });
    console.log("Migrações aplicadas no PGlite local.");
  } else {
    await migratePg(db as Parameters<typeof migratePg>[0], { migrationsFolder });
    console.log("Migrações aplicadas no PostgreSQL.");
  }
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
