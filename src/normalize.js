import { createHash } from "node:crypto";
import { VILLAGES } from "./master-data.js";

const clean = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const norm = (s) => clean(s).toLowerCase();

const GROUP_LOOKUP = new Map();
for (const v of VILLAGES) {
  for (const g of v.groups) GROUP_LOOKUP.set(norm(g.name), { villageId: v.id, villageName: v.name, groupId: g.id, groupName: g.name });
}

export function matchGroup(desaRaw, kelompokRaw) {
  const hit = GROUP_LOOKUP.get(norm(kelompokRaw));
  if (hit && norm(desaRaw) === norm(hit.villageName)) return { ...hit, anomaly: null };
  if (hit) return { ...hit, anomaly: `desa mismatch: '${clean(desaRaw)}' vs '${hit.villageName}'` };
  return { villageId: null, villageName: null, groupId: null, groupName: null, anomaly: `kelompok tak dikenal: '${clean(kelompokRaw)}'` };
}

export function answerText(submission, questionId) {
  const a = (submission.answers ?? []).find((x) => x.questionId === questionId);
  if (!a) return "";
  const flat = (v) => Array.isArray(v) ? v.map(flat).join(", ") : (v && typeof v === "object" ? (v.text ?? v.label ?? v.option ?? "") : String(v ?? ""));
  return flat(a.text ?? a.value ?? a.option ?? a.options ?? "");
}

export function normalizeSubmission(sub, fieldIds) {
  const nama = clean(answerText(sub, fieldIds.nama));
  const desaRaw = clean(answerText(sub, fieldIds.desa));
  const kelompokRaw = clean(answerText(sub, fieldIds.kelompok));
  const data = clean(answerText(sub, fieldIds.data));
  const confirmedRaw = clean(answerText(sub, fieldIds.persetujuan)).toLowerCase();
  const confirmed = confirmedRaw !== "" && !/^(tidak|no|belum|batal)/.test(confirmedRaw);
  const m = matchGroup(desaRaw, kelompokRaw);
  const hash = createHash("sha256").update(JSON.stringify([nama, desaRaw, kelompokRaw, data, confirmed])).digest("hex");
  return {
    id: sub.id, formId: sub.formId, submittedAt: sub.submittedAt,
    nama, desaRaw, kelompokRaw, dataMahasiswa: data, confirmed, payloadHash: hash, ...m,
  };
}

export function pickLatest(rows) {
  const best = new Map();
  for (const r of rows) {
    if (!r.groupId) continue;
    const cur = best.get(r.groupId);
    if (!cur || r.submittedAt > cur.submittedAt || (r.submittedAt === cur.submittedAt && r.id > cur.id)) best.set(r.groupId, r);
  }
  return best;
}
