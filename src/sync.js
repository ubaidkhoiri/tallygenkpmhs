import { FIELD_IDS, listSubmissions } from "./tally.js";
import { normalizeSubmission } from "./normalize.js";

// Upsert idempoten: tulis hanya bila submission baru atau hash berubah.
// Return "inserted" | "updated" | "skipped".
export async function upsertSubmission(sql, raw) {
  const r = normalizeSubmission(raw, FIELD_IDS);
  const existing = await sql`SELECT payload_hash FROM submissions WHERE id = ${r.id}`;
  if (existing.length > 0 && existing[0].payload_hash === r.payloadHash) return "skipped";
  const mode = existing.length > 0 ? "updated" : "inserted";
  await sql`INSERT INTO submissions
    (id, form_id, submitted_at, nama_pengirim, desa_raw, kelompok_raw, desa_norm, kelompok_norm, data_mahasiswa, confirmed, payload_hash, raw_json, updated_at)
    VALUES (${r.id}, ${r.formId}, ${r.submittedAt}, ${r.nama}, ${r.desaRaw}, ${r.kelompokRaw}, ${r.villageId}, ${r.groupId}, ${r.dataMahasiswa}, ${r.confirmed}, ${r.payloadHash}, ${JSON.stringify(raw)}, now())
    ON CONFLICT (id) DO UPDATE SET
      submitted_at = EXCLUDED.submitted_at, nama_pengirim = EXCLUDED.nama_pengirim,
      desa_raw = EXCLUDED.desa_raw, kelompok_raw = EXCLUDED.kelompok_raw,
      desa_norm = EXCLUDED.desa_norm, kelompok_norm = EXCLUDED.kelompok_norm,
      data_mahasiswa = EXCLUDED.data_mahasiswa, confirmed = EXCLUDED.confirmed,
      payload_hash = EXCLUDED.payload_hash, raw_json = EXCLUDED.raw_json, updated_at = now()`;
  return mode;
}

export async function isDeleted(sql, id) {
  const rows = await sql`SELECT 1 FROM deleted_submissions WHERE submission_id = ${id} LIMIT 1`;
  return rows.length > 0;
}

// Reconcile penuh dari Tally. Pin MOD tak tersentuh karena pin hanya dibaca di layer dashboard.
// Id di deleted_submissions dilewati agar hapus MOD permanen.
export async function reconcileAll(sql, { formId, apiKey }) {
  const subs = await listSubmissions({ formId, apiKey });
  const counts = { inserted: 0, updated: 0, skipped: 0 };
  for (const s of subs) {
    if (!s.isCompleted) continue;
    if (await isDeleted(sql, s.id)) {
      counts.skipped += 1;
      continue;
    }
    counts[await upsertSubmission(sql, s)] += 1;
  }
  await sql`INSERT INTO sync_state (id, value) VALUES ('last_reconcile', ${new Date().toISOString()})
    ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value`;
  return { total: subs.length, ...counts };
}
