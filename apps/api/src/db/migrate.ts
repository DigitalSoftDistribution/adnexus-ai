#!/usr/bin/env ts-node
/**
 * Database Migration Runner
 *
 * Reads migration files from /migrations directory, executes them in order
 * using a PostgreSQL client, and records applied migrations in a `migrations`
 * table.
 *
 * CLI Usage:
 *   npm run migrate:up      Apply all pending migrations
 *   npm run migrate:down    Rollback the last batch of migrations
 *   npm run migrate:status  Show current migration status
 */

import * as fs from "fs";
import * as path from "path";
import { query, closePool } from "./connection";
import { logger } from "../utils/logger";

// ── Configuration ───────────────────────────────────────────────────────────

const MIGRATIONS_DIR = path.resolve(__dirname, "../../migrations");

// ── Types ───────────────────────────────────────────────────────────────────

interface MigrationFile {
  id: number;
  name: string;
  filename: string;
  filepath: string;
  upSql: string;
  downSql: string;
}

interface AppliedMigration extends Record<string, unknown> {
  id: number;
  name: string;
  applied_at: Date;
  batch: number;
}

// ── Migration file parsing ──────────────────────────────────────────────────

/**
 * Parse a migration file into up/down SQL blocks.
 *
 * Files use this format:
 *   -- migrate:up
 *   CREATE TABLE ...;
 *
 *   -- migrate:down
 *   DROP TABLE ...;
 *
 * If a migrate:down section is absent, the migration is non-reversible.
 */
function parseMigration(content: string): { upSql: string; downSql: string } {
  const upMatch = content.match(/--\s*migrate:up\s*\n?([\s\S]*?)(?=--\s*migrate:down|$)/i);
  const downMatch = content.match(/--\s*migrate:down\s*\n?([\s\S]*?)(?=--\s*migrate:up|$)/i);

  const upSql = upMatch ? upMatch[1].trim() : "";
  const downSql = downMatch ? downMatch[1].trim() : "";

  return { upSql, downSql };
}

/**
 * Load all migration files from the migrations directory, sorted by ID.
 */
