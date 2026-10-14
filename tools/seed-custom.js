/**
 * seed-custom.js — DATA CONTOH untuk dev server & E2E sahaja (bukan data sebenar FKM, tidak dideploy).
 * Menggantikan seed generik: makmal, pegawai, aset (melalui laluan import), keperluan makmal & tiket.
 */
'use strict';

module.exports = function ({ api, ok, sup, user, ctx }) {
  const A = (action, payload) => ok(api({ action, token: sup.token, payload }));
  const U = (action, payload) => ok(api({ action, token: user.token, payload }));

  const labs = [
    ['ME-01', 'Makmal CAD', 'C23', 'B1-01', 40],
    ['ME-02', 'Makmal Simulasi', 'C23', 'B1-02', 30],
    ['ME-03', 'Makmal Termobendalir', 'C24', 'B2-01', 28],
    ['ME-04', 'Makmal Pembuatan', 'E01', 'B2-02', 32],
    ['ME-05', 'Makmal Robotik', 'C24', 'B3-01', 25],
    ['ME-06', 'Makmal Projek Tahun Akhir', 'C23', 'B3-02', 20]
  ].map(([kod, nama, bangunan, bilik, kap]) => A('crud.create', { module: 'makmal', kod, nama, bangunan, bilik, kapasiti: kap, tempatKomputer: kap, penggunaSesi: kap, jabatan: 'Kejuruteraan Mekanikal' }));

  const staff = ['Pegawai Teknologi Maklumat A', 'Penolong Pegawai TM B', 'Juruteknik Komputer C', 'Juruteknik Komputer D']
    .map((nama, i) => A('crud.create', { module: 'pegawai', nama, jawatan: i ? 'Juruteknik' : 'Pegawai TM', email: 'teknikal' + i + '@demo.local' }));

  /* Aset contoh melalui laluan import (menguji laluan yang sama digunakan pengguna) */
  const models = [['Dell', 'OptiPlex 7090', 'DESKTOP'], ['HP', 'EliteDesk 800 G6', 'DESKTOP'], ['Lenovo', 'ThinkPad L14', 'LAPTOP'], ['HP', 'LaserJet Pro M404', 'PENCETAK'], ['Epson', 'EB-X51', 'PROJEKTOR'], ['Cisco', 'Catalyst 2960X', 'SWITCH'], ['Ubiquiti', 'U6-LR', 'AP']];
  const statusCycle = ['Berfungsi', 'Berfungsi', 'Berfungsi', 'Berfungsi', 'Berfungsi', 'Berfungsi', 'Berfungsi', 'PERLAHAN', 'Perlu dibaiki', 'Tidak boleh digunakan', 'Berfungsi', 'Menunggu alat ganti'];
  const rows = [];
  for (let i = 0; i < 72; i++) {
    const m = models[i < 48 ? i % 2 : 2 + (i % 5)];
    rows.push({
      noAset: 'DEMO/FKM/' + String(1000 + i), noSiri: 'SN' + (500000 + i * 37), jenis: m[2], jenama: m[0], model: m[1],
      makmal: labs[i % labs.length].values.kod, tahunPerolehan: String(2015 + (i % 10)), tamatWaranti: (2024 + (i % 4)) + '-12-31',
      ramGb: String(8 * (1 + (i % 3))), storan: 'SSD 512GB', sistemOperasi: 'Windows 11 Pro', disahkanFizikal: i % 3 ? 'Ya' : 'Tidak',
      cadangan: i % 9 === 8 ? 'Ganti' : 'Kekal', status: statusCycle[i % statusCycle.length]
    });
  }
  A('aset.import', { rows });

  /* Keperluan makmal (oleh penyelaras = pengguna demo) */
  const y = new Date().getFullYear();
  const needs = [
    [0, 40, 34, 4, 0, 6, 52, 'KRITIKAL', 'DISAHKAN'],
    [1, 35, 30, 3, 2, 3, 38, 'TINGGI', 'DIHANTAR'],
    [2, 28, 25, 2, 1, 2, 30, 'TINGGI', 'DISAHKAN'],
    [3, 32, 28, 0, 2, 2, 34, 'SEDERHANA', 'DIKEMBALIKAN'],
    [4, 25, 23, 1, 1, 1, 26, 'RENDAH', 'DIHANTAR']
  ];
  needs.forEach(([li, total, ok2, unfit, fix, dead, target, pri, status]) => {
    const d = U('crud.create', {
      module: 'keperluan', makmal: labs[li].id, tahun: y, jumlahSediaAda: total, berfungsi: ok2, tidakSesuai: unfit, rosakBolehBaiki: fix, rosakLupus: dead,
      sasaranJumlah: target, keutamaan: pri, hargaSeunit: 4500, sumberHarga: 'Anggaran contoh', spesifikasi: 'Core i7, 32GB RAM, GPU 8GB',
      perisian: 'SolidWorks, ANSYS', justifikasi: 'Data contoh: komputer sedia ada tidak mampu menjalankan perisian kursus terkini.'
    });
    if (status !== 'DIHANTAR') A('crud.setStatus', { module: 'keperluan', id: d.id, status, note: status === 'DIKEMBALIKAN' ? 'Sila sahkan bilangan rosak.' : '' });
  });

  /* Tiket */
  const cats = ok(api({ action: 'public.categories' }));
  const tickets = [
    ['PC tidak boleh hidup', 'KRITIKAL', 0, 'BARU'], ['WiFi terputus di bilik kuliah', 'TINGGI', 1, 'DITUGASKAN'],
    ['Lesen SolidWorks tamat', 'TINGGI', 2, 'DALAM_TINDAKAN'], ['Tidak boleh log masuk akaun', 'SEDERHANA', 3, 'SELESAI'],
    ['Pencetak jammed', 'RENDAH', 4, 'SELESAI'], ['Projektor kabur', 'SEDERHANA', 5, 'DALAM_TINDAKAN'],
    ['Monitor berkelip', 'SEDERHANA', 0, 'BARU'], ['Port rangkaian mati', 'TINGGI', 1, 'MENUNGGU_PENGGUNA'],
    ['Pasang perisian MATLAB', 'RENDAH', 2, 'DITUTUP'], ['Papan kekunci rosak', 'RENDAH', 0, 'BARU']
  ];
  tickets.forEach(([tajuk, keutamaan, ci, status], i) => {
    const d = U('crud.create', {
      module: 'tiket', tajuk, keutamaan, kategori: cats[ci % cats.length].id, lokasi: labs[i % labs.length].values.nama,
      makmal: labs[i % labs.length].id, keterangan: 'Data contoh: ' + tajuk.toLowerCase() + ' sejak pagi tadi.'
    });
    if (status !== 'BARU') A('crud.update', { module: 'tiket', id: d.id, pegawai: staff[i % staff.length].id });
    if (status !== 'BARU' && status !== 'DITUGASKAN') A('crud.setStatus', { module: 'tiket', id: d.id, status, note: '' });
  });
  /* Isu KEWPA contoh (dijana automatik oleh import) + trend 5 bulan lepas (rekaan, untuk paparan graf) */
  A('aset.import', { rows: [
    { noAset: 'DEMO/FKM/1003', kodLokasi: 'J.C23.01.101-01', lokasiFizikal: 'C23.205' },
    { noAset: 'DEMO/FKM/1009', kodLokasi: 'J.C23.01.101-01', lokasiFizikal: 'C23.205' },
    { noAset: 'DEMO/FKM/1015', statusPengesahan: 'BERTUKAR_PENJAGA', penjagaTerkini: 'Staf Contoh Baharu' },
    { noAset: 'DEMO/FKM/1021', statusPengesahan: 'TIDAK_DISAHKAN' },
    { noAset: 'DEMO/FKM/1050', statusPengesahan: 'LUPUS_REKOD_AKTIF' }
  ] });
  if (ctx) {
    require('vm').runInContext(`(function () {
      AsetHooks.maintenance();
      const cur = Repo.of('RINGKASAN_BULANAN').all()[0];
      let k = cur.bulan;
      for (let i = 1; i <= 5; i++) {
        k = AsetTrend.prevMonth(k);
        const f = (c, d) => String(Math.max(0, Math.round((Number(cur[c]) || 0) + d * i)));
        Repo.of('RINGKASAN_BULANAN').insert({ bulan: k, aset: f('aset', -1), beroperasi_pct: f('beroperasi_pct', -1.5), nilai_kos: f('nilai_kos', -4000), nilai_buku: f('nilai_buku', 6000),
          susut_habis: f('susut_habis', -1), ganti_segera: f('ganti_segera', 1), ganti_tahun_depan: f('ganti_tahun_depan', 2), kos_ganti: f('kos_ganti', 9000),
          tiket_baru: String(6 + (i % 3) * 2), tiket_selesai: String(5 + (i % 2) * 3), tiket_terbuka: f('tiket_terbuka', 1), tiket_lewat: f('tiket_lewat', 0.5), sla_pct: String(80 + (i % 3) * 5),
          disahkan_pct: f('disahkan_pct', -4), lokasi_berbeza: f('lokasi_berbeza', 2), makmal: cur.makmal, makmal_kritikal: f('makmal_kritikal', 0.4), indeks_purata: f('indeks_purata', -2.5),
          tindakan_terbuka: f('tindakan_terbuka', 3), tindakan_lewat: f('tindakan_lewat', 1), tindakan_selesai: String(2 + i), emel_dihantar_pada: '2026-01-01T00:00:00Z', created_at: '', updated_at: '' });
      }
    })()`, ctx);
  }
  /* Kitar hayat aset (data rekaan) */
  const day = (n) => { const d = new Date(Date.now() + n * 86400000 + 8 * 3600000); return d.toISOString().slice(0, 10); };
  A('aset.import', { rows: ['1055', '1060', '1065', '1070'].map((n) => ({ noAset: 'DEMO/FKM/' + n, bolehDipinjam: 'Ya' })) });
  const fsign = (key) => ctx ? require('vm').runInContext('SecurityUtils', ctx).signFormToken('crud:' + key, Date.now() - 5000) : '';
  const pub = (key, p) => ok(api({ action: 'crud.publicCreate', payload: Object.assign({ module: key, formToken: fsign(key) }, p) }));
  const pinj = pub('pinjaman', { nama: 'Pelajar Contoh', email: 'pelajar.contoh@graduate.utm.my', kategoriPemohon: 'PRASISWAZAH', noPengenalan: 'A00KM0001', telefon: '012-0000001',
    penyelia: 'Dr. Penyelia Contoh', noAset: 'DEMO/FKM/1060', tujuan: 'Projek tahun akhir (data contoh)', lokasiPenggunaan: 'Makmal Projek Tahun Akhir', tarikhPinjam: day(0), tarikhPulang: day(7) });
  const findRef = (key, ref) => A('crud.list', { module: key, q: ref, pageSize: 5 }).items[0];
  const pj = findRef('pinjaman', pinj.refNo);
  A('crud.setStatus', { module: 'pinjaman', id: pj.id, status: 'DILULUSKAN' });
  A('crud.setStatus', { module: 'pinjaman', id: pj.id, status: 'DIPINJAM' });
  pub('pinjaman', { nama: 'Staf Contoh', email: 'staf.contoh@utm.my', kategoriPemohon: 'STAF', noPengenalan: 'D0002', telefon: '012-0000002',
    noAset: 'DEMO/FKM/1065', tujuan: 'Bengkel jabatan (data contoh)', lokasiPenggunaan: 'Bilik Seminar', tarikhPinjam: day(2), tarikhPulang: day(4) });
  const adu = pub('aduanaset', { nama: 'Pelajar Contoh B', email: 'pelajar.b@graduate.utm.my', noAset: 'DEMO/FKM/1007', tarikhKerosakan: day(0), lokasi: 'Makmal CAD, PC 7', keteranganKerosakan: 'Skrin tidak memaparkan apa-apa (data contoh).' });
  A('crud.setStatus', { module: 'aduanaset', id: findRef('aduanaset', adu.refNo).id, status: 'DALAM_PEMBAIKAN' });
  pub('aduanaset', { nama: 'Staf Contoh C', email: 'staf.c@utm.my', noAset: 'DEMO/FKM/1013', tarikhKerosakan: day(-1), lokasi: 'Makmal Simulasi', keteranganKerosakan: 'Papan kekunci tidak berfungsi (data contoh).' });
  A('crud.create', { module: 'selenggara', noAset: 'DEMO/FKM/1001', jenisSelenggara: 'PENCEGAHAN', tarikhSelenggara: day(5), butiranKerja: 'Pembersihan dalaman & kemas kini sistem (data contoh)', tarikhSeterusnya: day(185) });
  const sl = A('crud.create', { module: 'selenggara', noAset: 'DEMO/FKM/1002', jenisSelenggara: 'PENCEGAHAN', tarikhSelenggara: day(-3), butiranKerja: 'Penggantian pes terma (data contoh)', kos: 0, tarikhSeterusnya: day(180) });
  A('crud.setStatus', { module: 'selenggara', id: sl.id, status: 'SELESAI' });
  A('crud.create', { module: 'pemeriksaan', noAset: 'DEMO/FKM/1003', tarikhPemeriksaan: day(-1), pemeriksa: 'Pegawai Teknologi Maklumat A', keberadaan: 'ADA', keadaan: 'BAIK' });
  A('crud.create', { module: 'pemeriksaan', noAset: 'DEMO/FKM/1062', tarikhPemeriksaan: day(-1), pemeriksa: 'Pegawai Teknologi Maklumat A', keberadaan: 'TIADA', keadaan: 'BAIK', catatan: 'Tidak dijumpai di lokasi (data contoh).' });
  const pn = A('crud.create', { module: 'penilaian', noAset: 'DEMO/FKM/1005', tarikhPenilaian: day(-2), jenisPenilaian: 'KEDUA', skorFizikal: 2, skorPrestasi: 2, skorKeperluan: 2, penilai: 'Penolong Pegawai TM B' });
  A('crud.setStatus', { module: 'penilaian', id: pn.id, status: 'DISAHKAN' });
  A('crud.create', { module: 'pelupusan', noAset: 'DEMO/FKM/1005', sebab: 'USANG', justifikasi: 'Tidak memenuhi keperluan perisian kursus (data contoh).' });
  A('crud.create', { module: 'pergerakan', noAset: 'DEMO/FKM/1011', jenisPergerakan: 'PINDAH_LOKASI', lokasiBaru: 'C24-410', tarikhPergerakan: day(1), sebab: 'Penyusunan semula makmal (data contoh).' });
  pub('kehilangan', { nama: 'Staf Contoh D', email: 'staf.d@utm.my', kategoriPelapor: 'STAF', telefon: '012-0000004', noAset: 'DEMO/FKM/1058', tarikhKehilangan: day(-2), tarikhDiketahui: day(-1),
    lokasiKehilangan: 'Dewan Kuliah (data contoh)', keadaanKehilangan: 'Tidak ditemui selepas digunakan dalam kuliah (data contoh).' });
  /* Kit peralatan (rekaan): 12 unit Raspberry Pi + pinjaman kelas */
  A('aset.import', { rows: Array.from({ length: 12 }, (x, i) => ({ noAset: 'DEMO/RPI/' + String(i + 1).padStart(2, '0'), jenis: 'LAIN', jenama: 'Raspberry Pi', model: 'Raspberry Pi 4 Model B 4GB', makmal: 'ME-05', status: i === 11 ? 'Perlu dibaiki' : 'Berfungsi' })) });
  const kit = A('crud.create', { module: 'kit', nama: 'Kit Raspberry Pi 4 Model B', senaraiAset: Array.from({ length: 12 }, (x, i) => 'DEMO/RPI/' + String(i + 1).padStart(2, '0')).join('\n'), maksPinjam: 10,
    kandungan: 'Raspberry Pi 4 (4GB), kad microSD 32GB, adaptor kuasa USB-C, kabel micro-HDMI, casing', lokasiSimpanan: 'Makmal Robotik (ME-05)', catatan: 'Pulangkan lengkap dengan semua aksesori.' });
  const kp = pub('pinjaman', { nama: 'Wakil Kelas Contoh', email: 'wakil.kelas@graduate.utm.my', kategoriPemohon: 'WAKIL_KELAS', noPengenalan: 'A00KM0099', telefon: '012-0000099',
    kit: kit.id, kuantiti: 8, kodKursus: 'SKMM 3023 Mekatronik (contoh)', namaPensyarah: 'Dr. Pensyarah Contoh', emailPensyarah: 'pensyarah.contoh@utm.my', bilanganPelajar: 32,
    tujuan: 'Amali kelas (data contoh)', lokasiPenggunaan: 'Makmal Robotik', tarikhPinjam: day(1), tarikhPulang: day(3) });
  A('crud.setStatus', { module: 'pinjaman', id: findRef('pinjaman', kp.refNo).id, status: 'DILULUSKAN' });
  /* Sesi stock-take contoh (Makmal CAD): 3 aset diimbas */
  const stk = A('crud.create', { module: 'stoktake', nama: 'Stock-take Makmal CAD (contoh)', makmal: labs[0].id, tarikh: day(0), pemeriksa: 'Pegawai Teknologi Maklumat A' });
  ['DEMO/FKM/1000', 'DEMO/FKM/1006', 'DEMO/FKM/1013'].forEach((no) => A('stoktake.imbas', { sesi: stk.id, kod: no }));
  console.log('Data contoh Dashboard Unit IT dimasukkan (6 makmal, 4 pegawai, 72 aset, 5 keperluan, 10 tiket, kitar hayat aset, kit Raspberry Pi, stock-take).');
};
