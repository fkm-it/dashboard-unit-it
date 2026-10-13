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
  console.log('Data contoh Dashboard Unit IT dimasukkan (6 makmal, 4 pegawai, 72 aset, 5 keperluan, 10 tiket).');
};
