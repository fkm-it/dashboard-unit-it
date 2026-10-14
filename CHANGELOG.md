# CHANGELOG

## 1.18.0 — 2026-10-14 · Peralatan ICT lain dalam Penilaian Keperluan ICT Makmal
### Ditambah
- Seksyen 5 **Peralatan ICT lain** dalam borang banci makmal (`#/banci-makmal`)
  - Satu baris bagi setiap peralatan: pilih daripada senarai (projektor LCD, skrin, TV / paparan interaktif, sistem audio, kamera dokumen, pencetak, pengimbas, access point, UPS) atau "Lain-lain".
  - Isi sedia ada, bilangan dipohon, Ganti/Tambah, harga seunit dan catatan. Jumlah unit dan kos dikira serta-merta.
  - Jumlah anggaran kos keseluruhan = komputer + peralatan lain.
- Pelayan mengesahkan setiap baris (bilangan 1–500; penggantian tidak melebihi sedia ada; maks. 30 baris) dan menyimpannya dalam bentuk piawai yang mudah dibaca dalam Sheets.
- Medan dikira baharu: `bilanganPeralatan`, `anggaranKosPeralatan`.
- **Rumusan fakulti**: baris peralatan ICT lain, jadual ikut jenis peralatan, dan lajur peralatan dalam CSV. Bajet keperluan di Executive Overview kini termasuk peralatan.
- Butiran rekod keperluan memaparkan jadual peralatan.

## 1.17.0 — 2026-10-14 · Daftar pantas aset semasa stock-take
### Ditambah
- **Daftar aset ini** pada imbasan merah "Tiada dalam daftar"
  - Isi data asas sahaja: no. aset (daripada imbasan), nama alat, jenis dan no. siri (pilihan).
  - Aset terus didaftarkan di makmal/lokasi sesi dan direkod sebagai dijumpai; kiraan sesi dikemas kini.
  - Tersedia di halaman imbasan, ringkasan sesi (butang "Daftar" bagi setiap no. tidak berdaftar) dan halaman label `/qr` (aliran iPhone).
- Medan aset **Perlu dilengkapkan** (boleh ditapis dalam Aset IT). Tanda hilang sendiri apabila jenama dan model diisi.
- Kotak **Cara guna** di halaman Imbas aset (maksud hijau / kuning / merah dan aliran sesi).

## 1.16.0 — 2026-10-14 · Fasa 2b: label QR aset, stock-take & pautan tiket–aset
### Ditambah
- **Label QR aset** (Admin → Label QR aset)
  - Label boleh dicetak secara pukal mengikut makmal, jenis atau carian, pada kertas A4: 24 label (63.5 × 33.9 mm) atau 40 label (48.5 × 25.4 mm).
  - Butiran aset ada butang "Label QR" untuk mencetak satu label.
  - Kod QR pada label cetakan telah disahkan boleh dibaca.
- **Halaman imbasan label** (`#/qr?a=<no aset>`, awam)
  - Memaparkan maklumat minimum sahaja: no. aset, jenis, model, makmal dan status. Nama penjaga, nilai dan data peribadi tidak dipaparkan.
  - Butang tindakan: lapor kerosakan, Helpdesk, mohon pinjam (jika aset boleh dipinjam) dan lapor kehilangan. Borang yang dibuka akan terisi no. aset secara automatik.
  - Unit IT nampak butang "Buka rekod aset" dan "Rekod dijumpai" untuk sesi stock-take yang aktif.
- **Stock-take** (modul Sesi Stock-take)
  - Skop sesi boleh ditetapkan kepada makmal, lokasi fizikal, atau semua aset.
  - Halaman Imbas aset:
    - imbasan kamera dalam app (Chrome/Android: QR dan barcode)
    - pengimbas USB/Bluetooth atau taip no. aset
    - pilihan keadaan aset; imbasan berulang diabaikan
  - Untuk iPhone, imbas label dengan kamera telefon, kemudian tekan "Rekod dijumpai" di halaman yang terbuka.
  - Setiap imbasan direkod sebagai Pemeriksaan Aset dan rekod aset dikemas kini (tarikh semakan, disahkan fizikal, lokasi fizikal, dan keadaan rosak).
  - Ringkasan sesi menyenaraikan:
    - liputan (%)
    - aset belum dijumpai
    - aset dijumpai tetapi didaftarkan di lokasi lain
    - no. aset yang diimbas tetapi tiada dalam daftar
  - Semasa sesi ditutup, aset yang tidak dijumpai boleh direkod sebagai "Tidak dijumpai" (status pengesahan "tidak dapat disahkan", dan tindakan KEWPA dijana).
