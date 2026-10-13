# tally-neon-dashboard: Implementation Plan

**Spec:** docs/specs/2026-10-13-tally-neon-dashboard-design.md
**Goal:** Dashboard baca Neon sebagai sumber utama, ingest webhook plus reconcile dari Tally, MOD satu password untuk pin dan edit.
**Architecture:** Cloudflare Worker layani aset statis dan API. Neon simpan submission, pin, override, audit. Tally hanya upstream. Browser polling 30 detik ke Worker, Worker baca Neon.

Catatan urutan: tiga track dalam satu plan karena berbagi skema dan satu Worker. Urutan wajib Task 1 sampai Task 7. Tiap task berhenti di deliverable yang bisa diuji sendiri.

## Global constraints
- Secret hanya di env Worker: TALLY_API_KEY, TALLY_FORM_ID, TALLY_SIGNING_SECRET, MOD_PASSWORD, DATABASE_URL Neon.
- Frontend tidak panggil Tally langsung.
- Render semua jawaban sebagai teks, bukan HTML.
- Driver Neon pakai @neondatabase/serverless via HTTP fetch.
- Polling browser 30 detik tanpa interval ganda, gagal tampilkan label basi.
- Master data 5 desa 31 kelompok dari index.html dipakai sebagai acuan.
- Tanpa commit git: repo belum ada dan user belum minta commit, tiap task berhenti setelah verify lolos.

### Task 1: Scaffold Worker plus UI mock utuh → verify: HTTP 200 pada / dan /api/dashboard

**Files:**
- Create: `package.json`
- Create: `wrangler.jsonc`
- Create: `src/index.js`
- Create: `src/master-data.js`
- Create: `public/index.html`
- Create: `public/css/app.css`
- Create: `public/js/app.js`
- Create: `public/js/api.js`
- Create: `public/js/render.js`

- [ ] Step 1: Buat `package.json` dengan type module dan script test `node --test tests/`, tanpa dependency runtime.
- [ ] Step 2: Buat `wrangler.jsonc` dengan main `src/index.js`, assets directory `public`, compatibility date `2026-10-13`, trigger cron tiap 10 menit.
- [ ] Step 3: Pindah `MASTER_DATA` dari `index.html` ke `src/master-data.js` sebagai export `VILLAGES` dengan id stabil per desa dan kelompok, tambah export `GROUPS_FLAT` berisi 31 entri.
- [ ] Step 4: Pecah `index.html` menjadi `public/index.html`, `public/css/app.css`, `public/js/app.js`, `public/js/api.js`, `public/js/render.js` tanpa ubah tampilan dan tanpa mock bawaan yang hilang.
- [ ] Step 5: Tulis `src/index.js` dengan route `GET /api/dashboard` yang balas JSON kontrak spec berisi status ok, fetchedAt, totals, groups dari master data status pending, submissions kosong, warnings berisi satu entri mode scaffold.
- [ ] Step 6: Run `node --check src/index.js` dan `node --check src/master-data.js`.
- [ ] Step 7: Run `npx wrangler dev`, curl `/` dan `/api/dashboard`, hentikan dev server setelah bukti 200.

### Task 2: Skema Neon plus koneksi Worker → verify: migrasi exit 0 dan jumlah tabel minimal 5

**Files:**
- Create: `migrations/001_init.sql`
- Create: `src/db.js`

- [ ] Step 1: Tulis `migrations/001_init.sql` dengan tabel `submissions` (id text primary key, form_id text, submitted_at timestamptz, nama_pengirim text, desa_raw text, kelompok_raw text, desa_norm text, kelompok_norm text, data_mahasiswa text, confirmed boolean, payload_hash text, raw_json jsonb, created_at, updated_at), `group_pins` (group_id text primary key, submission_id text, updated_at), `mod_overrides` (group_id text primary key, data_mahasiswa text, updated_at), `mod_audit` (id bigserial primary key, action text, group_id text, detail text, created_at), `sync_state` (id text primary key, value text, updated_at).
- [ ] Step 2: Tulis `src/db.js` dengan fungsi `getSql(env)` yang import `@neondatabase/serverless`, baca `env.DATABASE_URL`, dan kembalikan fungsi query neon.
- [ ] Step 3: User jalankan migrasi lokal dengan DATABASE_URL miliknya via `psql`, tanpa tempel secret ke chat.
- [ ] Step 4: Run query information_schema untuk hitung tabel milik migrasi, lolos bila hasil minimal 5.

### Task 3: Client Tally plus normalisasi plus observasi questionId → verify: test runner exit 0

**Files:**
- Create: `src/tally.js`
- Create: `src/normalize.js`
- Create: `scripts/inspect-form.mjs`
- Create: `tests/normalize.test.js`

- [ ] Step 1: Tulis `scripts/inspect-form.mjs` yang baca `TALLY_API_KEY` dan `TALLY_FORM_ID` dari env lokal, panggil list submissions limit 1, cetak daftar question id dan label.
- [ ] Step 2: User run script lokal dan balas dengan peta label ke lima field: nama pengirim, desa, kelompok, data mahasiswa, persetujuan.
- [ ] Step 3: Tulis `src/tally.js` dengan fungsi `fetchAllSubmissions(env)` yang loop pagination `page` dan `afterId` sampai `hasMore` false, kirim header Authorization Bearer dan tally-version, dan fungsi `fetchFormQuestions(env)` untuk verifikasi peta.
- [ ] Step 4: Tulis `src/normalize.js` dengan fungsi `mapAnswers(submission, questionMap)` yang baca jawaban per questionId, fungsi `normalizeName(s)` untuk spasi dan kapital, fungsi `pickLatest(list)` yang pilih `submittedAt` terbesar dengan tie breaker id, dan fungsi `hashPayload(obj)` untuk banding ubah.
- [ ] Step 5: Tulis `tests/normalize.test.js` dengan kasus peta benar, tie breaker waktu identik, mismatch nama masuk anomali, hash stabil untuk objek sama.
- [ ] Step 6: Run `node --test tests/`.

