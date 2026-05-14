// src/lib/google-drive.js
//
// Public-folder Google Drive ingestion. The user shares a folder as
// "Anyone with the link" and pastes the folder URL into Project Setup;
// the engine lists children, downloads each (exporting Google-native
// types automatically), and hands the resulting File objects to the
// existing parseFile() pipeline.
//
// Auth: API key only (no OAuth this round). The user creates a free
// Google Cloud project, enables the Drive API, generates an API key,
// and pastes it into ⚙ Config as `googleDriveApiKey`. OAuth-based
// access to private folders is a v1.5 follow-up.
//
// Limits: recursive walk capped at depth 3 to prevent runaway; pageSize
// 100 per Drive page (we paginate). Files > 25 MB are skipped to keep
// the browser-side parse budget sane.

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const MAX_DEPTH = 3;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

// Google-native MIME types → export targets that the existing
// parse-files.js already understands.
const EXPORT_MIME = {
  "application/vnd.google-apps.document": {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ext: ".docx",
  },
  "application/vnd.google-apps.spreadsheet": {
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ext: ".xlsx",
  },
  "application/vnd.google-apps.presentation": {
    mime: "application/pdf",
    ext: ".pdf",
  },
  "application/vnd.google-apps.drawing": {
    mime: "image/png",
    ext: ".png",
  },
};

export function extractFolderId(url) {
  if (!url) return null;
  const trimmed = url.trim();
  // https://drive.google.com/drive/folders/FOLDER_ID(?usp=…)
  let m = trimmed.match(/\/folders\/([a-zA-Z0-9_-]{20,})/);
  if (m) return m[1];
  // https://drive.google.com/open?id=FOLDER_ID
  m = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
  if (m) return m[1];
  // Bare ID
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) return trimmed;
  return null;
}

// ── List children of a folder (paginated) ──
async function listFolderPage(folderId, apiKey, pageToken = null) {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id,name,mimeType,size,modifiedTime),nextPageToken",
    pageSize: "100",
    key: apiKey,
  });
  if (pageToken) params.set("pageToken", pageToken);
  const res = await fetch(`${DRIVE_API}/files?${params}`);
  if (!res.ok) {
    const body = (await res.text()).slice(0, 400);
    if (res.status === 404) throw new Error(`Folder ${folderId} not found. Is it shared as "Anyone with the link"?`);
    if (res.status === 403) throw new Error(`Drive API forbidden (${res.status}). Check that (a) Drive API is enabled in your Google Cloud project, (b) the API key has no IP/domain restrictions that exclude localhost, and (c) the folder is shared publicly.`);
    throw new Error(`Drive list ${res.status}: ${body}`);
  }
  return res.json();
}

async function listFolder(folderId, apiKey) {
  const items = [];
  let pageToken = null;
  do {
    const page = await listFolderPage(folderId, apiKey, pageToken);
    items.push(...(page.files || []));
    pageToken = page.nextPageToken;
  } while (pageToken);
  return items;
}

async function listFolderRecursive(folderId, apiKey, onProgress, depth = 0) {
  if (depth > MAX_DEPTH) return [];
  const items = await listFolder(folderId, apiKey);
  const out = [];
  for (const item of items) {
    if (item.mimeType === "application/vnd.google-apps.folder") {
      onProgress?.({ phase: "descending", folder: item.name, depth });
      const children = await listFolderRecursive(item.id, apiKey, onProgress, depth + 1);
      out.push(...children);
    } else {
      out.push(item);
    }
  }
  return out;
}

// ── Download one file as a File object ──
async function downloadFile(file, apiKey) {
  if (file.size && Number(file.size) > MAX_FILE_BYTES) {
    throw new Error(`skipped (${(Number(file.size) / 1024 / 1024).toFixed(1)} MB > 25 MB limit)`);
  }

  let url, finalName, finalType;
  const exportInfo = EXPORT_MIME[file.mimeType];
  if (exportInfo) {
    const params = new URLSearchParams({ mimeType: exportInfo.mime, key: apiKey });
    url = `${DRIVE_API}/files/${file.id}/export?${params}`;
    finalName = file.name + exportInfo.ext;
    finalType = exportInfo.mime;
  } else if (file.mimeType.startsWith("application/vnd.google-apps.")) {
    throw new Error(`unsupported Google-native type: ${file.mimeType}`);
  } else {
    url = `${DRIVE_API}/files/${file.id}?alt=media&key=${apiKey}`;
    finalName = file.name;
    finalType = file.mimeType;
  }

  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 403) throw new Error(`forbidden — file may have stricter sharing than the parent folder`);
    throw new Error(`HTTP ${res.status}`);
  }
  const blob = await res.blob();
  return new File([blob], finalName, { type: finalType });
}

// ── Public entry point ──
export async function ingestFolder(folderUrlOrId, apiKey, onProgress = () => {}) {
  const folderId = extractFolderId(folderUrlOrId);
  if (!folderId) throw new Error("Could not extract a folder ID from that input. Expected something like https://drive.google.com/drive/folders/XXXX or a bare ID.");
  if (!apiKey) throw new Error("Google Drive API key required. Paste one into ⚙ Config (see Drive setup steps in the docs).");

  onProgress({ phase: "listing", folderId });
  const items = await listFolderRecursive(folderId, apiKey, onProgress);
  onProgress({ phase: "found", count: items.length });

  if (items.length === 0) {
    return { files: [], skipped: [] };
  }

  const files = [];
  const skipped = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    onProgress({ phase: "downloading", current: i + 1, total: items.length, name: item.name });
    try {
      const file = await downloadFile(item, apiKey);
      files.push(file);
    } catch (e) {
      skipped.push({ name: item.name, reason: e.message });
    }
  }
  onProgress({ phase: "done", downloaded: files.length, skipped: skipped.length });
  return { files, skipped };
}
