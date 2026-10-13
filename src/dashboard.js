import { VILLAGES, GROUPS_FLAT } from "./master-data.js";

// Bangun respons /api/dashboard dari Neon. Pin dan override MOD hanya
// dibaca di sini, tak pernah menimpa baris submissions.
export async function buildDashboard(sql) {
  const rows = await sql`SELECT id, submitted_at, nama_pengirim, desa_raw, kelompok_raw,
    desa_norm, kelompok_norm, data_mahasiswa, confirmed
    FROM submissions ORDER BY submitted_at DESC, id DESC LIMIT 500`;
  const pins = await sql`SELECT group_id, submission_id FROM group_pins`;
  const overrides = await sql`SELECT group_id, data_mahasiswa FROM mod_overrides`;
  const pinByGroup = new Map(pins.map((p) => [p.group_id, p.submission_id]));
  const overrideByGroup = new Map(overrides.map((o) => [o.group_id, o.data_mahasiswa]));
  const byId = new Map(rows.map((r) => [r.id, r]));

  const historyByGroup = new Map(GROUPS_FLAT.map((g) => [g.id, []]));
  const warnings = [];
  for (const r of rows) {
    if (!r.kelompok_norm || !historyByGroup.has(r.kelompok_norm)) {
      warnings.push({ submissionId: r.id, desa: r.desa_raw, kelompok: r.kelompok_raw, submittedAt: r.submitted_at });
      continue;
    }
    historyByGroup.get(r.kelompok_norm).push(r);
  }

  const shape = (r, pinned, overridden) => ({
    id: r.id,
    nama: r.nama_pengirim,
    submittedAt: typeof r.submitted_at === "string" ? r.submitted_at : r.submitted_at.toISOString(),
    data: overridden ?? r.data_mahasiswa,
    confirmed: r.confirmed,
    pinned: Boolean(pinned),
    overridden: overridden !== undefined,
  });

  let submittedGroups = 0;
  const groups = VILLAGES.flatMap((v) =>
    v.groups.map((g) => {
      const history = historyByGroup.get(g.id) ?? [];
      let latest = history[0] ?? null;
      let pinned = false;
      const pinId = pinByGroup.get(g.id);
      if (pinId && byId.has(pinId) && byId.get(pinId).kelompok_norm === g.id) {
        latest = byId.get(pinId);
        pinned = true;
      }
      const overridden = overrideByGroup.get(g.id);
      if (history.length > 0) submittedGroups += 1;
      const status = !latest ? "pending" : !latest.confirmed ? "issue" : "done";
      return {
        id: g.id, desa: v.name, kelompok: g.name, status,
        latest: latest ? shape(latest, pinned, overridden) : null,
        history: history.map((r) => shape(r, r.id === pinId, undefined)),
      };
    }),
  );

  const submissions = rows.slice(0, 200).map((r) => ({
    id: r.id,
    desa: r.desa_norm ? (VILLAGES.find((v) => v.id === r.desa_norm)?.name ?? r.desa_raw) : r.desa_raw,
    kelompok: r.kelompok_norm ? (GROUPS_FLAT.find((g) => g.id === r.kelompok_norm)?.kelompok ?? r.kelompok_raw) : r.kelompok_raw,
    nama: r.nama_pengirim,
    submittedAt: typeof r.submitted_at === "string" ? r.submitted_at : r.submitted_at.toISOString(),
    data: r.data_mahasiswa,
    confirmed: r.confirmed,
    issue: !r.kelompok_norm || !r.confirmed,
  }));

  return {
    status: "ok",
    fetchedAt: new Date().toISOString(),
    totals: {
      villages: VILLAGES.length,
      groups: GROUPS_FLAT.length,
      submittedGroups,
      pendingGroups: GROUPS_FLAT.length - submittedGroups,
      submissions: rows.length,
    },
    groups,
    submissions,
    warnings,
  };
}