### Task 4: Webhook plus reconcile idempoten → verify: event ganda tidak tulis ulang dan signature salah balas 401

**Files:**
- Create: `src/ingest.js`
- Create: `tests/ingest.test.js`
- Modify: `src/index.js`

- [ ] Step 1: Tulis `src/ingest.js` dengan fungsi `upsertSubmission(sql, row)` yang insert on conflict id do update hanya bila `payload_hash` beda, dan fungsi `syncFromTally(env, sql)` yang tarik semua halaman via `fetchAllSubmissions`, normalisasi, upsert, update `sync_state`, dan lewati timpa pin pada kelompok berpin.
- [ ] Step 2: Tambah route `POST /api/tally-webhook` di `src/index.js` yang verifikasi signature pakai `TALLY_SIGNING_SECRET`, balas 401 bila salah, normalisasi payload event, panggil `upsertSubmission`, balas 200 cepat.
- [ ] Step 3: Tambah handler `scheduled` di `src/index.js` yang panggil `syncFromTally` tiap cron.
- [ ] Step 4: Tulis `tests/ingest.test.js` dengan kasus kirim event sama dua kali lalu hitung tulis kedua nol, ubah payload lalu tulis terjadi, reconcile tidak ubah kelompok berpin.
- [ ] Step 5: Run `node --test tests/`.
- [ ] Step 6: Run `npx wrangler dev`, kirim webhook tanpa signature, catat status 401.

### Task 5: Dashboard baca Neon plus cache tampilan → verify: HTTP 200 dan kunci kontrak minimal 6 cocok

**Files:**
- Modify: `src/index.js`
- Modify: `public/js/api.js`
- Modify: `public/js/app.js`
- Modify: `public/js/render.js`

- [ ] Step 1: Ubah `GET /api/dashboard` di `src/index.js` agar baca `submissions`, `group_pins`, `mod_overrides` dari Neon, susun groups 31 dengan status done pending issue, submissions terbaru per kelompok, totals hitung kelompok unik, warnings berisi anomali dan sync_state terakhir.
- [ ] Step 2: Ubah `public/js/api.js` agar fetch dashboard tiap 30 detik dengan satu interval, tambah tombol refresh manual, simpan respons ke localStorage, saat gagal pakai cache dan tandai label basi plus jam update.
- [ ] Step 3: Sesuaikan `public/js/app.js` dan `public/js/render.js` agar render dari respons API, pertahankan cari filter sortir bottom sheet dan render teks aman.
- [ ] Step 4: Run `npx wrangler dev`, curl `/api/dashboard`, hitung kunci status, fetchedAt, totals, groups, submissions, warnings, lolos bila minimal 6 cocok.

### Task 6: MOD satu password plus pin plus override plus audit → verify: tanpa sesi balas 401 dan audit tambah minimal 1 baris

**Files:**
- Create: `src/mod.js`
- Create: `tests/mod.test.js`
- Modify: `src/index.js`
- Modify: `public/index.html`
- Modify: `public/js/app.js`

- [ ] Step 1: Tulis `src/mod.js` dengan fungsi `unlockMod(env, password)` yang bandingkan password dengan `MOD_PASSWORD` waktu konstan, fungsi `requireMod(request, env)` yang cek cookie sesi bertanda, fungsi `pinPrimary(sql, groupId, submissionId)` tulis `group_pins`, fungsi `saveOverride(sql, groupId, data)` tulis `mod_overrides`, fungsi `logAudit(sql, action, groupId, detail)` tulis `mod_audit`.
- [ ] Step 2: Tambah route `POST /api/mod/unlock`, `POST /api/mod/pin`, `POST /api/mod/override` di `src/index.js`, semua kecuali unlock wajib `requireMod`, semua mutasi panggil `logAudit` tanpa tulis secret.
- [ ] Step 3: Tambah UI MOD di `public/index.html` dan `public/js/app.js`: tombol buka MOD, input password, pilih primary dari riwayat, form edit data, label pin dan override pada kartu.
- [ ] Step 4: Run `node --test tests/` untuk test sesi dan audit pada `tests/mod.test.js` yang dibuat pada task ini.
- [ ] Step 5: Run `npx wrangler dev`, panggil pin tanpa cookie sesi, catat status 401, lalu unlock dan pin via cookie, hitung baris audit tambah minimal 1.

### Task 7: QA blueprint plus secret plus deploy → verify: tiap cek QA lolos dan deploy exit 0

**Files:**
- Modify: `README.md`

- [ ] Step 1: Tulis `README.md` berisi setup lokal, daftar secret `TALLY_API_KEY`, `TALLY_FORM_ID`, `TALLY_SIGNING_SECRET`, `MOD_PASSWORD`, `DATABASE_URL`, perintah `npx wrangler secret put` per nama, cara daftar webhook Tally ke URL Worker, dan cara uji.
- [ ] Step 2: User set lima secret via `npx wrangler secret put` di terminal lokal, tanpa tempel nilai ke chat.
- [ ] Step 3: Uji 10 cek QA blueprint: 5 desa 31 kelompok dari master, statistik kelompok unik, terbaru utama plus riwayat, pagination tuntas, interval tunggal, refresh dan jam, cari filter sortir dan sheet HP, tanpa key di browser, tanpa fitur tulis publik, gagal Tally tampil basi.
- [ ] Step 4: Run `npx wrangler deploy`.
