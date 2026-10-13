# CHANGELOG

## 1.2.0 — 2026-10-13 · Senarai penyelenggaraan PC makmal
### Ditambah
- **Import senarai penyelenggaraan makmal** (lajur BARKOD, LOKASI MAKMAL, NAMA ALAT, STATUS ALAT Baik/Penyelenggaraan, JENIS ASET, KEWPA, SOP, PIC MAKMAL, jadual penyelenggaraan). Rekod sedia ada dikemas kini ikut barcode — tiada pendua; medan UTMFin (kod lokasi, penjaga, status pengesahan) dikekalkan.
- Medan aset baharu: **lokasi fizikal**, *lokasi fizikal ≠ UTMFin* (ditanda automatik, boleh ditapis), PIC makmal, nama alat, monitor, kategori aset (Aset Tetap / Inventori), borang KEWPA, status penggunaan, SOP, tiga jadual penyelenggaraan.
- Pautan makmal ikut **lokasi fizikal** (mengatasi UTMFin); *Jana & pautkan* mengumpul ikut bilik fizikal dan menyahaktif makmal jana automatik yang kini kosong.
- Import: baris tanpa barcode (cth. monitor) dan pendua dalam fail kini **dilangkau dengan amaran**, bukan ralat yang menghalang import.
- Executive Overview: bilangan aset yang lokasi fizikalnya berbeza daripada UTMFin.

## 1.1.0 — 2026-10-13 · Data aset UTMFin / KEWPA
### Ditambah
- **Medan aset selaras UTMFin / senarai DATA PC**: penjaga aset (KEWPA), no. pekerja & email penjaga, penjaga terkini, **status pengesahan aset** (8 status rasmi), disemak oleh, kod lokasi (ID_LOKASI), tarikh aset, nilai pembelian, serta maklumat perolehan (deskripsi, kod SODO, PTJ, chargeline, no. rujukan PD, no. PT, requisition PM, cost center).
- **Import terus ikut lajur eksport UTMFin** (BAR_CODE, ITEM_ASSET, ID_LOKASI, STATUS ALAT, NAMA, EMAIL, DIKEMASKINI OLEH, …). Terbitan automatik: jenis & jenama daripada nama item, lokasi mesra (C24 · Aras 01 · Bilik 108), status operasi daripada status pengesahan (*telah lupus* → Dilupus, *dalam pelupusan* → Tidak boleh digunakan + cadangan Lupus), *disahkan fizikal* (kecuali "tidak dapat disahkan"), nilai "-" dianggap kosong, tahun "2019.0" diterima.
- **Jana makmal daripada lokasi aset** (Import aset → *Jana & pautkan*): bilik dengan ≥ N PC berstatus *Penjaga - Penggunaan Makmal* dijadikan rekod Makmal (penyelaras = penjaga utama), aset dipautkan ikut kod lokasi; import seterusnya dipautkan automatik. Makmal ada medan baharu *Kod lokasi UTMFin*.
- Executive Overview: panel **Pengesahan aset (KEWPA)** dan **Semakan oleh pegawai IT**, nilai perolehan aset aktif.

### Dibaiki
- Teras: medan `int` pilihan yang kosong kini kekal kosong (sebelum ini dipaparkan sebagai 0 dan menyebabkan sunting gagal validasi `min`, cth. tahun perolehan). Jenis lajur baharu `intOrNull`.
- Nilai KPI panjang (RM) tidak lagi terpotong ke baris baharu pada desktop.

## 1.0.0 — 2026-10-13 · Dashboard Unit IT FKM (Fasa 1 / MVP)
Dibina daripada templat `gas-pwa-starter` 0.4.3.

### Modul
- **Executive Overview** (`/admin`): kad KPI (aset, tiket terbuka/lewat SLA, keperluan PC makmal, anggaran bajet, isu keutamaan tinggi), pematuhan SLA 6 bulan, status aset, tiket ikut kategori, 5 keperluan makmal utama, isu perlu tindakan, beban kerja pegawai, kualiti & liputan data. Semua angka dikira daripada rekod (`aset.overview`) dan boleh diklik ke rekod sumber. Statistik sistem asal dipindah ke `/admin/sistem`.
- **Aset IT**: daftar aset (jenis, model, makmal, spesifikasi, waranti, lesen OS, keadaan, cadangan, pengesahan fizikal), status operasi, No. aset unik.
- **Import aset** (`/admin/import-aset`): CSV (koma/koma bertitik, UTF-8 BOM Excel), pengepala ikut kunci atau label, enum/status ikut label, makmal ikut kod; semakan dahulu, ralat per baris, upsert ikut No. aset, templat CSV.
- **Keperluan Komputer Makmal**: banci per makmal per tahun oleh penyelaras; kiraan automatik ganti / tambahan / kos; aliran Dihantar → Dikembalikan / Disahkan Unit IT / Ditolak.
- **Helpdesk (Tiket)**: borang awam tanpa akaun + pengguna log masuk; kategori aduan IT; keutamaan & SLA (jam kalendar, boleh diubah di Tetapan); penugasan pegawai (status → Ditugaskan, email pegawai); cap masa diakui/selesai.
- **Makmal** dan **Pegawai IT** (data induk).

### Teras
- Ujian kategori templat tidak lagi bergantung pada satu kategori `Umum` (`TestHelpers.singleCategory`).
- E2E menerima dashboard admin tersuai (`.stat` atau `.xo-kpi`).

