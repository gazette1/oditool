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
};

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
        cpc: o.cpc || null,
        monthly_searches: o.monthly_searches || null,
      },
    }));

    for (let i = 0; i < records.length; i += 10) {
      const batch = records.slice(i, i + 10);
      await this._request(TABLES.outcomes, "POST", { records: batch });
    }
  }

  // ── Search Volume Data ──
  async saveSearchVolumeData(jobAirtableId, keywords) {
    const records = keywords.map((kw) => ({
      fields: {
        keyword_id: `kw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        job_id: [jobAirtableId],
        keyword: kw.keyword,
        monthly_volume: kw.monthly_volume || 0,
        cpc: kw.cpc || 0,
        competition_index: kw.competition_index || 0,
        trend_data: JSON.stringify(kw.trend_data || []),
        fetched_at: new Date().toISOString().split("T")[0],
      },
    }));

    for (let i = 0; i < records.length; i += 10) {
      const batch = records.slice(i, i + 10);
      await this._request(TABLES.searchVolume, "POST", { records: batch });
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
