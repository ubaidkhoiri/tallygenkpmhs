---
title: tally-neon-dashboard
date: 2026-10-13
status: approved
---

# tally-neon-dashboard: Design

## Problem
Dashboard monitoring 31 kelompok per 5 desa masih prototipe `index.html` dengan mock data. Data nyata ada di Tally form `https://tally.so/r/RGXQKl`, ID pendek `RGXQKl` belum tentu sama dengan `formId` internal API. Polling langsung tiap browser ke Tally kena limit 100 request per menit. Perlu satu sumber utama bersama yang realtime untuk data baru, tetap sinkron untuk edit lama, plus akses MOD untuk pin submission utama dan edit override.

## Goals
- Webhook Tally `FORM_RESPONSE` masuk Neon maksimal 60 detik setelah submit saat Worker online, diukur dari `submittedAt` ke row Neon.
- Upsert idempoten: submission id yang sama dengan hash payload sama tidak tulis ulang, dibuktikan dengan test kirim event ganda.
- Cron reconcile tiap 10 menit menangkap edit lama di Tally dan update Neon tanpa timpa pin MOD, dibuktikan dengan test ubah payload lalu reconcile.
- Dashboard baca Neon via `GET /api/dashboard` dengan kontrak blueprint, polling browser 30 detik ke Worker tidak tambah request Tally.
- MOD unlock dengan satu password dari env, pin primary per kelompok, edit override tersimpan di Neon, semua mutasi tercatat di audit log.
- UI lama di `index.html` dipakai ulang: statistik kelompok unik, terbaru per kelompok, riwayat, cari, filter, sortir, bottom sheet, render teks aman.

## Non-goals
- Tulis balik ke Tally. Tally tetap upstream read only, semua koreksi MOD hanya di Neon.
- Akun MOD per orang, role bertingkat, atau reset password mandiri.
- Deteksi device pengirim otomatis. Pilihan primary dilakukan manual oleh MOD.
- Migrasi data historis di luar Tally API dan webhook payload.

## Constraints
- Secret hanya di env Worker: `TALLY_API_KEY`, `TALLY_FORM_ID`, `TALLY_SIGNING_SECRET`, `MOD_PASSWORD`, `DATABASE_URL` Neon. Tidak ada secret di browser, tidak dikirim ke chat.
- Frontend tidak panggil Tally langsung. Hanya `GET /api/dashboard` publik plus endpoint MOD terkunci.
- Render semua jawaban sebagai teks, bukan HTML. Jangan tampilkan URL privat Tally kecuali dinyatakan publik.
- Driver Neon pakai `@neondatabase/serverless` via HTTP fetch agar jalan di Workers. Alternatif Hyperdrive dicatat bila fetch driver mentok.
- Polling browser 30 detik tanpa interval ganda. Gagal Tally tampilkan label basi, bukan label segar.
- Master data 5 desa 31 kelompok dari `index.html:776-833` jadi acuan, normalisasi spasi dan kapital, mismatch masuk anomali.

## Approach
Worker plus Static Assets layani UI dan API. Neon jadi sumber utama baca. Tally jadi upstream tulis.

Komponen:
- `src/index.js`: router. `GET /api/dashboard` baca Neon. `POST /api/tally-webhook` verifikasi signature lalu upsert. `POST /api/mod/unlock` cek password lalu terbitkan sesi. `POST /api/mod/pin` dan `POST /api/mod/override` cek sesi lalu tulis. Cron handler `scheduled` untuk reconcile.
- `src/tally.js`: client `GET /forms/{formId}/submissions` dengan pagination `page`, `limit` max 500, `afterId`, filter `completed`, header `Authorization Bearer` plus `tally-version`.
- `src/normalize.js`: petakan jawaban per `questionId` ke field nama pengirim, desa, kelompok, data mahasiswa, persetujuan. Pilih terbaru per kelompok pakai `submittedAt`, tie breaker submission id. Hitung hash payload untuk skip tulis ulang.
- `src/master-data.js`: pindahan `MASTER_DATA` dari `index.html`, tambah id stabil per desa dan kelompok.
- `migrations/001_init.sql`: tabel `submissions`, `group_pins`, `mod_overrides`, `mod_audit`, `sync_state`.
- `public/`: pecahan `index.html` jadi `index.html` plus `css/app.css` plus `js/app.js`, `js/api.js`, `js/render.js`. Tambah mode MOD: tombol unlock, pilih primary, form edit, label override dan pin.

Data flow baca: browser tampilkan cache localStorage dulu, fetch dashboard dari Neon, render, simpan cache, update jam. Gagal fetch tampilkan cache plus label basi.
Data flow tulis baru: Tally kirim webhook, Worker verifikasi, normalisasi, upsert bila id baru atau hash beda, update `sync_state`.
Data flow reconcile: cron ambil semua halaman, upsert logika sama, lewati kelompok yang ada pin aktif untuk field primary, catat mismatch ke warnings.
Data flow MOD: unlock cek password env, sesi httpOnly cookie singkat, pin tulis `group_pins`, edit tulis `mod_overrides`, semua tulis `mod_audit` dengan waktu dan payload ringkas tanpa secret.

Error handling: Tally 401 dan 404 tampilkan pesan konfigurasi. 429 backoff dan pakai data Neon plus label basi. Webhook signature salah balas 401 tanpa bocorkan detail. Neon down balas 503 dengan `fetchedAt` terakhir dari `sync_state` bila ada.

## Alternatives considered
- Webhook plus cron plus Neon: dipilih. Realtime untuk baru, reconcile untuk edit, hemat limit karena browser baca Neon.
- Cron saja tanpa webhook: ditolak untuk utama karena telat sampai 10 menit, tapi tetap jadi fallback bila webhook mati. Reconcile cron pada pendekatan dipilih sudah mencakup fungsi ini.
- Cache localStorage saja tanpa Neon: ditolak sebagai sumber utama karena cache milik tiap HP, tidak berbagi, tetap kena limit Tally, kapasitas sekitar 5MB. Tetap dipakai sebagai cache tampilan saja.

## Testing
- Unit normalize: mapping questionId, tie breaker waktu identik, normalisasi desa dan kelompok, deteksi mismatch.
- Unit upsert: event ganda tidak tulis ulang, hash sama skip, hash beda update, pin tidak tertimpa reconcile.
- Integrasi: webhook dengan signature salah ditolak, dashboard baca Neon sesuai kontrak blueprint, MOD tanpa sesi ditolak, audit tertulis.
- Manual: submit Tally asli, cek masuk Neon di bawah 60 detik, edit submission lama, tunggu cron, cek update, pin primary via MOD, cek dashboard pakai pin.

## Open questions
- N/A: formId internal sudah bisa dikonfirmasi via Tally API saat implementasi memakai key milik pengguna, tidak perlu jawaban chat.