## 0.4.3 — 2026-10-06
- Mod `/exec` dibaiki: HtmlService merosakkan komen blok dengan `/*` bersarang → `SyntaxError`, app tidak dimuat. `tools/build-gas.js` membuang komen skrip frontend ke `build/gas` sebelum `clasp push` (CI). `npm run check` melarang `/*` bersarang dalam komen. Web Pages juga tanpa komen skrip.

## 0.4.2 — 2026-10-06
- Idempotensi peringkat Router (`meta.rid`): semua tindakan dicuba semula secara selamat apabila Google gagal menghantar jawapan (404 URL echo / tamat masa). Mesej ralat sambungan menyertakan punca ringkas.


## 0.4.1 — 2026-10-06
- `public.bootstrap` (config + modul dalam satu eksekusi) + salinan simpanan pelayar: app dibuka serta-merta pada lawatan seterusnya.
- `AppCache.rememberFor(['SHEET'], key, ttl, fn)`: cache bacaan yang dibatalkan automatik bila sheet ditulis melalui repository.
- `KD.api`: tindakan baca dicuba semula 2 kali jika sambungan gagal; `bridge.js` had masa 45 s untuk permintaan biasa.


## 0.4.0 — 2026-10-06
- **Hook `hourly`** (kerja setiap jam, cth. peringatan beberapa jam sebelum). Pencetus `hourlyMaintenance` dipasang automatik selepas deploy (migrasi automatik) dan oleh penyelenggaraan harian; tiada langkah manual.
- **i18n halaman awam**: `KD.i18n.add('en', kamus, peraturan)` + `KD.t()`; butang BM/EN muncul di pengepala awam bila kamus wujud. Bahasa dihantar ke pelayan (`meta.lang` → `ctx.lang`, juga dalam borang awam) dan `NotificationService.email(…, { lang: 'en' })`.
- `KD.detailActions[<modul>]` (butang tambahan di halaman butiran rekod) dan `KD.heroCta` (ganti butang utama landing).
- Kesihatan Sistem: `hourlyTriggerInstalled`.


## 0.3.0 — 2026-10-06
Penambahbaikan daripada membina Sistem Tempahan Ruang FKM.
- **Pendaftaran ditutup** kini disokong sepenuhnya: Super Admin pertama (`BOOTSTRAP_SUPER_ADMIN_EMAIL`) masih boleh mendaftar (`SETUP_PENDING` dalam config awam); pautan "Daftar" disembunyikan apabila ditutup; seed demo & E2E berfungsi dengan pendaftaran ditutup.
- **Ujian domain projek**: isytihar `AppTests.suites()` dalam `src/tests/` → dijalankan oleh `npm test` dan `runTestsPart5` di editor.
- E2E: `tools/e2e-values.json` (nilai medan khusus projek), dan semua halaman awam tersuai (`KD.extraRoutes`) disemak pada 360px.
- `publicForm.successLink` (butang pada halaman berjaya, cth. "Semak status").
- Warna jenama dalam emel (`CONFIG.BRAND_COLOR`, diset oleh `npm run init`).
- Menu Kategori disembunyikan jika tiada modul menggunakan medan `category`; nama pendek pada pengepala awam di telefon (elak skrol mendatar).
- Mock GAS: `Range.getDisplayValues()`.


## 0.2.0 — 2026-10-06
- Jenis medan **`ref`** (rujuk rekod modul lain, cth. ruang/peralatan): pilihan dalam borang dalaman & awam, label, penapis, validasi (hook `selectable`).
- Hook **`beforeStatus`** (halang perubahan status — cth. semak semula pertindihan semasa lulus) dan **`routes`** (laluan API khusus modul tanpa mengubah Router).
- `publicForm.rateKeyField` — had kadar borang awam per pemohon.
- Frontend: `KD.extraRoutes`, `KD.extraNav`, `KD.landingCards` untuk halaman tersuai; borang diisi awal daripada query URL.
- Data demo khusus melalui `tools/seed-custom.js`.

## 0.1.1 — 2026-10-06
- Storan pelayar (sesi, token push, pilihan) diasingkan mengikut `APP_SLUG` — beberapa sistem boleh dihoskan di bawah `<org>.github.io` yang sama tanpa sesi bertindih.
- DEPLOYMENT.md §0: pilihan hosting (organisasi, repo, domain sendiri).

## 0.1.0 — 2026-10-05
Versi pertama templat, diekstrak daripada Kirim Doa 1.6.1.

- **Enjin modul generik** (`CrudEngine`): modul ditakrif dalam `modules/*.json`; CRUD, aliran status, borang awam, lampiran Drive, no. rujukan, eksport CSV, notifikasi (app/telefon/email), hooks domain.
- **Penjana** `npm run gen` / `npm run new` dengan validasi JSON yang menerangkan kesilapan; `--check` untuk CI.
- **Jenama** `npm run init`: nama, slogan, warna (palet + semakan kontras), ikon PWA dijana tanpa kebergantungan.
- **Frontend dipacu metadata**: laluan, menu, navigasi telefon, dashboard, senarai/butiran/borang dijana pada masa larian; paparan tersuai pilihan per modul.
- **Migrasi automatik selepas deploy** (`Migration.autoRun`).
- **CI/CD GitHub Actions**: ujian (2 susunan muat) + E2E generik + semakan telefon 360px → `clasp push` + `update-deployment` → GitHub Pages; `DeployInfo.gs` (URL awam, commit).
- **Imbasan rahsia** (`tools/scan-secrets.js`).
- Teras dikekalkan daripada Kirim Doa: auth PBKDF2+pepper, sesi, RBAC, audit, tetapan runtime, kesihatan sistem, sandaran harian, push FCM v1 + lencana ikon, PWA + pasang, binaan GitHub Pages dengan CSP ketat.
