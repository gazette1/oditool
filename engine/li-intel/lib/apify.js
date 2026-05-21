/**
 * Apify client wrapper for the LI-Intel pipeline.
 *
 * Vendored into the engine at engine/li-intel/lib/apify.js on v1.7.5
 * (2026-05-21). Adjusted to read APIFY_TOKEN from the engine's repo-root
 * `.env.local` instead of the source-folder `.env`.
 *
 * Actors used downstream:
 *   - supreme_coder~linkedin-post              (scrape-posts.js)
 *   - harvestapi~linkedin-post-reactions       (scrape-engagers.js · Phase A)
 *   - harvestapi~linkedin-post-comments        (scrape-engagers.js · Phase A)
 *   - apimaestro~linkedin-profile-detail       (scrape-engagers.js · Phase B)
 *
 * Uses run-sync-get-dataset-items for simplicity (blocks until done).
 * For long-running scrapes (>5 min), switch to run-then-poll pattern.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env.local') });

const APIFY_TOKEN = process.env.APIFY_TOKEN;

if (!APIFY_TOKEN) {
  console.error('Missing APIFY_TOKEN in .env.local');
  process.exit(1);
}

const APIFY_BASE = 'https://api.apify.com/v2/acts';

/**
 * Run an Apify actor synchronously and return the dataset items.
 */
async function runActor(actorId, input, { timeoutSecs = 300 } = {}) {
  const url = `${APIFY_BASE}/${actorId}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=${timeoutSecs}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Apify ${actorId} failed (${response.status}): ${text.slice(0, 200)}`);
  }

  return response.json();
}

module.exports = { runActor };
