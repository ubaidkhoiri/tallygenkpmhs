const BASE = "https://api.tally.so";
const VERSION = "2025-02-01";

export const FIELD_IDS = {
  nama: "KP1EAA",
  desa: "LEprBj",
  kelompok: "p0OEXq",
  data: "1bVezQ",
  persetujuan: "MrR4lp",
};

export async function tallyFetch(path, { apiKey, timeoutMs = 15000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, {
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${apiKey}`, "tally-version": VERSION },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const err = new Error(`tally ${res.status} ${path}`);
      err.status = res.status;
      err.body = body.slice(0, 500);
      throw err;
    }
    return res.json();
  } finally {
    clearTimeout(t);
  }
}

export async function listSubmissions({ formId, apiKey, filter = "completed", limit = 100, onPage } = {}) {
  const out = [];
  let page = 1;
  for (;;) {
    const q = new URLSearchParams({ page: String(page), limit: String(Math.min(limit, 500)), filter });
    const data = await tallyFetch(`/forms/${formId}/submissions?${q}`, { apiKey });
    out.push(...(data.submissions ?? []));
    onPage?.(page, data.submissions?.length ?? 0, data.totalNumberOfSubmissionsPerFilter);
    if (!data.hasMore) break;
    page += 1;
  }
  return out;
}
