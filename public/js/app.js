import { fetchDashboard } from "./api.js";
import {
  esc,
  renderStats,
  renderVillageCards,
  renderGroups,
  openDetail,
  closeDetail,
} from "./render.js";

("use strict");

// Master data desa dan kelompok. Duplikat kecil dari src/master-data.js
// khusus frontend. Task 5 ganti sumber dari API.
const MASTER_DATA = [
  {
    desa: "Samigaluh",
    kelompok: [
      "Pengos",
      "Suren",
      "Kalirejo",
      "Pagerharjo",
      "Separang",
      "Kebonharjo",
    ],
  },
  {
    desa: "Pengasih",
    kelompok: [
      "Margosari",
      "Sendangsari",
      "Banjarharjo",
      "Nanggulan",
      "Girinyono",
      "Jatimulyo",
      "Serut",
    ],
  },
  {
    desa: "Wates",
    kelompok: [
      "Krembangan",
      "Bojong",
      "Giripeni 1",
      "Giripeni 2",
      "Hargowilis",
      "Triharjo",
    ],
  },
  {
    desa: "Lendah",
    kelompok: [
      "Bonosoro",
      "Bumirejo",
      "Carikan",
      "Ngentakrejo",
      "Tuksono",
      "Srikayangan",
    ],
  },
  {
    desa: "Temon",
    kelompok: [
      "Tawangsari",
      "Hargorejo",
      "Sidatan 1",
      "Sidatan 2",
      "Jogoboyo",
      "Jogoresan",
    ],
  },
];

