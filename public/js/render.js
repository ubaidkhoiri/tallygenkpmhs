// Render murni. Tanpa akses DOM global, semua lewat argumen.
// Logika sama dengan prototipe index.html.

const dateFmt = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (ch) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[ch],
  );

export const dateText = (value) =>
  value ? dateFmt.format(new Date(value)) : "—";

export const pct = (n, total) => (total ? Math.round((n / total) * 100) : 0);

export const statusLabel = (status) =>
  status === "done"
    ? "Sudah mengisi"
    : status === "issue"
      ? "Perlu dicek"
      : "Belum mengisi";

export function renderStats(els, groups, submissions) {
  const done = groups.filter((g) => g.status === "done").length;
  const pending = groups.filter((g) => g.status === "pending").length;
  const issues = groups.filter((g) => g.status === "issue").length;
  els.statDone.textContent = `${done}/${groups.length}`;
  els.statPending.textContent = pending;
  els.statIssues.textContent = issues;
  els.statSubmissions.textContent = submissions.length;
  els.statPercent.textContent = `${pct(done, groups.length)}% sudah mengisi`;
  els.mainProgress.style.width = `${pct(done, groups.length)}%`;
}

export function renderVillageCards(
  gridEl,
  villages,
  groups,
  activeVillage,
  onSelect,
) {
  gridEl.innerHTML = villages
    .map((v) => {
      const items = groups.filter((g) => g.desa === v.desa);
      const done = items.filter((g) => g.status === "done").length;
      const issues = items.filter((g) => g.status === "issue").length;
      const selected = activeVillage === v.desa;
      return `<button class="village-card ${selected ? "active" : ""}" data-village="${esc(v.desa)}" aria-pressed="${selected}">
      <div class="village-top"><span class="village-name">${esc(v.desa)}</span><span class="village-count">${done}/${items.length}</span></div>
      <div class="progress-track"><span style="width:${pct(done, items.length)}%"></span></div>
      <div class="village-meta"><span><strong>${items.filter((g) => g.status === "pending").length}</strong> belum</span><span>${issues ? `<strong>${issues}</strong> anomali` : `${pct(done, items.length)}%`}</span></div>
    </button>`;
    })
    .join("");
  gridEl.querySelectorAll("[data-village]").forEach((btn) =>
    btn.addEventListener("click", () => onSelect(btn.dataset.village)),
  );
}

export function filteredGroups(allGroups, { q, village, status, sort }) {
  const needle = q.trim().toLocaleLowerCase("id-ID");
  const items = allGroups.filter((g) => {
    const hay = [g.desa, g.kelompok, g.latest?.nama, g.latest?.data]
      .join(" ")
      .toLocaleLowerCase("id-ID");
    return (
      (!needle || hay.includes(needle)) &&
      (!village || g.desa === village) &&
      (!status || g.status === status)
    );
  });
  items.sort((a, b) => {
    if (sort === "name") return a.kelompok.localeCompare(b.kelompok, "id");
    if (sort === "newest")
      return (
        new Date(b.latest?.submittedAt || 0) -
        new Date(a.latest?.submittedAt || 0)
      );
    if (sort === "oldest")
      return (
        new Date(a.latest?.submittedAt || "9999-12-31") -
        new Date(b.latest?.submittedAt || "9999-12-31")
      );
    return (
      a.desa.localeCompare(b.desa, "id") ||
      a.kelompok.localeCompare(b.kelompok, "id")
    );
  });
  return items;
}

export function renderGroups(listEl, resultEl, allGroups, filters, onOpen) {
  const items = filteredGroups(allGroups, filters);
  resultEl.textContent = `${items.length} dari ${allGroups.length} kelompok`;
  if (!items.length) {
    listEl.innerHTML =
      '<div class="empty">Tidak ada kelompok yang cocok.<br>Coba ubah kata kunci atau filter.</div>';
    return;
  }
  listEl.innerHTML = items
    .map((g) => {
      const latest = g.latest;
      const initials = g.kelompok
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
      return `<button class="group-row" data-group="${esc(g.id)}">
      <span class="group-icon ${g.status === "done" ? "done" : ""}">${esc(initials)}</span>
      <span class="group-main"><span class="group-name">${esc(g.kelompok)}</span><span class="group-sub">${esc(g.desa)} · ${latest ? `Terakhir: ${esc(dateText(latest.submittedAt))}` : "Belum ada submission"}</span></span>
      <span class="status ${g.status}">${statusLabel(g.status)}</span>
    </button>`;
    })
    .join("");
  listEl
    .querySelectorAll("[data-group]")
    .forEach((btn) => btn.addEventListener("click", () => onOpen(btn.dataset.group)));
}

export function openDetail(els, g) {
  els.title.textContent = g.kelompok;
  els.subtitle.textContent = `${g.desa} · ${g.history.length} submission tercatat`;
  const latest = g.latest;
  els.content.innerHTML = `
    <div class="detail-grid">
      <div class="detail-cell"><label>STATUS KELOMPOK</label><div><span class="status ${g.status}">${statusLabel(g.status)}</span></div></div>
      <div class="detail-cell"><label>JUMLAH SUBMISSION</label><div>${g.history.length} pengiriman</div></div>
      <div class="detail-cell"><label>NAMA PENGIRIM TERAKHIR</label><div>${esc(latest?.nama || "—")}</div></div>
      <div class="detail-cell"><label>WAKTU PENGIRIMAN</label><div>${esc(dateText(latest?.submittedAt))}</div></div>
    </div>
    <div class="detail-block"><h4>Data mahasiswa (submission terbaru)</h4><div class="student-data">${esc(latest?.data || "Belum ada data yang dikirim.")}</div></div>
    <div class="detail-block"><h4>Riwayat submission</h4>
      ${g.history.length ? g.history.map((s) => `<div class="history-item"><span class="history-dot"></span><div><strong>${esc(s.nama)} ${s.issue ? '<span class="status issue">Perlu dicek</span>' : ""}</strong><span>${esc(dateText(s.submittedAt))} · ${s.confirmed ? "Konfirmasi dicentang" : "Konfirmasi belum dicentang"}</span></div></div>`).join("") : '<div class="empty">Belum ada riwayat submission untuk kelompok ini.</div>'}
    </div>
    ${g.status === "issue" ? '<div class="footer-note"><strong>Anomali data:</strong> periksa kecocokan nama desa/kelompok dan validitas submission pada sumber Tally.</div>' : ""}`;
  els.overlay.classList.add("open");
  document.body.style.overflow = "hidden";
  els.closeBtn.focus();
}

export function closeDetail(overlay) {
  overlay.classList.remove("open");
  document.body.style.overflow = "";
}