- **Tiket ↔ aset**: no. aset pada tiket Helpdesk dipadankan dengan daftar aset, dan sejarah aset memaparkan tiket berkaitan.

## 1.15.0 — 2026-10-14 · Kit peralatan, pinjaman kelas & kod QR
### Ditambah
- **Kit Peralatan** (modul baharu)
  - Satu set alat yang sama, contohnya 12 unit Raspberry Pi, didaftarkan melalui senarai no. aset. Setiap aset hanya boleh berada dalam satu kit.
  - Halaman kit memaparkan unit boleh guna, unit dipinjam dan unit tersedia.
  - Unit rosak, hilang atau dilupus tidak dikira.
  - Had maksimum unit bagi setiap permohonan boleh ditetapkan.
- **Pinjaman berkumpulan**
  - Peminjam memilih kit dan bilangan unit. Sistem menyemak baki unit tersedia mengikut tarikh, dan menyemaknya semula semasa permohonan diluluskan.
  - Semasa serahan, Unit IT memilih atau mengimbas no. aset sebenar. Jika dibiarkan kosong, sistem memilih unit secara automatik.
  - Pemulangan separa disokong: unit yang belum dipulangkan kekal ditanda dipinjam.
  - Pinjaman kit juga dipaparkan dalam sejarah setiap unit.
- **Pinjaman untuk kelas**
  - Kategori baharu "Wakil kelas / kursus" dengan maklumat kod kursus, pensyarah dan bilangan pelajar.
  - Pensyarah (email UTM) menerima salinan permohonan, keputusan dan peringatan pulang.
- **Kod QR borang pinjaman**
  - Kod QR boleh dijana untuk borang umum atau untuk kit tertentu. Borang yang dibuka melalui kod QR kit akan memilih kit itu secara automatik.
  - Pautan boleh disalin, kod QR dimuat turun sebagai SVG, atau dicetak sebagai poster.
  - Penjana QR dibina sendiri tanpa pustaka luar, dan setiap versi 1–10 telah disahkan dengan penyahkod OpenCV.

## 1.14.0 — 2026-10-14 · Kitar hayat aset (KEWPA)
### Ditambah
Lapan modul baharu, semuanya dipautkan kepada daftar Aset IT melalui **No. aset**. Daftar aset dikemas kini secara automatik.
- **Pergerakan Aset** (KEW.PA-6)
  - Staf boleh memohon untuk pindah lokasi, tukar penjaga, atau keluar FKM.
  - Apabila status ditukar kepada Selesai, lokasi fizikal, makmal dan penjaga aset dikemas kini.
  - Lokasi yang berbeza daripada UTMFin menjana tindakan KEWPA.
- **Pinjaman Aset**
  - Staf boleh memohon selepas log masuk; pelajar boleh memohon melalui borang awam (email UTM).
  - Hanya aset yang ditanda "Boleh dipinjam" boleh dimohon, untuk tempoh maksimum `PINJAMAN_MAX_HARI`, dan tarikh tidak boleh bertindih dengan pinjaman lain.
  - Pelajar wajib menyatakan penyelia.
  - Aset ditanda dipinjam semasa diserahkan dan dibebaskan apabila dipulangkan. Aset yang dipulangkan rosak bertukar status kepada Perlu dibaiki.
  - Email peringatan dihantar sehari sebelum tarikh pulang dan semasa lewat.
- **Aduan Kerosakan Aset** (KEW.PA-9)
  - Borang awam dan borang dalaman. Hanya satu aduan terbuka dibenarkan bagi setiap aset.
  - Semasa pembaikan, aset berstatus Perlu dibaiki atau Menunggu alat ganti.
  - Apabila selesai, aset kembali Berfungsi dan rekod penyelenggaraan dicipta automatik.
  - Jika tidak ekonomi dibaiki, aset ditanda Tidak boleh digunakan dengan cadangan Lupus.
- **Penyelenggaraan** (KEW.PA-14): rekod pencegahan, pembetulan dan naik taraf. Tarikh selenggara terakhir dan seterusnya disimpan pada aset, dan admin dimaklumkan sebelum penyelenggaraan berjadual.
- **Pemeriksaan Aset** (KEW.PA-10/11)
  - Merekod keberadaan, keadaan, lokasi dan pengguna sebenar, dan rekod aset dikemas kini serta-merta.
  - Aset yang tidak dijumpai ditanda "tidak dapat disahkan".
