import { db } from "./db.js";
import { buildDashboard } from "./dashboard.js";
import { isMod, modLogin, modPin, modUnpin, modOverride, modClearOverride, modDeleteSubmission } from "./mod.js";
import { upsertSubmission, reconcileAll } from "./sync.js";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifySignature(secret, rawBody, signature) {
  if (!secret || !signature) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const sig = signature.replace(/^sha256=/, "");
  return timingSafeEqual(hex, sig);
}

async function handleWebhook(request, env) {
  if (!env.TALLY_SIGNING_SECRET) return json({ status: "error", message: "webhook belum dikonfigurasi" }, 500);
  const rawBody = await request.text();
  const signature = request.headers.get("tally-signature") ?? request.headers.get("x-tally-signature") ?? "";
  if (!(await verifySignature(env.TALLY_SIGNING_SECRET, rawBody, signature))) {
    return json({ status: "error", message: "signature tak valid" }, 401);
  }
  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json({ status: "error", message: "body bukan JSON" }, 400);
  }
  const sub = body.submission ?? body.data?.submission ?? body.data ?? body;
  const hasAnswers = Array.isArray(sub.answers) || Array.isArray(sub.responses);
  if (!sub || !sub.id || !hasAnswers) {
    return json({ status: "error", message: "bentuk event tak dikenal" }, 400);
  }
  try {
    const mode = await upsertSubmission(db(env), sub);
    return json({ status: "ok", mode });
  } catch (e) {
    return json({ status: "error", message: "gagal tulis database" }, 500);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/dashboard") {
      if (request.method !== "GET") {
        return json({ status: "error", message: "method not allowed" }, 405);
      }
      try {
        const data = await buildDashboard(db(env));
        const keys = ["status", "fetchedAt", "totals", "groups", "submissions", "warnings"];
        if (!keys.every((k) => k in data)) throw new Error("kontrak rusak");
        return json(data);
      } catch (e) {
        return json({ status: "error", message: "gagal baca database" }, 500);
      }
    }
    if (url.pathname === "/api/webhooks/tally") {
      if (request.method !== "POST") {
        return json({ status: "error", message: "method not allowed" }, 405);
      }
      return handleWebhook(request, env);
    }
    if (url.pathname === "/api/mod/login" && request.method === "POST") {
      const r = await modLogin(request, env);
      const headers = { "content-type": "application/json; charset=utf-8" };
      if (r.cookie) headers["set-cookie"] = r.cookie;
      return new Response(JSON.stringify(r.body), { status: r.status, headers });
    }
    if (url.pathname === "/api/mod/logout" && request.method === "POST") {
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "set-cookie": "mod=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
        },
      });
    }
    if (url.pathname.startsWith("/api/mod/")) {
      if (!(await isMod(request, env))) {
        return json({ status: "error", message: "butuh login MOD" }, 401);
      }
      const sql = db(env);
      if (url.pathname === "/api/mod/pin" && request.method === "POST") {
        const r = await modPin(sql, await request.json().catch(() => ({})));
        return json(r.body, r.status);
      }
      if (url.pathname === "/api/mod/unpin" && request.method === "POST") {
        const { groupId } = await request.json().catch(() => ({}));
        const r = await modUnpin(sql, groupId);
        return json(r.body, r.status);
      }
      if (url.pathname === "/api/mod/override" && request.method === "POST") {
        const r = await modOverride(sql, await request.json().catch(() => ({})));
        return json(r.body, r.status);
      }
      if (url.pathname === "/api/mod/override" && request.method === "DELETE") {
        const { groupId } = await request.json().catch(() => ({}));
        const r = await modClearOverride(sql, groupId);
        return json(r.body, r.status);
      }
      if (url.pathname === "/api/mod/audit" && request.method === "GET") {
        const limit = Math.min(Number(url.searchParams.get("limit") ?? 50) || 50, 200);
        const rows = await sql`SELECT id, action, group_id, detail, created_at FROM mod_audit ORDER BY id DESC LIMIT ${limit}`;
        return json({ status: "ok", audit: rows });
      }
      if (url.pathname === "/api/mod/delete" && request.method === "DELETE") {
        const { submissionId } = await request.json().catch(() => ({}));
        const r = await modDeleteSubmission(sql, submissionId);
        return json(r.body, r.status);
      }
    }
    if (url.pathname.startsWith("/api/groups/") && url.pathname.endsWith("/history")) {
      if (request.method !== "GET") {
        return json({ status: "error", message: "method not allowed" }, 405);
      }
      const groupId = decodeURIComponent(url.pathname.slice("/api/groups/".length, -"/history".length));
      try {
        const data = await buildDashboard(db(env));
        const group = data.groups.find((g) => g.id === groupId);
        if (!group) return json({ status: "error", message: "kelompok tak dikenal" }, 404);
        return json({ status: "ok", group });
      } catch (e) {
        return json({ status: "error", message: "gagal baca database" }, 500);
      }
    }
    if (url.pathname.startsWith("/api/submissions/")) {
      if (request.method !== "GET") {
        return json({ status: "error", message: "method not allowed" }, 405);
      }
      const subId = decodeURIComponent(url.pathname.slice("/api/submissions/".length));
      if (!subId || subId.includes("/")) {
        return json({ status: "error", message: "not found" }, 404);
      }
      try {
        const data = await buildDashboard(db(env));
        const sub = data.submissions.find((s) => s.id === subId);
        if (!sub) return json({ status: "error", message: "submission tak ditemukan" }, 404);
        return json({ status: "ok", submission: sub });
      } catch (e) {
        return json({ status: "error", message: "gagal baca database" }, 500);
      }
    }
    if (url.pathname.startsWith("/api/")) {
      return json({ status: "error", message: "not found" }, 404);
    }
    return env.ASSETS.fetch(request);
  },
  async scheduled(event, env) {
    await reconcileAll(db(env), { formId: env.TALLY_FORM_ID, apiKey: env.TALLY_API_KEY });
  },
};
