// Panel MOD: login password, pin submission utama, override teks tampil,
// lihat audit. Mount di bawah daftar kelompok.
import { esc } from "./render.js";

const post = async (path, body) => {
  const r = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  return { status: r.status, data: await r.json().catch(() => ({})) };
};

export function initMod() {
  const anchor = document.getElementById("groupList");
  if (!anchor) return;
  const el = document.createElement("section");
  el.innerHTML = `
    <div class="section-head"><h3>MOD</h3><span class="small-muted" id="modState">belum login</span></div>
    <div class="controls">
      <div class="control-row">
        <input id="modPass" type="password" placeholder="Password MOD" autocomplete="off">
        <button class="btn primary" id="modLogin" type="button">Masuk</button>
      </div>
      <div class="control-row">
        <select id="modGroup" aria-label="Kelompok"></select>
        <select id="modSub" aria-label="Submission"></select>
      </div>
      <div class="control-row">
        <button class="btn" id="modPin" type="button">Pin utama</button>
        <button class="btn" id="modUnpin" type="button">Lepas pin</button>
      </div>
      <div class="control-row">
        <input id="modText" placeholder="Teks override tampil">
        <button class="btn" id="modOverride" type="button">Override</button>
        <button class="btn" id="modClear" type="button">Hapus override</button>
      </div>
      <div class="control-row">
        <button class="btn" id="modAudit" type="button">Lihat audit</button>
      </div>
      <div class="small-muted" id="modMsg"></div>
      <div id="modAuditList"></div>
    </div>`;
  anchor.after(el);
  const $ = (id) => document.getElementById(id);
  const msg = (t) => { $("modMsg").textContent = t; };
  let groups = [];

  const loadGroups = async () => {
    try {
      const d = await (await fetch("/api/dashboard")).json();
      groups = d.groups ?? [];
      $("modGroup").innerHTML = groups.map((g) => `<option value="${esc(g.id)}">${esc(g.desa)} - ${esc(g.kelompok)}</option>`).join("");
      loadSubs();
    } catch { msg("gagal muat kelompok"); }
  };
  const loadSubs = () => {
    const g = groups.find((x) => x.id === $("modGroup").value);
    const h = g?.history ?? [];
    $("modSub").innerHTML = h.length
      ? h.map((s) => `<option value="${esc(s.id)}">${esc((s.submittedAt ?? "").slice(0, 16))} - ${esc(s.nama ?? "")}${s.pinned ? " (pin)" : ""}</option>`).join("")
      : `<option value="">belum ada submission</option>`;
  };
  $("modGroup").addEventListener("change", loadSubs);

  $("modLogin").addEventListener("click", async () => {
    const r = await post("/api/mod/login", { password: $("modPass").value });
    $("modPass").value = "";
    $("modState").textContent = r.status === 200 ? "login ok" : "gagal";
    msg(r.status === 200 ? "login MOD ok" : (r.data.message ?? "gagal"));
  });
  $("modPin").addEventListener("click", async () => {
    const r = await post("/api/mod/pin", { groupId: $("modGroup").value, submissionId: $("modSub").value });
    msg(r.status === 200 ? "pin ok" : (r.data.message ?? "gagal"));
    loadGroups();
  });
  $("modUnpin").addEventListener("click", async () => {
    const r = await post("/api/mod/unpin", { groupId: $("modGroup").value });
    msg(r.status === 200 ? "pin dilepas" : (r.data.message ?? "gagal"));
    loadGroups();
  });
  $("modOverride").addEventListener("click", async () => {
    const r = await post("/api/mod/override", { groupId: $("modGroup").value, dataMahasiswa: $("modText").value });
    msg(r.status === 200 ? "override ok" : (r.data.message ?? "gagal"));
  });
  $("modClear").addEventListener("click", async () => {
    const r = await fetch("/api/mod/override", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ groupId: $("modGroup").value }) });
    msg(r.status === 200 ? "override dihapus" : "gagal");
  });
  $("modAudit").addEventListener("click", async () => {
    const r = await fetch("/api/mod/audit?limit=20");
    if (r.status !== 200) { msg("butuh login MOD"); return; }
    const d = await r.json();
    $("modAuditList").innerHTML = (d.audit ?? []).map((a) => `<div class="history-item"><span class="history-dot"></span><div><strong>${esc(a.action)} ${esc(a.group_id ?? "")}</strong><span>${esc(a.detail ?? "")}</span></div></div>`).join("");
  });
  loadGroups();
}