- **Penilaian Aset**
  - Penilaian keadaan menggunakan tiga skor 1–5, dan cadangan dijana automatik daripada skor.
  - Nilai semasa lalai ialah nilai buku (susut nilai).
  - Penilaian yang disahkan menjadi cadangan pada rekod aset.
- **Pelupusan Aset** (KEW.PA-16/17)
  - Aliran: Dicadangkan → Diperiksa Lembaga Pemeriksa → Diluluskan → Dilupuskan.
  - No. rujukan kelulusan, kaedah dan tarikh pelupusan wajib diisi.
  - Aset ditanda Dilupus dan tindakan KEWPA untuk mengemas kini UTMFin dijana.
- **Kehilangan Aset** (KEW.PA-28)
  - Laporan awal boleh dihantar oleh staf atau pelajar, termasuk maklumat laporan polis.
  - Aset berstatus Hilang semasa siasatan. Jika ditemui semula, status asal dipulihkan; jika tidak, aset dihapus kira.
- **Butiran aset**
  - Butang pantas untuk setiap modul (borang diisi awal dengan no. aset).
  - Sejarah lengkap aset merentas modul dan tiket Helpdesk.
- **Executive Overview**: panel "Kitar hayat aset (KEWPA)" yang memaparkan kiraan sahaja, tanpa data peribadi.
- **Status aset baharu**: Hilang, Hapus kira, dan Dipindahkan keluar FKM.
- **Medan aset baharu**: boleh dipinjam, sedang dipinjam, selenggara terakhir/seterusnya, skor keadaan dan nilai semasa.
- **Tetapan baharu**: `ASET_DOMAIN_EMAIL` (lalai `utm.my`, termasuk `graduate.utm.my`) dan `PINJAMAN_MAX_HARI` (lalai 30).

## 1.13.2 — 2026-10-14 · Supabase aktif
- Data dipindahkan ke Supabase (`pindahKeSupabase`): 22 sheet, 693 baris, semuanya tersulit.
- Laman web kini memanggil Supabase terus (`webUsesEdge: true`). Pautan lama `/exec` diteruskan ke Supabase secara automatik.
- Berpatah balik pada bila-bila masa: `pindahKeSheets()` dan tukar `webUsesEdge` kepada `false`.

## 1.13.1 — 2026-10-14 · Projek Supabase disediakan (data belum dipindah)
- Projek Supabase `dashboard-unit-it-fkm` (Singapura) dicipta; jadual storan tersulit (`private.*`) dipasang.
- `backend.json` ditambah dengan `webUsesEdge: false`: laman web masih memanggil Apps Script dan data kekal di Google Sheets.
- CI: jika secret `SUPABASE_ACCESS_TOKEN` / `SUPABASE_DATA_KEY` belum ditetapkan, deploy fungsi Supabase dilangkau dengan amaran (Apps Script & Pages tetap dideploy).

## 1.13.0 — 2026-10-14 · Backend Supabase tersulit (sedia, belum aktif)
Pilihan A, "kurangkan + sulitkan". Tiada perubahan kepada sistem yang sedang berjalan: Supabase hanya aktif selepas `backend.json` dicipta dan `pindahKeSupabase` dijalankan, iaitu selepas kelulusan UTMD.

### Ditambah
- **Backend Supabase** (Edge Function + Postgres) menjalankan kod Apps Script yang sama. Apps Script kekal sebagai pekerja untuk email, sandaran harian ke Google Drive dan lampiran.
- **Penyulitan semua data** sebelum disimpan di Supabase (AES-256-GCM):
  - baris data, Script Properties (`AUTH_PEPPER`, `FORM_SECRET`) dan baris gilir email/notifikasi disulitkan
  - nama kunci had kadar (mengandungi email) disamarkan
  - hanya ID rekod, nama sheet dan tajuk lajur kekal boleh dibaca
  - data yang diubah, dipindah antara sheet atau dibaca dengan kunci salah ditolak
