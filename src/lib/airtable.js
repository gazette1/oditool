/**
 * Airtable integration for persisting ODI research sessions.
 *
 * Required Airtable base structure (create these tables):
 *
 * TABLE: Research Sessions
 *   - session_id (Single line text, primary)
 *   - sector (Single line text)
 *   - created_at (Date)
 *   - status (Single select: running, complete, archived)
 *   - summary (Long text)
 *
 * TABLE: Core Jobs
 *   - job_id (Single line text, primary)
 *   - session_id (Link to Research Sessions)
 *   - job_statement (Single line text)
 *   - job_executor (Single line text)
 *   - related_jobs (Long text, JSON)
 *   - emotional_jobs (Long text, JSON)
 *   - social_jobs (Long text, JSON)
 *   - consumption_chain_jobs (Long text, JSON)
 *   - search_volume_signal (Number)
 *   - trend (Single select: rising, stable, declining)
 *   - competition (Single select: low, medium, high)
 *   - top_keyword (Single line text)
 *   - evidence (Long text)
 *
 * TABLE: Job Map Steps
 *   - step_id (Single line text, primary)
 *   - job_id (Link to Core Jobs)
 *   - step_name (Single select: Define, Locate, Prepare, Confirm, Execute, Monitor, Modify, Conclude)
 *   - description (Long text)
 *
 * TABLE: Desired Outcomes
 *   - outcome_id (Single line text, primary)
 *   - job_id (Link to Core Jobs)
 *   - step (Single select: Define, Locate, Prepare, Confirm, Execute, Monitor, Modify, Conclude)
 *   - statement (Long text)
 *   - importance (Number, 1 decimal)
 *   - satisfaction (Number, 1 decimal)
 *   - opportunity_score (Number, 1 decimal)
 *   - search_volume (Number) — from Google Keyword Planner
 *   - cpc (Currency) — cost per click, proxy for commercial intent
 *   - monthly_searches (Number)
 *
 * TABLE: Search Volume Data
 *   - keyword_id (Single line text, primary)
 *   - job_id (Link to Core Jobs)
 *   - outcome_id (Link to Desired Outcomes, optional)
 *   - keyword (Single line text)
 *   - monthly_volume (Number)
 *   - cpc (Currency)
 *   - competition_index (Number, 0-100)
 *   - trend_data (Long text, JSON — 12 month volume array)
 *   - fetched_at (Date)
 */

const TABLES = {
  sessions: "Research Sessions",
  jobs: "Core Jobs",
  steps: "Job Map Steps",
  outcomes: "Desired Outcomes",
  searchVolume: "Search Volume Data",
  entryRecs: "Entry Recommendations",
  projects: "Projects",
  // Engine v1.7 — Ad-Intel module
  swipePages: "Swipe Pages",
  swipeAds: "Swipe Ads",
  creativeBriefs: "Creative Briefs",
  briefIterations: "Brief Iterations",
  // Engine v1.7.0 · Strategic Diagnostic + Applied Playbooks
  appliedPlaybooks: "Applied Playbooks",
};

// ─────────────────────────────────────────────────────────────
// v1.7.0 · Required Airtable schema additions (user must create manually)
//
// Projects table · ADD COLUMN:
//   - diagnostic_v1 (Long text) · stores Pass D JSON output
//
// NEW TABLE · "Applied Playbooks":
//   - project_id (Single line text · or Link to Projects)
//   - concept_id (Single line text)
//   - name (Single line text)
//   - theme (Single line text)
//   - category (Single line text)
//   - why_applies (Long text)
//   - anchored_to_persona (Single line text)
//   - anchored_to_outcome (Long text)
//   - first_move (Long text)
//   - owner (Single line text)
//   - kpi (Long text)
//   - success_signal (Long text)
//   - references (Long text · JSON array)
//   - vault_source (Long text · for traceability back to the user's vault file)
//   - created_at (Date)
// ─────────────────────────────────────────────────────────────

// Engine v1.6.8 · throttle helper. Airtable rate-limit is 5 req/sec per base.
// We chunk at 10 records per request, so back-to-back chunks plus the
// preceding session/project writes routinely 429 on a heavy run. 200ms
// between chunks keeps us comfortably under the limit and is invisible
// in wall time (a 30-chunk save adds 6s total — acceptable).
const _sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CHUNK_THROTTLE_MS = 200;

