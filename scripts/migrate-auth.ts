import { loadEnvConfig } from "@next/env";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { getMigrations } from "better-auth/db/migration";
import { getAuth } from "../src/server/auth";
import { getPool } from "../src/server/db";

loadEnvConfig(process.cwd());

const pool = getPool();
const connection = await pool.connect();
try {
  // One migration runner at a time, including Better Auth's own migrations.
  await connection.query("SELECT pg_advisory_lock(714472516)");
  const { runMigrations } = await getMigrations(getAuth().options);
  await runMigrations();
  await connection.query("BEGIN");
  await connection.query("CREATE TABLE IF NOT EXISTS kiraquest_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
  const directory = new URL("../src/server/migrations/", import.meta.url);
  const files = (await readdir(directory)).filter((file) => /^\d+[-\w]*\.sql$/.test(file)).sort();
  for (const file of files) {
    const existing = await connection.query("SELECT 1 FROM kiraquest_migrations WHERE name = $1", [file]);
    if (existing.rowCount) continue;
    await connection.query(await readFile(fileURLToPath(new URL(file, directory)), "utf8"));
    await connection.query("INSERT INTO kiraquest_migrations (name) VALUES ($1)", [file]);
    console.info(`Applied ${file}`);
  }
  await connection.query("COMMIT");
  console.info("Authentication and account migrations complete.");
} catch {
  await connection.query("ROLLBACK").catch(() => {});
  console.error("Migration failed. Check the database connection, permissions and migration history locally; no secrets were printed.");
  process.exitCode = 1;
} finally {
  await connection.query("SELECT pg_advisory_unlock(714472516)").catch(() => {});
  connection.release();
  await pool.end();
}