- **Kunci `DATA_KEY`** berada dalam rahsia fungsi (bukan pangkalan data). `janaKunciData()` menjana kunci dan menyimpan salinan dalam Script Properties. `pindahKeSupabase()` menyemak cap jari kunci pelayan sebelum menghantar sebarang data.
- **Minimumkan data**:
  - lampiran tidak disimpan di Supabase; ia kekal dalam Google Drive UTM melalui relay bertandatangan ke Apps Script, dan hanya fail dalam folder lampiran boleh dibaca
  - kandungan email dibuang sebaik sahaja dihantar
- **Berpatah balik pada bila-bila masa**: `pindahKeSheets()`.
  - Supabase berhenti menerima tulisan dan memulangkan semua data.
  - Salinan spreadsheet sedia ada dibuat dahulu, kemudian data ditulis semula ke spreadsheet asal.
  - Email tertunggak dihantar dan mod Google Sheets diaktifkan semula.
  - Jika gagal di tengah jalan, Supabase dibuka semula dan tiada data hilang.
  - Selepas itu boleh dipindah semula ke Supabase dengan `pindahKeSupabase()`.
- **CI**:
  - ujian penyulitan, ujian integrasi Postgres (24 ujian, termasuk imbasan pangkalan data mentah untuk teks biasa) dan himpunan Edge
  - deploy fungsi menetapkan `DATA_KEY` daripada secret `SUPABASE_DATA_KEY`
  - pengimbas rahsia mengesan `DATA_KEY` dan token Supabase

## 1.12.0 — 2026-10-13 · Kesediaan Windows 11, kapasiti & status penilaian
### Ditambah
- Tiga panel baharu di **Executive Overview**:
  - **Kesediaan Windows 11**:
    - Taburan komputer kepada Windows 11, Windows 10 yang boleh dinaik taraf (Intel gen 8+ / Ryzen 2000+), Windows 10 yang perlu diganti kerana CPU tidak disokong, dan Windows 10 yang data CPU-nya tiada.
    - Senarai makmal yang masih menggunakan Windows 10.
    - Taburan RAM dan pemproses.
    - Liputan data spesifikasi.
  - **Kapasiti makmal**: bilangan PC beroperasi berbanding anggaran pengguna setiap sesi (atau tempat komputer jika kosong), dengan status Kurang, Cukup atau Lebih.
  - **Penilaian Keperluan ICT Makmal**:
    - Peratus makmal yang telah menghantar.
    - Jumlah penggantian dan penambahan, dikira berasingan beserta kos.
    - Senarai makmal yang belum menghantar.
- **Laporan Eksekutif**: isu automatik bilangan komputer yang masih Windows 10 (sokongan tamat 14 Okt 2025), dipecahkan kepada yang boleh dinaik taraf dan yang perlu diganti.

## 1.11.0 — 2026-10-13 · Komputer ikut makmal
### Ditambah
- Panel baharu **Komputer ikut makmal** di Executive Overview. Bagi setiap makmal, panel ini memaparkan:
  - jumlah komputer, dipecahkan kepada meja, riba dan workstation
  - bilangan beroperasi (dengan %), rosak dan perlu diganti
  - umur purata dan tahun perolehan tertua
  - indeks kesihatan makmal
  - jumlah keseluruhan
- Klik nama makmal untuk membuka senarai aset makmal itu.

### Diperbaiki
- **Pengesanan jenis aset**: nama item kini diutamakan berbanding deskripsi perolehan. Sebelum ini, deskripsi tender seperti "PC DESKTOP, LAPTOP …" menyebabkan desktop dikira sebagai komputer riba. `MIGRATION_007` membetulkan rekod sedia ada yang terjejas; rekod yang jenisnya diisi secara manual tidak diubah.

## 1.10.0 — 2026-10-13 · Jenis permohonan: penggantian / penambahan berasingan
### Ditambah
- Borang Penilaian Keperluan ICT Makmal kini ada medan **Jenis permohonan** dengan empat pilihan: *Penggantian sahaja*, *Penambahan sahaja*, *Penggantian dan penambahan*, *Tiada permohonan (banci sahaja)*. Medan ini wajib dalam borang awam.
  - Kiraan dan kos penggantian serta penambahan direkod **berasingan** (`anggaranKosGanti`, `anggaranKosTambahan`).
  - Medan *Jumlah komputer diperlukan* hanya dipaparkan untuk permohonan penambahan.
  - Validasi memastikan jenis permohonan selaras dengan angka. Contohnya, *Penggantian* mesti ada komputer yang tidak sesuai atau rosak tidak ekonomi, dan *Penambahan* mesti melebihi kapasiti sedia ada.
