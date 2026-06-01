// src/lib/foreplay.js
//
// Engine v1.9.2 scaffold · Foreplay.co ad-validator + ad-evaluator
// data source. Mirrors the architectural pattern of src/lib/adyntel.js.
//
// ROLE DISTINCTION (Foreplay vs Adyntel):
//
//   Adyntel   = EXHAUSTIVE COVERAGE · every ad from a competitor
//               via the third-party paid API · raw discovery surface
//               · best for "find all ads from Brand X"
//
//   Foreplay  = CURATED WINNERS · ads the user (or their team) has
//               saved to boards · ads from competitor brands they
//               actively Spy on · plus the global Foreplay ad library
//               filtered by running-duration, format, platform, etc.
//               · best for "validate that a pattern is proven before
//               we adapt it" and "score creative against signal"
//
// In the Pass 8 / 8.6 / 8.7 pipeline:
//
//   Pass 8   · grounds each of 10 swipe ads in a real running ad.
//              When Foreplay is configured, prefer Foreplay results
//              with `running_duration_min_days >= 30` (proven winner
//              signal). Falls back to Adyntel · then web_search.
//   Pass 8.6 · recreations of competitor ads. When Foreplay is
//              configured, evaluate each candidate source ad by
//              board-save count + duplicate count + running duration
//              and rank by that composite before adapting.
//   Pass 8.7 · deep dive · uses the same Foreplay-validated source
//              as Pass 8.6 picked.
//
// Spec: <vault>/08c - Foreplay Ad Source Spec.md
// Foreplay API base: https://public.api.foreplay.co
// Foreplay API docs: https://public.api.foreplay.co/docs
//
// Auth: single `Authorization: <api_key>` header (NO "Bearer" prefix
// per the Foreplay docs · just the raw key value). Tied to the user's
// Foreplay subscription account.

const FOREPLAY_BASE = "https://public.api.foreplay.co";

// Per-endpoint metadata. Foreplay's pricing is subscription-tier-based
// rather than per-API-call credits (different model than Adyntel). The
// engine still tracks call volume for debugging and rate-limit safety.
export const FOREPLAY_ENDPOINTS = Object.freeze({
  // SwipeFile · user's own saved ad collection (the boards they curated)
  "swipefile_ads":             "/api/swipefile/ads",
  "boards_list":               "/api/boards",
  "board_brands":              "/api/board/brands",
  "board_ads":                 "/api/board/ads",
  // Spyder · competitor brands the user is actively tracking
  "spyder_brands":             "/api/spyder/brands",
  "spyder_brand":              "/api/spyder/brand",
  "spyder_brand_ads":          "/api/spyder/brand/ads",
  // Brand discovery + arbitrary brand-id ad pulls
  "brand_ads_by_ids":          "/api/brand/getAdsByBrandId",
  "brand_ads_by_page_id":      "/api/brand/getAdsByPageId",
  "brands_by_domain":          "/api/brand/getBrandsByDomain",
  // Single-ad endpoints · validator + duplicate detection
  "ad_by_query":               "/api/ad",
  "ad_by_path":                "/api/ad",                  // append /{ad_id}
  "ad_duplicates":             "/api/ad/duplicates",       // append /{ad_id}
});

const REQUEST_TIMEOUT_MS = 30_000;
const RETRY_BACKOFF_MS = [200, 1000];

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

/**
 * Foreplay HTTP error · attaches `status`, `endpoint`, and parsed body
 * so callers can branch on 401/402/429/5xx without re-parsing.
 */
export class ForeplayError extends Error {
  constructor(message, { status, endpoint, body } = {}) {
    super(message);
    this.name = "ForeplayError";
    this.status = status || 0;
    this.endpoint = endpoint || "";
    this.body = body || null;
  }
}

/**
 * Run-level call counter. Foreplay doesn't expose per-call credit
 * pricing publicly · subscription tier governs quota. The counter
 * still surfaces a per-run "calls made" log line for visibility
 * and helps detect runaway loops.
 */
export class ForeplayCallCounter {
  constructor({ maxCallsPerRun = 200 } = {}) {
    this.calls = 0;
    this.max = maxCallsPerRun;
  }
  charge(endpoint) {
    this.calls += 1;
  }
  wouldExceed() {
    return this.calls >= this.max;
  }
  remaining() {
    return Math.max(0, this.max - this.calls);
  }
  perPullLine() {
    return `Foreplay · calls this run: ${this.calls} / ${this.max}`;
  }
  endOfRunLine() {
    return `Foreplay complete · ${this.calls} API calls`;
  }
}

