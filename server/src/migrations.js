import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pool from './db.js'

const migrationsDirectory = fileURLToPath(new URL('../migrations/', import.meta.url))

export async function runMigrations() {
  const files = (await readdir(migrationsDirectory))
    .filter(file => /^\d+_.+\.sql$/.test(file))
    .sort()
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    await client.query("SELECT pg_advisory_xact_lock(hashtext('houzeey_schema_migrations'))")
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    const appliedResult = await client.query('SELECT version FROM schema_migrations')
    const applied = new Set(appliedResult.rows.map(row => row.version))

    for (const file of files) {
      if (applied.has(file)) continue
      const sql = await readFile(path.join(migrationsDirectory, file), 'utf8')
      await client.query(sql)
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file])
    }

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