- **Rumusan fakulti** (Keperluan Makmal → *Rumusan fakulti*, juga laluan `keperluan.rumusan` untuk Pengurusan):
  - Jumlah penggantian dan penambahan dipaparkan berasingan, termasuk kos.
  - Rumusan untuk semua permohonan dan untuk yang telah disahkan Unit IT dipaparkan berasingan.
  - Pecahan ikut jenis permohonan dan ikut makmal, serta eksport CSV.
- **Laporan Eksekutif** kini ada seksyen permohonan keperluan ICT makmal.
- Rekod sedia ada diberi jenis permohonan secara automatik berdasarkan angka (`MIGRATION_006`).

## 1.9.0 — 2026-10-13 · Akaun oleh pentadbir & halaman utama ringkas
### Diubah
- **Halaman utama**: kad borang awam (aduan dan penilaian makmal) serta borang maklum balas kini disembunyikan. Boleh dipaparkan semula melalui Tetapan `LANDING_SHOW_FORMS` dan `LANDING_SHOW_FEEDBACK`. Link borang yang dikongsi tetap berfungsi.
- **Pendaftaran sendiri ditutup.** Butang Daftar dibuang daripada halaman utama dan log masuk (`MIGRATION_005`). Boleh dibuka semula melalui Tetapan → `ALLOW_REGISTRATION`.
- **Borang banci** kini bertajuk *Penilaian Keperluan ICT Makmal*, dengan penerangan baharu. Subjek dan isi email turut diselaraskan.

### Ditambah
- **Pengguna → Tambah pengguna**: pentadbir mencipta akaun dan menentukan peranan.
  - Admin boleh mencipta akaun Pengguna atau Pengurusan.
  - Super Admin boleh mencipta akaun dengan semua peranan.
- **Jemputan pengaktifan** melalui email (`#/aktifkan`):
  - Pengguna menetapkan kata laluan sendiri, kemudian terus log masuk.
  - Link sah 7 hari dan hanya boleh digunakan sekali. Hanya hash token disimpan.
  - Status *Belum aktifkan akaun* dipaparkan dalam senarai pengguna, dengan pilihan *Hantar semula jemputan*.

## 1.8.0 — 2026-10-13 · Prestasi
### Diperbaiki
- **Cache laporan di pelayan** (`AsetCache`): Executive Overview, Perancangan, Laporan Eksekutif, laporan nilai/ganti/lokasi, pelan, indeks makmal, trend dan ringkasan tindakan KEWPA tidak lagi dikira semula daripada Sheets pada setiap paparan.
  - Kunci cache mengandungi versi data setiap sheet, jadi sebarang tulisan melalui sistem membatalkan cache serta-merta.
  - Kunci juga mengandungi jam semasa, jadi angka yang bergantung pada masa dikira semula sekurang-kurangnya sejam sekali.
- **Pencetus setiap jam** memanaskan cache laporan utama, supaya paparan pertama juga pantas.
- **Bacaan sheet**: pengepala dan data dibaca dalam satu panggilan (`getDataRange`), dan objek sheet dicache bagi setiap permintaan. Bilangan panggilan perkhidmatan bagi setiap sheet berkurang kira-kira separuh.
- **AppCache**: nilai besar (> 95KB) dipecah kepada beberapa ketul, dan versi semua sheet dibaca dalam satu panggilan (`getAll`).
- **Pelayar**:
  - Laporan disimpan dalam memori selama 90 saat dan dikosongkan apabila ada tindakan menulis. Kembali ke halaman yang sama dipapar serta-merta.
  - Semasa aplikasi dibuka, halaman dipapar tanpa menunggu profil pengguna disegarkan.

## 1.7.0 — 2026-10-13 · Data makmal: staf, perisian & spesifikasi komputer
### Ditambah
- **Staf Makmal**: modul baharu untuk staf makmal FKM. Medan: no. pekerja, makmal/unit, jawatan, gred, email, telefon, blok dan *terima link borang banci*. Hanya admin boleh melihat modul ini.
- **Perisian & Lesen**: modul baharu untuk perisian setiap makmal. Medan: kategori, jenis lesen (berlesen atau sumber terbuka), sumber lesen, bilangan lesen, OS dan tarikh tamat. Sistem tidak membenarkan pendua bagi makmal + perisian yang sama.
- **Makmal**: medan baharu *jenis makmal* (komputer, kejuruteraan atau unit) dan *spesifikasi komputer*.
  - Butiran makmal kini memaparkan senarai perisian.
  - Staf makmal turut dipaparkan, tetapi untuk admin sahaja.
