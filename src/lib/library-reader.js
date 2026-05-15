// src/lib/library-reader.js
//
// Engine v1.7.0 · Vault-as-source-of-truth concept library.
//
// Reads .md files from a user-supplied Obsidian vault folder (the user's
// "Brain Map" + optional "PM101" subfolders). Parses YAML frontmatter
// with fallbacks. Builds an in-memory concept index with full markdown
// content available for Pass L's per-concept apply step.
//
// localStorage caches the index keyed by vault path. 5MB cap: when over
// budget, full_content is dropped from the persisted version but stays
// in-memory for the session · re-ingest restores it.

const CACHE_KEY_PREFIX = "alchemy:library:";
const LS_CAP_BYTES = 4_500_000;       // ~4.5MB · stay under 5MB localStorage limit

// Theme → category fallback map · used when frontmatter doesn't supply a category.
const THEME_TO_CATEGORY = {
  "AI Search Optimization": "discovery",
  "Above-the-Fold Optimization": "conversion",
  "Ad Creative Testing": "paid",
  "Ad Hook Design": "paid",
  "AI Content Creation": "content",
  "Brand Identity & Story": "brand",
  "Cold Email Outreach": "outbound",
  "Community-Led Growth": "growth",
  "Content Hook Types": "content",
  "Content Strategy & Planning": "content",
  "Conversion Rate Optimization": "conversion",
  "Copywriting Frameworks": "messaging",
  "Customer Research & Insights": "research",
  "Email Marketing Tactics": "retention",
  "Growth Loops & Flywheels": "growth",
  "Influencer & Creator Marketing": "paid",
  "Landing Page Design": "conversion",
  "Messaging & Positioning": "positioning",
  "Organic Social Growth": "organic",
  "Paid Ads Strategy": "paid",
  "Platform-Specific Tactics": "growth",
  "Referral & Viral Programs": "growth",
  "Review & Social Proof": "trust",
  "SEO & Organic Search": "discovery",
  "Video Content Production": "content",
};

// Slugify · stable IDs.
function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

// Strip leading "01 - " / "02_" patterns from a folder name.
function cleanThemeName(raw) {
  return String(raw)
    .replace(/^\d+\s*[-_·]\s*/, "")
    .replace(/_/g, " ")
    .trim();
}

