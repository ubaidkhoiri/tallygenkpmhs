# Spesifikasi Teknis Final — Dashboard Monitoring Tally

Status: blueprint dikunci · tahap berikutnya: implementasi

Keputusan final: Cloudflare Worker + Static Assets, HTML/CSS/JavaScript modular, Tally API sebagai satu-satunya sumber submission, tanpa database, tanpa webhook, dan polling 30 detik.

Prinsip desainnya: sederhana, read-only, mobile-first, minim dependency, dan tidak menyimpan salinan data submission secara permanen di luar Tally.

## 1. Spesifikasi sistem

| Area              | Keputusan final                                                                 |
| ----------------- | ------------------------------------------------------------------------------- |
| Hosting           | Cloudflare Workers Static Assets                                                |
| Backend           | Cloudflare Worker                                                               |
| Frontend          | HTML5, CSS modern, JavaScript ES Modules                                        |
| Data source       | Tally API                                                                       |
| Autentikasi Tally | API key dalam Worker Secret                                                     |
| Database          | Tidak ada                                                                       |
| Cache             | Tidak ada cache persisten; cache memori opsional tidak menjadi sumber kebenaran |
| Refresh           | Polling 30 detik, refresh saat halaman dibuka, tombol refresh manual            |
| Master data       | Hardcode 5 desa dan 31 kelompok                                                 |
| Akses             | Publik, read-only                                                               |
| Riwayat           | Semua submission valid tetap berasal dari Tally                                 |
| Data utama        | Submission terbaru per kelompok                                                 |
| UI                | Mobile-only, light mode                                                         |
| Dependensi        | Minimal; tanpa framework frontend                                               |

### Batasan yang diterima

Tanpa database, setiap permintaan yang memerlukan data terbaru bergantung pada ketersediaan Tally API. Jika API lambat atau gagal, dashboard harus menampilkan status kegagalan secara jujur, bukan menganggap data yang lama sebagai data terbaru.

Polling 30 detik juga bukan jaminan data selalu berubah tepat setiap 30 detik. Waktu aktual bergantung pada latensi API, ukuran data, pagination, dan rate limit Tally.

## 2. Integrasi Tally API

Endpoint utama yang akan digunakan:

`GET https://api.tally.so/forms/{formId}/submissions`

Parameter yang tersedia mencakup `page`, `limit`, `filter`, `startDate`, `endDate`, dan `afterId`. Setiap respons memiliki `hasMore`, sehingga backend harus memeriksa pagination sebelum menganggap data lengkap. Batas `limit` adalah 500 submission per halaman.

