// src/lib/parse-files.js
//
// Browser-side file parsers for the Project Setup ingest flow.
// Takes File objects from drag-drop or file input, returns
// { fileName, type, text, byteSize, error? }.
//
// Supported: PDF, DOCX, XLSX/CSV/TSV, TXT/MD/JSON, images (stored as
// reference with a base64 thumbnail; no OCR yet).
//
// Heavyweight libs (pdfjs, mammoth, xlsx) load lazily so the main
// bundle stays light.

const MIME_TO_KIND = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xlsx",
  "text/csv": "csv",
  "text/tab-separated-values": "tsv",
  "text/plain": "text",
  "text/markdown": "text",
  "application/json": "json",
};

function kindFor(file) {
  if (MIME_TO_KIND[file.type]) return MIME_TO_KIND[file.type];
  const ext = file.name.toLowerCase().split(".").pop();
  if (["pdf"].includes(ext)) return "pdf";
  if (["docx", "doc"].includes(ext)) return "docx";
  if (["xlsx", "xls"].includes(ext)) return "xlsx";
  if (["csv"].includes(ext)) return "csv";
  if (["tsv"].includes(ext)) return "tsv";
  if (["txt", "md", "markdown"].includes(ext)) return "text";
  if (["json"].includes(ext)) return "json";
  if (file.type.startsWith("image/")) return "image";
  return "unknown";
}

async function parsePdf(file) {
  const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = (await import("pdfjs-dist/build/pdf.worker.mjs?url")).default;
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const pages = [];
  const maxPages = Math.min(doc.numPages, 50); // cap to prevent runaway
  for (let i = 1; i <= maxPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map(it => it.str).join(" "));
  }
  return pages.join("\n\n");
}

async function parseDocx(file) {
  const mammoth = await import("mammoth/mammoth.browser.js");
  const buf = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  return result.value;
}

async function parseXlsx(file) {
  const xlsx = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = xlsx.read(buf, { type: "array" });
  const sheets = [];
  for (const name of wb.SheetNames) {
    sheets.push(`# Sheet: ${name}\n` + xlsx.utils.sheet_to_csv(wb.Sheets[name]));
  }
  return sheets.join("\n\n");
}

async function parseText(file) {
  return await file.text();
}

async function parseImage(file) {
  // No OCR yet. Return a thumbnail data URL + minimal metadata so
  // the summarizer can at least know the image is there.
  const dataUrl = await new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.readAsDataURL(file);
  });
  return `[image: ${file.name} · ${file.type} · ${(file.size/1024).toFixed(0)}KB · thumbnail data-url available]`;
}

export async function parseFile(file) {
  const kind = kindFor(file);
  const base = { fileName: file.name, kind, byteSize: file.size };
  try {
    let text = "";
    if (kind === "pdf") text = await parsePdf(file);
    else if (kind === "docx") text = await parseDocx(file);
    else if (kind === "xlsx") text = await parseXlsx(file);
    else if (kind === "text" || kind === "json" || kind === "csv" || kind === "tsv") text = await parseText(file);
    else if (kind === "image") text = await parseImage(file);
    else text = `[unsupported file type: ${file.name}]`;

    // Truncate very long texts to keep summarizer prompts in budget.
    const MAX_CHARS = 30000;
    const truncated = text.length > MAX_CHARS;
    if (truncated) text = text.slice(0, MAX_CHARS) + `\n\n[…truncated from ${text.length} chars]`;

    return { ...base, text, truncated, error: null };
  } catch (e) {
    return { ...base, text: "", error: e.message };
  }
}

export async function parseFiles(fileList, onProgress = () => {}) {
  const files = Array.from(fileList);
  const results = [];
  for (let i = 0; i < files.length; i++) {
    onProgress(i, files.length, files[i].name);
    const parsed = await parseFile(files[i]);
    results.push(parsed);
  }
  onProgress(files.length, files.length, null);
  return results;
}
