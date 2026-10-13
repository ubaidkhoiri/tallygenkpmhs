import test from "node:test";
import assert from "node:assert/strict";
import { FIELD_IDS } from "../src/tally.js";
import { normalizeSubmission } from "../src/normalize.js";
import { upsertSubmission } from "../src/sync.js";

const mkRaw = (id, data) => ({
  id, formId: "RGXQKl", submittedAt: "2026-10-13T12:00:00Z",
  answers: [
    { questionId: "KP1EAA", text: "Admin" },
    { questionId: "LEprBj", text: "Temon" },
    { questionId: "p0OEXq", text: "Sidatan 2" },
    { questionId: "1bVezQ", text: data },
    { questionId: "MrR4lp", value: ["x"] },
  ],
});

function stubDb(existingHash) {
  const queries = [];
  const sql = async (strings) => {
    queries.push(strings[0]);
    if (strings[0].includes("SELECT payload_hash")) {
      return existingHash === null ? [] : [{ payload_hash: existingHash }];
    }
    return [];
  };
  return { sql, queries };
}

test("submission baru -> inserted + tulis", async () => {
  const { sql, queries } = stubDb(null);
  assert.equal(await upsertSubmission(sql, mkRaw("s1", "isi")), "inserted");
  assert.ok(queries.some((q) => q.includes("INSERT INTO submissions")));
});

test("event ganda hash sama -> skipped tanpa tulis", async () => {
  const hash = normalizeSubmission(mkRaw("s1", "isi"), FIELD_IDS).payloadHash;
  const { sql, queries } = stubDb(hash);
  assert.equal(await upsertSubmission(sql, mkRaw("s1", "isi")), "skipped");
  assert.ok(!queries.some((q) => q.includes("INSERT INTO submissions")));
});

test("isi berubah -> updated + tulis", async () => {
  const hash = normalizeSubmission(mkRaw("s1", "lama"), FIELD_IDS).payloadHash;
  const { sql, queries } = stubDb(hash);
  assert.equal(await upsertSubmission(sql, mkRaw("s1", "baru")), "updated");
  assert.ok(queries.some((q) => q.includes("INSERT INTO submissions")));
});