![](https://www.google.com/s2/favicons?domain=https://developers.tally.so\&sz=32)

Tally Developer Docs

Header autentikasi:

http

```
Authorization: Bearer <TALLY_API_KEY>
tally-version: 2025-02-01
```

Versi API tersebut digunakan sebagai contoh versi yang didokumentasikan Tally; versi final harus dikonfirmasi saat implementasi.

![](https://www.google.com/s2/favicons?domain=https://developers.tally.so\&sz=32)

Tally Developer Docs

+1

### Aturan pengambilan data

* Hanya mengambil submission completed untuk statistik utama.

* Mengambil semua halaman yang diperlukan untuk riwayat lengkap.

* Tidak mengasumsikan satu halaman sudah memuat seluruh submission.

* Memetakan jawaban berdasarkan `questionId` atau ID field stabil, bukan hanya judul pertanyaan.

* Mengabaikan submission yang tidak memenuhi kriteria valid dengan tetap memberikan indikator jika ada data yang perlu diperiksa.

* Menyediakan error yang jelas untuk API key tidak valid, form ID salah, rate limit, dan gangguan Tally.

Catatan performa: Tally membatasi API hingga 100 request per menit. Jika 50 orang membuka dashboard dan masing-masing polling setiap 30 detik, itu sudah berpotensi mencapai 100 request per menit, bahkan sebelum kebutuhan pagination.

![](https://www.google.com/s2/favicons?domain=https://developers.tally.so\&sz=32)

Tally Developer Docs

+1

Karena itu, kita perlu mempertahankan satu request agregat ke Worker per siklus refresh, membatasi request publik, dan menguji jumlah submission. Tanpa cache bersama, tidak ada jaminan skala publik yang besar tetap berada dalam kuota.

## 3. Kontrak API dashboard

Frontend tidak boleh berkomunikasi langsung dengan Tally API.

| Endpoint Worker               | Respons                                              |
| ----------------------------- | ---------------------------------------------------- |
| `GET /api/dashboard`          | Ringkasan, status 31 kelompok, dan daftar submission |
| `GET /api/submissions/:id`    | Detail satu submission                               |
| `GET /api/groups/:id/history` | Riwayat submission kelompok                          |

Untuk menghindari beberapa permintaan ke Tally dalam satu siklus, endpoint pertama menjadi endpoint utama dashboard. Frontend melakukan pencarian, filter, sortir, dan perhitungan tampilan berdasarkan respons tersebut. Detail yang sudah termuat dapat dibuka tanpa request tambahan.

Jika jumlah submission membesar, kita perlu meninjau kembali pendekatan ini karena semua riwayat akan memerlukan pagination dan transfer data yang lebih besar.

### Format respons internal

JSON

```
{
  "status": "ok",
  "fetchedAt": "2026-10-13T13:00:00.000Z",
  "totals": {
    "villages": 5,
    "groups": 31,
    "submittedGroups": 0,
    "pendingGroups": 31,
    "submissions": 0
  },
  "groups": [],
  "submissions": [],
  "warnings": []
}
```

Nilai di atas adalah contoh kontrak, bukan data submission aktual. Implementasi akan menghasilkan statistik dari data Tally yang berhasil diambil.

## 4. Struktur file final

Struktur dibuat kecil, tanpa bundler, tanpa framework, dan tanpa dependency runtime tambahan.

tally-monitor/

wrangler.jsonc

Konfigurasi Worker, Static Assets, route API, compatibility date.

src/

index.js

Router API, autentikasi server ke Tally, validasi parameter, error handling.

tally.js

HTTP client Tally, pagination, timeout, pemetaan response.

normalize.js

Normalisasi jawaban dan pemilihan submission terbaru.

master-data.js

Konfigurasi resmi 5 desa dan 31 kelompok.

public/

index.html

Struktur semantik dan layout mobile.

css/app.css

Design tokens, kartu, accordion, bottom sheet, responsivitas.

js/app.js

State UI, polling 30 detik, pencarian, filter, sortir, interaksi.

js/api.js

Client API Worker dan penanganan kegagalan jaringan.

js/render.js

Render statistik, desa, submission, detail dan riwayat dengan aman.

README.md

Setup lokal, secret, konfigurasi form, pengujian, deployment.

Konfigurasi Worker Static Assets mengikuti dokumentasi resmi Cloudflare; request `/api/*` harus diarahkan ke Worker sebelum penanganan aset statis.

![](https://www.google.com/s2/favicons?domain=https://developers.cloudflare.com\&sz=32)

Cloudflare Workers docs

+1

## 5. Aturan master data dan normalisasi

Master data harus memiliki ID internal yang stabil. Contoh struktur berikut hanya ilustrasi format, bukan nama desa atau kelompok sebenarnya.

JavaScript

```
export const VILLAGES = [
  {
    id: "desa-a",
    name: "Nama Desa Resmi",
    groups: [
      { id: "kelompok-01", name: "Nama Kelompok Resmi" }
    ]
  }
];
```

Implementasi final harus memuat seluruh 5 desa dan 31 kelompok dari daftar resmi yang kamu berikan.

Aturan pemetaan:

1. Cocokkan desa dan kelompok dengan master data.

2. Normalisasi spasi dan kapitalisasi untuk membantu pencocokan.

3. Jangan menganggap dua kelompok berbeda sebagai satu kelompok hanya karena nama mereka mirip.

4. Kelompok yang tidak cocok masuk daftar anomali.

5. Pilih submission terbaru berdasarkan `submittedAt`, bukan urutan array dari API.

6. Jika dua submission memiliki waktu identik, gunakan ID submission sebagai tie-breaker yang konsisten.

## 6. Keamanan dan privasi

Walaupun seluruh data dipilih untuk ditampilkan secara publik, tetap ada beberapa batasan teknis yang wajib diterapkan.

* API key hanya tersedia di Worker Secret bernama `TALLY_API_KEY`.

* `formId` disimpan dalam konfigurasi server, bukan parameter bebas yang dapat digunakan pengunjung untuk membaca form lain.

* Endpoint publik hanya menggunakan metode `GET`.

* Batasi ukuran respons, jumlah request, dan timeout.

* Render semua jawaban sebagai teks, bukan HTML.

* Jangan menampilkan link PDF atau URL privat dari respons Tally kecuali memang dibutuhkan dan telah dinyatakan publik.

* Jangan mencatat isi paragraf mahasiswa atau API key ke log.

* Pastikan persetujuan pada form memang mencakup publikasi data yang ditampilkan.

Penting: API key yang aman tidak otomatis membuat endpoint publik aman dari penyalahgunaan. Pengunjung tetap dapat memanggil endpoint Worker berulang kali dan menghabiskan kuota Tally. Pembatasan request harus menjadi bagian dari implementasi.

## 7. Kriteria penerimaan sebelum dianggap selesai

### Checklist QA

0/10

Seluruh 5 desa dan 31 kelompok berasal dari master data yang ditetapkan.

Statistik menghitung kelompok unik, bukan jumlah submission.

Submission terbaru menjadi data utama dan riwayat lama tetap tersedia.

Pagination Tally diproses sampai seluruh halaman yang dibutuhkan terambil.

Polling berjalan setiap 30 detik tanpa membuat interval baru pada setiap refresh.

Refresh manual, loading, error, dan waktu pembaruan terakhir berfungsi.

Pencarian, filter, sortir, accordion, dan bottom sheet berfungsi di layar HP.

API key tidak pernah dikirim ke browser.

Dashboard tidak mempunyai fitur tulis atau menghapus submission.

Kegagalan Tally tidak menampilkan data lama sebagai data terbaru.

## 8. Input yang diperlukan sebelum coding

Spesifikasi teknis sudah dikunci. Yang belum boleh ditebak adalah konfigurasi nyata form.

1. Tally Form ID atau URL form

API key tidak perlu dikirim ke chat.

2. Daftar resmi desa dan kelompok

Belum siap — gunakan placeholder dulu

Sudah siap — akan diberikan untuk konfigurasi

3. Persetujuan publikasi data

Sudah mencakup publikasi seluruh data submission

Perlu diperiksa lagi, khususnya paragraf data mahasiswa

Lanjutkan persiapan implementasi

Referensi utama: [Tally API](https://developers.tally.so/api-reference/introduction?utm_source=chatgpt.com), [Listing submissions](https://developers.tally.so/api-reference/endpoint/forms/submissions/list?utm_source=chatgpt.com), [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/?utm_source=chatgpt.com).




## 9. Pemeriksaan form yang sudah diberikan

Aku sudah membuka form [Generus Mahasiswa Kulon Progo](https://tally.so/r/RGXQKl?utm_source=chatgpt.com). Label yang terlihat pada form cocok dengan kebutuhan dashboard.

![](https://www.google.com/s2/favicons?domain=https://tally.so\&sz=32)

Tally Forms

Field yang perlu dipetakan:

| Field          | Fungsi di dashboard                                                                 |
| -------------- | ----------------------------------------------------------------------------------- |
| Nama Pengirim  | Identitas admin yang mengirim                                                       |
| Desa           | Pemetaan ke master desa                                                             |
| Kelompok       | Pemetaan ke master kelompok                                                         |
| Data Mahasiswa | Paragraf detail; jika tidak ada, form mengarahkan pengisi menulis `Kosong` atau `-` |
| Persetujuan    | Status konfirmasi bahwa data sudah dicek dan terbaru                                |

Form tersebut juga menyebut contoh format data mahasiswa berupa nama, kampus, dan tahun masuk. Untuk UI, isi paragraf tetap ditampilkan sesuai teks asli, bukan dipecah atau ditafsirkan otomatis menjadi daftar mahasiswa.

Catatan teknis: `RGXQKl` adalah ID pendek yang terlihat pada URL publik. Kita belum boleh menganggapnya sebagai `formId` internal yang digunakan endpoint API. ID yang tepat perlu dikonfirmasi lewat Tally API menggunakan API key milikmu. Endpoint daftar submission dan format respons resminya tersedia di dokumentasi Tally.

![](https://www.google.com/s2/favicons?domain=https://developers.tally.so\&sz=32)

Tally Developer Docs

## 10. Persiapan konfigurasi Cloudflare

Setelah proyek dibuat, konfigurasi rahasia dilakukan langsung di terminal pada direktori proyek:

PowerShell

```
npx wrangler secret put TALLY_API_KEY
```

Masukkan API key pada prompt terminal. Jangan memasukkannya ke source code atau mengirimkannya ke chat.

Konfigurasi form ID disimpan terpisah, misalnya melalui environment variable `TALLY_FORM_ID`, setelah ID internal dikonfirmasi.

Sebelum implementasi dianggap siap, kita perlu menguji:

* Autentikasi Tally API berhasil.

* Seluruh halaman submission berhasil dibaca.

* Kelima field terpetakan dengan benar berdasarkan ID pertanyaan.

* Submission terbaru dan riwayat dihitung dengan benar.

* Polling 30 detik tidak membuat request bertumpuk.

* Kegagalan API tidak menghasilkan statistik yang menyesatkan.

Satu trade-off yang tetap berlaku: tanpa cache, setiap browser aktif akan memicu permintaan Tally baru setiap 30 detik. Jadi, jika dashboard dibuka banyak orang sekaligus, kita perlu mengawasi batas API Tally.

## Langkah berikutnya

Yang masih dibutuhkan adalah master data resmi 5 desa dan 31 kelompok. Kamu bisa kirim sebagai teks sederhana, misalnya:

```
Desa 1
- Kelompok A
- Kelompok B

Desa 2
- Kelompok C
- Kelompok D
```

Tidak perlu menyiapkan format JSON. Setelah daftar itu tersedia, kita bisa membangun konfigurasi master data dan scaffold proyek sesuai blueprint yang telah dikunci, tanpa menambahkan database atau mengubah alur kerja Tally.



```js
export const MASTER_DATA = [
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
```
