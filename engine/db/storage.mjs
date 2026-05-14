// engine/db/storage.mjs
//
// Storage adapter for the ad-intel pipeline. Two backends:
//   1. json   — local JSON files in db/ (current default)
//   2. airtable — direct Airtable API writes (swap when access lands)
//
// Pick via env var STORAGE_BACKEND, default "json".
//
// Tables (logical names — same in both backends):
//   swipe_pages       — competitor brand-page records
//   swipe_ads         — individual ads pulled from competitor pages
//   creative_briefs   — storyboard briefs derived from underserved outcomes
//   brief_iterations  — render-ready iterations on each brief
//   audit             — append-only event log (engine audit trail surrogate)
//
// JSON backend writes one file per table at db/<table>.json. Each file is a
// JSON object mapping id → record. Records carry an `id`, `created_at`, and
// the fields listed in the spec.
//
// Airtable backend assumes tables exist with names matching the JSON keys
// title-cased and space-separated (e.g. "Swipe Pages"). Swap via env when
// the base actually has them.

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const BACKEND = process.env.STORAGE_BACKEND || "json";
const DB_DIR = path.resolve("db");

// Logical table name → Airtable table name (when backend = airtable)
const AIRTABLE_NAMES = {
  swipe_pages: "Swipe Pages",
  swipe_ads: "Swipe Ads",
  creative_briefs: "Creative Briefs",
  brief_iterations: "Brief Iterations",
  audit: "Audit Log",
};

// ── ID helpers ─────────────────────────────────────────────────────────
export function generateId(prefix = "rec") {
  return `${prefix}_${crypto.randomBytes(6).toString("hex")}`;
}

// ── JSON backend ───────────────────────────────────────────────────────
async function jsonRead(table) {
  const file = path.join(DB_DIR, `${table}.json`);
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    if (e.code === "ENOENT") return {};
    throw e;
  }
}

async function jsonWrite(table, data) {
  await fs.mkdir(DB_DIR, { recursive: true });
  const file = path.join(DB_DIR, `${table}.json`);
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

async function jsonInsert(table, record) {
  const data = await jsonRead(table);
  const id = record.id || generateId(table.replace(/s$/, "").slice(0, 3));
  data[id] = { id, created_at: new Date().toISOString(), ...record };
  await jsonWrite(table, data);
  return data[id];
}

async function jsonUpdate(table, id, patch) {
  const data = await jsonRead(table);
  if (!data[id]) throw new Error(`${table}: id ${id} not found`);
  data[id] = { ...data[id], ...patch, updated_at: new Date().toISOString() };
  await jsonWrite(table, data);
  return data[id];
}

async function jsonList(table, predicate = () => true) {
  const data = await jsonRead(table);
  return Object.values(data).filter(predicate);
}

// ── Airtable backend (stub, ready to enable) ───────────────────────────
const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID;

async function airtableFetch(endpoint, options = {}) {
  if (!AIRTABLE_KEY || !AIRTABLE_BASE) {
    throw new Error("Airtable backend requires AIRTABLE_API_KEY + AIRTABLE_BASE_ID env vars");
  }
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Authorization": `Bearer ${AIRTABLE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`Airtable ${endpoint}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function airtableInsert(table, record) {
  const name = AIRTABLE_NAMES[table];
  const data = await airtableFetch(encodeURIComponent(name), {
    method: "POST",
    body: JSON.stringify({ records: [{ fields: record }] }),
  });
  return { id: data.records[0].id, ...data.records[0].fields };
}

async function airtableUpdate(table, id, patch) {
  const name = AIRTABLE_NAMES[table];
  const data = await airtableFetch(`${encodeURIComponent(name)}/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ fields: patch }),
  });
  return { id: data.id, ...data.fields };
}

async function airtableList(table, predicate = () => true) {
  const name = AIRTABLE_NAMES[table];
  const data = await airtableFetch(encodeURIComponent(name));
  return data.records.map(r => ({ id: r.id, ...r.fields })).filter(predicate);
}

// ── Public API (backend-agnostic) ──────────────────────────────────────
export async function insert(table, record) {
  return BACKEND === "airtable" ? airtableInsert(table, record) : jsonInsert(table, record);
}

export async function update(table, id, patch) {
  return BACKEND === "airtable" ? airtableUpdate(table, id, patch) : jsonUpdate(table, id, patch);
}

export async function list(table, predicate) {
  return BACKEND === "airtable" ? airtableList(table, predicate) : jsonList(table, predicate);
}

// ── Audit trail helper ─────────────────────────────────────────────────
export async function audit(event, data = {}) {
  return insert("audit", { event, data, ts: new Date().toISOString() });
}

export function backendInfo() {
  return { backend: BACKEND, db_dir: BACKEND === "json" ? DB_DIR : null, airtable_base: BACKEND === "airtable" ? AIRTABLE_BASE : null };
}
