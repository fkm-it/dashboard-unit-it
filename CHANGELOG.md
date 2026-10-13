# CHANGELOG

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