// Minimal YAML frontmatter parser · ~30 lines, no `gray-matter` dep.
// Handles simple key: value, including:
//   tags: [a, b, c]   (inline arrays)
//   key: value
// Multi-line values + nested objects are intentionally not supported ·
// we control the schema upstream (frontmatter conventions doc).
function parseFrontmatter(text) {
  if (!text.startsWith("---")) return { meta: {}, body: text };
  const end = text.indexOf("\n---", 3);
  if (end === -1) return { meta: {}, body: text };
  const block = text.slice(3, end).trim();
  const body = text.slice(end + 4).replace(/^\n+/, "");
  const meta = {};
  for (const line of block.split(/\r?\n/)) {
    const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if (!val) { meta[key] = ""; continue; }
    // Inline array
    if (val.startsWith("[") && val.endsWith("]")) {
      meta[key] = val
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
        .filter(Boolean);
      continue;
    }
    // Strip wrapping quotes
    val = val.replace(/^['"]|['"]$/g, "");
    meta[key] = val;
  }
  return { meta, body };
}

// Extract first non-empty paragraph as summary · cap 280 chars.
function firstParagraph(body, cap = 280) {
  const para = body.split(/\n\s*\n/).map((p) => p.trim()).find((p) => p && !p.startsWith("#"));
  if (!para) return "";
  const flat = para.replace(/\s+/g, " ").trim();
  return flat.length > cap ? flat.slice(0, cap - 1) + "…" : flat;
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Ingest a vault folder via a FileList from <input type="file" webkitdirectory>.
 * Returns { concepts: [...], stats: {...} }.
 *
 * Each concept: { id, name, theme, category, summary, full_content, tags, source }.
 * Files prefixed with "_" are skipped (typically index files like _Brain_Map.md).
 * Per-file parse errors are caught and reported in stats.parse_errors · the
 * ingest continues for surviving files.
 */
export async function ingestConceptVault(fileList, onProgress) {
  if (!fileList || !fileList.length) {
    return { concepts: [], stats: { total_files: 0, parsed: 0, skipped: 0, themes_seen: [], parse_errors: [] } };
  }
  const files = Array.from(fileList);
  const concepts = [];
  const stats = {
    total_files: files.length,
    parsed: 0,
    skipped: 0,
    themes_seen: new Set(),
    parse_errors: [],
  };

  let processed = 0;
  for (const f of files) {
    processed++;
    onProgress?.(processed, files.length, f.name);

    // Skip non-markdown files
    if (!f.name.toLowerCase().endsWith(".md")) { stats.skipped++; continue; }
    // Skip index files prefixed with "_"
    if (f.name.startsWith("_")) { stats.skipped++; continue; }

    try {
      const text = await f.text();
      const { meta, body } = parseFrontmatter(text);

      // Derive fields with fallbacks
      const fileName = f.name.replace(/\.md$/i, "");
      const relativePath = f.webkitRelativePath || f.name;
      const pathParts = relativePath.split(/[/\\]/);
      const folderName = pathParts.length > 1 ? pathParts[pathParts.length - 2] : "";

      const name = (meta.name || "").trim() || fileName.replace(/_/g, " ");
      const theme = cleanThemeName((meta.theme || "").trim() || folderName);
      const category = (meta.category || "").trim() || THEME_TO_CATEGORY[theme] || "general";
      const tags = Array.isArray(meta.tags) ? meta.tags : (meta.tags ? [meta.tags] : []);
      const source = (meta.source || "").trim() || `Obsidian: ${relativePath}`;

      const summary = firstParagraph(body, 280);
      const full_content = body.length > 8000 ? body.slice(0, 8000) + "\n[…truncated…]" : body;

      const id = slugify(`${theme}/${name}`);

      concepts.push({ id, name, theme, category, summary, full_content, tags, source });
      stats.themes_seen.add(theme);
      stats.parsed++;
    } catch (e) {
      stats.parse_errors.push({ file: f.name, error: e.message });
    }
  }

  return {
    concepts,
    stats: { ...stats, themes_seen: Array.from(stats.themes_seen).sort() },
  };
}

/**
 * Re-rank a concept index against an archetype's library priors.
 * Every concept stays eligible · this is a SOFT signal, not a filter.
 * Returns a re-ranked array of concepts (in-place not modified).
 */
export function rankByPriors(index, libraryPriors) {
  const concepts = index?.concepts || index || [];
  const priority = new Set((libraryPriors?.priority_themes || []).map((t) => t.toLowerCase()));
  const deprio = new Set((libraryPriors?.deprioritize || []).map((t) => t.toLowerCase()));
  return concepts
    .map((c) => {
      const themeLc = (c.theme || "").toLowerCase();
      let weight = 0;
      if (priority.has(themeLc)) weight += 10;
      if (deprio.has(themeLc)) weight -= 3;
      return { ...c, _weight: weight };
    })
    .sort((a, b) => {
      if (b._weight !== a._weight) return b._weight - a._weight;
      return (a.name || "").localeCompare(b.name || "");
    });
}

/**
 * Load a cached index from localStorage.
 * Returns { vault_path, ingested_at, concepts, stats } or null on miss.
 */
export function loadCachedIndex(vaultPath) {
  if (!vaultPath) return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + vaultPath);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Persist an index to localStorage.
 * 4.5MB budget · if over, drop full_content from each concept (the
 * session in-memory copy keeps full_content intact; only the persisted
 * cache loses it · re-ingest restores).
 */
export function persistIndex(vaultPath, payload) {
  if (!vaultPath) return false;
  const entry = {
    vault_path: vaultPath,
    ingested_at: new Date().toISOString(),
    concepts: payload.concepts,
    stats: payload.stats,
  };
  try {
    const serialized = JSON.stringify(entry);
    if (serialized.length <= LS_CAP_BYTES) {
      localStorage.setItem(CACHE_KEY_PREFIX + vaultPath, serialized);
      return true;
    }
    // Over budget · drop full_content for persistence only
    const slim = {
      ...entry,
      concepts: entry.concepts.map((c) => ({ ...c, full_content: undefined })),
      _slim: true,
    };
    localStorage.setItem(CACHE_KEY_PREFIX + vaultPath, JSON.stringify(slim));
    return "slim";
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[library-reader] persist failed:", e.message);
    return false;
  }
}

/** Forget a cached index. */
export function clearCachedIndex(vaultPath) {
  try { localStorage.removeItem(CACHE_KEY_PREFIX + vaultPath); } catch {}
}

/** List every cached vault path. */
export function listCachedVaultPaths() {
  const out = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(CACHE_KEY_PREFIX)) out.push(k.slice(CACHE_KEY_PREFIX.length));
  }
  return out;
}
