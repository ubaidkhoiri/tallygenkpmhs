import test from "node:test";
import assert from "node:assert/strict";
import { matchGroup, normalizeSubmission, pickLatest } from "../src/normalize.js";

test("matchGroup kenal Sidatan 2", () => {
  const m = matchGroup("Temon", "SIDATAN 2");
  assert.equal(m.groupId, "temon--sidatan-2");
  assert.equal(m.anomaly, null);
});

test("matchGroup asing jadi anomali", () => {
  const m = matchGroup("Temon", "Kelompok X");
  assert.equal(m.groupId, null);
  assert.match(m.anomaly, /tak dikenal/);
});

test("normalizeSubmission + pickLatest pilih terbaru", () => {
  const F = { nama: "q1", desa: "q2", kelompok: "q3", data: "q4", persetujuan: "q5" };
  const mk = (id, at, data) => ({
    id, formId: "f", submittedAt: at,
    answers: [
      { questionId: "q1", text: "A" }, { questionId: "q2", text: "Temon" },
      { questionId: "q3", text: "Sidatan 2" }, { questionId: "q4", text: data },
      { questionId: "q5", text: "Ya" },
    ],
  });
  const rows = [mk("a", "2026-10-01T00:00:00Z", "lama"), mk("b", "2026-10-02T00:00:00Z", "baru")].map((s) => normalizeSubmission(s, F));
  const best = pickLatest(rows);
  assert.equal(best.get("temon--sidatan-2").dataMahasiswa, "baru");
  assert.equal(rows[0].confirmed, true);
});

test("checkbox persetujuan dicentang = confirmed", () => {
  const sub = {
    id: "c", formId: "f", submittedAt: "2026-10-03T00:00:00Z",
    answers: [
      { questionId: "q1", text: "B" }, { questionId: "q2", text: "Wates" },
      { questionId: "q3", text: "Bojong" }, { questionId: "q4", text: "Kosong" },
      { questionId: "q5", value: ["opt-1"] },
    ],
  };
  const r = normalizeSubmission(sub, { nama: "q1", desa: "q2", kelompok: "q3", data: "q4", persetujuan: "q5" });
  assert.equal(r.groupId, "wates--bojong");
  assert.equal(r.dataMahasiswa, "Kosong");
});

test("bentuk API asli responses + answer array terbaca", () => {
  const sub = {
    id: "Nqvgpz0", formId: "RGXQKl", submittedAt: "2026-10-13T16:13:10.000Z",
    responses: [
      { questionId: "KP1EAA", answer: "tes" },
      { questionId: "LEprBj", answer: ["Pengasih"] },
      { questionId: "p0OEXq", answer: ["Girinyono"] },
      { questionId: "1bVezQ", answer: "tes data" },
      { questionId: "MrR4lp", answer: ["am-ID-1"] },
    ],
  };
  const r = normalizeSubmission(sub, { nama: "KP1EAA", desa: "LEprBj", kelompok: "p0OEXq", data: "1bVezQ", persetujuan: "MrR4lp" });
  assert.equal(r.nama, "tes");
  assert.equal(r.groupId, "pengasih--girinyono");
  assert.equal(r.dataMahasiswa, "tes data");
});
