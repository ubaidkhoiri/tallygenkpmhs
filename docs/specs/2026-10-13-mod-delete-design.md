---
title: mod-delete-redesign
date: 2026-10-13
status: approved
---

# MOD hapus submission dan panel baru: Design

## Problem

Data percobaan masuk Neon dan tampil di dashboard. Hapus di Tally saja tak cukup karena reconcile hanya tambah dan update, tak pernah hapus. Panel MOD sekarang datar: semua aksi sekaligus, sulit dipakai.

## Goals

- MOD bisa hapus satu submission dari dashboard dan submission itu tak masuk lagi lewat reconcile. Kriteria: setelah hapus, row hilang dari submissions dan GET /api/dashboard tak lagi tampilkan, walau cron jalan.
- Setiap hapus tercatat di audit. Kriteria: baris audit action delete-submission ada.
- Panel MOD terstruktur: login lipat, daftar kelompok berisi submission, aksi per submission. Kriteria: tanpa login tak ada tombol aksi aktif.

## Non-goals

- Undo hapus. Hapus permanen.
- Hapus di sisi Tally. User hapus manual di dashboard Tally.

## Constraints

- Reconcile harus lewati id terhapus. Tabel baru deleted_submissions.
- Hapus submission yang sedang dipin harus lepas pin dulu agar tak ada pin gantung.
- Konfirmasi dua ketuk sebelum hapus, karena permanen.
- Password tetap satu di env, sesi cookie httpOnly.

## Approach

Migrasi 002 bikin tabel deleted_submissions(submission_id pk, deleted_at). Reconcile cek blocklist sebelum upsert, skip bila ada. DELETE /api/mod/delete terima submissionId, butuh sesi, dalam satu transaksi: hapus pin bila menunjuk id itu, hapus row submissions, tulis blocklist, tulis audit. Frontend rombak: details login, daftar kelompok (dari /api/dashboard, hanya yang history tak kosong), ketuk kelompok tampilkan submissionnya, tiap baris tombol Jadikan utama dan Hapus (ketuk kedua konfirmasi). Override pindah ke sheet detail kelompok, tampil hanya bila sesi MOD aktif.

## Alternatives considered

- Soft delete flag di submissions: ditolak, baris mati menumpuk dan kontrak dashboard harus filter di tiap query.
- Hapus tanpa blocklist: ditolak, reconcile 10 menit masukkan lagi dari Tally.

## Testing

- Unit reconcile lewati blocklist.
- Live: hapus submission test, cek dashboard hilang, audit ada, cron jalan row tetap tak ada.

## Open questions

N/A: user setuju desain dan minta kerjakan.
