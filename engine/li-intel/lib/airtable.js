/**
 * Airtable client wrapper for the LI-Intel pipeline.
 *
 * Vendored into the engine at engine/li-intel/lib/airtable.js on
 * v1.7.5 (2026-05-21). Adjusted from the source-folder version in two
 * ways:
 *   1. dotenv path points at the engine's repo-root `.env.local`
 *      (not the original `.env` in a sibling project)
 *   2. The 4 LI tables (Profiles, Posts, Engagers, Engagements) live
 *      in the SAME Airtable base as the engine's existing 17 tables.
 *      The shared base ID is read from AIRTABLE_BASE_ID. Table-name
 *      collisions are avoided by the `LI ` prefix on all 4 names.
 *
 * What it provides:
 *   - A configured Airtable base handle
 *   - Table name resolution from env vars (with sensible defaults)
 *   - Helpers for the access patterns used by the scrapers:
 *       findByField, findEnabledProfiles, findPostsByStatus,
 *       createRecord, updateRecord, resolveRecordId
 *   - withRetry() for 429 / 5xx backoff
 *
 * Airtable specifics handled here:
 *   - Linked record fields require arrays of record IDs, not URLs.
 *     `resolveRecordId` looks up by URL and caches for the run.
 *   - Airtable enforces ~5 req/sec/base. The scrapers' inner loops are
 *     mostly bottlenecked by Apify anyway, but withRetry handles bursts.
 *   - Strings inside filterByFormula must escape double quotes.
 */

const Airtable = require('airtable');
const path = require('path');

// Engine convention: secrets live in .env.local at repo root (gitignored).
// From engine/li-intel/lib/ that's three levels up.
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env.local') });

const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID } = process.env;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID in .env.local');
  process.exit(1);
}

const TABLES = {
  profiles: process.env.AIRTABLE_TABLE_LI_PROFILES || 'LI Profiles',
  posts: process.env.AIRTABLE_TABLE_LI_POSTS || 'LI Posts',
  engagers: process.env.AIRTABLE_TABLE_LI_ENGAGERS || 'LI Engagers',
  engagements: process.env.AIRTABLE_TABLE_LI_ENGAGEMENTS || 'LI Engagements',
};

const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

// Per-run caches: URL -> Airtable record ID
const idCaches = {
  profiles: new Map(),
  posts: new Map(),
  engagers: new Map(),
};

function escapeFormula(value) {
  return String(value).replace(/"/g, '\\"');
}

async function withRetry(fn, { retries = 3, baseDelay = 500 } = {}) {
  let attempt = 0;
  let lastErr;
  while (attempt <= retries) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = err && (err.statusCode || err.status);
      const retriable = status === 429 || (status >= 500 && status < 600);
      if (!retriable) throw err;
      const delay = baseDelay * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
      await new Promise((r) => setTimeout(r, delay));
      attempt++;
    }
  }
  throw lastErr;
}

async function findByField(tableKey, field, value) {
  if (value == null) return null;
  const tableName = TABLES[tableKey];
  if (!tableName) throw new Error(`Unknown table key: ${tableKey}`);
  const records = await withRetry(() =>
    base(tableName)
      .select({
        filterByFormula: `{${field}} = "${escapeFormula(value)}"`,
        maxRecords: 1,
      })
      .firstPage()
  );
  return records[0] || null;
}

async function findEnabledProfiles() {
  const records = await withRetry(() =>
    base(TABLES.profiles)
      .select({ filterByFormula: '{Enabled} = TRUE()' })
      .all()
  );
  return records;
}

async function findPostsByStatus(status) {
  const records = await withRetry(() =>
    base(TABLES.posts)
      .select({ filterByFormula: `{Status} = "${escapeFormula(status)}"` })
      .all()
  );
  return records;
}

async function createRecord(tableKey, fields) {
  const tableName = TABLES[tableKey];
  // Strip undefined keys — Airtable rejects them.
  const clean = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) clean[k] = v;
  }
  const [record] = await withRetry(() =>
    base(tableName).create([{ fields: clean }])
  );
  return record;
}

async function updateRecord(tableKey, recordId, fields) {
  const tableName = TABLES[tableKey];
  const clean = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) clean[k] = v;
  }
  const [record] = await withRetry(() =>
    base(tableName).update([{ id: recordId, fields: clean }])
  );
  return record;
}

async function resolveRecordId(tableKey, urlField, url) {
  const cache = idCaches[tableKey];
  if (!cache) throw new Error(`No cache for table key: ${tableKey}`);
  if (cache.has(url)) return cache.get(url);
  const record = await findByField(tableKey, urlField, url);
  if (record) {
    cache.set(url, record.id);
    return record.id;
  }
  return null;
}

async function getRecordById(tableKey, recordId) {
  const tableName = TABLES[tableKey];
  return await withRetry(() => base(tableName).find(recordId));
}

module.exports = {
  base,
  TABLES,
  findByField,
  findEnabledProfiles,
  findPostsByStatus,
  createRecord,
  updateRecord,
  resolveRecordId,
  getRecordById,
  withRetry,
  escapeFormula,
};
