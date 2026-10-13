// Master data resmi 5 desa dan 31 kelompok. Sumber: daftar pengguna.
// Id stabil berupa slug, dipakai sebagai group_id di Neon dan API.

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const RAW = [
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

export const VILLAGES = RAW.map((v) => ({
  id: slug(v.desa),
  name: v.desa,
  groups: v.kelompok.map((k) => ({
    id: slug(v.desa) + "--" + slug(k),
    name: k,
  })),
}));

export const GROUPS_FLAT = VILLAGES.flatMap((v) =>
  v.groups.map((g) => ({ id: g.id, desa: v.name, kelompok: g.name })),
);
