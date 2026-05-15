import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { AirtableClient } from "./lib/airtable";
import { discoverJobs, mapJobsAndOutcomes, validateWithSearch, generateEntryRecommendations, generatePersonas, generateSwipeFile, generateScripts, generateEmailFlows, comparePositioning, generateChannelPlan, generateLandingVariants, generateRollout, generateCreatorBriefs, generateCompetitiveTeardown, generateBrandAudit, generateDemandLandscape, generateTribeReadout, validateAndNormalizeChannelPlan, generateRunRetrospective } from "./lib/anthropic";
import { composeStrategyDoc, downloadStrategyDoc } from "./lib/compose-strategy";
import { deployStrategyDoc, isVercelDeployConfigured } from "./lib/vercel-deploy";
import { generateSwipeImagery } from "./lib/image-gen";
import { runAdIntel } from "./lib/ad-intel";
import { getSearchVolume, getSearchConfig } from "./lib/search-volume";
import ProjectSetup from "./ProjectSetup";

// ── Constants ──
const STEPS = ["Define", "Locate", "Prepare", "Confirm", "Execute", "Monitor", "Modify", "Conclude"];
const STEP_VERBS = {
  Define: "Plan, Select, Determine", Locate: "Gather, Access, Retrieve",
  Prepare: "Set up, Organize, Examine", Confirm: "Validate, Prioritize, Decide",
  Execute: "Perform, Transact, Administer", Monitor: "Verify, Track, Check",
  Modify: "Update, Adjust, Maintain", Conclude: "Store, Finish, Close",
};

const oppColor = (s) => s >= 12 ? "#ef4444" : s >= 10 ? "#f97316" : s >= 8 ? "#eab308" : s >= 6 ? "#84cc16" : "#22c55e";
const trendIcon = (t) => t === "rising" ? "↗" : t === "declining" ? "↘" : "→";
const trendColor = (t) => t === "rising" ? "#22c55e" : t === "declining" ? "#ef4444" : "#eab308";

// ── Market Entry Strategy display ──
const STRATEGY_INFO = {
  Differentiated: { color: "#3b82f6", icon: "◆", description: "Target underserved outcomes — get the job done better" },
  Dominant:       { color: "#22c55e", icon: "★", description: "Get the job done better AND cheaper" },
  Disruptive:     { color: "#f97316", icon: "⚡", description: "Target overserved customers with simpler, cheaper solution" },
  Discrete:       { color: "#06b6d4", icon: "◎", description: "Focus on ONE high-value underserved outcome" },
  Sustaining:     { color: "#6a7585", icon: "→", description: "Incremental improvement on table stakes" },
};
const strategyInfo = (s) => STRATEGY_INFO[s] || { color: "#a78bfa", icon: "·", description: "" };
const marketSignalColor = (n) => n >= 70 ? "#22c55e" : n >= 40 ? "#eab308" : "#ef4444";
const difficultyColor = (d) => d === "low" ? "#22c55e" : d === "high" ? "#ef4444" : "#eab308";

