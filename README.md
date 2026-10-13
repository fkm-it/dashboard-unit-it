# Dashboard Unit IT FKM

Sistem pengurusan Unit IT, Fakulti Kejuruteraan Mekanikal (FKM), UTM: aset IT, keperluan komputer makmal dan helpdesk dalam satu platform, dengan **Executive Overview** untuk pengurusan. Laman web + app telefon (PWA) + panel pentadbir di atas **Google Apps Script + Sheets**, dibina daripada templat [`gas-pwa-starter`](https://github.com/kirimdoa/gas-pwa-starter).

> Spesifikasi: *FKM UTM Unit IT Management Dashboard — Mockup v1.0*, *Dashboard Unit IT FKM — Mockup Design Specification* dan *Projek Kajian Keperluan Komputer Makmal FKM UTM*. Fasa 1 = MVP 4 modul (Overview, Aset, Keperluan Makmal, Helpdesk).

## Siapa buat apa

| Peranan | Boleh |
|---|---|
| Staf / pelajar FKM (tanpa akaun) | Hantar aduan IT melalui borang awam, dapat No. rujukan & makluman email |
| Pengguna (penyelaras makmal, staf) | Hantar & jejak tiket sendiri · isi banci & keperluan komputer makmal sendiri (boleh sunting semasa *Dihantar* / *Dikembalikan*) |
| Admin (Unit IT) | Executive Overview · urus aset, import CSV · sahkan/kembalikan keperluan makmal · tugaskan & selesaikan tiket · makmal, pegawai, kategori, tetapan SLA |
| Super Admin | Semua di atas + peranan pengguna, tetapan sistem |

## Peraturan domain
- **Keperluan makmal** (satu rekod aktif bagi setiap makmal setiap tahun): berfungsi + rosak (boleh dibaiki) + rosak (tidak ekonomi) = jumlah sedia ada; tidak sesuai ≤ berfungsi.
  `kekal = berfungsi − tidak sesuai + rosak boleh dibaiki` · `ganti = tidak sesuai + rosak tidak ekonomi` · `tambahan = max(0, sasaran − kekal − ganti)` · `kos = (ganti + tambahan) × harga seunit`.
- **Tiket**: SLA dari masa diterima mengikut keutamaan (lalai Kritikal 4j, Tinggi 24j, Sederhana 72j, Rendah 168j — jam kalendar; Tetapan → `SLA_JAM_*`). Menugaskan pegawai menukar *Baharu → Ditugaskan* dan mengemel pegawai. *Selesai/Ditutup* merekod masa selesai; dibuka semula mengosongkannya.
- **Aset**: No. aset unik (tidak peka huruf besar/kecil). *Beroperasi* = Berfungsi + Berfungsi tetapi tidak memadai.
- Anggaran kos = perancangan; kelulusan sebenar kekal ikut prosedur kewangan UTM.

Logik: `src/modules/<modul>/<Nama>Hooks.gs`. Overview & import: `src/modules/aset/AsetHooks.gs`, paparan `src/frontend/modules/aset.html`. Ujian domain: `src/tests/AppTests.gs`.

## Import daftar aset
Admin → **Import aset** → *Templat CSV*. Dari Excel: *Simpan sebagai → CSV UTF-8*. Pengepala boleh guna kunci (`noAset`) atau label (`No. aset`); makmal ditulis dengan kod (cth. `ME-01`) — tambah makmal dahulu. Sistem menyemak semua baris dahulu; tiada data ditulis jika ada ralat. Baris dengan No. aset sedia ada dikemas kini.

> Data contoh dalam `tools/seed-custom.js` hanya untuk dev server & E2E — bukan data sebenar FKM dan tidak dideploy.

## Pembangunan

```bash
npm test      # ujian backend (2 susunan muat)
npm run check # sintaks frontend, XSS, rahsia
npm run dev   # http://localhost:8080  (super@demo.local / Demo1234 · user@demo.local / Demo1234)
npm run e2e   # E2E pelayar (dev server mesti berjalan)
```

Setiap `git push` ke `main` → ujian → Apps Script → GitHub Pages (lihat [DEPLOYMENT.md](DEPLOYMENT.md)).

## Arahan

| Arahan | Fungsi |
|---|---|
| `npm run init -- --name … --color …` | Jenamakan sistem (nama, slogan, warna, ikon PWA) |
| `npm run new -- <key> "<Label>"` | Cipta templat JSON modul baharu |
| `npm run gen` | Jana modul daripada `modules/*.json` (`--check` dalam CI) |
| `npm test` | Semak modul terkini + ujian backend (susunan muat abjad & terbalik) |
| `npm run check` | Sintaks frontend, kebocoran API server, risiko XSS, imbasan rahsia |
| `npm run dev` | Dev server dengan backend sebenar atas mock Google + data demo |
| `npm run e2e` | Ujian E2E Playwright generik (membaca modul anda) |
| `npm run build:web` | Binaan GitHub Pages (`web/`) |
| `npm run push` | Ujian, kemudian `clasp push` (manual, tanpa CI) |

## Dokumentasi

- [CLAUDE.md](CLAUDE.md): aliran kerja untuk Claude (dan manusia) apabila membina sistem baharu daripada penerangan atau mockup
- [docs/MODULES.md](docs/MODULES.md): rujukan penuh JSON modul, hooks dan contoh (tempahan, pinjaman, pendaftaran)
- [DEPLOYMENT.md](DEPLOYMENT.md): persediaan sekali sahaja, CI/CD, Firebase, penyelesaian masalah
- [SECURITY.md](SECURITY.md): model ancaman, kawalan, senarai semak operasi
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): seni bina, aliran data, had GAS

## Struktur

```
modules/            ← takrifan modul (JSON) — SATU-SATUNYA tempat untuk menambah/ubah modul
src/
  Code.gs           doGet / doPost / api + fungsi operasi pemilik (setupDatabase, installTriggers, …)
  config/           Config (nama, versi, had), Constants, Environment (Script Properties), DeployInfo (CI)
  controllers/      Router (RBAC, satu pintu API) + pengawal nipis
  modules/          CrudEngine (enjin generik) + <key>/<Name>Module.gs (dijana) + <Name>Hooks.gs (logik anda)
  services/         Auth, User, Notification, Push (FCM), Settings, Security, Drive, Dashboard, System
  repositories/     Akses Sheets (kunci, cache permintaan, auto-tambah lajur)
  database/         Schema → SheetManager, Migration (+ autoRun selepas deploy), SeedData
  frontend/         SPA vanilla JS: css/ (tokens jenama), js/ (app, api, ui, crud, pwa), views/
  tests/            Ujian (berjalan dalam Node DAN Apps Script)
pwa/                bridge.js, sw.js, manifest, ikon, offline.html, config.js (nilai awam)
tools/              gen, init, build-web, dev-server, run-tests, e2e, scan-secrets, check-frontend
.github/workflows/  ci.yml (ujian + E2E) · deploy.yml (Apps Script + GitHub Pages)
```
