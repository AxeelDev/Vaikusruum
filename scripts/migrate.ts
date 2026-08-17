import dns from "node:dns";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

dns.setDefaultResultOrder("ipv4first");

const { Client } = pg;

function migrationVersion(fileName: string): string {
  const match = fileName.match(/^(\d+)/);
  if (!match) {
    throw new Error(`Migration file must start with a numeric version: ${fileName}`);
  }
  return match[1];
}

function migrationName(fileName: string): string {
  return fileName.replace(/^\d+_?/, "").replace(/\.sql$/, "") || fileName.replace(/\.sql$/, "");
}

function listMigrationFiles(migrationsDir: string): string[] {
  return readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort((a, b) => migrationVersion(a).localeCompare(migrationVersion(b), undefined, { numeric: true }));
}

async function ensureMigrationsTable(client: pg.Client): Promise<void> {
  await client.query("create schema if not exists supabase_migrations");
  await client.query(`
    create table if not exists supabase_migrations.schema_migrations (
      version text primary key,
      name text,
      statements text[],
      applied_at timestamptz not null default now()
    )
  `);
}

async function getAppliedVersions(client: pg.Client): Promise<Set<string>> {
  const result = await client.query("select version from supabase_migrations.schema_migrations");
  return new Set(result.rows.map((row: { version: string }) => row.version));
}

async function applyMigration(client: pg.Client, fileName: string, sql: string): Promise<string> {
  const version = migrationVersion(fileName);
  const name = migrationName(fileName);

  await client.query("begin");
  try {
    await client.query(sql);
    await client.query(
      "insert into supabase_migrations.schema_migrations (version, name, statements) values ($1, $2, $3)",
      [version, name, [sql]],
    );
    await client.query("commit");
    return version;
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is missing. Check .env.");
  }

  const migrationsDir = join(process.cwd(), "supabase", "migrations");
  const files = listMigrationFiles(migrationsDir);
  const remote = !/localhost|127\.0\.0\.1/.test(connectionString);
  const client = new Client({
    connectionString,
    ssl: remote ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();

  try {
    await ensureMigrationsTable(client);
    const applied = await getAppliedVersions(client);
    const pending = files.filter((file) => !applied.has(migrationVersion(file)));

    if (pending.length === 0) {
      console.log(`Database is up to date. ${applied.size} migration(s) applied.`);
      return;
    }

    for (const file of pending) {
      const sql = readFileSync(join(migrationsDir, file), "utf8");
      const version = await applyMigration(client, file, sql);
      console.log(`Applied ${version} (${file})`);
    }

    console.log(`Migration complete. Applied ${pending.length} migration(s).`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Migration failed");
  process.exit(1);
});