// DATA MOCK: dipakai bila API belum ada submission. Task 5 hapus.
const mockSubmissions = [
  {
    id: "sub-024",
    desa: "Samigaluh",
    kelompok: "Pengos",
    nama: "Ahmad Fikri",
    submittedAt: "2026-10-13T08:42:00+07:00",
    data: "Ahmad Fikri — Universitas Negeri Yogyakarta — 2023\nNadia Putri — UIN Sunan Kalijaga — 2024",
    confirmed: true,
  },
  {
    id: "sub-023",
    desa: "Pengasih",
    kelompok: "Margosari",
    nama: "Siti Rahma",
    submittedAt: "2026-10-13T08:15:00+07:00",
    data: "Siti Rahma — Universitas Gadjah Mada — 2022\nFajar Nugroho — Universitas Negeri Yogyakarta — 2023",
    confirmed: true,
  },
  {
    id: "sub-022",
    desa: "Wates",
    kelompok: "Giripeni 1",
    nama: "Dimas Pratama",
    submittedAt: "2026-10-12T21:10:00+07:00",
    data: "Dimas Pratama — Universitas Teknologi Yogyakarta — 2024",
    confirmed: true,
  },
  {
    id: "sub-021",
    desa: "Lendah",
    kelompok: "Bonosoro",
    nama: "Rizki Amelia",
    submittedAt: "2026-10-12T18:05:00+07:00",
    data: "Kosong",
    confirmed: true,
  },
  {
    id: "sub-020",
    desa: "Temon",
    kelompok: "Tawangsari",
    nama: "Dewi Lestari",
    submittedAt: "2026-10-12T17:22:00+07:00",
    data: "Dewi Lestari — Universitas Ahmad Dahlan — 2023",
    confirmed: true,
  },
  {
    id: "sub-019",
    desa: "Samigaluh",
    kelompok: "Suren",
    nama: "Ilham Maulana",
    submittedAt: "2026-10-12T15:20:00+07:00",
    data: "Ilham Maulana — Universitas Islam Indonesia — 2024",
    confirmed: true,
  },
  {
    id: "sub-018",
    desa: "Pengasih",
    kelompok: "Sendangsari",
    nama: "Nur Aini",
    submittedAt: "2026-10-12T14:05:00+07:00",
    data: "Nur Aini — Universitas Negeri Yogyakarta — 2022",
    confirmed: true,
  },
  {
    id: "sub-017",
    desa: "Wates",
    kelompok: "Krembangan",
    nama: "Bagas Aditya",
    submittedAt: "2026-10-11T19:40:00+07:00",
    data: "Bagas Aditya — Universitas Amikom Yogyakarta — 2023",
    confirmed: true,
  },
  {
    id: "sub-016",
    desa: "Lendah",
    kelompok: "Bumirejo",
    nama: "Maya Safitri",
    submittedAt: "2026-10-11T16:25:00+07:00",
    data: "Maya Safitri — UIN Sunan Kalijaga — 2024",
    confirmed: true,
  },
  {
    id: "sub-015",
    desa: "Temon",
    kelompok: "Hargorejo",
    nama: "Rian Setiawan",
    submittedAt: "2026-10-11T11:05:00+07:00",
    data: "Rian Setiawan — Universitas Gadjah Mada — 2021",
    confirmed: true,
  },
  {
    id: "sub-014",
    desa: "Pengasih",
    kelompok: "Banjarharjo",
    nama: "Nabila Putri",
    submittedAt: "2026-10-10T13:15:00+07:00",
    data: "Nabila Putri — UIN Sunan Kalijaga — 2024",
    confirmed: true,
  },
  {
    id: "sub-013",
    desa: "Wates",
    kelompok: "Bojong",
    nama: "Arif Hidayat",
    submittedAt: "2026-10-10T09:15:00+07:00",
    data: "Arif Hidayat — Universitas Teknologi Yogyakarta — 2022",
    confirmed: true,
  },
  {
    id: "sub-012",
    desa: "Lendah",
    kelompok: "Carikan",
    nama: "Laila Khairunnisa",
    submittedAt: "2026-10-09T19:30:00+07:00",
    data: "Laila Khairunnisa — Universitas Ahmad Dahlan — 2023",
    confirmed: true,
  },
  {
    id: "sub-011",
    desa: "Temon",
    kelompok: "Sidatan 1",
    nama: "Fauzan Hakim",
    submittedAt: "2026-10-09T14:50:00+07:00",
    data: "Fauzan Hakim — Universitas Negeri Yogyakarta — 2022",
    confirmed: true,
  },
  {
    id: "sub-010",
    desa: "Samigaluh",
    kelompok: "Kalirejo",
    nama: "Alya Zahra",
    submittedAt: "2026-10-08T15:00:00+07:00",
    data: "Alya Zahra — UIN Sunan Kalijaga — 2024",
    confirmed: true,
  },
  {
    id: "sub-009",
    desa: "Pengasih",
    kelompok: "Nanggulan",
    nama: "Fikri Ramadhan",
    submittedAt: "2026-10-08T11:35:00+07:00",
    data: "Fikri Ramadhan — Universitas Gadjah Mada — 2023",
    confirmed: true,
  },
  {
    id: "sub-008",
    desa: "Wates",
    kelompok: "Giripeni 2",
    nama: "Tania Wulandari",
    submittedAt: "2026-10-07T16:20:00+07:00",
    data: "Tania Wulandari — Universitas Amikom Yogyakarta — 2024",
    confirmed: true,
  },
  {
    id: "sub-007",
    desa: "Lendah",
    kelompok: "Ngentakrejo",
    nama: "Rafi Akbar",
    submittedAt: "2026-10-07T10:45:00+07:00",
    data: "Rafi Akbar — Universitas Islam Indonesia — 2023",
    confirmed: true,
  },
  {
    id: "sub-006",
    desa: "Temon",
    kelompok: "Jogoboyo",
    nama: "Putri Ananda",
    submittedAt: "2026-10-06T18:15:00+07:00",
    data: "Putri Ananda — Universitas Negeri Yogyakarta — 2022",
    confirmed: true,
  },
  {
    id: "sub-005",
    desa: "Samigaluh",
    kelompok: "Pagerharjo",
    nama: "Rizal Firmansyah",
    submittedAt: "2026-10-06T13:00:00+07:00",
    data: "Rizal Firmansyah — Universitas Gadjah Mada — 2024",
    confirmed: true,
  },
  {
    id: "sub-004",
    desa: "Pengasih",
    kelompok: "Giri Nonyo",
    nama: "Hanif",
    submittedAt: "2026-10-05T10:10:00+07:00",
    data: "Data belum diverifikasi",
    confirmed: false,
    issue: true,
  },
  {
    id: "sub-003",
    desa: "Wates",
    kelompok: "Hargowilis",
    nama: "Rina",
    submittedAt: "2026-10-04T12:00:00+07:00",
    data: "Rina — Universitas Ahmad Dahlan — 2023",
    confirmed: true,
  },
  {
    id: "sub-002",
    desa: "Lendah",
    kelompok: "Tuksono",
    nama: "Andi Saputra",
    submittedAt: "2026-10-03T14:00:00+07:00",
    data: "Andi Saputra — Universitas Negeri Yogyakarta — 2022",
    confirmed: true,
  },
  {
    id: "sub-001",
    desa: "Temon",
    kelompok: "SIDATAN 2",
    nama: "Pengirim tidak cocok",
    submittedAt: "2026-10-02T09:00:00+07:00",
    data: "Submission perlu pemetaan ulang nama kelompok",
    confirmed: true,
    issue: true,
  },
];