/**
 * Foreplay API client. Stateless across calls except for the API key
 * passed at construction. Per-run state (call counter, cache) lives
 * in the ForeplayCallCounter and the Stage B / Pass 8 wrapper that
 * consumes this client.
 */
export class ForeplayClient {
  constructor({ apiKey, baseUrl = FOREPLAY_BASE } = {}) {
    if (!apiKey) throw new Error("ForeplayClient: apiKey is required");
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  /**
   * Validate the api key WITHOUT pulling significant data. Pings the
   * cheapest endpoint (boards list with limit=1). 401 → invalid key ·
   * 200 → valid · network error → unreachable.
   */
  async validateKey() {
    try {
      await this._request("/api/boards", { limit: 1 });
      return { valid: true, reason: "auth_passed" };
    } catch (e) {
      if (e.status === 401) return { valid: false, reason: "invalid_key" };
      if (e.status >= 500) return { valid: false, reason: "server_error", transient: true };
      return { valid: false, reason: e.message || "unreachable" };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // SwipeFile · user's curated collection
  // ─────────────────────────────────────────────────────────────

  /**
   * Pull ads from the user's personal swipefile · the "WINNERS THE
   * USER ALREADY CURATED" set. Highest-signal data source the engine
   * has access to · these are ads the user (or their team) explicitly
   * saved as worth studying.
   *
   * `filters` is forwarded to the Foreplay API · see FOREPLAY_FILTERS
   * below for the supported shape.
   */
  async fetchSwipefileAds(filters = {}) {
    return this._request("/api/swipefile/ads", filters);
  }

  async listBoards({ offset = 0, limit = 50 } = {}) {
    return this._request("/api/boards", { offset, limit });
  }

  async fetchBoardAds(boardId, filters = {}) {
    if (!boardId) throw new Error("fetchBoardAds: boardId required");
    return this._request("/api/board/ads", { board_id: boardId, ...filters });
  }

  async fetchBoardBrands(boardId, { offset = 0, limit = 50 } = {}) {
    if (!boardId) throw new Error("fetchBoardBrands: boardId required");
    return this._request("/api/board/brands", { board_id: boardId, offset, limit });
  }

  // ─────────────────────────────────────────────────────────────
  // Spyder · competitor brands the user actively tracks
  // ─────────────────────────────────────────────────────────────

  async listSpyderBrands({ offset = 0, limit = 50 } = {}) {
    return this._request("/api/spyder/brands", { offset, limit });
  }

  async getSpyderBrand(brandId) {
    if (!brandId) throw new Error("getSpyderBrand: brandId required");
    return this._request("/api/spyder/brand", { brand_id: brandId });
  }

  async fetchSpyderBrandAds(brandId, filters = {}) {
    if (!brandId) throw new Error("fetchSpyderBrandAds: brandId required");
    return this._request("/api/spyder/brand/ads", { brand_id: brandId, ...filters });
  }

  // ─────────────────────────────────────────────────────────────
  // Brand discovery · find brands by domain · pull ads by brand id
  // or Facebook page id. These power the bridge between Stage A
  // competitor discovery and Foreplay-validated ad pulls.
  // ─────────────────────────────────────────────────────────────

  async findBrandsByDomain(domain, { limit = 5, order = "relevance" } = {}) {
    if (!domain) throw new Error("findBrandsByDomain: domain required");
    return this._request("/api/brand/getBrandsByDomain", { domain, limit, order });
  }

  async fetchAdsByBrandIds(brandIds, filters = {}) {
    if (!brandIds || !brandIds.length) throw new Error("fetchAdsByBrandIds: brandIds required");
    const ids = Array.isArray(brandIds) ? brandIds : [brandIds];
    return this._request("/api/brand/getAdsByBrandId", { brand_ids: ids, ...filters });
  }

  async fetchAdsByPageId(pageId, filters = {}) {
    if (!pageId) throw new Error("fetchAdsByPageId: pageId required");
    return this._request("/api/brand/getAdsByPageId", { page_id: pageId, ...filters });
  }

  // ─────────────────────────────────────────────────────────────
  // Single-ad endpoints · validator + duplicate detection
  // ─────────────────────────────────────────────────────────────

  async getAdDetails(adId) {
    if (!adId) throw new Error("getAdDetails: adId required");
    return this._request(`/api/ad/${encodeURIComponent(adId)}`, {});
  }

  /**
   * "Find ads that share the same image or video" · this is the
   * AD VALIDATOR signal. If a creative pattern has 20+ duplicates,
   * that pattern is being copied and is almost certainly working.
   */
  async getAdDuplicates(adId) {
    if (!adId) throw new Error("getAdDuplicates: adId required");
    return this._request(`/api/ad/duplicates/${encodeURIComponent(adId)}`, {});
  }

  // ─────────────────────────────────────────────────────────────
  // Internals
  // ─────────────────────────────────────────────────────────────

  async _request(endpoint, query = {}) {
    const url = new URL(this.baseUrl + endpoint);
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      if (Array.isArray(v)) v.forEach((item) => url.searchParams.append(k, String(item)));
      else url.searchParams.set(k, String(v));
    }

    let lastErr;
    const attempts = [0, ...RETRY_BACKOFF_MS];
    for (const delay of attempts) {
      if (delay) await sleep(delay);
      try {
        const res = await this._fetchWithTimeout(url.toString(), {
          method: "GET",
          headers: {
            // Foreplay docs spec the key as the raw Authorization
            // header value · NO "Bearer" prefix.
            "Authorization": this.apiKey,
            "Accept": "application/json",
          },
        });

        const text = await res.text();
        let parsed = null;
        try { parsed = text ? JSON.parse(text) : null; } catch { parsed = { _raw: text }; }

        if (res.ok) return parsed;

        if (res.status >= 500) {
          lastErr = new ForeplayError(`Foreplay ${res.status} at ${endpoint}`, {
            status: res.status, endpoint, body: parsed,
          });
          continue; // retry
        }
        throw new ForeplayError(parsed?.metadata?.message || parsed?.message || `Foreplay ${res.status}`, {
          status: res.status, endpoint, body: parsed,
        });
      } catch (e) {
        if (e instanceof ForeplayError && e.status < 500) throw e;
        lastErr = e instanceof ForeplayError ? e : new ForeplayError(e.message, { status: 0, endpoint });
      }
    }
    throw lastErr || new ForeplayError("Foreplay: exhausted retries", { status: 0, endpoint });
  }

  async _fetchWithTimeout(url, init = {}) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(url, { ...init, signal: ctrl.signal });
    } finally {
      clearTimeout(t);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Filter helpers · build the parameter sets Pass 8 / 8.6 will use
// ─────────────────────────────────────────────────────────────

/**
 * "Proven winner" filter set · the AD VALIDATOR baseline. Used by
 * Pass 8 when grounding each swipe card in a real running ad. The
 * `running_duration_min_days` filter is the killer signal: any ad
 * a brand has paid to run for 30+ consecutive days is almost
 * certainly profitable. (Performance marketers don't pay for losers
 * for a month.) Stack with `live: true` to drop dead ads.
 *
 * Usage:
 *   const filters = provenWinnerFilters({
 *     platform: "facebook",
 *     min_running_days: 45,
 *     date_window_days: 90,
 *   });
 *   const ads = await client.fetchSwipefileAds(filters);
 */
export function provenWinnerFilters({
  platform = null,            // "facebook" | "tiktok" | "linkedin" | null (all)
  min_running_days = 30,
  max_running_days = null,
  date_window_days = 90,
  display_format = null,      // "video" | "image" | "carousel" | null (all)
  niches = null,              // array of niche slugs
  languages = ["en"],
  limit = 50,
  order = "running_duration_desc",
} = {}) {
  const end = new Date();
  const start = new Date(end.getTime() - date_window_days * 86400_000);
  const f = {
    live: true,
    start_date: start.toISOString().split("T")[0],
    end_date: end.toISOString().split("T")[0],
    running_duration_min_days: min_running_days,
    limit,
    order,
  };
  if (platform) f.publisher_platform = platform;
  if (max_running_days) f.running_duration_max_days = max_running_days;
  if (display_format) f.display_format = display_format;
  if (niches && niches.length) f.niches = niches;
  if (languages && languages.length) f.languages = languages;
  return f;
}

/**
 * Score a Foreplay ad record on the validator + evaluator signals.
 * Used by Pass 8 to rank candidate source ads before adapting · and
 * by Pass 8.6 to evaluate the strength of each recreation candidate.
 *
 * Returns 0-10 composite score with breakdown.
 *
 * @param {object} ad  ad record from Foreplay (shape from /api/ad/{ad_id})
 * @param {object} [opts]
 * @param {number} [opts.duplicateCount]  from getAdDuplicates(ad_id) · 0 if not fetched
 * @param {number} [opts.boardSaveCount]  count of boards this ad appears on · 0 if not fetched
 */
export function scoreAdSignal(ad, { duplicateCount = 0, boardSaveCount = 0 } = {}) {
  const runningDays = Number(ad?.running_duration_days || ad?.days_active || 0);
  const isLive = !!ad?.live;
  const platform = ad?.publisher_platform || "";
  const format = ad?.display_format || "";

  // Running duration · the strongest single signal. 30+ days = strong,
  // 90+ = battle-hardened, 180+ = canonical winner.
  let runningScore = 0;
  if (runningDays >= 180) runningScore = 4;
  else if (runningDays >= 90) runningScore = 3.5;
  else if (runningDays >= 60) runningScore = 3;
  else if (runningDays >= 30) runningScore = 2.5;
  else if (runningDays >= 14) runningScore = 1.5;
  else runningScore = 0.5;

  // Live status · counts but doesn't dominate. Dead ad with 200-day
  // historical run is still valuable for study.
  const liveScore = isLive ? 1 : 0.5;

  // Duplicates · "N other brands are copying this exact creative"
  // is direct evidence the pattern is working. Cap at 3 points.
  let dupeScore = 0;
  if (duplicateCount >= 20) dupeScore = 3;
  else if (duplicateCount >= 10) dupeScore = 2.5;
  else if (duplicateCount >= 5) dupeScore = 2;
  else if (duplicateCount >= 2) dupeScore = 1;
  else dupeScore = 0.5;

  // Board saves · human curation signal. If 5+ people saved this
  // ad to their swipefile, it's worth your attention.
  let saveScore = 0;
  if (boardSaveCount >= 10) saveScore = 2;
  else if (boardSaveCount >= 5) saveScore = 1.5;
  else if (boardSaveCount >= 1) saveScore = 1;
  else saveScore = 0;

  const total = Math.min(10, runningScore + liveScore + dupeScore + saveScore);
  return {
    total: Math.round(total * 10) / 10,
    breakdown: {
      running_duration_days: runningDays,
      running_score: runningScore,
      live: isLive,
      live_score: liveScore,
      duplicate_count: duplicateCount,
      duplicate_score: dupeScore,
      board_save_count: boardSaveCount,
      board_save_score: saveScore,
    },
    verdict: total >= 8 ? "canonical winner" :
             total >= 6 ? "strong validator" :
             total >= 4 ? "moderate signal" :
                          "weak signal · skip or investigate further",
    platform, format,
  };
}

// ─────────────────────────────────────────────────────────────
// Top-level factory · mirrors createAdyntelClient
// ─────────────────────────────────────────────────────────────

/**
 * Construct a Foreplay client from the current Config + .env.local
 * state. Returns null when credentials absent (caller should fall
 * back to Adyntel or web_search).
 */
export function createForeplayClient(cfg = {}) {
  const apiKey = cfg.foreplayKey || (typeof import.meta !== "undefined" ? import.meta.env?.VITE_FOREPLAY_API_KEY : "");
  if (!apiKey) return null;
  return new ForeplayClient({ apiKey });
}

export function foreplayConfigDefaults(cfg = {}) {
  const env = (typeof import.meta !== "undefined" && import.meta.env) ? import.meta.env : {};
  const maxCallsPerRun = Number(cfg.foreplayMaxCallsPerRun ?? env.VITE_FOREPLAY_MAX_CALLS_PER_RUN ?? 200);
  const minRunningDays = Number(cfg.foreplayMinRunningDays ?? env.VITE_FOREPLAY_MIN_RUNNING_DAYS ?? 30);
  return { maxCallsPerRun, minRunningDays };
}
