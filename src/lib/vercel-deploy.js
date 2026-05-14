// src/lib/vercel-deploy.js
//
// Engine v1.6.8 · optional Vercel deploy hook.
//
// Takes a finished strategy-doc HTML string and POSTs it to Vercel's
// /v13/deployments API as a single-file static deployment. Returns the
// public *.vercel.app URL or null if the token isn't configured.
//
// Token + team-ID are read from VITE_VERCEL_TOKEN / VITE_VERCEL_TEAM_ID
// in `.env.local`. Both are optional — when missing, the deploy step is
// silently skipped and the local-download path remains the default.
//
// SECURITY NOTE: deployments land on the Hobby tier which doesn't gate
// production URLs (we hit this limit in v1.6.4 hosting attempts). The
// resulting URL is technically public · only the random slug protects
// it. Surface this to the user via the share-button copy.

const VERCEL_API = "https://api.vercel.com";

export function isVercelDeployConfigured() {
  return !!(import.meta.env.VITE_VERCEL_TOKEN && import.meta.env.VITE_VERCEL_TOKEN.trim());
}

/**
 * Deploy a single HTML string to Vercel.
 * @param {string} html · the full strategy-doc HTML
 * @param {object} opts
 * @param {string} [opts.projectName] · target project name, defaults to "oditool-decks"
 * @param {string} [opts.slug] · subpath / filename hint, defaults to "index"
 * @returns {Promise<{ url: string, deploymentId: string, inspectorUrl: string }>}
 */
export async function deployStrategyDoc(html, { projectName = "oditool-decks", slug = "index" } = {}) {
  const token = import.meta.env.VITE_VERCEL_TOKEN;
  const teamId = import.meta.env.VITE_VERCEL_TEAM_ID;
  if (!token) throw new Error("VITE_VERCEL_TOKEN not set in .env.local — Vercel deploy disabled");

  const url = `${VERCEL_API}/v13/deployments${teamId ? `?teamId=${encodeURIComponent(teamId)}` : ""}`;

  const body = {
    name: projectName,
    files: [
      {
        file: "index.html",
        data: html,
        encoding: "utf-8",
      },
    ],
    projectSettings: {
      framework: null,
      buildCommand: null,
      installCommand: null,
      outputDirectory: null,
    },
    target: "production",
    // Add a deployment-level meta tag so the user can find this in the
    // Vercel dashboard later by slug.
    meta: { slug },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `Vercel deploy ${res.status}: ${err.error?.message || res.statusText}`
    );
  }

  const data = await res.json();
  return {
    url: data.url ? `https://${data.url}` : null,
    deploymentId: data.id || data.uid || null,
    inspectorUrl: data.inspectorUrl || null,
  };
}