// ── Config Panel ──
// Engine v1.6.12 · Hermes Retrospective modal.
// Renders after a Strategy Doc run completes. Shows the meta-pass output:
// overall verdict, prompt-improvement candidates (Accept/Reject per row),
// and wins. Accepted candidates append to brand_learned via Pattern B.
function RetrospectiveModal({ retro, onAccept, onClose, brandLearnedSize, brandMemorySize }) {
  const candidates = retro.candidates || [];
  const wins = retro.wins || [];
  const sevColor = (s) => s === "high" ? "#bc4749" : s === "medium" ? "#c8a45c" : "#6a994e";
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface-1 border border-[#1e2a3a] rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1e2a3a] sticky top-0 bg-surface-1 z-10">
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <div className="font-display text-base font-bold">🜂 Hermes Retrospective</div>
            <button onClick={onClose} className="text-[10px] text-dim border border-[#1e2a3a] px-2 py-1 rounded hover:border-accent hover:text-accent">✕ close</button>
          </div>
          <p className="text-[11px] text-dim leading-relaxed">{retro.overall_verdict}</p>
          <div className="text-[9px] text-dim mt-2 tracking-widest uppercase">
            brand_memory: {brandMemorySize.toLocaleString()} chars · brand_learned: {brandLearnedSize.toLocaleString()} chars
          </div>
        </div>

        <div className="px-6 py-5">
          {/* Wins */}
          {wins.length > 0 && (
            <div className="mb-5 p-3 rounded-lg" style={{ background: "rgba(106,153,78,0.08)", borderLeft: "3px solid #6a994e" }}>
              <div className="text-[9px] tracking-widest uppercase font-bold mb-2" style={{ color: "#6a994e" }}>✓ Wins · keep doing this</div>
              <ul className="space-y-1.5">
                {wins.map((w, i) => <li key={i} className="text-[12px] leading-relaxed">· {w}</li>)}
              </ul>
            </div>
          )}

          {/* Candidates */}
          <div className="text-[9px] tracking-widest uppercase font-bold mb-3 text-dim">
            {candidates.length} prompt-improvement candidate{candidates.length !== 1 ? "s" : ""} · accept to append to brand_learned
          </div>
          {candidates.length === 0 && (
            <p className="text-[12px] text-dim italic py-6 text-center">No candidates surfaced — clean run.</p>
          )}
          {candidates.map((c, idx) => (
            <div key={idx} className="mb-3 p-4 rounded-lg border border-[#1e2a3a] bg-surface-2">
              <div className="flex items-baseline justify-between gap-3 mb-2">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-display text-sm font-bold">Pass {c.pass_id}</span>
                  <span className="text-[10px] text-dim font-mono">{c.pass_name}</span>
                  <span className="text-[9px] tracking-widest uppercase px-2 py-0.5 rounded" style={{ background: `${sevColor(c.severity)}33`, color: sevColor(c.severity) }}>
                    {c.severity}
                  </span>
                </div>
                {c._accepted ? (
                  <span className="text-[10px] text-[#6a994e] font-bold">✓ ACCEPTED</span>
                ) : (
                  <button
                    onClick={() => onAccept(idx)}
                    className="text-[10px] border border-[#6a994e] text-[#6a994e] px-3 py-1 rounded hover:bg-[#6a994e] hover:text-[#06080c] transition">
                    Accept → brand_learned
                  </button>
                )}
              </div>
              <p className="text-[11px] text-[#e0ddd5] leading-relaxed mb-2"><strong className="text-dim">Observation:</strong> {c.observation}</p>
              <p className="text-[11px] text-[#e0ddd5] leading-relaxed mb-2"><strong className="text-dim">Improvement:</strong> {c.improvement}</p>
              {c.brand_learned_entry && (
                <p className="text-[11px] text-dim italic leading-relaxed border-t border-[#1e2a3a] pt-2 mt-2">
                  ↳ Will write: "{c.brand_learned_entry}"
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ConfigPanel({ config, setConfig, onClose }) {
  const [local, setLocal] = useState(config);
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-surface-1 border border-[#1e2a3a] rounded-xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-bold mb-4">Configuration</h2>
        {[
          ["ANTHROPIC_API_KEY", "anthropicKey", "password", "Required — Claude API key"],
          ["AIRTABLE_API_KEY", "airtableKey", "password", "Optional — Airtable personal access token"],
          ["AIRTABLE_BASE_ID", "airtableBaseId", "text", "Optional — starts with 'app'"],
          ["SERPAPI_KEY", "serpApiKey", "password", "Optional — for real Google search volume ($50/mo)"],
          ["GOOGLE_DRIVE_API_KEY", "googleDriveApiKey", "password", "Optional — for Project Setup Drive folder ingest"],
          ["OPENAI_API_KEY", "openaiKey", "password", "Optional — gpt-image-2 swipe imagery (~$0.80/run)"],
        ].map(([label, key, type, hint]) => (
          <div key={key} className="mb-4">
            <label className="text-[10px] text-dim tracking-widest uppercase block mb-1">{label}</label>
            <input type={type} value={local[key] || ""}
              onChange={(e) => setLocal((p) => ({ ...p, [key]: e.target.value }))}
              className="w-full bg-surface-2 border border-[#1e2a3a] rounded-lg px-3 py-2 text-sm text-[#e0ddd5] focus:border-accent outline-none"
              placeholder={hint} />
          </div>
        ))}
        <div className="flex gap-3 mt-6">
          <button onClick={() => { setConfig(local); localStorage.setItem("odi-config", JSON.stringify(local)); onClose(); }}
            className="flex-1 bg-accent text-[#06080c] font-display font-bold text-xs tracking-wider uppercase py-3 rounded-lg">
            Save
          </button>
          <button onClick={onClose} className="px-6 border border-[#1e2a3a] text-dim text-xs rounded-lg">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Session Sidebar ──
function SessionList({ sessions, activeId, onSelect, onNew }) {
  return (
    <div className="w-64 shrink-0 border-r border-[#1e2a3a] bg-surface-1 flex flex-col h-screen overflow-hidden">
      <div className="p-4 border-b border-[#1e2a3a]">
        <button onClick={onNew}
          className="w-full bg-accent/10 border border-accent/30 text-accent font-display font-bold text-xs tracking-wider uppercase py-2.5 rounded-lg hover:bg-accent/20 transition">
          + New Research
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sessions.map((s) => (
          <div key={s.session_id || s.id} onClick={() => onSelect(s)}
            className={`px-4 py-3 border-b border-[#1e2a3a] cursor-pointer transition ${(s.session_id || s.id) === activeId ? "bg-accent/10 border-l-2 border-l-accent" : "hover:bg-surface-2"}`}>
            <div className="text-sm font-medium truncate">{s.sector}</div>
            <div className="text-[10px] text-dim mt-1">{s.created_at || "just now"} · {s.status || "local"}</div>
          </div>
        ))}
        {sessions.length === 0 && <div className="p-4 text-xs text-dim">No sessions yet</div>}
      </div>
    </div>
  );
}

// Engine v1.6.7 · `.env.local` fallback for API keys.
// Anything the user pastes into the Config panel (localStorage) wins
// over these env defaults. The env path exists so a baseline key set
// can persist across browser-state wipes without re-typing.
const ENV_DEFAULTS = {
  anthropicKey:      import.meta.env.VITE_ANTHROPIC_API_KEY     || "",
  airtableKey:       import.meta.env.VITE_AIRTABLE_API_KEY      || "",
  airtableBaseId:    import.meta.env.VITE_AIRTABLE_BASE_ID      || "",
  serpApiKey:        import.meta.env.VITE_SERPAPI_KEY           || "",
  googleDriveApiKey: import.meta.env.VITE_GOOGLE_DRIVE_API_KEY  || "",
  openaiKey:         import.meta.env.VITE_OPENAI_API_KEY        || "",
};

// ── Main App ──
export default function App() {
  const [config, setConfig] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("odi-config") || "{}");
      // localStorage wins · env vars only fill in keys the user hasn't set yet
      return { ...ENV_DEFAULTS, ...stored };
    } catch {
      return { ...ENV_DEFAULTS };
    }
  });
  const [showConfig, setShowConfig] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [sector, setSector] = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [activeJob, setActiveJob] = useState(null);
  const [view, setView] = useState("entry");
  const [searchVolumeData, setSearchVolumeData] = useState({});
  const [entryRecs, setEntryRecs] = useState([]);
  const [positioningSpine, setPositioningSpine] = useState(null);
  const [stratDocBusy, setStratDocBusy] = useState(false);
  const [stratDocPhase, setStratDocPhase] = useState("");
  const [debugLog, setDebugLog] = useState([]);

  // Engine v1.7: Ad-Intel module
  const [adIntelBusy, setAdIntelBusy] = useState(false);
  const [adIntelPhase, setAdIntelPhase] = useState("");
  const [adIntelData, setAdIntelData] = useState(null); // { competitors, ads, briefs, summary }

  // Engine v1.6.8: opt-in swipe imagery toggle (gpt-image-2 per card)
  const [generateImagery, setGenerateImagery] = useState(false);

  // Engine v1.6.12: Hermes retrospective state + brand_memory cache
  const [retroData, setRetroData] = useState(null);       // { overall_verdict, candidates, wins } or null
  const [retroBusy, setRetroBusy] = useState(false);
  const [retroPhase, setRetroPhase] = useState("");
  const [brandMemory, setBrandMemory] = useState("");     // loaded with active project
  const [brandLearned, setBrandLearned] = useState("");

  // Engine v1.4: Project Setup flow + active project context
  const [viewMode, setViewMode] = useState("analyze"); // "analyze" | "setup"
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [projectContext, setProjectContext] = useState(null);

  const log = useCallback((msg, level = "info") => {
    const ts = new Date().toLocaleTimeString("en-GB", { hour12: false });
    setDebugLog((prev) => [...prev, { ts, msg, level }].slice(-200));
    // eslint-disable-next-line no-console
    console.log(`[${ts}] ${msg}`);
  }, []);

  // Airtable client. MUST be declared before any useCallback that has it
  // in its deps array (otherwise we hit a Temporal Dead Zone error at
  // render time — App crashes with "Cannot access 'airtable' before
  // initialization"). useMemo'd so callbacks don't churn on every render.
  const airtable = useMemo(() => (
    config.airtableKey && config.airtableBaseId
      ? new AirtableClient(config.airtableKey, config.airtableBaseId)
      : null
  ), [config.airtableKey, config.airtableBaseId]);

  // Load sessions + projects from Airtable on mount
  useEffect(() => {
    if (config.airtableKey && config.airtableBaseId) {
      const client = new AirtableClient(config.airtableKey, config.airtableBaseId);
      client.listSessions().then(setSessions).catch(console.error);
      client.listProjects().then(setProjects).catch(() => {});
    }
  }, [config.airtableKey, config.airtableBaseId]);

  // When user picks a Project, parse its embedded Pass 0 context summary
  // out of the product_context field (the createProject persists it there
  // under "── PASS 0 CONTEXT SUMMARY ──").
  // Engine v1.6.5 · Project isolation: when switching projects, RESET
  // every piece of project-scoped state so the new project starts cold.
  // Without this, the previous brand's outcomes/personas/ad-intel/etc.
  // would persist in the dashboard until the user clicks Run Analysis.
  // The only state that survives is user-scoped (API keys in config).
  const resetProjectScopedState = useCallback(() => {
    setData(null);
    setActiveJob(null);
    setEntryRecs([]);
    setPositioningSpine(null);
    setSearchVolumeData({});
    setAdIntelData(null);
    setAdIntelPhase("");
    setStratDocPhase("");
    setDebugLog([]);
    setError(null);
    setView("entry");
    setPhase("");
    // v1.6.12 · brand_memory and retrospective are project-scoped too
    setRetroData(null);
    setRetroPhase("");
    setBrandMemory("");
    setBrandLearned("");
  }, []);

  const loadProjectAsContext = useCallback((project) => {
    resetProjectScopedState();         // ← clear previous project's data first
    setActiveProject(project);
    let summary = null;
    const pc = project?.product_context || "";
    const marker = "── PASS 0 CONTEXT SUMMARY ──";
    if (pc.includes(marker)) {
      const json = pc.split(marker)[1]?.split("── SOURCES ──")[0]?.trim();
      try { summary = JSON.parse(json); } catch { /* leave null */ }
    }
    // If we couldn't parse a summary, build a minimal one from the fields.
    if (!summary && project) {
      summary = {
        sector: project.sector || "",
        audience: project.audience || "",
        product_context: pc,
        brand_voice: "",
        key_facts: [],
        sources: [],
        positioning_hints: [],
        red_flags: ["No Pass 0 summary found on this project — context is fields-only."],
      };
    }
    setProjectContext(summary);
    if (summary?.sector) setSector(summary.sector);
    // v1.6.12 · Pattern B · load brand_memory + brand_learned for this project
    if (airtable && project?.airtableId) {
      airtable.loadBrandMemory(project.airtableId).then(({ brand_memory, brand_learned }) => {
        setBrandMemory(brand_memory || "");
        setBrandLearned(brand_learned || "");
        if (brand_memory) log(`Pattern B · loaded ${brand_memory.length} chars of brand_memory from prior runs`, "ok");
      }).catch(() => {});
    }
  }, [resetProjectScopedState, airtable, log]);

  // ── Engine v1.5 · Generate full Strategy Doc ──
  const generateStrategyDoc = useCallback(async () => {
    if (!data || !data.length) { setError("Run analysis first"); return; }
    if (!config.anthropicKey) { setError("Anthropic key required"); return; }
    setStratDocBusy(true);
    setError(null);
    try {
      setStratDocPhase("Pass 7: generating personas…");
      log("Pass 7/18: personas");
      const { personas = [] } = await generatePersonas(config.anthropicKey, projectContext, data);

      setStratDocPhase("Pass 5: value-prop comparison…");
      log("Pass 5/18: competitor value-prop comparison");
      // Pull competitor names from positioningHints / context if available; else skip
      const competitors = (projectContext?.key_facts || []).filter(f => /competitor|vs\s/i.test(f)).slice(0, 4).map(name => ({ name, stated_value_prop: "", source_url: "" }));
      let valueProp = { comparisons: [] };
      if (competitors.length && positioningSpine?.primary?.sentence) {
        try {
          const scoredOutcomes = data.flatMap(j => (j.outcomes || []).map(o => ({ job_id: j.id, statement: o.statement, opportunity_score: o.opportunity_score })));
          valueProp = await comparePositioning(config.anthropicKey, projectContext?.sector || "the brand", positioningSpine.primary.sentence, competitors, scoredOutcomes);
        } catch (e) { log(`Pass 5 skipped (non-critical): ${e.message}`, "error"); }
      }

      setStratDocPhase("Pass 8: swipe file (20 ads)…");
      log("Pass 8/18: 20 swipe-file ad concepts");
      let { swipe_file = [] } = await generateSwipeFile(config.anthropicKey, projectContext, positioningSpine, personas);

      // v1.6.8 · optional Pass 8.5 · gpt-image-1 per swipe card
      if (generateImagery && swipe_file.length && config.openaiKey) {
        setStratDocPhase(`Pass 8.5: generating ${swipe_file.length} ad images (gpt-image-2, slow + costs)…`);
        log(`Pass 8.5: generating ${swipe_file.length} swipe images via gpt-image-2 (~$${(swipe_file.length * 0.04).toFixed(2)}, ~${Math.round(swipe_file.length * 8)}s)`);
        try {
          const imgResult = await generateSwipeImagery({
            openaiKey: config.openaiKey,
            swipeFile: swipe_file,
            projectContext,
            onProgress: (msg) => { setStratDocPhase(`Pass 8.5: ${msg}`); log(`  ${msg}`); },
          });
          swipe_file = imgResult.swipeFile;
          log(`Pass 8.5 complete · ${imgResult.summary.ok}/${imgResult.summary.total} images generated · ${imgResult.summary.failed} failed`, "ok");
        } catch (e) {
          log(`Pass 8.5 skipped: ${e.message} · falling back to gradient mocks`, "warn");
        }
      } else if (generateImagery && !config.openaiKey) {
        log("Pass 8.5 skipped: imagery toggle ON but no OPENAI_API_KEY in config · falling back to gradient mocks", "warn");
      }

      setStratDocPhase("Pass 9: TikTok scripts…");
      log("Pass 9/18: 8 shot-by-shot TikTok scripts");
      const { scripts = [] } = await generateScripts(config.anthropicKey, projectContext, positioningSpine, personas);

      setStratDocPhase("Pass 10: email flows…");
      log("Pass 10/18: 4 Klaviyo-ready email flows");
      const emailFlows = await generateEmailFlows(config.anthropicKey, projectContext, positioningSpine);

      setStratDocPhase("Pass 11: channel plan + targeting matrix…");
      log("Pass 11/18: channel plan + targeting matrix");
      let channelPlan = { channels: [], targeting_matrix: [] };
      try {
        channelPlan = await generateChannelPlan(config.anthropicKey, projectContext, positioningSpine, personas);
        // v1.6.8 · normalize budget_pct so it sums to exactly 100
        channelPlan = validateAndNormalizeChannelPlan(channelPlan);
        if (channelPlan._validation?.applied) {
          log(`Pass 11 budget rebalanced · original sum ${channelPlan._validation.original_sum}% → 100%`, "warn");
        }
      } catch (e) { log(`Pass 11 skipped: ${e.message}`, "error"); }

      setStratDocPhase("Pass 12: landing-page variants…");
      log("Pass 12/18: landing-page variants");
      let landing = { variants: [] };
      try { landing = await generateLandingVariants(config.anthropicKey, projectContext, positioningSpine, personas); }
      catch (e) { log(`Pass 12 skipped: ${e.message}`, "error"); }

      setStratDocPhase("Pass 13: 90-day rollout plan…");
      log("Pass 13/18: 90-day rollout");
      let rollout = { phases: [], weekly_cadence: [], kill_criteria: [] };
      try { rollout = await generateRollout(config.anthropicKey, projectContext, positioningSpine, entryRecs); }
      catch (e) { log(`Pass 13 skipped: ${e.message}`, "error"); }

      setStratDocPhase("Pass 14: creator outreach packets…");
      log("Pass 14/18: 5 paid-creator briefs");
      let creators = { creator_briefs: [] };
      try { creators = await generateCreatorBriefs(config.anthropicKey, projectContext, positioningSpine, personas, entryRecs); }
      catch (e) { log(`Pass 14 skipped: ${e.message}`, "error"); }

      setStratDocPhase("Pass 15: competitive teardown…");
      log("Pass 15/18: 6-row competitive matrix + axis summary");
      let competitive = { competitive_matrix: [], axis_summary: null };
      try {
        const adIntelCompetitors = adIntelData?.competitors || null;
        competitive = await generateCompetitiveTeardown(config.anthropicKey, projectContext, positioningSpine, valueProp, adIntelCompetitors);
      } catch (e) { log(`Pass 15 skipped: ${e.message}`, "error"); }

      setStratDocPhase("Pass 16: brand audit…");
      log("Pass 16/18: 8-10 surface brand audit");
      let brandAudit = { audit_summary: "", areas: [], voice_consistency: null, discoverability: null };
      try {
        // Optional: feed scraped content if any URLs were ingested at Pass 0.
        // For now we pass empty string · Pass 16 reasons from projectContext.
        brandAudit = await generateBrandAudit(config.anthropicKey, projectContext, data, "");
      } catch (e) { log(`Pass 16 skipped: ${e.message}`, "error"); }

      setStratDocPhase("Pass 17: demand landscape…");
      log("Pass 17/18: 3-stage funnel + white-space + seasonal");
      let demandLandscape = { funnel_stages: [], white_space_keywords: [], seasonal_pulse: [], category_temperature: null };
      try {
        demandLandscape = await generateDemandLandscape(config.anthropicKey, projectContext, positioningSpine, data, searchVolumeData);
      } catch (e) { log(`Pass 17 skipped: ${e.message}`, "error"); }

      setStratDocPhase("Pass 18: tribe readout (web_search verification, slow)…");
      log("Pass 18/18: tribe readout · web_search-verified handles only");
      let tribe = { tribe_summary: "", creators: [], search_paths: [], honest_caveats: [] };
      try {
        tribe = await generateTribeReadout(config.anthropicKey, projectContext, personas, creators);
      } catch (e) { log(`Pass 18 skipped: ${e.message}`, "error"); }

      setStratDocPhase("Composing HTML doc…");
      const html = composeStrategyDoc({
        project_name: activeProject?.name || projectContext?.sector || sector,
        project_context: projectContext,
        positioning: positioningSpine,
        personas,
        mergedJobs: data,
        valueProp,
        swipeFile: swipe_file,
        scripts,
        emailFlows,
        recommendations: entryRecs,
        channelPlan,
        landing,
        rollout,
        creators,
        competitive,
        brandAudit,
        demandLandscape,
        tribe,
      });

      const slug = (activeProject?.name || "doc").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      const filename = `strategy-${slug}-${Date.now()}.html`;
      downloadStrategyDoc(html, filename);
      setStratDocPhase(`✓ Downloaded ${filename}`);
      log(`Strategy doc downloaded: ${filename}`);

      // Engine v1.6.8 · optional Vercel deploy. Silently skipped when
      // VITE_VERCEL_TOKEN isn't set in .env.local.
      if (isVercelDeployConfigured()) {
        setStratDocPhase("Deploying to Vercel for share URL…");
        try {
          const projectName = `oditool-${slug.slice(0, 40)}`;
          const result = await deployStrategyDoc(html, { projectName, slug });
          if (result.url) {
            setStratDocPhase(`✓ ${filename} · share: ${result.url}`);
            log(`Vercel share URL: ${result.url}`, "ok");
            // eslint-disable-next-line no-console
            console.log("📎 Strategy doc share URL:", result.url);
          }
        } catch (e) {
          log(`Vercel deploy skipped: ${e.message}`, "warn");
        }
      }

      // Engine v1.6.12 · auto-trigger Hermes retrospective after a full run.
      // Surfaces a modal with prompt-improvement candidates · user accepts
      // or rejects each · accepted ones append to brand_learned.
      setStratDocPhase("Hermes meta-pass: reviewing the run…");
      log("Hermes retrospective · reviewing 18 passes for prompt-improvement candidates");
      try {
        const retro = await generateRunRetrospective(config.anthropicKey, projectContext, {
          mergedJobs: data,
          entryRecs,
          positioning: positioningSpine,
          personas,
          swipeFile: swipe_file,
          scripts,
          emailFlows,
          channelPlan,
          landing,
          rollout,
          creators,
          competitive,
          brandAudit,
          demandLandscape,
          tribe,
        });
        setRetroData(retro);
        log(`Hermes retrospective · ${(retro.candidates || []).length} candidates · ${(retro.wins || []).length} wins`, "ok");
      } catch (e) {
        log(`Hermes retrospective skipped: ${e.message}`, "warn");
      }
    } catch (e) {
      setError(e.message);
      log(`Strategy doc generation failed: ${e.message}`, "error");
    } finally {
      setStratDocBusy(false);
    }
  }, [data, config, projectContext, positioningSpine, entryRecs, activeProject, sector, adIntelData, generateImagery, log]);

  // v1.6.12 · accept a retrospective candidate → append its brand_learned_entry
  const acceptRetroCandidate = useCallback(async (idx) => {
    if (!retroData?.candidates?.[idx]) return;
    const c = retroData.candidates[idx];
    if (airtable && activeProject?.airtableId && c.brand_learned_entry) {
      try {
        await airtable.appendBrandLearned(activeProject.airtableId, `[Pass ${c.pass_id} · ${c.pass_name}] ${c.brand_learned_entry}`);
        log(`Pattern B · accepted candidate appended to brand_learned`, "ok");
        // Refresh local cache
        const fresh = await airtable.loadBrandMemory(activeProject.airtableId);
        setBrandLearned(fresh.brand_learned);
      } catch (e) {
        log(`appendBrandLearned failed: ${e.message}`, "error");
      }
    }
    // Mark as accepted in local state so UI updates
    setRetroData((prev) => ({
      ...prev,
      candidates: prev.candidates.map((x, i) => i === idx ? { ...x, _accepted: true } : x),
    }));
  }, [retroData, airtable, activeProject, log]);

  // ── Engine v1.7 · Run Ad-Intel (Stage A → B → C → D) ──
  const runAdIntelHandler = useCallback(async () => {
    if (!data || !data.length) { setError("Run ODI analysis first — ad-intel needs Pass 1+2 outcomes for Stage D."); return; }
    if (!config.anthropicKey) { setError("Anthropic key required"); return; }
    setAdIntelBusy(true);
    setError(null);
    setAdIntelData(null);

    const brand = activeProject?.name || projectContext?.sector?.split(/[—·:]/)[0]?.trim() || sector;
    const category = projectContext?.sector || sector;
    const projectId = activeProject?.project_id || `proj_${Date.now()}`;

    try {
      log(`Ad-Intel · starting · brand="${brand}" · category="${category}"`);
      const result = await runAdIntel({
        apiKey: config.anthropicKey,
        airtable,
        projectId,
        projectContext,
        mergedJobs: data,
        brand,
        category,
        onProgress: (msg) => {
          setAdIntelPhase(msg);
          log(`Ad-Intel · ${msg}`);
        },
      });
      setAdIntelData(result);
      setView("adintel");
      log(`Ad-Intel · complete · ${result.summary.competitor_count} competitors · ${result.summary.ad_count} ads · ${result.summary.tagged_count} tagged · ${result.summary.brief_count} briefs`);
      setAdIntelPhase(`✓ ${result.summary.brief_count} briefs ready`);
    } catch (e) {
      setError(e.message);
      log(`Ad-Intel failed: ${e.message}`, "error");
    } finally {
      setAdIntelBusy(false);
    }
  }, [data, config, projectContext, activeProject, sector, airtable, log]);

  const handleProjectReady = useCallback(({ project, contextSummary }) => {
    setProjects((prev) => [project, ...prev]);
    setActiveProject(project);
    setProjectContext(contextSummary);
    if (contextSummary?.sector) setSector(contextSummary.sector);
    setViewMode("analyze");
  }, []);

  // Show config on first load if no API key
  useEffect(() => {
    if (!config.anthropicKey) setShowConfig(true);
  }, []);

  // ── Run ODI Analysis ──
  const runAnalysis = useCallback(async () => {
    if (!sector.trim() || !config.anthropicKey) return;
    setLoading(true); setError(null); setData(null); setActiveJob(null); setSearchVolumeData({}); setEntryRecs([]); setDebugLog([]);
    setView("entry");

    let sessionRef = null;
    try {
      // Create Airtable session if connected
      if (airtable) {
        setPhase("Creating research session...");
        log("Creating Airtable research session");
        sessionRef = await airtable.createSession(sector.trim());
        log(`Session created: ${sessionRef.sessionId}`);
        setSessions((prev) => [{ session_id: sessionRef.sessionId, sector: sector.trim(), status: "running", created_at: new Date().toISOString().split("T")[0] }, ...prev]);
      }

      // Pass 1: Discover jobs (Engine v1.4 — pass projectContext if available)
      setPhase("Pass 1/4 — Discovering core functional jobs...");
      const ctxNote = projectContext ? ` (with Pass 0 project context)` : ` (no project context)`;
      log(`Pass 1/4: discovering core functional jobs for "${sector.trim()}"${ctxNote}`);
      const jobsResult = await discoverJobs(config.anthropicKey, sector.trim(), null, projectContext);
      if (!jobsResult.core_jobs?.length) throw new Error("No jobs discovered.");
      log(`Pass 1/4 complete: ${jobsResult.core_jobs.length} jobs discovered`);

      // Pass 2: Map + outcomes (per-job to avoid truncation)
      setPhase(`Pass 2/4 — Mapping ${jobsResult.core_jobs.length} jobs through Universal Job Map...`);
      log(`Pass 2/4: mapping ${jobsResult.core_jobs.length} jobs through Universal Job Map (one job per call)`);
      const mapsResult = await mapJobsAndOutcomes(
        config.anthropicKey,
        jobsResult.core_jobs,
        (jobId, status, errMsg) => {
          if (status === "start") log(`Pass 2/4: mapping job ${jobId}…`);
          else if (status === "done") log(`Pass 2/4: job ${jobId} mapped`);
          else if (status === "error") log(`Pass 2/4: job ${jobId} FAILED — ${errMsg}`, "error");
        }
      );
      log(`Pass 2/4 complete: ${mapsResult.job_maps.length}/${jobsResult.core_jobs.length} maps generated${mapsResult.errors.length ? ` (${mapsResult.errors.length} failed)` : ""}`);

      // Pass 3: Validate with search (non-critical)
      setPhase("Pass 3/4 — Validating against search demand...");
      log("Pass 3/4: validating against real search demand");
      let valResult = { validations: [] };
      try {
        valResult = await validateWithSearch(config.anthropicKey, jobsResult.core_jobs);
        log(`Pass 3/4 complete: ${valResult.validations?.length || 0} validations`);
      } catch (e) {
        log(`Pass 3/4 failed (non-critical): ${e.message}`, "error");
      }

      // Pass 4: Real search volume if provider configured
      const searchConfig = {
        ...getSearchConfig(),
        anthropicKey: config.anthropicKey,
        serpApiKey: config.serpApiKey,
        searchProvider: config.serpApiKey ? "serpapi" : "claude",
      };
      const allKeywords = jobsResult.core_jobs.flatMap((j) => j.search_queries || []);
      let volumeData = {};
      if (allKeywords.length > 0 && config.serpApiKey) {
        setPhase("EARTH: Fetching real search volume data...");
        log(`Fetching SerpAPI volume for ${Math.min(20, allKeywords.length)} keywords`);
        try {
          const volResults = await getSearchVolume(allKeywords.slice(0, 20), searchConfig);
          volResults.forEach((v) => { volumeData[v.keyword] = v; });
          const errors = volResults.filter((v) => v.error || v.source === "serpapi_error");
          const ok = volResults.length - errors.length;
          log(`SerpAPI: ${ok}/${volResults.length} keywords succeeded${errors.length ? `, ${errors.length} failed` : ""}`);
          // Surface each unique error once so the user can actually see what went wrong.
          const uniqueErrors = [...new Set(errors.map((e) => e.error).filter(Boolean))];
          uniqueErrors.forEach((msg) => log(`SerpAPI error: ${msg}`, "error"));
        } catch (e) {
          log(`Search volume fetch failed (non-critical): ${e.message}`, "error");
        }
      }
      setSearchVolumeData(volumeData);

      // Merge all data
      const merged = jobsResult.core_jobs.map((job) => {
        const map = mapsResult.job_maps?.find((m) => m.job_id === job.id) || { steps: {}, outcomes: [] };
        const val = valResult.validations?.find((v) => v.job_id === job.id) || {};

        // Attach search volume to job
        const jobVolume = (job.search_queries || [])
          .map((q) => volumeData[q])
          .filter(Boolean);
        const maxVolume = jobVolume.length > 0
          ? Math.max(...jobVolume.map((v) => v.volume_signal || 0))
          : val.search_volume_signal || 0;

        return {
          ...job, ...map, ...val,
          search_volume_signal: maxVolume || val.search_volume_signal || 0,
          volume_data: jobVolume,
        };
      });

      // Pass 4: Market entry recommendations (non-critical)
      setPhase("Pass 4/4 — Generating market entry recommendations...");
      log("Pass 4/4: synthesizing market entry recommendations");
      let recs = [];
      try {
        const recResult = await generateEntryRecommendations(config.anthropicKey, merged);
        recs = (recResult.recommendations || []).sort((a, b) => (a.rank || 99) - (b.rank || 99));
        setPositioningSpine(recResult.positioning_spine || null);
        log(`Pass 4/4 complete: ${recs.length} recommendations generated`);
      } catch (e) {
        log(`Pass 4/4 failed (non-critical): ${e.message}`, "error");
      }
      setEntryRecs(recs);

      // Save to Airtable
      if (airtable && sessionRef) {
        setPhase("Saving results to Airtable...");
        log("Saving results to Airtable");
        try {
          const savedJobs = await airtable.saveJobs(sessionRef.airtableId, merged);
          const jobIdToAirtableId = {};
          for (let i = 0; i < savedJobs.length; i++) {
            const jobRecord = savedJobs[i];
            const jobData = merged[i];
            jobIdToAirtableId[jobData.id] = jobRecord.id;
            if (jobData?.outcomes?.length) {
              await airtable.saveOutcomes(jobRecord.id, jobData.outcomes);
            }
            if (jobData?.volume_data?.length) {
              await airtable.saveSearchVolumeData(jobRecord.id, jobData.volume_data);
            }
          }
          if (recs.length > 0 && airtable.saveEntryRecommendations) {
            try {
              await airtable.saveEntryRecommendations(sessionRef.airtableId, recs, jobIdToAirtableId);
              log("Entry recommendations saved to Airtable");
            } catch (e) {
              log(`Entry rec save failed (non-critical): ${e.message}`, "error");
            }
          }
          await airtable.updateSession(sessionRef.airtableId, { status: "complete" });
        } catch (e) {
          log(`Airtable save failed (non-critical): ${e.message}`, "error");
        }
      }

      setData(merged);
      setActiveJob(merged[0]?.id || null);
      setActiveSession(sessionRef?.sessionId || `local-${Date.now()}`);

      setPhase("");
    } catch (e) {
      setError(e.message);
      log(`FATAL: ${e.message}`, "error");
      if (airtable && sessionRef) {
        airtable.updateSession(sessionRef.airtableId, { status: "error", summary: e.message }).catch(() => {});
      }
    } finally {
      setLoading(false);
    }
  }, [sector, config, airtable, log]);

  // ── Load saved session ──
  const loadSession = useCallback(async (session) => {
    if (!airtable) return;
    setLoading(true); setPhase("Loading saved session...");
    try {
      const jobs = await airtable.loadSession(session.id || session.airtableId);
      setData(jobs);
      setSector(session.sector);
      setActiveJob(jobs[0]?.id || jobs[0]?.job_id || null);
      setActiveSession(session.session_id);
      setPhase("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [airtable]);

  const activeJobData = data?.find((j) => j.id === activeJob || j.job_id === activeJob);
  const allOutcomes = data?.flatMap((j) => (j.outcomes || []).map((o) => ({ ...o, jobName: j.job_statement }))) || [];
  const underservedCount = allOutcomes.filter((o) => (o.opportunity_score || 0) >= 10).length;

  // Engine v1.4: when in Project Setup mode, render that view full-screen.
  if (viewMode === "setup") {
    return <ProjectSetup config={config} priorBrandMemory={brandMemory} onProjectReady={handleProjectReady} onCancel={() => setViewMode("analyze")} />;
  }

  return (
    <div className="flex h-screen bg-[#06080c] text-[#e0ddd5] font-mono">
      {showConfig && <ConfigPanel config={config} setConfig={setConfig} onClose={() => setShowConfig(false)} />}
      {retroData && <RetrospectiveModal retro={retroData} onAccept={acceptRetroCandidate} onClose={() => setRetroData(null)} brandLearnedSize={brandLearned.length} brandMemorySize={brandMemory.length} />}

      {/* Sidebar */}
      <SessionList sessions={sessions} activeId={activeSession}
        onSelect={loadSession}
        onNew={() => { resetProjectScopedState(); setSector(""); setActiveSession(null); setActiveProject(null); setProjectContext(null); }} />

      {/* Main */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1100px] mx-auto p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-2 h-2 rounded-full bg-accent shadow-[0_0_10px_#c8a45c]" />
                <span className="font-display text-[11px] font-bold text-accent tracking-[3px]">ALCHEMICAL GROWTH ENGINE · MODE 1 · EARTH</span>
              </div>
              <h1 className="font-display text-2xl font-bold">ODI Research Tool</h1>
              <p className="text-xs text-dim mt-1">
                Discover jobs → Universal Job Map → Desired Outcomes → Opportunity Algorithm → Search Volume Validation
                {config.serpApiKey && <span className="text-accent ml-2">· SerpAPI connected</span>}
                {airtable && <span className="text-accent ml-2">· Airtable connected</span>}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setViewMode("setup")}
                className="text-xs text-dim border border-[#1e2a3a] px-3 py-2 rounded-lg hover:border-accent hover:text-accent transition">
                + New Project
              </button>
              <button onClick={runAdIntelHandler} disabled={!data || adIntelBusy || loading || stratDocBusy}
                className="text-xs border border-[#a78bfa] text-[#a78bfa] px-3 py-2 rounded-lg hover:bg-[#a78bfa] hover:text-[#06080c] transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#a78bfa]">
                {adIntelBusy ? "↻ Scoring…" : "🎯 Run Ad-Intel"}
              </button>
              <label
                className="text-[10px] text-dim border border-[#1e2a3a] px-2 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer hover:border-accent hover:text-accent transition select-none"
                title={config.openaiKey ? "Generate one gpt-image-2 image per swipe-file card (~$0.80, +3 min)" : "Add OPENAI_API_KEY in ⚙ Config to enable"}
              >
                <input
                  type="checkbox"
                  checked={generateImagery}
                  onChange={(e) => setGenerateImagery(e.target.checked)}
                  disabled={!config.openaiKey || stratDocBusy || loading}
                  className="accent-accent"
                />
                🖼 imagery
              </label>
              <button onClick={generateStrategyDoc} disabled={!data || stratDocBusy || loading}
                className="text-xs border border-accent text-accent px-3 py-2 rounded-lg hover:bg-accent hover:text-[#06080c] transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-accent">
                {stratDocBusy ? "↻ Composing…" : "↓ Strategy Doc"}
              </button>
              <button onClick={() => setShowConfig(true)}
                className="text-xs text-dim border border-[#1e2a3a] px-3 py-2 rounded-lg hover:border-accent hover:text-accent transition">
                ⚙ Config
              </button>
            </div>
          </div>

          {/* Project picker (Engine v1.4) */}
          {projects.length > 0 && (
            <div className="bg-surface-1 border border-[#1e2a3a] rounded-lg p-4 mb-5">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-[10px] font-display font-bold tracking-widest uppercase text-dim">Project context</span>
                {projectContext && <span className="text-[10px] text-accent">✓ Pass 0 loaded · {projectContext.key_facts?.length || 0} key facts</span>}
              </div>
              <div className="flex gap-2 flex-wrap">
                <select
                  value={activeProject?.airtableId || ""}
                  onChange={(e) => {
                    const p = projects.find(x => x.airtableId === e.target.value);
                    if (p) loadProjectAsContext(p);
                    else { resetProjectScopedState(); setActiveProject(null); setProjectContext(null); setSector(""); }
                  }}
                  className="flex-1 min-w-[200px] bg-surface-2 border border-[#1e2a3a] rounded-lg px-3 py-2 text-xs text-[#e0ddd5] focus:border-accent outline-none"
                >
                  <option value="">— No project loaded · running with sector text only —</option>
                  {projects.map(p => <option key={p.airtableId} value={p.airtableId}>{p.name} · {p.sector || "(no sector)"}</option>)}
                </select>
                {activeProject && (
                  <button
                    onClick={() => { resetProjectScopedState(); setActiveProject(null); setProjectContext(null); setSector(""); }}
                    className="text-[10px] text-dim border border-[#1e2a3a] px-3 py-2 rounded-lg hover:text-red-400 hover:border-red-400 transition">
                    Clear
                  </button>
                )}
              </div>
              {projectContext?.red_flags?.length > 0 && (
                <div className="mt-2 text-[10px] text-red-400">⚑ {projectContext.red_flags.length} red flag{projectContext.red_flags.length !== 1 ? "s" : ""} in Pass 0 output — see project record</div>
              )}
            </div>
          )}

          {/* Search */}
          <div className="flex gap-3 mb-6">
            <input value={sector} onChange={(e) => setSector(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && runAnalysis()}
              placeholder="Enter a sector or market..."
              className="flex-1 bg-surface-1 border border-[#1e2a3a] rounded-lg px-4 py-3 text-sm focus:border-accent outline-none" />
            <button onClick={runAnalysis} disabled={loading || !sector.trim() || !config.anthropicKey}
              className="bg-accent text-[#06080c] font-display font-bold text-xs tracking-wider uppercase px-6 rounded-lg disabled:opacity-40 hover:brightness-110 transition">
              {loading ? "Running..." : "Run ODI Analysis"}
            </button>
          </div>

          {/* Loading */}
          {(loading || stratDocBusy || adIntelBusy) && (
            <div className="bg-surface-1 border border-[#1e2a3a] rounded-lg px-4 py-3 mb-3 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-xs text-accent">{adIntelBusy ? adIntelPhase : stratDocBusy ? stratDocPhase : phase}</span>
            </div>
          )}

          {/* Debug log — visible during/after a run */}
          {debugLog.length > 0 && (
            <div className="bg-surface-1 border border-[#1e2a3a] rounded-lg mb-5 overflow-hidden">
              <div className="px-4 py-2 bg-surface-2 border-b border-[#1e2a3a] flex items-center justify-between">
                <span className="text-[9px] text-dim tracking-widest uppercase">Debug Log</span>
                <button
                  onClick={() => setDebugLog([])}
                  className="text-[9px] text-dim hover:text-accent tracking-widest uppercase">
                  Clear
                </button>
              </div>
              <div className="max-h-40 overflow-y-auto px-4 py-2 font-mono text-[10px] leading-relaxed">
                {debugLog.map((entry, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="text-dim shrink-0">{entry.ts}</span>
                    <span className={entry.level === "error" ? "text-red-400" : "text-[#e0ddd5]"}>{entry.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/25 rounded-lg px-4 py-3 mb-5 text-xs text-red-400">{error}</div>
          )}

          {/* Results */}
          {data && (
            <>
              {/* Summary bar */}
              <div className="flex items-center gap-6 mb-5 px-4 py-3 bg-surface-1 border border-[#1e2a3a] rounded-lg">
                <Stat label="Entry Points" value={entryRecs.length} color="#a78bfa" />
                <Stat label="Jobs Found" value={data.length} />
                <Stat label="Total Outcomes" value={allOutcomes.length} />
                <Stat label="Underserved (≥10)" value={underservedCount} color="#ef4444" />
                <Stat label="Search Provider" value={config.serpApiKey ? "SerpAPI" : "Claude est."} />
                {airtable && <Stat label="Saved" value="✓ Airtable" color="#22c55e" />}
              </div>

              {/* Job selector — hidden on Market Entry tab (cross-job view) */}
              {view !== "entry" && (
                <div className="flex gap-2 flex-wrap mb-4">
                  {data.map((j) => (
                    <button key={j.id || j.job_id}
                      onClick={() => setActiveJob(j.id || j.job_id)}
                      className={`px-3 py-1.5 text-[11px] rounded-full border transition ${(j.id || j.job_id) === activeJob
                        ? "bg-accent/10 border-accent text-accent"
                        : "border-[#1e2a3a] text-dim hover:border-accent hover:text-[#e0ddd5]"}`}>
                      {j.job_statement}
                    </button>
                  ))}
                </div>
              )}

              {/* View tabs */}
              <div className="flex gap-2 mb-5 flex-wrap">
                {[
                  ["entry", "⚡ Market Entry", "#a78bfa"],
                  ["adintel", "🎯 Ad-Intel", "#a78bfa"],
                  ["landscape", "Opportunity Landscape"],
                  ["jobmap", "Universal Job Map"],
                  ["needs", "All Need Types"],
                  ["volume", "Search Volume"],
                ].map(([k, label, customColor]) => {
                  const isActive = view === k;
                  const activeColor = customColor || "#c8a45c";
                  return (
                    <button key={k} onClick={() => setView(k)}
                      className="px-4 py-2 text-[10px] font-display font-semibold tracking-widest uppercase rounded-lg border transition"
                      style={{
                        borderColor: isActive ? activeColor : "#1e2a3a",
                        color: isActive ? activeColor : "#6a7585",
                        background: isActive ? `${activeColor}1a` : "transparent",
                      }}>
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* ═══ MARKET ENTRY RECOMMENDATIONS ═══ */}
              {view === "entry" && (
                <div className="space-y-4">
                  {entryRecs.length === 0 ? (
                    <div className="bg-surface-1 border border-[#1e2a3a] rounded-xl p-8 text-center">
                      <div className="text-[10px] tracking-widest uppercase mb-2" style={{ color: "#a78bfa" }}>⚡ Market Entry</div>
                      <p className="text-sm text-dim">
                        Entry recommendations couldn't be generated for this run.
                      </p>
                      <p className="text-[11px] text-dim mt-2">
                        Check the debug log above — Pass 4 is non-critical so analysis still completed.
                        You can still explore the other tabs.
                      </p>
                    </div>
                  ) : (
                    entryRecs.map((rec, i) => {
                      const info = strategyInfo(rec.strategy);
                      const signal = rec.estimated_market_signal || 0;
                      return (
                        <div key={i} className="bg-surface-1 border border-[#1e2a3a] rounded-xl overflow-hidden">
                          {/* Header */}
                          <div className="px-5 py-4 border-b border-[#1e2a3a] flex items-start justify-between gap-5">
                            <div className="flex items-start gap-4 flex-1 min-w-0">
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center font-display font-bold text-sm text-white shrink-0"
                                style={{ background: info.color }}>
                                {rec.rank || i + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-display text-sm font-bold tracking-wider" style={{ color: info.color }}>
                                    {info.icon} {rec.strategy?.toUpperCase()}
                                  </span>
                                </div>
                                <p className="text-[10px] text-dim mb-2">{info.description}</p>
                                <div className="text-sm font-display font-semibold text-[#e0ddd5] leading-snug">
                                  {rec.target_job}
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-[9px] text-dim tracking-widest uppercase">Market Signal</div>
                              <div className="font-display text-2xl font-bold" style={{ color: marketSignalColor(signal) }}>
                                {signal}
                              </div>
                              <div
                                className="text-[9px] tracking-widest uppercase mt-1 px-2 py-0.5 rounded inline-block"
                                style={{
                                  color: difficultyColor(rec.estimated_difficulty),
                                  background: `${difficultyColor(rec.estimated_difficulty)}1a`,
                                }}>
                                {rec.estimated_difficulty || "medium"} difficulty
                              </div>
                            </div>
                          </div>

                          {/* Body */}
                          <div className="px-5 py-4 space-y-5">
                            {/* Rationale */}
                            <div>
                              <div className="text-[9px] tracking-widest uppercase text-dim mb-2">Why This Entry Point</div>
                              <p className="text-[12px] leading-relaxed text-[#e0ddd5]">{rec.rationale}</p>
                            </div>

                            {/* Target outcomes */}
                            {rec.target_outcomes?.length > 0 && (
                              <div>
                                <div className="text-[9px] tracking-widest uppercase text-dim mb-2">Target Outcomes</div>
                                <div className="space-y-2">
                                  {rec.target_outcomes.map((o, oi) => (
                                    <div
                                      key={oi}
                                      className="text-[12px] leading-relaxed pl-3 border-l-2"
                                      style={{ borderColor: info.color }}>
                                      {o}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* 3-col grid: first move / belief change / risk */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                              <div className="bg-surface-2 border border-[#1e2a3a] rounded-lg p-3">
                                <div className="text-[9px] tracking-widest uppercase mb-2" style={{ color: "#22c55e" }}>
                                  First Move (Mode 2 Experiment)
                                </div>
                                <p className="text-[11px] leading-relaxed text-[#e0ddd5]">{rec.first_move || "—"}</p>
                              </div>
                              <div className="bg-surface-2 border border-[#1e2a3a] rounded-lg p-3">
                                <div className="text-[9px] tracking-widest uppercase mb-2" style={{ color: "#eab308" }}>
                                  Belief Change Required
                                </div>
                                <p className="text-[11px] leading-relaxed text-[#e0ddd5]">{rec.belief_change_required || "—"}</p>
                              </div>
                              <div className="bg-surface-2 border border-[#1e2a3a] rounded-lg p-3">
                                <div className="text-[9px] tracking-widest uppercase mb-2" style={{ color: "#ef4444" }}>
                                  Key Risk
                                </div>
                                <p className="text-[11px] leading-relaxed text-[#e0ddd5]">{rec.risk || "—"}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* ═══ AD-INTEL (Engine v1.7) ═══ */}
              {view === "adintel" && (
                <div className="space-y-4">
                  {!adIntelData ? (
                    <div className="bg-surface-1 border border-[#1e2a3a] rounded-xl p-8 text-center">
                      <div className="text-[10px] tracking-widest uppercase mb-2" style={{ color: "#a78bfa" }}>🎯 Ad-Intel</div>
                      <p className="text-sm text-dim mb-3">
                        Run the 4-stage ad-intel pipeline to score competitor ads and generate storyboard briefs
                        anchored to your underserved Ulwick outcomes.
                      </p>
                      <p className="text-[11px] text-dim mb-4">
                        Stage A · find 10 competitors (web_search) · Stage B · ingest active ads · Stage C · score with
                        Claude on 5 behavioral signals · Stage D · generate storyboard briefs using hook-affinity picker.
                      </p>
                      <button
                        onClick={runAdIntelHandler}
                        disabled={!data || adIntelBusy || loading}
                        className="bg-[#a78bfa]/10 border border-[#a78bfa]/40 text-[#a78bfa] px-5 py-2.5 rounded-lg text-xs font-display font-bold tracking-wider uppercase hover:bg-[#a78bfa]/20 transition disabled:opacity-40">
                        {adIntelBusy ? `↻ ${adIntelPhase}` : "🎯 Run Ad-Intel · 4 stages"}
                      </button>
                      {!data && (
                        <p className="text-[10px] text-dim mt-4">⓵ Run ODI Analysis first — Stage D needs underserved outcomes.</p>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Summary bar */}
                      <div className="flex items-center gap-6 px-4 py-3 bg-surface-1 border border-[#1e2a3a] rounded-lg">
                        <Stat label="Competitors" value={adIntelData.summary.competitor_count} color="#a78bfa" />
                        <Stat label="Ads Ingested" value={adIntelData.summary.ad_count} />
                        <Stat label="Scored" value={adIntelData.summary.tagged_count} color="#22c55e" />
                        <Stat label="Briefs" value={adIntelData.summary.brief_count} color="#c8a45c" />
                        <Stat label="Outcomes Addressed" value={adIntelData.summary.outcomes_addressed} color="#ef4444" />
                      </div>

                      {/* Stage A · Competitors */}
                      <div className="bg-surface-1 border border-[#1e2a3a] rounded-xl overflow-hidden">
                        <div className="px-5 py-3 border-b border-[#1e2a3a] flex items-baseline justify-between">
                          <h3 className="font-display text-sm font-semibold">Stage A · Competitors ({adIntelData.competitors.length})</h3>
                          <span className="text-[10px] text-dim tracking-widest uppercase">web_search verified</span>
                        </div>
                        <div className="divide-y divide-[#1e2a3a]">
                          {adIntelData.competitors.map((c, i) => {
                            const tierColor = c.classification === "direct" ? "#ef4444" : c.classification === "adjacent" ? "#eab308" : "#a78bfa";
                            return (
                              <div key={i} className="px-5 py-3 flex items-start gap-3">
                                <div
                                  className="text-[9px] tracking-widest uppercase font-display font-bold shrink-0 w-20"
                                  style={{ color: tierColor }}>
                                  {c.classification}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-baseline gap-2 mb-1">
                                    <span className="font-display text-sm font-semibold">{c.brand_name}</span>
                                    <span className="text-[10px] text-dim">{c.spend_tier || "—"}</span>
                                  </div>
                                  <p className="text-[11px] text-dim leading-relaxed">{c.evidence}</p>
                                  {c.page_url && (
                                    <a href={c.page_url} target="_blank" rel="noreferrer" className="text-[10px] text-accent hover:underline">{c.page_url}</a>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Stage C · Scored ads (top 8) */}
                      {adIntelData.ads.filter(a => a.tag_status === "tagged").length > 0 && (
                        <div className="bg-surface-1 border border-[#1e2a3a] rounded-xl overflow-hidden">
                          <div className="px-5 py-3 border-b border-[#1e2a3a] flex items-baseline justify-between">
                            <h3 className="font-display text-sm font-semibold">Stage C · Top Scored Ads</h3>
                            <span className="text-[10px] text-dim tracking-widest uppercase">5 behavioral signals · text-only eval</span>
                          </div>
                          <div className="divide-y divide-[#1e2a3a]">
                            {adIntelData.ads
                              .filter(a => a.tag_status === "tagged")
                              .sort((a, b) => (b.score_total || 0) - (a.score_total || 0))
                              .slice(0, 8)
                              .map((ad, i) => (
                                <div key={i} className="px-5 py-3">
                                  <div className="flex items-baseline justify-between gap-3 mb-1">
                                    <div className="flex items-baseline gap-2 min-w-0">
                                      <span className="font-display text-sm font-semibold truncate">{ad.brand_name}</span>
                                      <span className="text-[10px] text-dim tracking-widest uppercase">{ad.format}</span>
                                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#a78bfa]/15 text-[#a78bfa]">{ad.hook_type}</span>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <span className="font-display text-lg font-bold text-accent">{ad.score_total}</span>
                                      <span className="text-[9px] text-dim ml-1">/ 50</span>
                                    </div>
                                  </div>
                                  {ad.headline && <p className="text-[12px] leading-snug text-[#e0ddd5] mb-1">"{ad.headline}"</p>}
                                  {ad.copy_text && <p className="text-[11px] text-dim leading-relaxed line-clamp-2">{ad.copy_text}</p>}
                                  <div className="flex gap-3 mt-2 text-[10px] text-dim">
                                    <span>Aware {ad.awareness_level || "?"}/5</span>
                                    <span>Attn {ad.attention_capture || "?"}</span>
                                    <span>Mem {ad.memory_encoding || "?"}</span>
                                    <span>Brand {ad.brand_recall || "?"}</span>
                                    <span>Intent {ad.purchase_intent || "?"}</span>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Stage D · Creative Briefs */}
                      {adIntelData.briefs.length > 0 && (
                        <div className="bg-surface-1 border border-[#1e2a3a] rounded-xl overflow-hidden">
                          <div className="px-5 py-3 border-b border-[#1e2a3a] flex items-baseline justify-between">
                            <h3 className="font-display text-sm font-semibold">Stage D · Creative Briefs ({adIntelData.briefs.filter(b => b.status === "draft").length})</h3>
                            <span className="text-[10px] text-dim tracking-widest uppercase">hook-affinity picker · ready for Higgsfield</span>
                          </div>
                          <div className="divide-y divide-[#1e2a3a]">
                            {adIntelData.briefs.filter(b => b.status === "draft").map((b, i) => (
                              <div key={i} className="px-5 py-4">
                                <div className="flex items-baseline justify-between gap-3 mb-2">
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-[10px] tracking-widest uppercase text-[#a78bfa]">{b.source_angle_code}</span>
                                    <span className="text-[10px] text-dim">Job {b.source_outcome_job_id} · opp {b.source_outcome_score?.toFixed?.(1) ?? b.source_outcome_score}</span>
                                  </div>
                                  <span className="text-[10px] text-dim italic">via {b.linked_swipe_ad_brand} ({b.linked_swipe_ad_score})</span>
                                </div>
                                <p className="font-display text-[15px] leading-snug mb-2">"{b.hook}"</p>
                                <p className="text-[12px] text-dim leading-relaxed mb-3">{b.body}</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                  <div className="bg-surface-2 border border-[#1e2a3a] rounded p-2.5">
                                    <div className="text-[9px] tracking-widest uppercase text-dim mb-1">Belief to shift</div>
                                    <p className="text-[11px] leading-relaxed">{b.belief_to_shift}</p>
                                  </div>
                                  <div className="bg-surface-2 border border-[#1e2a3a] rounded p-2.5">
                                    <div className="text-[9px] tracking-widest uppercase text-dim mb-1">Evidence to use</div>
                                    <p className="text-[11px] leading-relaxed">{b.evidence_to_use}</p>
                                  </div>
                                </div>
                                {b.shot_list?.length > 0 && (
                                  <details className="text-[11px]">
                                    <summary className="text-[10px] tracking-widest uppercase text-accent cursor-pointer">Shot list ({b.shot_list.length})</summary>
                                    <ol className="mt-2 space-y-1 pl-3">
                                      {b.shot_list.map((shot, si) => <li key={si} className="text-dim leading-relaxed">{shot}</li>)}
                                    </ol>
                                  </details>
                                )}
                                <div className="flex items-center gap-2 mt-3 text-[10px]">
                                  <span className="px-2 py-0.5 rounded bg-surface-2 text-dim">{b.tool}</span>
                                  <span className="px-2 py-0.5 rounded bg-surface-2 text-dim">{b.format}</span>
                                  <span className="px-2 py-0.5 rounded bg-surface-2 text-dim">{b.duration_seconds}s</span>
                                  <span className="px-2 py-0.5 rounded bg-surface-2 text-accent">CTA · {b.cta}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <button
                        onClick={runAdIntelHandler}
                        disabled={adIntelBusy || loading}
                        className="w-full bg-[#a78bfa]/10 border border-[#a78bfa]/40 text-[#a78bfa] px-5 py-2.5 rounded-lg text-xs font-display font-bold tracking-wider uppercase hover:bg-[#a78bfa]/20 transition disabled:opacity-40">
                        {adIntelBusy ? "↻ Running…" : "↻ Re-run Ad-Intel"}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* ═══ OPPORTUNITY LANDSCAPE ═══ */}
              {view === "landscape" && activeJobData && (
                <div className="bg-surface-1 border border-[#1e2a3a] rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#1e2a3a] flex justify-between items-center">
                    <div>
                      <h3 className="font-display text-sm font-semibold">Opportunity Landscape</h3>
                      <p className="text-[10px] text-dim mt-0.5">Score = Importance + max(Importance − Satisfaction, 0) · ≥10 = underserved</p>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-dim tracking-widest uppercase">Search Signal</div>
                      <div className="font-display text-xl font-bold text-accent">{activeJobData.search_volume_signal || "—"}</div>
                      <div className="text-[10px]" style={{ color: trendColor(activeJobData.trend) }}>
                        {trendIcon(activeJobData.trend)} {activeJobData.trend || "unknown"}
                        {activeJobData.competition && ` · ${activeJobData.competition} comp`}
                      </div>
                    </div>
                  </div>

                  {/* Scatter */}
                  <div className="p-5">
                    <div className="relative w-full h-80 bg-surface-2 rounded-lg overflow-hidden">
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 text-[9px] text-dim tracking-widest uppercase whitespace-nowrap">Importance</div>
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] text-dim tracking-widest uppercase">Satisfaction</div>
                      {/* Underserved zone */}
                      <div className="absolute right-0 top-0 w-[35%] h-[50%] bg-red-500/5 border-l border-b border-dashed border-red-500/20">
                        <span className="absolute top-2 right-3 text-[9px] text-red-500/40 tracking-wider uppercase">Underserved</span>
                      </div>
                      <div className="absolute left-8 bottom-0 w-[35%] h-[40%] bg-green-500/5 border-r border-t border-dashed border-green-500/15">
                        <span className="absolute bottom-5 left-3 text-[9px] text-green-500/30 tracking-wider uppercase">Overserved</span>
                      </div>
                      {/* Dots */}
                      {(activeJobData.outcomes || []).map((o, i) => {
                        const x = 8 + ((o.satisfaction || 5) / 10) * 82;
                        const y = 5 + ((10 - (o.importance || 5)) / 10) * 82;
                        const s = o.opportunity_score || 0;
                        const size = Math.max(16, Math.min(30, s * 2));
                        return (
                          <div key={i} title={`${o.statement}\nImp: ${o.importance} Sat: ${o.satisfaction} Opp: ${s.toFixed(1)}`}
                            className="absolute rounded-full border-2 border-[#06080c] flex items-center justify-center cursor-pointer transition-all hover:scale-125 hover:z-10"
                            style={{
                              left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)",
                              width: size, height: size, background: oppColor(s), fontSize: 9, fontWeight: 700, color: "#06080c",
                            }}>
                            {s.toFixed(0)}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Table */}
                  <div className="border-t border-[#1e2a3a]">
                    <div className="grid grid-cols-[50px_1fr_60px_60px_70px] gap-3 px-4 py-2 bg-surface-2 text-[9px] text-dim tracking-widest uppercase">
                      <span>Opp</span><span>Desired Outcome</span><span className="text-center">Imp</span><span className="text-center">Sat</span><span className="text-center">Step</span>
                    </div>
                    {(activeJobData.outcomes || [])
                      .sort((a, b) => (b.opportunity_score || 0) - (a.opportunity_score || 0))
                      .map((o, i) => (
                        <div key={i} className="grid grid-cols-[50px_1fr_60px_60px_70px] gap-3 px-4 py-2.5 border-b border-[#1e2a3a] items-center hover:bg-surface-2 transition">
                          <div className="w-9 h-7 rounded flex items-center justify-center font-display text-xs font-bold"
                            style={{ background: oppColor(o.opportunity_score), color: "#06080c" }}>
                            {(o.opportunity_score || 0).toFixed(1)}
                          </div>
                          <span className="text-xs leading-relaxed">{o.statement}</span>
                          <span className="text-xs text-center text-accent">{o.importance}</span>
                          <span className="text-xs text-center" style={{ color: (o.satisfaction || 0) < 4 ? "#ef4444" : (o.satisfaction || 0) < 6 ? "#eab308" : "#22c55e" }}>
                            {o.satisfaction}
                          </span>
                          <span className="text-[10px] text-center text-cyan-400 bg-cyan-400/10 rounded px-1.5 py-0.5">{o.step}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* ═══ JOB MAP ═══ */}
              {view === "jobmap" && activeJobData && (
                <div className="bg-surface-1 border border-[#1e2a3a] rounded-xl p-5">
                  <h3 className="font-display text-sm font-semibold mb-1">Universal Job Map</h3>
                  <p className="text-xs text-dim mb-5">{activeJobData.job_statement}</p>
                  <div className="grid grid-cols-4 gap-3">
                    {STEPS.map((step, si) => {
                      const outs = (activeJobData.outcomes || []).filter((o) => o.step === step);
                      const desc = activeJobData.steps?.[step] || "";
                      return (
                        <div key={step} className={`bg-surface-2 rounded-lg p-4 border ${outs.length ? "border-accent/40" : "border-[#1e2a3a]"}`}>
                          <div className="text-[9px] text-accent tracking-widest uppercase mb-1">Step {si + 1}</div>
                          <div className="font-display text-sm font-bold mb-0.5">{step}</div>
                          <div className="text-[9px] text-dim mb-3">{STEP_VERBS[step]}</div>
                          {desc && <p className="text-[11px] text-dim leading-relaxed mb-3">{desc}</p>}
                          {outs.length > 0 && (
                            <div className="border-t border-[#1e2a3a] pt-2">
                              <div className="text-[9px] text-accent tracking-wider mb-2">OUTCOMES ({outs.length})</div>
                              {outs.map((o, oi) => (
                                <div key={oi} className="text-[10px] leading-relaxed mb-2 pl-2 border-l-2" style={{ borderColor: oppColor(o.opportunity_score) }}>
                                  {o.statement}
                                  <span className="font-bold ml-1" style={{ color: oppColor(o.opportunity_score) }}>{(o.opportunity_score || 0).toFixed(1)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ═══ NEED TYPES ═══ */}
              {view === "needs" && activeJobData && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 bg-surface-1 border border-[#1e2a3a] rounded-xl p-5">
                    <div className="text-[9px] text-accent tracking-widest uppercase mb-1">Core Functional Job</div>
                    <div className="font-display text-lg font-bold">{activeJobData.job_statement}</div>
                    <div className="text-xs text-dim mt-1">Executor: {activeJobData.job_executor}</div>
                    {activeJobData.evidence && <div className="text-[11px] text-dim mt-3 bg-surface-2 rounded-lg p-3">{activeJobData.evidence}</div>}
                  </div>
                  <NeedCard title="Related Jobs" items={activeJobData.related_jobs} color="#3b82f6" subtitle="Functional jobs done alongside the core job" />
                  <NeedCard title="Emotional Jobs" items={activeJobData.emotional_jobs} color="#eab308" subtitle="How they want to feel" />
                  <NeedCard title="Social Jobs" items={activeJobData.social_jobs} color="#06b6d4" subtitle="How they want to be perceived" />
                  <NeedCard title="Consumption Chain" items={activeJobData.consumption_chain_jobs} color="#84cc16" subtitle="Buy, setup, use, maintain, dispose" />
                </div>
              )}

              {/* ═══ SEARCH VOLUME ═══ */}
              {view === "volume" && activeJobData && (
                <div className="bg-surface-1 border border-[#1e2a3a] rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#1e2a3a]">
                    <h3 className="font-display text-sm font-semibold">Search Volume Data</h3>
                    <p className="text-[10px] text-dim mt-0.5">
                      {config.serpApiKey ? "Real data from SerpAPI" : "Estimated via Claude web search — connect SerpAPI for real volume"}
                    </p>
                  </div>

                  {/* Keywords table */}
                  <div className="grid grid-cols-[1fr_100px_80px_100px] gap-3 px-4 py-2 bg-surface-2 text-[9px] text-dim tracking-widest uppercase">
                    <span>Keyword</span><span className="text-center">Volume Signal</span><span className="text-center">CPC</span><span className="text-center">Competition</span>
                  </div>

                  {(activeJobData.search_queries || []).map((q, i) => {
                    const vol = searchVolumeData[q];
                    return (
                      <div key={i} className="grid grid-cols-[1fr_100px_80px_100px] gap-3 px-4 py-3 border-b border-[#1e2a3a] items-center hover:bg-surface-2">
                        <span className="text-xs">{q}</span>
                        <div className="text-center">
                          {vol ? (
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 h-1.5 rounded-full bg-white/5">
                                <div className="h-full rounded-full" style={{ width: `${vol.volume_signal}%`, background: oppColor(15 - vol.volume_signal / 10) }} />
                              </div>
                              <span className="text-[10px] text-accent">{vol.volume_signal}</span>
                            </div>
                          ) : <span className="text-[10px] text-dim">—</span>}
                        </div>
                        <span className="text-xs text-center text-dim">{vol?.cpc || "—"}</span>
                        <span className="text-xs text-center text-dim">{vol?.competition_index || "—"}</span>
                      </div>
                    );
                  })}

                  {/* Related keywords if available */}
                  {activeJobData.related_keywords?.length > 0 && (
                    <div className="px-5 py-4 border-t border-[#1e2a3a]">
                      <div className="text-[9px] text-accent tracking-widest uppercase mb-2">Related Keywords from Search</div>
                      <div className="flex flex-wrap gap-2">
                        {activeJobData.related_keywords.map((kw, i) => (
                          <span key={i} className="text-[11px] text-dim bg-surface-2 px-2.5 py-1 rounded-full border border-[#1e2a3a]">{kw}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {!config.serpApiKey && (
                    <div className="px-5 py-4 bg-amber-500/5 border-t border-amber-500/20">
                      <p className="text-xs text-amber-400">
                        ⚡ Connect SerpAPI ($50/mo) for real Google search volume, CPC, and competition data.
                        Click ⚙ Config to add your API key.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Footer */}
              {activeJobData?.top_keyword && (
                <div className="mt-4 px-4 py-3 bg-surface-1 border border-[#1e2a3a] rounded-lg flex justify-between text-[11px] text-dim">
                  <span><span className="text-accent">Top keyword:</span> {activeJobData.top_keyword}</span>
                  <span>{(activeJobData.outcomes || []).filter((o) => (o.opportunity_score || 0) >= 10).length} underserved outcomes</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div>
      <div className="text-[9px] text-dim tracking-widest uppercase">{label}</div>
      <div className="font-display text-sm font-bold" style={{ color: color || "#e0ddd5" }}>{value}</div>
    </div>
  );
}

function NeedCard({ title, items, color, subtitle }) {
  return (
    <div className="bg-surface-1 border border-[#1e2a3a] rounded-xl p-5">
      <div className="text-[9px] tracking-widest uppercase mb-1" style={{ color }}>{title}</div>
      <p className="text-[11px] text-dim mb-3">{subtitle}</p>
      {(items || []).map((item, i) => (
        <div key={i} className="text-xs leading-relaxed mb-2 pl-2.5 border-l-2" style={{ borderColor: color }}>{item}</div>
      ))}
      {(!items || items.length === 0) && <div className="text-[11px] text-dim">No data</div>}
    </div>
  );
}
