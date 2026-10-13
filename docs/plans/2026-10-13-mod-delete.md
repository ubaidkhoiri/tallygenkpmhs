# MOD hapus dan panel baru: Implementation Plan

**Spec:** docs/specs/2026-10-13-mod-delete-design.md
**Goal:** MOD hapus submission permanen anti-reconcile, panel terstruktur
**Architecture:** Tabel blocklist di Neon, endpoint DELETE sesi MOD, frontend daftar kelompok lalu submission

## Global constraints
- Reconcile lewati id di deleted_submissions
- Hapus lepas pin gantung dalam satu transaksi
- Konfirmasi dua ketuk, audit tiap hapus
- Tanpa login tak ada aksi aktif

### Task 1: blocklist plus lewati reconcile → verify: test lewati blocklist lolos

**Files:**
- Create: `db/002-blocklist.sql`
- Modify: `src/sync.js`
- Create: `tests/delete.test.mjs`

- [ ] Step 1: Tulis db/002-blocklist.sql (deleted_submissions, submission_id text pk, deleted_at timestamptz default now)
- [ ] Step 2: src/sync.js reconcileAll cek blocklist per id, skip upsert bila ada
- [ ] Step 3: tests/delete.test.mjs minimal 1 test skip blocklist pakai sql mock
- [ ] Step 4: Run `npm test`
- [ ] Step 5: Run `npm run migrate`
- [ ] Step 6: Commit

### Task 2: endpoint hapus MOD → verify: tanpa sesi 401, hapus 200 plus audit

**Files:**
- Modify: `src/mod.js`
- Modify: `src/index.js`

- [ ] Step 1: src/mod.js modDeleteSubmission(sql, submissionId): transaksi hapus pin, hapus submissions, tulis blocklist, tulis audit delete-submission
- [ ] Step 2: src/index.js DELETE /api/mod/delete, 400 tanpa submissionId, butuh sesi
- [ ] Step 3: Live wrangler dev: 401 tanpa sesi, hapus submission test 200, audit ada
- [ ] Step 4: Commit

### Task 3: panel baru plus override di sheet → verify: halaman muat, aksi terkunci pra-login

**Files:**
- Modify: `public/js/mod.js`
- Modify: `public/js/app.js`
- Modify: `public/js/render.js`

- [ ] Step 1: mod.js rombak: details login, daftar kelompok berisi submission, tombol Jadikan utama dan Hapus dua ketuk, expose status login ke app
- [ ] Step 2: render.js openDetail tampilkan editor override bila sesi MOD aktif, kirim ke /api/mod/override
- [ ] Step 3: node --check semua file public/js
- [ ] Step 4: Live wrangler dev cek markup dan alur login sampai hapus
- [ ] Step 5: Commit dan deploy