- **Import data lain** di halaman Import aset, untuk makmal, staf, perisian dan pegawai IT. Rekod sedia ada dikemas kini (upsert), jadi tiada pendua dicipta.
  - Makmal dipadankan ikut kod, kemudian ikut kod lokasi UTMFin.
  - Staf dipadankan ikut no. pekerja.
  - Perisian dipadankan ikut makmal + nama.
  - Pegawai IT dipadankan ikut email.
  - Rujukan makmal boleh ditulis sebagai kod atau nama.
  - Setiap jenis data ada templat CSV.
- **Status banci & hantar link** di *Keperluan Makmal*:
  - Paparan status setiap makmal bagi tahun semasa: sudah atau belum hantar, dan bilangan penerima.
  - Butang untuk emel link borang kepada staf makmal yang belum hantar. Makmal dalam link dipilih secara automatik melalui `#/banci-makmal?makmal=…`.
  - Makmal komputer diisi oleh Unit IT dan tidak diemel.
  - Ada pilihan menghantar email ujian.

## 1.6.0 — 2026-10-13 · Link borang banci & keperluan komputer makmal
### Ditambah
- **Borang awam `#/banci-makmal`**: link yang boleh dikongsi kepada pemilik, ketua atau pengurus makmal. Mereka tidak perlu log masuk.
  - Borang ada 4 bahagian: pemohon (nama, no. staf, email rasmi UTM, peranan), makmal, banci komputer sedia ada, dan permohonan penggantian/tambahan. Kiraan dibuat secara langsung semasa mengisi.
  - Satu borang bagi setiap makmal bagi setiap tahun. Ini terpakai untuk makmal sedia ada dan juga makmal baharu (dikenal pasti ikut nama).
  - **Makmal baharu**: dipilih melalui "+ Makmal baharu" dengan medan nama, bangunan, bilik dan jabatan. Apabila Unit IT mengesahkan permohonan, makmal itu didaftarkan secara automatik dalam modul Makmal dan dipautkan.
  - **Link kemas kini peribadi** dihantar ke email pemohon. Token rawak digunakan dan hanya hash token disimpan (sheet `PAUTAN_EDIT`).
  - Pemohon boleh mengemas kini borang semasa status *Dihantar* atau *Dikembalikan*. Selepas status itu, borang hanya boleh dibaca.
  - Apabila borang dikembalikan, link baharu dihantar. Pemohon juga boleh meminta link baharu dengan no. rujukan dan email.
  - Pemohon dimaklumkan melalui email setiap kali status berubah.
- Admin: butang **Kongsi link borang** di *Keperluan Makmal*, dengan pilihan salin atau buka.
- Tetapan `KEPERLUAN_DOMAIN_EMAIL` (lalai `utm.my`; subdomain diterima; `*` = semua domain). Had kadar dikenakan pada borang dan permintaan link.

## 1.5.0 — 2026-10-13 · Fasa 2d: trend bulanan, email ringkasan & penjejak tindakan KEWPA
### Ditambah
- **Penjejak tindakan KEWPA** (modul `tindakan`, menu admin *Tindakan KEWPA*). Tindakan dijana automatik daripada daftar aset:
  - jenis tindakan: lokasi fizikal ≠ UTMFin, penjaga bertukar, status tidak dapat disahkan, dalam pelupusan, telah lupus tetapi rekod masih aktif
  - dijana setiap hari, selepas setiap import, atau melalui butang *Segerak dengan daftar aset*
  - satu tindakan terbuka bagi setiap aset dan jenis, tanpa pendua
  - ditutup automatik apabila rekod aset dibetulkan; tindakan yang ditutup oleh pegawai tidak dijana semula
  - setiap tindakan ada pegawai IT, tarikh sasaran (lalai 30 hari, boleh diubah dalam Tetapan), rujukan borang dan catatan
- **Trend bulanan** (tab *Trend & tindakan KEWPA* di Perancangan):
  - ringkasan disimpan setiap hari dalam sheet `RINGKASAN_BULANAN`; nilai bulan lepas kekal sebagai nilai akhir bulan
  - graf 12 bulan: komputer perlu diganti, indeks kesihatan makmal, % aset disahkan, tindakan KEWPA terbuka, aduan baharu dan nilai buku
  - jadual ringkasan ikut bulan, dan ringkasan tindakan KEWPA ikut jenis (tanpa butiran peribadi untuk Pengurusan)
