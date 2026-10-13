// Panel MOD baru: login lipat, daftar kelompok berisi submission,
// aksi per submission (jadikan utama, hapus dua ketuk), audit.
import { esc } from "./render.js";

const post = async (path, body) => {
  const r = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  return { status: r.status, data: await r.json().catch(() => ({})) };
};

const del = async (path, body) => {
  const r = await fetch(path, {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  return { status: r.status, data: await r.json().catch(() => ({})) };
};

export const isModLoggedIn = () => document.body.dataset.mod === "1";

export function initMod(onChange) {
  const anchor = document.getElementById("groupList");
  if (!anchor) return;
  const el = document.createElement("section");
  el.className = "mod-panel";
  el.innerHTML = `
    <details id="modDetails">
      <summary>Panel MOD (khusus admin)</summary>
      <div class="controls">
        <div class="control-row">
          <input id="modPass" type="password" placeholder="Password MOD" autocomplete="off" aria-label="Password MOD">
          <button class="btn primary" id="modLogin" type="button">Masuk</button>
        </div>
        <div class="small-muted" id="modMsg" role="status"></div>
        <fieldset id="modActions" disabled>
          <div class="small-muted">Kelompok berisi submission</div>
          <div id="modGroupList" class="mod-groups"></div>
          <div id="modSubList"></div>
          <div class="control-row">
            <button class="btn" id="modAudit" type="button">Lihat audit</button>
          </div>
          <div id="modAuditList" aria-live="polite"></div>
        </fieldset>
      </div>
    </details>`;
  anchor.after(el);
  const $ = (id) => document.getElementById(id);
  const msg = (t) => { $("modMsg").textContent = t; };
  const changed = () => { if (onChange) onChange(); };
  let groups = [];

  const loadModGroups = async () => {
    try {
      const d = await (await fetch("/api/dashboard")).json();
      groups = (d.groups ?? []).filter((g) => (g.history ?? []).length > 0);
      $("modGroupList").innerHTML = groups.length
        ? groups.map((g) => `<button class="btn mod-group-btn" type="button" data-modgroup="${esc(g.id)}">${esc(g.desa)} - ${esc(g.kelompok)} (${g.history.length})</button>`).join("")
        : `<div class="empty">Belum ada submission.</div>`;
      $("modGroupList").querySelectorAll("[data-modgroup]").forEach((b) =>
        b.addEventListener("click", () => renderSubs(b.dataset.modgroup)),
      );
    } catch { msg("gagal muat kelompok"); }
  };

  const renderSubs = (groupId) => {
    const g = groups.find((x) => x.id === groupId);
    if (!g) return;
    $("modSubList").innerHTML = `
      <div class="small-muted">${esc(g.desa)} - ${esc(g.kelompok)}</div>
      ${g.history.map((s) => `
        <div class="mod-sub">
          <div><strong>${esc((s.submittedAt ?? "").slice(0, 16))} - ${esc(s.nama ?? "")}</strong>
          <span>${s.pinned ? "utama" : ""}${s.overridden ? " · override" : ""}</span></div>
          <div class="control-row">
            <button class="btn" type="button" data-make="${esc(s.id)}" data-group="${esc(g.id)}">Jadikan utama</button>
            <button class="btn danger" type="button" data-del="${esc(s.id)}">Hapus</button>
          </div>
        </div>`).join("")}`;
    $("modSubList").querySelectorAll("[data-make]").forEach((b) =>
      b.addEventListener("click", async () => {
        const r = await post("/api/mod/pin", { groupId: b.dataset.group, submissionId: b.dataset.make });
        msg(r.status === 200 ? "pin ok" : (r.data.message ?? "gagal"));
        await loadModGroups();
        changed();
      }),
    );
    $("modSubList").querySelectorAll("[data-del]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!b.dataset.armed) {
          b.dataset.armed = "1";
          b.textContent = "Ketuk lagi untuk hapus";
          setTimeout(() => { delete b.dataset.armed; b.textContent = "Hapus"; }, 3000);
          return;
        }
        const r = await del("/api/mod/delete", { submissionId: b.dataset.del });
        msg(r.status === 200 ? "hapus ok" : (r.data.message ?? "gagal"));
        await loadModGroups();
        $("modSubList").innerHTML = "";
        changed();
      }),
    );
  };

  $("modLogin").addEventListener("click", async () => {
    const r = await post("/api/mod/login", { password: $("modPass").value });
    $("modPass").value = "";
    const ok = r.status === 200;
    document.body.dataset.mod = ok ? "1" : "";
    $("modActions").disabled = !ok;
    msg(ok ? "login MOD ok" : (r.data.message ?? "gagal"));
    if (ok) loadModGroups();
  });
  $("modAudit").addEventListener("click", async () => {
    const r = await fetch("/api/mod/audit?limit=20");
    if (r.status !== 200) { msg("butuh login MOD"); return; }
    const d = await r.json();
    $("modAuditList").innerHTML = (d.audit ?? []).map((a) => `<div class="history-item"><span class="history-dot"></span><div><strong>${esc(a.action)} ${esc(a.group_id ?? "")}</strong><span>${esc(a.detail ?? "")}</span></div></div>`).join("");
  });
}

// Editor override di sheet detail kelompok. Tampil hanya bila sesi MOD aktif.
export function mountModOverride(contentEl, g, onDone) {
  if (!isModLoggedIn()) return;
  const wrap = document.createElement("div");
  wrap.className = "detail-block";
  wrap.innerHTML = `
    <h4>Override MOD</h4>
    <div class="control-row">
      <input id="modDetailText" placeholder="Teks override tampil" aria-label="Teks override tampil" value="${esc(g.latest?.overridden ? (g.latest.data ?? "") : "")}">
      <button class="btn" id="modDetailSave" type="button">Simpan</button>
    </div>
    <div class="control-row">
      <button class="btn" id="modDetailClear" type="button">Hapus override</button>
    </div>
    <div class="small-muted" id="modDetailMsg" role="status"></div>`;
  contentEl.append(wrap);
  const say = (t) => { wrap.querySelector("#modDetailMsg").textContent = t; };
  wrap.querySelector("#modDetailSave").addEventListener("click", async () => {
    const r = await post("/api/mod/override", { groupId: g.id, dataMahasiswa: wrap.querySelector("#modDetailText").value });
    say(r.status === 200 ? "override ok" : (r.data.message ?? "gagal"));
    if (r.status === 200 && onDone) onDone();
  });
  wrap.querySelector("#modDetailClear").addEventListener("click", async () => {
    const r = await del("/api/mod/override", { groupId: g.id });
    say(r.status === 200 ? "override dihapus" : "gagal");
    if (r.status === 200 && onDone) onDone();
  });
}
