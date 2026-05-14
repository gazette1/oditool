// src/ProjectSetup.jsx
//
// Engine v1.4 — Project Setup view. Drop a folder of files + paste a URL,
// click Ingest, and the engine produces a Project Context (Pass 0) that
// downstream phases read from. Replaces the "type a sector string per run"
// pattern with a single ingestion that flows through every pass.

import { useState, useCallback } from "react";
import { parseFiles } from "./lib/parse-files";
import { scrapeUrl } from "./lib/scrape-url";
import { summarizeProjectContext } from "./lib/anthropic";
import { AirtableClient } from "./lib/airtable";
import { ingestFolder } from "./lib/google-drive";

export default function ProjectSetup({ config, onProjectReady, onCancel }) {
  const [files, setFiles] = useState([]);
  const [parsedFiles, setParsedFiles] = useState([]);
  const [url, setUrl] = useState("");
  const [scraped, setScraped] = useState(null);
  const [projectName, setProjectName] = useState("");
  const [contextSummary, setContextSummary] = useState(null);
  const [phase, setPhase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [driveUrl, setDriveUrl] = useState("");
  const [driveSkipped, setDriveSkipped] = useState([]);

  // ── Drop / pick handlers ──
  const handleFiles = useCallback(async (fileList) => {
    if (!fileList || !fileList.length) return;
    setFiles(Array.from(fileList));
    setBusy(true);
    setPhase("Parsing files…");
    setError(null);
    try {
      const parsed = await parseFiles(fileList, (i, total, name) => {
        setPhase(`Parsing ${i + 1}/${total}: ${name || "done"}`);
      });
      setParsedFiles(parsed);
      setPhase(`Parsed ${parsed.length} files. ${parsed.filter(f => !f.error).length} OK, ${parsed.filter(f => f.error).length} errored.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    const dt = e.dataTransfer;
    if (dt.items) {
      // Walk items to support folder drops
      const all = [];
      for (let i = 0; i < dt.items.length; i++) {
        const f = dt.items[i].getAsFile();
        if (f) all.push(f);
      }
      if (all.length) handleFiles(all);
    } else if (dt.files) {
      handleFiles(dt.files);
    }
  }, [handleFiles]);

  // ── Pull from Google Drive folder ──
  const handleDrivePull = useCallback(async () => {
    if (!driveUrl.trim()) return;
    if (!config.googleDriveApiKey) {
      setError("Google Drive API key required. Paste one into ⚙ Config (see step-by-step in the Drive panel below).");
      return;
    }
    setBusy(true);
    setError(null);
    setDriveSkipped([]);
    setPhase("Listing folder contents…");
    try {
      const { files: driveFiles, skipped } = await ingestFolder(
        driveUrl,
        config.googleDriveApiKey,
        (p) => {
          if (p.phase === "listing") setPhase(`Listing folder ${p.folderId}…`);
          else if (p.phase === "descending") setPhase(`Descending into ${p.folder} (depth ${p.depth + 1})…`);
          else if (p.phase === "found") setPhase(`Found ${p.count} files. Downloading…`);
          else if (p.phase === "downloading") setPhase(`Downloading ${p.current}/${p.total}: ${p.name}`);
          else if (p.phase === "done") setPhase(`Downloaded ${p.downloaded} files (${p.skipped} skipped). Parsing…`);
        }
      );
      setDriveSkipped(skipped);
      if (driveFiles.length > 0) {
        // Feed straight into the existing parse pipeline
        await handleFiles(driveFiles);
      } else {
        setPhase("No usable files found in folder.");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, [driveUrl, config.googleDriveApiKey, handleFiles]);

  // ── Scrape URL ──
  const handleScrape = useCallback(async () => {
    if (!url.trim()) return;
    setBusy(true);
    setPhase(`Scraping ${url} via Jina Reader…`);
    setError(null);
    try {
      const result = await scrapeUrl(url);
      setScraped(result);
      if (result.error) setError(`URL scrape: ${result.error}`);
      else setPhase(`Scraped ${(result.byteSize / 1024).toFixed(1)}KB from ${result.url}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, [url]);

  // ── Summarize (Pass 0) ──
  const handleSummarize = useCallback(async () => {
    if (!config.anthropicKey) { setError("Anthropic API key required (⚙ Config)"); return; }
    if (!parsedFiles.length && !scraped) { setError("Drop files or scrape a URL first"); return; }
    setBusy(true);
    setPhase("Pass 0: synthesizing Project Context via Claude…");
    setError(null);
    try {
      const inputs = {
        files: parsedFiles.filter(f => f.text && f.text.length > 0).map(f => ({
          fileName: f.fileName, kind: f.kind, text: f.text,
        })),
        urls: scraped && scraped.content ? [{ url: scraped.url, content: scraped.content }] : [],
      };
      const summary = await summarizeProjectContext(config.anthropicKey, inputs);
      setContextSummary(summary);
      // Pre-fill the project name from the summary if not set
      if (!projectName && summary.sector) {
        setProjectName(summary.sector.split(/[.,—]/)[0].slice(0, 60));
      }
      setPhase(`Pass 0 complete. ${summary.key_facts?.length || 0} key facts, ${summary.positioning_hints?.length || 0} positioning hints.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, [parsedFiles, scraped, projectName, config.anthropicKey]);

  // ── Save to Airtable + hand off ──
  const handleSaveProject = useCallback(async () => {
    if (!contextSummary) { setError("Run Pass 0 first"); return; }
    if (!config.airtableKey || !config.airtableBaseId) { setError("Airtable not configured (⚙ Config)"); return; }
    setBusy(true);
    setPhase("Saving Project to Airtable…");
    setError(null);
    try {
      const client = new AirtableClient(config.airtableKey, config.airtableBaseId);
      const project = await client.createProject({
        name: projectName || "Untitled Project",
        sector: contextSummary.sector,
        audience: contextSummary.audience,
        productContext: contextSummary.product_context,
        contextSummary,
        sourceUrls: [
          ...(scraped?.url ? [scraped.url] : []),
          ...parsedFiles.map(f => `file: ${f.fileName}`),
        ],
      });
      setPhase(`Saved as Project ${project.airtableId}.`);
      onProjectReady({ project, contextSummary });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, [contextSummary, projectName, scraped, parsedFiles, config, onProjectReady]);

  return (
    <div className="min-h-screen" style={{ background: "#06080c", color: "#e0ddd5", fontFamily: "'IBM Plex Mono', monospace" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 32px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 32, borderBottom: "1px solid #1e2a3a", paddingBottom: 24 }}>
          <div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#c8a45c", marginBottom: 6 }}>
              · Alchemical Growth Engine · Project Setup · v1.4
            </div>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 36, fontWeight: 700, letterSpacing: "-0.015em" }}>
              Drop. Paste. Ingest.
            </h1>
            <p style={{ color: "#a09989", marginTop: 8, fontSize: 13, maxWidth: 580 }}>
              Drop a folder of brand files + paste the brand's URL. The engine extracts the context once and feeds it through every downstream phase. No more retyping the sector for each pass.
            </p>
          </div>
          <button onClick={onCancel} disabled={busy}
            style={{ background: "transparent", border: "1px solid #1e2a3a", color: "#a09989", padding: "8px 16px", borderRadius: 6, fontFamily: "inherit", fontSize: 10, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", cursor: busy ? "not-allowed" : "pointer" }}>
            Cancel
          </button>
        </div>

        {/* Step 1: File drop */}
        <Section step="01" title="Drop files">
          <div
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            style={{
              border: `2px dashed ${dragActive ? "#c8a45c" : "#1e2a3a"}`,
              borderRadius: 10,
              padding: "40px 24px",
              textAlign: "center",
              background: dragActive ? "rgba(200,164,92,0.06)" : "#0d1117",
              transition: "all 200ms cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
              {dragActive ? "Release to add files" : "Drag a folder here, or click below"}
            </div>
            <div style={{ color: "#6a7585", fontSize: 11, marginBottom: 16 }}>
              PDF · DOCX · XLSX · CSV · TXT · MD · JSON · images (OCR deferred to v1.5)
            </div>
            <input
              type="file"
              multiple
              webkitdirectory=""
              onChange={(e) => handleFiles(e.target.files)}
              style={{ display: "none" }}
              id="files-input"
            />
            <input
              type="file"
              multiple
              onChange={(e) => handleFiles(e.target.files)}
              style={{ display: "none" }}
              id="files-input-loose"
            />
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <label htmlFor="files-input-loose"
                style={{ background: "#c8a45c", color: "#06080c", padding: "10px 20px", borderRadius: 6, fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", cursor: "pointer" }}>
                Pick files
              </label>
              <label htmlFor="files-input"
                style={{ background: "transparent", border: "1px solid #1e2a3a", color: "#e0ddd5", padding: "10px 20px", borderRadius: 6, fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", cursor: "pointer" }}>
                Pick folder
              </label>
            </div>
          </div>

          {parsedFiles.length > 0 && (
            <div style={{ marginTop: 16, background: "#0d1117", border: "1px solid #1e2a3a", borderRadius: 8, padding: "8px 0" }}>
              {parsedFiles.map((f, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 1fr", gap: 12, padding: "8px 20px", borderBottom: i < parsedFiles.length - 1 ? "1px solid #1e2a3a" : "none", fontSize: 11 }}>
                  <span style={{ color: "#e0ddd5" }}>{f.fileName}</span>
                  <span style={{ color: "#c8a45c", letterSpacing: "0.18em", textTransform: "uppercase", fontSize: 9 }}>{f.kind}</span>
                  <span style={{ color: "#6a7585", textAlign: "right" }}>{(f.byteSize/1024).toFixed(0)} KB</span>
                  <span style={{ color: f.error ? "#ef4444" : "#6E8C5B", textAlign: "right", fontSize: 10 }}>{f.error || `${(f.text?.length || 0).toLocaleString()} chars`}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Step 1b: Google Drive folder */}
        <Section step="01b" title="…or pull from a Google Drive folder">
          <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
            <input
              type="url"
              value={driveUrl}
              onChange={(e) => setDriveUrl(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
              disabled={busy}
              style={{ flex: 1, background: "#0d1117", border: "1px solid #1e2a3a", borderRadius: 6, padding: "12px 16px", color: "#e0ddd5", fontFamily: "inherit", fontSize: 13 }}
            />
            <button onClick={handleDrivePull} disabled={busy || !driveUrl.trim()}
              style={{ background: "transparent", border: "1px solid #1e2a3a", color: "#e0ddd5", padding: "12px 20px", borderRadius: 6, fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", cursor: busy || !driveUrl.trim() ? "not-allowed" : "pointer", opacity: busy || !driveUrl.trim() ? 0.4 : 1 }}>
              Pull from Drive
            </button>
          </div>

          {driveSkipped.length > 0 && (
            <div style={{ padding: "10px 14px", background: "rgba(201,122,61,0.1)", border: "1px solid rgba(201,122,61,0.3)", borderRadius: 6, fontSize: 11, color: "#C97A3D", marginBottom: 12 }}>
              {driveSkipped.length} file{driveSkipped.length !== 1 ? "s" : ""} skipped:
              <ul style={{ marginTop: 6, paddingLeft: 16, listStyle: "disc", color: "#a09989" }}>
                {driveSkipped.slice(0, 8).map((s, i) => <li key={i}>{s.name} — {s.reason}</li>)}
                {driveSkipped.length > 8 && <li>…and {driveSkipped.length - 8} more</li>}
              </ul>
            </div>
          )}

          {!config.googleDriveApiKey && (
            <details style={{ marginTop: 8, padding: "12px 16px", background: "#0d1117", border: "1px solid #1e2a3a", borderRadius: 6, fontSize: 11 }}>
              <summary style={{ cursor: "pointer", color: "#c8a45c", fontWeight: 600, letterSpacing: "0.05em" }}>
                ⚙ Drive setup steps (one-time, ~3 minutes)
              </summary>
              <ol style={{ marginTop: 10, paddingLeft: 18, color: "#a09989", lineHeight: 1.8 }}>
                <li>Go to <a href="https://console.cloud.google.com" target="_blank" style={{ color: "#c8a45c" }}>console.cloud.google.com</a> and create a project (or pick existing)</li>
                <li>APIs &amp; Services → Library → search "Google Drive API" → click <strong>Enable</strong></li>
                <li>APIs &amp; Services → Credentials → <strong>Create Credentials</strong> → API key</li>
                <li>Copy the key, paste it into ⚙ Config in this app as <code style={{ background: "#1c2536", padding: "1px 5px", borderRadius: 3 }}>GOOGLE_DRIVE_API_KEY</code></li>
                <li>In Drive, right-click the folder you want to ingest → Share → <strong>Anyone with the link can view</strong></li>
                <li>Copy the folder URL, paste here, click Pull</li>
              </ol>
              <p style={{ marginTop: 10, color: "#6a7585", fontSize: 10 }}>
                Limits: depth 3 recursion, 25MB per file, Google Docs / Sheets / Slides export automatically (to DOCX / XLSX / PDF respectively). Private folders need OAuth — v1.5 work.
              </p>
            </details>
          )}
        </Section>

        {/* Step 2: URL */}
        <Section step="02" title="Paste a URL">
          <div style={{ display: "flex", gap: 12 }}>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://sirajbeauty.com"
              disabled={busy}
              style={{ flex: 1, background: "#0d1117", border: "1px solid #1e2a3a", borderRadius: 6, padding: "12px 16px", color: "#e0ddd5", fontFamily: "inherit", fontSize: 13 }}
            />
            <button onClick={handleScrape} disabled={busy || !url.trim()}
              style={{ background: "transparent", border: "1px solid #1e2a3a", color: "#e0ddd5", padding: "12px 20px", borderRadius: 6, fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", cursor: busy || !url.trim() ? "not-allowed" : "pointer", opacity: busy || !url.trim() ? 0.4 : 1 }}>
              Scrape
            </button>
          </div>
          {scraped && !scraped.error && (
            <div style={{ marginTop: 12, padding: "12px 16px", background: "rgba(110,140,91,0.1)", border: "1px solid rgba(110,140,91,0.3)", borderRadius: 6, fontSize: 11 }}>
              ✓ {(scraped.byteSize / 1024).toFixed(1)} KB markdown extracted from <code>{scraped.url}</code>
              {scraped.truncated && <span style={{ color: "#c8a45c", marginLeft: 8 }}>(truncated)</span>}
            </div>
          )}
          {scraped?.error && (
            <div style={{ marginTop: 12, padding: "12px 16px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, fontSize: 11, color: "#ef4444" }}>
              {scraped.error}
            </div>
          )}
        </Section>

        {/* Step 3: Ingest (Pass 0) */}
        <Section step="03" title="Run Pass 0 · Synthesize Context">
          <button onClick={handleSummarize}
            disabled={busy || (!parsedFiles.length && !scraped) || !config.anthropicKey}
            style={{ background: "#c8a45c", color: "#06080c", padding: "14px 28px", borderRadius: 6, fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", cursor: busy ? "not-allowed" : "pointer", opacity: busy || (!parsedFiles.length && !scraped) || !config.anthropicKey ? 0.4 : 1, border: "none" }}>
            {busy ? "Working…" : "Ingest Context"}
          </button>
          {contextSummary && (
            <div style={{ marginTop: 20, background: "#0d1117", border: "1px solid #1e2a3a", borderRadius: 10, padding: 24 }}>
              <ContextField label="Sector" value={contextSummary.sector} />
              <ContextField label="Audience" value={contextSummary.audience} />
              <ContextField label="Product context" value={contextSummary.product_context} />
              <ContextField label="Brand voice" value={contextSummary.brand_voice} />
              <ContextField label="Key facts" value={contextSummary.key_facts} />
              <ContextField label="Positioning hints" value={contextSummary.positioning_hints} />
              <ContextField label="Red flags" value={contextSummary.red_flags} warning />
              <ContextField label="Sources" value={contextSummary.sources} />
            </div>
          )}
        </Section>

        {/* Step 4: Save + hand off */}
        {contextSummary && (
          <Section step="04" title="Save Project + run analysis">
            <div style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Project name"
                disabled={busy}
                style={{ flex: 1, background: "#0d1117", border: "1px solid #1e2a3a", borderRadius: 6, padding: "12px 16px", color: "#e0ddd5", fontFamily: "inherit", fontSize: 13 }}
              />
              <button onClick={handleSaveProject} disabled={busy || !projectName.trim()}
                style={{ background: "#c8a45c", color: "#06080c", padding: "12px 24px", borderRadius: 6, fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", cursor: busy ? "not-allowed" : "pointer", opacity: busy || !projectName.trim() ? 0.4 : 1, border: "none" }}>
                Save & Continue
              </button>
            </div>
          </Section>
        )}

        {/* Status */}
        {(busy || phase || error) && (
          <div style={{ position: "fixed", bottom: 24, left: 24, right: 24, maxWidth: 680, margin: "0 auto", padding: "12px 20px", background: "#0d1117", border: "1px solid #1e2a3a", borderRadius: 8, fontSize: 12, display: "flex", alignItems: "center", gap: 12 }}>
            {busy && <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#c8a45c", animation: "pulse 1800ms infinite" }}></span>}
            <span style={{ color: error ? "#ef4444" : "#c8a45c" }}>{error || phase}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ step, title, children }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: "0.22em", color: "#6a7585" }}>§ {step}</span>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 600, color: "#e0ddd5" }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function ContextField({ label, value, warning }) {
  if (!value || (Array.isArray(value) && !value.length)) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 16, padding: "10px 0", borderBottom: "1px solid #1e2a3a", fontSize: 12 }}>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: warning ? "#ef4444" : "#6a7585" }}>{label}</span>
      <span style={{ color: "#e0ddd5", lineHeight: 1.6 }}>
        {Array.isArray(value)
          ? value.map((v, i) => <div key={i} style={{ paddingLeft: 12, position: "relative" }}><span style={{ position: "absolute", left: 0, color: "#c8a45c" }}>·</span> {v}</div>)
          : value}
      </span>
    </div>
  );
}