const submissions = mockSubmissions.map((s) => ({
  ...s,
  kelompok:
    s.kelompok === "Giri Nonyo"
      ? "Girinyono"
      : s.kelompok === "SIDATAN 2"
        ? "Sidatan 2"
        : s.kelompok,
}));

function buildGroups(list) {
  return MASTER_DATA.flatMap((v) =>
    v.kelompok.map((k) => {
      const history = list
        .filter(
          (s) =>
            s.desa === v.desa &&
            s.kelompok.toLowerCase() === k.toLowerCase(),
        )
        .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
      const latest = history[0] || null;
      return {
        id: v.desa + "::" + k,
        desa: v.desa,
        kelompok: k,
        history,
        latest,
        status: latest ? (latest.issue ? "issue" : "done") : "pending",
      };
    }),
  );
}

let allGroups = buildGroups(submissions);
let currentSubmissions = submissions;
let activeVillage = "";
const $ = (id) => document.getElementById(id);

function currentFilters() {
  return {
    q: $("searchInput").value,
    village: $("villageFilter").value,
    status: $("statusFilter").value,
    sort: $("sortSelect").value,
  };
}

function paint() {
  renderStats(
    {
      statDone: $("statDone"),
      statPending: $("statPending"),
      statIssues: $("statIssues"),
      statSubmissions: $("statSubmissions"),
      statPercent: $("statPercent"),
      mainProgress: $("mainProgress"),
    },
    allGroups,
    currentSubmissions,
  );
  renderVillageCards(
    $("villageGrid"),
    MASTER_DATA,
    allGroups,
    activeVillage,
    (desa) => {
      activeVillage = activeVillage === desa ? "" : desa;
      $("villageFilter").value = activeVillage;
      paint();
      $("groupList").scrollIntoView({ behavior: "smooth", block: "start" });
    },
  );
  renderGroups($("groupList"), $("resultCount"), allGroups, currentFilters(), (id) => {
    const g = allGroups.find((x) => x.id === id);
    if (!g) return;
    openDetail(
      {
        overlay: $("detailOverlay"),
        title: $("detailTitle"),
        subtitle: $("detailSubtitle"),
        content: $("detailContent"),
        closeBtn: $("closeDetail"),
      },
      g,
    );
  });
}

function resetFilters() {
  activeVillage = "";
  $("searchInput").value = "";
  $("villageFilter").value = "";
  $("statusFilter").value = "";
  $("sortSelect").value = "village";
  paint();
}

// Pakai data remote bila sudah ada submission nyata, mock bila belum.
function applyRemote(remote) {
  if (!remote || remote.status !== "ok") return false;
  const subs = Array.isArray(remote.submissions) ? remote.submissions : [];
  if (!subs.length) return false;
  currentSubmissions = subs;
  allGroups = remote.groups;
  paint();
  const issues = allGroups.filter((g) => g.status === "issue").length;
  $("statIssues").textContent = issues;
  return true;
}

function init() {
  $("villageFilter").innerHTML =
    '<option value="">Semua desa</option>' +
    MASTER_DATA.map(
      (v) => `<option value="${esc(v.desa)}">${esc(v.desa)}</option>`,
    ).join("");
  paint();
  ["searchInput", "villageFilter", "statusFilter", "sortSelect"].forEach((id) =>
    $(id).addEventListener(id === "searchInput" ? "input" : "change", () => {
      if (id === "villageFilter") activeVillage = $("villageFilter").value;
      paint();
    }),
  );
  $("resetBtn").addEventListener("click", resetFilters);
  $("closeDetail").addEventListener("click", () =>
    closeDetail($("detailOverlay")),
  );
  $("closeDetailBottom").addEventListener("click", () =>
    closeDetail($("detailOverlay")),
  );
  $("detailOverlay").addEventListener("click", (e) => {
    if (e.target === $("detailOverlay")) closeDetail($("detailOverlay"));
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDetail($("detailOverlay"));
  });
  fetchDashboard().then(applyRemote);
}

init();
