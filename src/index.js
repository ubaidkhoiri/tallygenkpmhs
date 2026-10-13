import { VILLAGES, GROUPS_FLAT } from "./master-data.js";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

// Mode scaffold: kontrak respons sudah final, isi masih mock dari master
// data. Integrasi Neon masuk pada Task 5.
function scaffoldDashboard() {
  return {
    status: "ok",
    fetchedAt: new Date().toISOString(),
    totals: {
      villages: VILLAGES.length,
      groups: GROUPS_FLAT.length,
      submittedGroups: 0,
      pendingGroups: GROUPS_FLAT.length,
      submissions: 0,
    },
    groups: GROUPS_FLAT.map((g) => ({
      id: g.id,
      desa: g.desa,
      kelompok: g.kelompok,
      status: "pending",
      latest: null,
      history: [],
    })),
    submissions: [],
    warnings: ["Mode scaffold: integrasi Tally dan Neon belum aktif."],
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/dashboard") {
      if (request.method !== "GET") {
        return json({ status: "error", message: "method not allowed" }, 405);
      }
      return json(scaffoldDashboard());
    }
    if (url.pathname.startsWith("/api/")) {
      return json({ status: "error", message: "not found" }, 404);
    }
    return env.ASSETS.fetch(request);
  },
  // Reconcile Tally masuk pada Task 4.
  async scheduled() {
    return;
  },
};
