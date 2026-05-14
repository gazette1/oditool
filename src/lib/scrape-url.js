// src/lib/scrape-url.js
//
// Browser-side URL scraping via Jina AI Reader. Returns clean markdown
// extracted from the page. CORS-friendly, free up to 1M tokens / month.
//
// Endpoint: https://r.jina.ai/<full-url>
// Docs: https://jina.ai/reader/
//
// Long-term: swap to Anthropic's web_fetch tool once stable.

const MAX_CONTENT_CHARS = 60000; // hard cap on what we send to the summarizer

export async function scrapeUrl(url, { headerKey = null } = {}) {
  if (!url || !url.trim()) return { url, content: "", error: "no url provided" };
  let normalized = url.trim();
  if (!/^https?:\/\//i.test(normalized)) normalized = "https://" + normalized;

  const reader = `https://r.jina.ai/${normalized}`;
  const headers = { Accept: "text/markdown" };
  // Optional Jina API key for higher rate limits — not required for the free tier.
  if (headerKey) headers["Authorization"] = `Bearer ${headerKey}`;

  try {
    const res = await fetch(reader, { headers });
    if (!res.ok) {
      return { url: normalized, content: "", error: `Jina ${res.status}: ${(await res.text()).slice(0, 200)}` };
    }
    const text = await res.text();
    const truncated = text.length > MAX_CONTENT_CHARS;
    return {
      url: normalized,
      content: truncated ? text.slice(0, MAX_CONTENT_CHARS) + `\n\n[…truncated from ${text.length} chars]` : text,
      truncated,
      byteSize: text.length,
      error: null,
    };
  } catch (e) {
    return { url: normalized, content: "", error: e.message };
  }
}

// Scrape multiple URLs in sequence (sequential to respect Jina rate limits).
export async function scrapeUrls(urls, onProgress = () => {}) {
  const list = (urls || []).filter(u => u && u.trim());
  const results = [];
  for (let i = 0; i < list.length; i++) {
    onProgress(i, list.length, list[i]);
    results.push(await scrapeUrl(list[i]));
  }
  onProgress(list.length, list.length, null);
  return results;
}
