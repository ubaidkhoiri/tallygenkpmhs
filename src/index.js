import { db } from "./db.js";
import { buildDashboard } from "./dashboard.js";
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
  if (!sub || !sub.id || !Array.isArray(sub.answers)) {
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
    if (url.pathname.startsWith("/api/")) {
      return json({ status: "error", message: "not found" }, 404);
    }
    return env.ASSETS.fetch(request);
  },
  async scheduled(event, env) {
    await reconcileAll(db(env), { formId: env.TALLY_FORM_ID, apiKey: env.TALLY_API_KEY });
  },
};
