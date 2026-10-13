import test from "node:test";
import assert from "node:assert/strict";
import { listSubmissions } from "../src/tally.js";

test("pagination tuntas: 2 halaman terkumpul semua", async () => {
  const seen = [];
  globalThis.fetch = async (url, opts) => {
    seen.push(String(url));
    assert.match(opts.headers.Authorization, /^Bearer k$/);
    const page = Number(new URL(url).searchParams.get("page"));
    return {
      ok: true,
      json: async () =>
        page === 1
          ? { submissions: [{ id: "a" }, { id: "b" }], hasMore: true }
          : { submissions: [{ id: "c" }], hasMore: false },
    };
  };
  try {
    const out = await listSubmissions({ formId: "f", apiKey: "k", limit: 2 });
    assert.deepEqual(out.map((s) => s.id), ["a", "b", "c"]);
    assert.equal(seen.length, 2);
  } finally {
    delete globalThis.fetch;
  }
});

test("tally error bawa status", async () => {
  globalThis.fetch = async () => ({
    ok: false,
    status: 429,
    text: async () => "rate limited",
  });
  try {
    await assert.rejects(
      listSubmissions({ formId: "f", apiKey: "k" }),
      (e) => e.status === 429,
    );
  } finally {
    delete globalThis.fetch;
  }
});