class AirtableClient {
  constructor(apiKey, baseId) {
    this.apiKey = apiKey;
    this.baseId = baseId;
    this.baseUrl = `https://api.airtable.com/v0/${baseId}`;
  }

  async _request(table, method = "GET", body = null, params = {}) {
    const url = new URL(`${this.baseUrl}/${encodeURIComponent(table)}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const opts = {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(url.toString(), opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Airtable ${method} ${table}: ${err.error?.message || res.statusText}`);
    }
    return res.json();
  }

  // ── Sessions ──
  async listSessions() {
    const data = await this._request(TABLES.sessions, "GET", null, {
      sort: encodeURIComponent('[{"field":"created_at","direction":"desc"}]'),
      maxRecords: "50",
    });
    return data.records.map((r) => ({ id: r.id, ...r.fields }));
  }

  async createSession(sector) {
    const sessionId = `odi-${Date.now()}`;
    const data = await this._request(TABLES.sessions, "POST", {
      records: [{
        fields: {
          session_id: sessionId,
          sector,
          created_at: new Date().toISOString().split("T")[0],
          status: "running",
        },
      }],
    });
    return { airtableId: data.records[0].id, sessionId };
  }

  async updateSession(airtableId, fields) {
    await this._request(TABLES.sessions, "PATCH", {
      records: [{ id: airtableId, fields }],
    });
  }

  // ── Core Jobs ──
  async saveJobs(sessionAirtableId, jobs) {
    // Airtable batch limit is 10 records per request
    const records = jobs.map((j) => ({
      fields: {
        job_id: `job-${j.id}`,
        session_id: [sessionAirtableId],
        job_statement: j.job_statement,
        job_executor: j.job_executor || "",
        related_jobs: JSON.stringify(j.related_jobs || []),
        emotional_jobs: JSON.stringify(j.emotional_jobs || []),
        social_jobs: JSON.stringify(j.social_jobs || []),
        consumption_chain_jobs: JSON.stringify(j.consumption_chain_jobs || []),
        search_volume_signal: j.search_volume_signal || 0,
        trend: j.trend || "stable",
        competition: j.competition || "medium",
        top_keyword: j.top_keyword || "",
        evidence: j.evidence || "",
      },
    }));

    const results = [];
    for (let i = 0; i < records.length; i += 10) {
      const batch = records.slice(i, i + 10);
      const data = await this._request(TABLES.jobs, "POST", { records: batch });
      results.push(...data.records);
      if (i + 10 < records.length) await _sleep(CHUNK_THROTTLE_MS);
    }
    return results;
  }

  // ── Desired Outcomes ──
  async saveOutcomes(jobAirtableId, outcomes) {
    const records = outcomes.map((o) => ({
      fields: {
        outcome_id: o.id || `out-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        job_id: [jobAirtableId],
        step: o.step || "",
        statement: o.statement,
        importance: o.importance || 0,
        satisfaction: o.satisfaction || 0,
        opportunity_score: o.opportunity_score || 0,
        search_volume: o.search_volume || null,
        cpc: typeof o.cpc === "number" && isFinite(o.cpc) ? o.cpc : null,
        monthly_searches: typeof o.monthly_searches === "number" && isFinite(o.monthly_searches) ? o.monthly_searches : null,
      },
    }));

    for (let i = 0; i < records.length; i += 10) {
      const batch = records.slice(i, i + 10);
      await this._request(TABLES.outcomes, "POST", { records: batch });
      if (i + 10 < records.length) await _sleep(CHUNK_THROTTLE_MS);
    }
  }

  // ── Search Volume Data ──
  async saveSearchVolumeData(jobAirtableId, keywords) {
    // Airtable's cpc field is Currency and competition_index is Number.
    // SerpAPI's google engine returns cpc as "has_ads" / "no_ads" strings —
    // those won't accept into numeric Airtable fields. Coerce here:
    //   - cpc: number-only; the has-ads signal lives in competition_index instead
    //   - competition_index: number-only, 0-100 band
    const toNum = (v, fallback = 0) => typeof v === "number" && isFinite(v) ? v : fallback;
    const records = keywords.map((kw) => ({
      fields: {
        keyword_id: `kw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        job_id: [jobAirtableId],
        keyword: kw.keyword,
        monthly_volume: toNum(kw.monthly_volume, 0),
        cpc: toNum(kw.cpc, 0),
        competition_index: toNum(kw.competition_index, 0),
        trend_data: JSON.stringify(kw.trend_data || []),
        fetched_at: new Date().toISOString().split("T")[0],
      },
    }));

    for (let i = 0; i < records.length; i += 10) {
      const batch = records.slice(i, i + 10);
      await this._request(TABLES.searchVolume, "POST", { records: batch });
      if (i + 10 < records.length) await _sleep(CHUNK_THROTTLE_MS);
    }
  }

  // ── Entry Recommendations ──
  //
  // Table: Entry Recommendations
  //   - rec_id (Single line text, primary)
  //   - session_id (Link to Research Sessions)
  //   - rank (Number)
  //   - strategy (Single select: Differentiated, Dominant, Disruptive, Discrete, Sustaining)
  //   - target_job_id (Link to Core Jobs)
  //   - target_outcomes (Long text, JSON)
  //   - rationale (Long text)
  //   - estimated_difficulty (Single select: low, medium, high)
  //   - estimated_market_signal (Number)
  //   - first_move (Long text)
  //   - belief_change_required (Long text)
  //   - risk (Long text)
  async saveEntryRecommendations(sessionAirtableId, recs, jobIdToAirtableId = {}) {
    const records = recs.map((r, i) => {
      const fields = {
        rec_id: `rec-${Date.now()}-${i}`,
        session_id: [sessionAirtableId],
        rank: r.rank || i + 1,
        strategy: r.strategy || "Differentiated",
        target_outcomes: JSON.stringify(r.target_outcomes || []),
        rationale: r.rationale || "",
        estimated_difficulty: r.estimated_difficulty || "medium",
        estimated_market_signal: r.estimated_market_signal || 0,
        first_move: r.first_move || "",
        belief_change_required: r.belief_change_required || "",
        risk: r.risk || "",
      };
      const linked = jobIdToAirtableId[r.target_job_id];
      if (linked) fields.target_job_id = [linked];
      return { fields };
    });

    for (let i = 0; i < records.length; i += 10) {
      const batch = records.slice(i, i + 10);
      await this._request(TABLES.entryRecs, "POST", { records: batch });
      if (i + 10 < records.length) await _sleep(CHUNK_THROTTLE_MS);
    }
  }

  // ── Projects (Engine v1.4 add) ──
  //
  // The Projects table is the brand-agnostic container for a context.
  // Set up via the Project Setup flow (drop files + URL → Pass 0 summary
  // → save here). Existing analysis flows read from this record so
  // sector/audience/product_context never need to be retyped.
  async listProjects() {
    const data = await this._request(TABLES.projects, "GET", null, {
      sort: encodeURIComponent('[{"field":"updated_at","direction":"desc"}]'),
      maxRecords: "100",
    });
    return data.records.map(r => ({ airtableId: r.id, ...r.fields }));
  }

  async loadProject(airtableId) {
    const data = await this._request(`${TABLES.projects}/${airtableId}`, "GET");
    return { airtableId: data.id, ...data.fields };
  }

  async createProject({ name, projectId, sector, audience, productContext, contextSummary, sourceUrls }) {
    const fields = {
      project_id: projectId || `proj_${Date.now()}`,
      user_id: "engine_internal",
      name,
      sector: sector || "",
      audience: audience || "",
      product_context: productContext || "",
      status: "active",
      created_at: new Date().toISOString().split("T")[0],
      updated_at: new Date().toISOString().split("T")[0],
    };
    // Stash the full Pass 0 summary + source list in product_context if
    // contextSummary was provided. Keeps everything searchable in Airtable.
    if (contextSummary) {
      fields.product_context = `${productContext || ""}\n\n── PASS 0 CONTEXT SUMMARY ──\n${typeof contextSummary === "string" ? contextSummary : JSON.stringify(contextSummary, null, 2)}\n\n── SOURCES ──\n${(sourceUrls || []).join("\n")}`;
    }
    const data = await this._request(TABLES.projects, "POST", {
      records: [{ fields }],
    });
    return { airtableId: data.records[0].id, ...data.records[0].fields };
  }

  async updateProject(airtableId, patch) {
    await this._request(TABLES.projects, "PATCH", {
      records: [{ id: airtableId, fields: { ...patch, updated_at: new Date().toISOString().split("T")[0] } }],
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Pattern B · brand_memory + brand_learned (Engine v1.6.12)
  //
  // Two new fields on the `projects` table (add manually in Airtable):
  //   - brand_memory   (Long text) · facts learned about the brand across
  //     sessions · loaded into Pass 0 as prior context
  //   - brand_learned  (Long text) · prompt-improvement candidates the
  //     user has accepted from a Hermes retrospective run
  //
  // Section-sign delimited so multiple sessions append without clobbering:
  //   ── BRAND MEMORY · 2026-05-14 ──
  //   <facts harvested from this run>
  //   ── BRAND MEMORY · 2026-05-15 ──
  //   <facts harvested from the next run>
  //
  // Loaded at session start, FROZEN during a run, written only post-run.
  // (The "frozen" property is what keeps Anthropic's prompt cache valid
  //  across the run — never mutate context mid-stream.)
  // ─────────────────────────────────────────────────────────────

  async loadBrandMemory(airtableId) {
    // Returns { brand_memory, brand_learned } strings (each may be "").
    // Silently returns empty strings if the field doesn't exist yet
    // (user hasn't added the column to the Airtable schema).
    try {
      const data = await this._request(`${TABLES.projects}/${airtableId}`, "GET");
      return {
        brand_memory: data.fields?.brand_memory || "",
        brand_learned: data.fields?.brand_learned || "",
      };
    } catch (e) {
      console.warn("[Pattern B] loadBrandMemory failed (field may not exist yet):", e.message);
      return { brand_memory: "", brand_learned: "" };
    }
  }

  /**
   * Append a new section to the brand_memory field.
   * Appends · never overwrites · idempotent on the same date if entry matches.
   */
  async appendBrandMemory(airtableId, entry) {
    if (!entry || !entry.trim()) return;
    const existing = await this.loadBrandMemory(airtableId);
    const today = new Date().toISOString().split("T")[0];
    const stanza = `── BRAND MEMORY · ${today} ──\n${entry.trim()}\n`;
    // Dedup: if the most recent stanza is identical, skip
    if (existing.brand_memory.includes(stanza)) return;
    const next = existing.brand_memory
      ? `${existing.brand_memory}\n${stanza}`
      : stanza;
    try {
      await this.updateProject(airtableId, { brand_memory: next });
    } catch (e) {
      console.warn("[Pattern B] appendBrandMemory failed:", e.message);
    }
  }

  async appendBrandLearned(airtableId, entry) {
    if (!entry || !entry.trim()) return;
    const existing = await this.loadBrandMemory(airtableId);
    const today = new Date().toISOString().split("T")[0];
    const stanza = `── BRAND LEARNED · ${today} ──\n${entry.trim()}\n`;
    if (existing.brand_learned.includes(stanza)) return;
    const next = existing.brand_learned
      ? `${existing.brand_learned}\n${stanza}`
      : stanza;
    try {
      await this.updateProject(airtableId, { brand_learned: next });
    } catch (e) {
      console.warn("[Pattern B] appendBrandLearned failed:", e.message);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Strategic Diagnostic + Applied Playbooks (Engine v1.7.0)
  //
  // Pass D output stored as JSON on the `diagnostic_v1` field of the
  // projects table. Pass L applied playbooks stored as rows on a new
  // "Applied Playbooks" table.
  // ─────────────────────────────────────────────────────────────

  async saveDiagnostic(airtableId, diagnostic) {
    if (!airtableId || !diagnostic) return;
    try {
      await this.updateProject(airtableId, { diagnostic_v1: JSON.stringify(diagnostic) });
    } catch (e) {
      console.warn("[Pass D] saveDiagnostic failed (diagnostic_v1 field may not exist yet):", e.message);
    }
  }

  async loadDiagnostic(airtableId) {
    if (!airtableId) return null;
    try {
      const data = await this._request(`${TABLES.projects}/${airtableId}`, "GET");
      const raw = data.fields?.diagnostic_v1;
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn("[Pass D] loadDiagnostic failed:", e.message);
      return null;
    }
  }

  async saveAppliedPlaybooks(projectId, playbooks) {
    if (!projectId || !playbooks?.length) return;
    const records = playbooks.map((b) => ({
      fields: {
        project_id: projectId,
        concept_id: b.id || "",
        name: b.name || "",
        theme: b.theme || "",
        category: b.category || "",
        why_applies: b.why_it_applies || "",
        anchored_to_persona: b.anchored_to_persona || "",
        anchored_to_outcome: b.anchored_to_outcome || "",
        first_move: b.first_move || "",
        owner: b.owner || "",
        kpi: b.kpi || "",
        success_signal: b.success_signal || "",
        references: JSON.stringify(b.references || []),
        vault_source: (b.references && b.references[0]) || "",
        created_at: new Date().toISOString().split("T")[0],
      },
    }));
    for (let i = 0; i < records.length; i += 10) {
      try {
        await this._request(TABLES.appliedPlaybooks, "POST", { records: records.slice(i, i + 10) });
        if (i + 10 < records.length) await _sleep(CHUNK_THROTTLE_MS);
      } catch (e) {
        console.warn("[Pass L] saveAppliedPlaybooks chunk failed (table may not exist yet):", e.message);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Ad-Intel module · Engine v1.7
  //
  // Expected base schema (create these tables in Airtable):
  //
  // TABLE: Swipe Pages
  //   - swipe_page_id (Single line text, primary)
  //   - project_id (Single line text)
  //   - brand_name (Single line text)
  //   - page_url (URL)
  //   - meta_page_url (URL)
  //   - classification (Single select: direct, adjacent, aspirational)
  //   - spend_tier (Single select: <$100K/mo, $100K-1M/mo, >$1M/mo, unknown)
  //   - verticals (Long text, JSON)
  //   - evidence (Long text)
  //   - scrape_status (Single select: pending, scraped, success_partial, failed)
  //   - ad_count (Number)
  //   - added_at (Date)
  //
  // TABLE: Swipe Ads
  //   - swipe_ad_id (Single line text, primary)
  //   - project_id (Single line text)
  //   - swipe_page_id (Single line text)
  //   - brand_name (Single line text)
  //   - meta_ad_id (Single line text)
  //   - creative_url (URL)
  //   - format (Single select: image, video, carousel, dco)
  //   - copy_text (Long text)
  //   - headline (Long text)
  //   - cta (Single line text)
  //   - platforms (Long text, JSON)
  //   - run_start (Date · optional)
  //   - run_end (Date · optional)
  //   - evidence (Long text)
  //   - ingestion_method (Single select: meta_api, web_search_fallback)
  //   - tag_status (Single select: pending, tagged, failed)
  //   - hook_type (Single select)
  //   - awareness_level (Number)
  //   - attention_capture / emotional_valence / memory_encoding /
  //     brand_recall / purchase_intent (Number)
  //   - score_total (Number)
  //   - addressed_beliefs (Long text, JSON)
  //   - overall_verdict (Long text)
  //   - fetched_at (Date)
  //   - tagged_at (Date)
  //
  // TABLE: Creative Briefs
  //   - brief_id (Single line text, primary)
  //   - project_id (Single line text)
  //   - source_outcome_job_id (Number)
  //   - source_outcome_statement (Long text)
  //   - source_outcome_score (Number)
  //   - source_angle_code (Single line text)
  //   - linked_swipe_ad_brand (Single line text)
  //   - hook (Long text)
  //   - body (Long text)
  //   - cta (Single line text)
  //   - shot_list (Long text, JSON)
  //   - belief_to_shift (Long text)
  //   - evidence_to_use (Long text)
  //   - predicted_scores (Long text, JSON)
  //   - tool / preset_mode / format (Single line text)
  //   - duration_seconds (Number)
  //   - status (Single select: draft, approved, rendered, published, failed)
  //   - pick_reason (Long text)
  //   - created_at (Date)

  // Helper · normalize spend_tier strings from CLI ("small"/"mid"/"large")
  // to Airtable select values. Mirrors engine/db/migrate-json-to-airtable.mjs.
  _normSpendTier(t) {
    const map = { small: "<$100K/mo", mid: "$100K-1M/mo", large: ">$1M/mo" };
    if (!t) return "unknown";
    return map[t] || t;
  }

  async saveSwipePages(projectId, competitors) {
    const records = competitors.map((c, i) => ({
      fields: {
        swipe_page_id: c.id || `sp-${projectId}-${i + 1}`,
        project_id: projectId,
        brand_name: c.brand_name || "",
        page_url: c.page_url || "",
        meta_page_url: c.meta_page_url || "",
        classification: c.classification || "direct",
        spend_tier: this._normSpendTier(c.spend_tier),
        verticals: JSON.stringify(c.verticals || []),
        evidence: c.evidence || "",
        scrape_status: c.scrape_status || "pending",
        ad_count: c.ad_count || 0,
        added_at: (c.added_at || new Date().toISOString()).split("T")[0],
      },
    }));
    const out = [];
    for (let i = 0; i < records.length; i += 10) {
      const batch = records.slice(i, i + 10);
      try {
        const data = await this._request(TABLES.swipePages, "POST", { records: batch });
        out.push(...data.records);
      } catch (e) {
        // Non-fatal — return what we have so the run continues
        console.warn("[airtable] saveSwipePages chunk failed:", e.message);
      }
      if (i + 10 < records.length) await _sleep(CHUNK_THROTTLE_MS);
    }
    return out;
  }

  async saveSwipeAds(projectId, ads) {
    const records = ads.map((a, i) => ({
      fields: {
        swipe_ad_id: a.id || `sa-${projectId}-${i + 1}`,
        project_id: projectId,
        swipe_page_id: a.swipe_page_id || "",
        brand_name: a.brand_name || "",
        meta_ad_id: a.meta_ad_id || "",
        creative_url: a.creative_url || "",
        format: a.format || "image",
        copy_text: a.copy_text || "",
        headline: a.headline || "",
        cta: a.cta || "",
        platforms: JSON.stringify(a.platforms || []),
        run_start: a.run_start || null,
        run_end: a.run_end || null,
        evidence: a.evidence || "",
        ingestion_method: a.ingestion_method || "web_search_fallback",
        tag_status: a.tag_status || "pending",
        fetched_at: (a.fetched_at || new Date().toISOString()).split("T")[0],
      },
    }));
    for (let i = 0; i < records.length; i += 10) {
      try {
        await this._request(TABLES.swipeAds, "POST", { records: records.slice(i, i + 10) });
      } catch (e) {
        console.warn("[airtable] saveSwipeAds chunk failed:", e.message);
      }
      if (i + 10 < records.length) await _sleep(CHUNK_THROTTLE_MS);
    }
  }

  /**
   * Patch Stage C eval results onto previously-saved Swipe Ads rows.
   * We don't track Airtable record IDs across stages in the React app
   * (the orchestrator is a single in-memory run), so we re-upsert by
   * `swipe_ad_id` as the primary key. Idempotent.
   */
  async updateSwipeAds(projectId, taggedAds) {
    const records = taggedAds.map((a, i) => ({
      fields: {
        swipe_ad_id: a.id || `sa-${projectId}-${i + 1}`,
        project_id: projectId,
        swipe_page_id: a.swipe_page_id || "",
        brand_name: a.brand_name || "",
        format: a.format || "image",
        copy_text: a.copy_text || "",
        headline: a.headline || "",
        cta: a.cta || "",
        tag_status: a.tag_status || "tagged",
        hook_type: a.hook_type || "",
        awareness_level: typeof a.awareness_level === "number" ? a.awareness_level : null,
        attention_capture: typeof a.attention_capture === "number" ? a.attention_capture : null,
        emotional_valence: typeof a.emotional_valence === "number" ? a.emotional_valence : null,
        memory_encoding: typeof a.memory_encoding === "number" ? a.memory_encoding : null,
        brand_recall: typeof a.brand_recall === "number" ? a.brand_recall : null,
        purchase_intent: typeof a.purchase_intent === "number" ? a.purchase_intent : null,
        score_total: typeof a.score_total === "number" ? a.score_total : null,
        addressed_beliefs: JSON.stringify(a.addressed_beliefs || []),
        overall_verdict: a.overall_verdict || "",
        tagged_at: a.tagged_at ? a.tagged_at.split("T")[0] : new Date().toISOString().split("T")[0],
      },
    }));
    // Use POST · the swipe_ad_id is the natural key, but Airtable POST
    // creates duplicates rather than upserting. Strategy: rely on the
    // upstream saveSwipeAds happening first, then PATCH by record ID
    // would be ideal — but we don't track record IDs across the React run.
    // Compromise · POST and let the brief generation reference by
    // swipe_ad_id field, not Airtable record ID.
    for (let i = 0; i < records.length; i += 10) {
      try {
        await this._request(TABLES.swipeAds, "POST", { records: records.slice(i, i + 10) });
      } catch (e) {
        console.warn("[airtable] updateSwipeAds chunk failed:", e.message);
      }
      if (i + 10 < records.length) await _sleep(CHUNK_THROTTLE_MS);
    }
  }

  async saveCreativeBriefs(projectId, briefs) {
    const records = briefs.map((b, i) => ({
      fields: {
        brief_id: `cb-${projectId}-${Date.now()}-${i}`,
        project_id: projectId,
        source_outcome_job_id: b.source_outcome_job_id ?? null,
        source_outcome_statement: b.source_outcome_statement || "",
        source_outcome_score: typeof b.source_outcome_score === "number" ? b.source_outcome_score : null,
        source_angle_code: b.source_angle_code || "",
        linked_swipe_ad_brand: b.linked_swipe_ad_brand || "",
        hook: b.hook || "",
        body: b.body || "",
        cta: b.cta || "",
        shot_list: JSON.stringify(b.shot_list || []),
        belief_to_shift: b.belief_to_shift || "",
        evidence_to_use: b.evidence_to_use || "",
        predicted_scores: JSON.stringify(b.predicted_scores || {}),
        tool: b.tool || "",
        preset_mode: b.preset_mode || "",
        format: b.format || "9:16",
        duration_seconds: typeof b.duration_seconds === "number" ? b.duration_seconds : 8,
        status: b.status || "draft",
        pick_reason: b.pick_reason || "",
        created_at: (b.created_at || new Date().toISOString()).split("T")[0],
      },
    }));
    for (let i = 0; i < records.length; i += 10) {
      try {
        await this._request(TABLES.creativeBriefs, "POST", { records: records.slice(i, i + 10) });
      } catch (e) {
        console.warn("[airtable] saveCreativeBriefs chunk failed:", e.message);
      }
      if (i + 10 < records.length) await _sleep(CHUNK_THROTTLE_MS);
    }
  }

  // ── Load full session ──
  async loadSession(sessionAirtableId) {
    const safeParse = (v) => {
      if (!v) return [];
      try { return JSON.parse(v); } catch { return []; }
    };

    const jobsData = await this._request(TABLES.jobs, "GET", null, {
      filterByFormula: `FIND("${sessionAirtableId}", ARRAYJOIN(session_id))`,
    });

    const jobs = await Promise.all(
      jobsData.records.map(async (r) => {
        const outData = await this._request(TABLES.outcomes, "GET", null, {
          filterByFormula: `FIND("${r.id}", ARRAYJOIN(job_id))`,
        });
        return {
          ...r.fields,
          id: r.fields.job_id,
          airtableId: r.id,
          related_jobs: safeParse(r.fields.related_jobs),
          emotional_jobs: safeParse(r.fields.emotional_jobs),
          social_jobs: safeParse(r.fields.social_jobs),
          consumption_chain_jobs: safeParse(r.fields.consumption_chain_jobs),
          outcomes: outData.records.map((o) => o.fields),
        };
      })
    );

    return jobs;
  }
}

export { AirtableClient, TABLES };
