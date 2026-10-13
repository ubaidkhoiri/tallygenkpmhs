import { GROUPS_FLAT } from "./master-data.js";

const enc = new TextEncoder();

async function sha256hex(s) {
  const d = await crypto.subtle.digest("SHA-256", enc.encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const equal = (a, b) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

export const modToken = (password) => sha256hex(`mod:${password}`);

export async function isMod(request, env) {
  if (!env.MOD_PASSWORD) return false;
  const m = (request.headers.get("cookie") ?? "").match(/(?:^|;\s*)mod=([0-9a-f]{64})/);
  return Boolean(m && equal(m[1], await modToken(env.MOD_PASSWORD)));
}

const validGroup = (groupId) => GROUPS_FLAT.some((g) => g.id === groupId);

async function audit(sql, action, groupId, detail) {
  await sql`INSERT INTO mod_audit (action, group_id, detail) VALUES (${action}, ${groupId}, ${detail})`;
}

// Semua handler return Response. Pemanggil sudah cek isMod kecuali login.
export async function modLogin(request, env) {
  if (!env.MOD_PASSWORD) return { status: 500, body: { status: "error", message: "MOD belum dikonfigurasi" } };
  const { password } = await request.json().catch(() => ({}));
  if (!password || !equal(await sha256hex(`mod:${password}`), await modToken(env.MOD_PASSWORD))) {
    return { status: 401, body: { status: "error", message: "password salah" } };
  }
  return {
    status: 200,
    body: { status: "ok" },
    cookie: `mod=${await modToken(env.MOD_PASSWORD)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`,
  };
}

export async function modPin(sql, { groupId, submissionId }) {
  if (!validGroup(groupId)) return { status: 400, body: { status: "error", message: "kelompok tak dikenal" } };
  const rows = await sql`SELECT kelompok_norm FROM submissions WHERE id = ${submissionId}`;
  if (rows.length === 0) return { status: 404, body: { status: "error", message: "submission tak ada" } };
  if (rows[0].kelompok_norm !== groupId) return { status: 400, body: { status: "error", message: "submission bukan milik kelompok ini" } };
  await sql`INSERT INTO group_pins (group_id, submission_id) VALUES (${groupId}, ${submissionId})
    ON CONFLICT (group_id) DO UPDATE SET submission_id = EXCLUDED.submission_id, updated_at = now()`;
  await audit(sql, "pin", groupId, submissionId);
  return { status: 200, body: { status: "ok" } };
}

export async function modUnpin(sql, groupId) {
  await sql`DELETE FROM group_pins WHERE group_id = ${groupId}`;
  await audit(sql, "unpin", groupId, "");
  return { status: 200, body: { status: "ok" } };
}

export async function modOverride(sql, { groupId, dataMahasiswa }) {
  if (!validGroup(groupId)) return { status: 400, body: { status: "error", message: "kelompok tak dikenal" } };
  const text = String(dataMahasiswa ?? "").trim();
  if (!text) return { status: 400, body: { status: "error", message: "teks kosong" } };
  await sql`INSERT INTO mod_overrides (group_id, data_mahasiswa) VALUES (${groupId}, ${text})
    ON CONFLICT (group_id) DO UPDATE SET data_mahasiswa = EXCLUDED.data_mahasiswa, updated_at = now()`;
  await audit(sql, "override", groupId, text.slice(0, 200));
  return { status: 200, body: { status: "ok" } };
}

export async function modClearOverride(sql, groupId) {
  await sql`DELETE FROM mod_overrides WHERE group_id = ${groupId}`;
  await audit(sql, "clear_override", groupId, "");
  return { status: 200, body: { status: "ok" } };
}

// Hapus permanen satu submission. Pin gantung dilepas, id masuk blocklist
// agar reconcile tak masukkan lagi, semua tercatat di audit.
export async function modDeleteSubmission(sql, submissionId) {
  if (!submissionId) return { status: 400, body: { status: "error", message: "submissionId wajib" } };
  const rows = await sql`SELECT kelompok_norm FROM submissions WHERE id = ${submissionId}`;
  if (rows.length === 0) return { status: 404, body: { status: "error", message: "submission tak ada" } };
  const groupId = rows[0].kelompok_norm;
  await sql`DELETE FROM group_pins WHERE submission_id = ${submissionId}`;
  await sql`DELETE FROM submissions WHERE id = ${submissionId}`;
  await sql`INSERT INTO deleted_submissions (submission_id) VALUES (${submissionId}) ON CONFLICT DO NOTHING`;
  await audit(sql, "delete-submission", groupId, submissionId);
  return { status: 200, body: { status: "ok" } };
}
