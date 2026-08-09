import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const url = (process.env.DATABASE_URL || "").trim();
const usingPglite = !url || url === "pglite" || url.startsWith("pglite:");

// generate usa só o schema; a URL real só importa para migrate via drizzle-kit.
// Migrações locais com PGlite usam: npm run db:migrate (server/db/migrate.ts)
const credentialsUrl = usingPglite
  ? "postgresql://encaixe:encaixe_local@127.0.0.1:5432/encaixe"
  : url;

if (!usingPglite && !credentialsUrl) {
  throw new Error("DATABASE_URL não definida. Copie .env.example para .env.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./server/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: credentialsUrl },
});