function loadMigrations(): MigrationFile[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    logger.error(`[Migrate] Migrations directory not found: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  return files.map((filename) => {
    const match = filename.match(/^(\d+)_(.+)\.sql$/);
    if (!match) {
      throw new Error(`[Migrate] Invalid migration filename: ${filename}. Expected: NNN_name.sql`);
    }

    const [, idStr, name] = match;
    const id = parseInt(idStr, 10);
    const filepath = path.join(MIGRATIONS_DIR, filename);
    const content = fs.readFileSync(filepath, "utf-8");
    const { upSql, downSql } = parseMigration(content);

    return { id, name, filename, filepath, upSql, downSql };
  });
}

// ── Migration tracking table ────────────────────────────────────────────────

const CREATE_MIGRATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS migrations (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    applied_at  TIMESTAMPTZ DEFAULT NOW(),
    batch       INTEGER NOT NULL
  );
`;

/**
 * Ensure the migrations tracking table exists.
 */
async function ensureMigrationsTable(): Promise<void> {
  await query(CREATE_MIGRATIONS_TABLE);
}

/**
 * Get all currently applied migrations, ordered by ID.
 */
async function getAppliedMigrations(): Promise<AppliedMigration[]> {
  const { rows } = await query<AppliedMigration>(
    "SELECT id, name, applied_at, batch FROM migrations ORDER BY id"
  );
  return rows;
}

/**
 * Get the next batch number for recording applied migrations.
 */
async function getNextBatch(): Promise<number> {
  const { rows } = await query<{ max: number | null }>(
    "SELECT COALESCE(MAX(batch), 0) + 1 AS max FROM migrations"
  );
  return rows[0].max ?? 1;
}

/**
 * Record a migration as applied.
 */
async function recordMigration(
  id: number,
  name: string,
  batch: number
): Promise<void> {
  await query("INSERT INTO migrations (id, name, batch) VALUES ($1, $2, $3)", [
    id,
    name,
    batch,
  ]);
}

/**
 * Remove a migration record (for rollback).
 */
async function removeMigration(id: number): Promise<void> {
  await query("DELETE FROM migrations WHERE id = $1", [id]);
}

// ── CLI commands ────────────────────────────────────────────────────────────

/**
 * Apply all pending migrations.
 */
async function migrateUp(): Promise<void> {
  await ensureMigrationsTable();

  const migrations = loadMigrations();
  const applied = await getAppliedMigrations();
  const appliedIds = new Set(applied.map((a) => a.id));

  const pending = migrations.filter((m) => !appliedIds.has(m.id));

  if (pending.length === 0) {
    console.log("✅ No pending migrations. Database is up to date.");
    return;
  }

  const batch = await getNextBatch();
  console.log(`⬆️  Applying ${pending.length} migration(s) (batch ${batch})...\n`);

  for (const migration of pending) {
    if (!migration.upSql) {
      console.log(`⚠️  Skipping ${migration.filename} — no up migration found`);
      continue;
    }

    console.log(`  → ${migration.id}_${migration.name}`);
    logger.info(`[Migrate:UP] ${migration.id}_${migration.name}`);

    try {
      await query("BEGIN");
      await query(migration.upSql);
      await recordMigration(migration.id, migration.name, batch);
      await query("COMMIT");
      console.log(`     ✅ Applied`);
    } catch (error) {
      await query("ROLLBACK");
      logger.error({ err: error }, `[Migrate:UP] Failed on ${migration.filename}`);
      console.error(`     ❌ Failed: ${(error as Error).message}`);
      throw error;
    }
  }

  console.log(`\n✅ ${pending.length} migration(s) applied successfully.`);
}

/**
 * Rollback the last batch of migrations.
 */
async function migrateDown(): Promise<void> {
  await ensureMigrationsTable();

  const migrations = loadMigrations();
  const applied = await getAppliedMigrations();

  if (applied.length === 0) {
    console.log("ℹ️  No migrations have been applied.");
    return;
  }

  // Find the highest batch number
  const maxBatch = Math.max(...applied.map((a) => a.batch));
  const toRollback = applied.filter((a) => a.batch === maxBatch);
  const rollbackIds = new Set(toRollback.map((a) => a.id));

  console.log(
    `⬇️  Rolling back ${toRollback.length} migration(s) (batch ${maxBatch})...\n`
  );

  // Roll back in reverse order
  const rollbackMigrations = migrations
    .filter((m) => rollbackIds.has(m.id))
    .sort((a, b) => b.id - a.id);

  for (const migration of rollbackMigrations) {
    if (!migration.downSql) {
      console.log(
        `⚠️  Skipping ${migration.filename} — no down migration (non-reversible)`
      );
      continue;
    }

    console.log(`  → ${migration.id}_${migration.name}`);
    logger.info(`[Migrate:DOWN] ${migration.id}_${migration.name}`);

    try {
      await query("BEGIN");
      await query(migration.downSql);
      await removeMigration(migration.id);
      await query("COMMIT");
      console.log(`     ✅ Rolled back`);
    } catch (error) {
      await query("ROLLBACK");
      logger.error({ err: error }, `[Migrate:DOWN] Failed on ${migration.filename}`);
      console.error(`     ❌ Failed: ${(error as Error).message}`);
      throw error;
    }
  }

  console.log(`\n✅ ${toRollback.length} migration(s) rolled back.`);
}

/**
 * Show current migration status.
 */
async function migrateStatus(): Promise<void> {
  await ensureMigrationsTable();

  const migrations = loadMigrations();
  const applied = await getAppliedMigrations();
  const appliedMap = new Map(applied.map((a) => [a.id, a]));

  console.log("\n📋 Migration Status\n");
  console.log("  ID  │ Status   │ Name");
  console.log("──────┼──────────┼─────────────────────────────────────────");

  for (const m of migrations) {
    const app = appliedMap.get(m.id);
    const status = app ? `✅ applied` : `⬜ pending`;
    const batch = app ? ` (batch ${app.batch})` : "";
    console.log(
      `  ${String(m.id).padStart(3)} │ ${status.padEnd(8)} │ ${m.name}${batch}`
    );
  }

  const pending = migrations.length - applied.length;
  console.log(`\n  Total: ${migrations.length}  |  Applied: ${applied.length}  |  Pending: ${pending}`);
}

// ── CLI entry point ─────────────────────────────────────────────────────────

const COMMANDS: Record<string, () => Promise<void>> = {
  up: migrateUp,
  down: migrateDown,
  status: migrateStatus,
};

async function main(): Promise<void> {
  const cmd = process.argv[2] ?? "status";

  if (!COMMANDS[cmd]) {
    console.error(`\n❌ Unknown command: "${cmd}"`);
    console.error("\nUsage: ts-node migrate.ts <command>");
    console.error("  Commands:");
    console.error("    up      Apply all pending migrations");
    console.error("    down    Rollback the last batch");
    console.error("    status  Show migration status\n");
    process.exit(1);
  }

  try {
    // Verify database connectivity first
    const { rows } = await query<{ now: Date }>("SELECT NOW() as now");
    logger.info({ serverTime: rows[0].now }, "[Migrate] Connected to PostgreSQL");

    await COMMANDS[cmd]();
  } catch (error) {
    logger.error({ err: error, command: cmd }, "[Migrate] Fatal error");
    console.error(`\n❌ Migration failed: ${(error as Error).message}`);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

// ── Exports for programmatic use ────────────────────────────────────────────

export {
  migrateUp,
  migrateDown,
  migrateStatus,
  loadMigrations,
  parseMigration,
  type MigrationFile,
  type AppliedMigration,
};
