import test from "node:test";
import assert from "node:assert/strict";
import { isDeleted } from "../src/sync.js";

// Mock sql: jawab blocklist hanya untuk id terhapus.
const mockSql = (deleted) => async (strings, ...values) => {
  const q = strings.join("?");
  if (q.includes("deleted_submissions")) {
    return deleted.has(values[0]) ? [{ "?column?": 1 }] : [];
  }
  return [];
};

test("isDeleted true untuk id di blocklist", async () => {
  const sql = mockSql(new Set(["gone-1"]));
  assert.equal(await isDeleted(sql, "gone-1"), true);
});

test("isDeleted false untuk id biasa", async () => {
  const sql = mockSql(new Set(["gone-1"]));
  assert.equal(await isDeleted(sql, "keep-1"), false);
});