- **Email ringkasan bulanan**:
  - pada awal setiap bulan, ringkasan bulan lepas beserta perubahan berbanding bulan sebelumnya dihantar sekali kepada semua pengguna Pengurusan dan Admin, serta penerima tambahan, dengan notifikasi dalam app
  - tetapan baharu: `EMAIL_RINGKASAN_BULANAN` dan `EMAIL_RINGKASAN_TAMBAHAN`
  - admin boleh *Hantar ujian kepada saya* atau *Hantar kepada semua sekarang*
- **Laporan Eksekutif**: baris tindakan KEWPA, seksyen *Trend bulanan* (6 bulan), dan isu automatik bagi tindakan yang melepasi tarikh sasaran.

### Teras
- Hook frontend generik `KD.listActions[<modul>]` untuk butang tambahan admin di halaman senarai.

## 1.4.0 — 2026-10-13 · Fasa 2c: Pengurusan & perancangan
### Ditambah
- **Peranan Pengurusan (baca sahaja)** untuk Dekan, Timbalan Dekan, TDP/TPK dan Ketua Jabatan. Super Admin menetapkannya di *Pengguna → Urus → Peranan*. Boleh melihat dashboard, perancangan dan laporan; tidak boleh menyunting, mengimport atau melihat daftar aset (butiran peribadi penjaga); tidak menerima notifikasi admin. Log masuk terus ke `/pengurusan`; navigasi telefon khas.
- **Perancangan aset IT** (`/pengurusan`, admin: `/admin/perancangan`):
  - *Ringkasan*: KPI, perkara untuk perhatian/keputusan (dijana automatik), unjuran 5 tahun, kesihatan makmal.
  - *Pelan penggantian 5 tahun*: keperluan ikut tahun & makmal (tertunggak + matang), purata bajet diperlukan; **simulasi bajet** (RM/tahun) — PC diganti setahun, baki tertunggak, tahun tunggakan selesai, jadual ikut makmal mengikut keutamaan.
  - *Indeks kesihatan makmal* (0–100): umur purata, % rosak, % perlu ganti, aduan, % disahkan → Baik / Sederhana / Kritikal.
- **Laporan Eksekutif** (`/pengurusan/laporan`) — dokumen 2–3 muka surat sedia cetak / PDF untuk mesyuarat pengurusan.

### Teras
- Peranan `PENGURUSAN` (tahap antara USER dan ADMIN); notifikasi "admin" kini ikut `hasRole(ADMIN)`, bukan "bukan USER".
- Hook frontend generik: akses laluan `management`, item menu ke-4 `'management'`, `KD.homePath(role)`, `KD.bottomNavFor(items, role)`.

## 1.3.0 — 2026-10-13 · Fasa 2a: nilai aset, susut nilai & cadangan penggantian
### Ditambah
- **Laporan aset** (`/admin/laporan-aset`) dengan 3 tab, tapisan makmal/kategori/jenis, eksport CSV dan Cetak/PDF:
  - **Nilai aset & susut nilai** — nilai perolehan, nilai buku semasa, susut terkumpul (garis lurus), aset susut sepenuhnya; pecahan ikut makmal, tahun, kategori dan jenis.
  - **Cadangan penggantian** — skor ikut kriteria (umur, status, ditanda Ganti, RAM, kekerapan aduan ikut no. aset, nilai buku habis) → *Ganti segera / Ganti tahun depan / Pantau*, dengan anggaran kos dan ringkasan ikut makmal.
  - **Percanggahan lokasi** — senarai aset yang lokasi fizikal ≠ ID_LOKASI UTMFin, untuk kemas kini pergerakan aset KEWPA.
- Tetapan baharu: `SUSUT_HAYAT_TAHUN` (5), `SUSUT_NILAI_SISA` (RM0), `GANTI_UMUR_TAHUN` (7), `GANTI_RAM_MIN_GB` (8), `GANTI_ADUAN_MIN` (3), `GANTI_HARGA_LALAI` (RM4,500).
- Executive Overview: kad nilai perolehan, susut terkumpul, cadangan ganti segera & anggaran kos.
- Butiran aset: panel *Nilai & susut nilai* (hook generik `KD.detailSide[<modul>]`).

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
