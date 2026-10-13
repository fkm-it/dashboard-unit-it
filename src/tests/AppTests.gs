/**
 * @file AppTests.gs
 * Ujian domain Dashboard Unit IT FKM (modul sebenar dalam modules/*.json).
 * Dalam Apps Script: runTestsPart5. Dalam Node: npm test.
 */
const AppTests = {
  suites: function () { return [TestSuiteDashboardIT, TestSuiteUtmfin, TestSuiteMaintenance, TestSuiteNilai, TestSuitePengurusan, TestSuiteKewpa, TestSuiteTrend, TestSuiteBanci, TestSuiteDataMakmal, TestSuitePrestasi]; }
};

const AppFx = {
  seq: 0,
  real: function () { CrudEngine.override = null; },
  lab: function (a, kod) {
    AppFx.seq++;
    return TestAssert.apiOk(TestHelpers.call(a.token, 'crud.create', {
      module: 'makmal', kod: kod || ('ME-' + AppFx.seq), nama: 'Makmal Ujian ' + AppFx.seq, bangunan: 'C23', kapasiti: 40, tempatKomputer: 40
    }));
  },
  pegawai: function (a, email) {
    return TestAssert.apiOk(TestHelpers.call(a.token, 'crud.create', { module: 'pegawai', nama: 'Pegawai ' + (++AppFx.seq), email: email || ('pg' + AppFx.seq + '@test.local') }));
  },
  need: function (u, lab, extra) {
    return TestHelpers.call(u.token, 'crud.create', Object.assign({
      module: 'keperluan', makmal: lab.id, tahun: 2026, jumlahSediaAda: 40, berfungsi: 34, tidakSesuai: 4,
      rosakBolehBaiki: 0, rosakLupus: 6, sasaranJumlah: 45, keutamaan: 'TINGGI', hargaSeunit: 4500,
      justifikasi: 'Perisian CAD terkini memerlukan spesifikasi lebih tinggi.'
    }, extra || {}));
  },
  catId: function () { return CategoryRepository.active()[0].category_id; }
};

const TestSuiteDashboardIT = {
  name: 'Dashboard Unit IT',
  tests: [
    ['Keperluan makmal: kiraan ganti/tambahan/kos ikut formula spesifikasi', function (t) {
      AppFx.real();
      const a = TestHelpers.admin(ROLES.ADMIN);
      const u = TestHelpers.user('penyelaras');
      const lab = AppFx.lab(a);
      const d = TestAssert.apiOk(AppFx.need(u, lab));
      /* 40 sedia ada: 34 berfungsi (4 tidak sesuai) + 6 rosak lupus; sasaran 45 → kekal 30, ganti 10, tambahan 5 */
      t.eq(d.values.bilanganGanti, 10, 'ganti = tidak sesuai + rosak lupus');
      t.eq(d.values.bilanganTambahan, 5, 'tambahan = sasaran − kekal − ganti');
      t.eq(d.values.anggaranKos, 67500, 'kos = 15 × 4500');
      t.eq(d.computed.jumlahCadangan, 15);
      const c = KeperluanHooks.compute({ berfungsi: 34, tidakSesuai: 4, rosakBaiki: 6, rosakLupus: 0, sasaran: 45, harga: 0 });
      t.eq(c.ganti, 4); t.eq(c.tambahan, 5, 'rosak boleh dibaiki dikira sebagai kekal');
      t.eq(KeperluanHooks.compute({ berfungsi: 50, tidakSesuai: 0, rosakBaiki: 0, rosakLupus: 0, sasaran: 40 }).tambahan, 0, 'tiada tambahan negatif');
    }],

    ['Keperluan makmal: jumlah status mesti sepadan, tidak sesuai ≤ berfungsi, satu rekod setahun', function (t) {
      AppFx.real();
      const a = TestHelpers.admin(ROLES.ADMIN);
      const u = TestHelpers.user('penyelaras');
      const lab = AppFx.lab(a);
      TestAssert.apiFail(AppFx.need(u, lab, { berfungsi: 30 }), ERROR_CODES.VALIDATION_ERROR, 'jumlah tidak sepadan');
      TestAssert.apiFail(AppFx.need(u, lab, { berfungsi: 2, tidakSesuai: 3, rosakLupus: 38 }), ERROR_CODES.VALIDATION_ERROR, 'tidak sesuai > berfungsi');
      const d = TestAssert.apiOk(AppFx.need(u, lab));
      TestAssert.apiFail(AppFx.need(u, lab), ERROR_CODES.CONFLICT, 'pendua makmal + tahun');
      TestAssert.apiOk(AppFx.need(u, lab, { tahun: 2027 }));
      /* Sunting separa: kiraan semula daripada nilai semasa */
      const e = TestAssert.apiOk(TestHelpers.call(u.token, 'crud.update', { module: 'keperluan', id: d.id, sasaranJumlah: 50 }));
      t.eq(e.values.bilanganTambahan, 10);
      TestAssert.apiFail(TestHelpers.call(u.token, 'crud.update', { module: 'keperluan', id: d.id, berfungsi: 10 }), ERROR_CODES.VALIDATION_ERROR);
      /* Selepas disahkan, penyelaras tidak boleh sunting */
      TestAssert.apiOk(TestHelpers.call(a.token, 'crud.setStatus', { module: 'keperluan', id: d.id, status: 'DISAHKAN' }));
      TestAssert.apiFail(TestHelpers.call(u.token, 'crud.update', { module: 'keperluan', id: d.id, sasaranJumlah: 60 }), ERROR_CODES.FORBIDDEN);
    }],

    ['Tiket: SLA ikut keutamaan, penugasan → Ditugaskan + email pegawai, cap masa selesai', function (t) {
      AppFx.real();
      const a = TestHelpers.admin(ROLES.ADMIN);
      const u = TestHelpers.user('pemohon');
      const d = TestAssert.apiOk(TestHelpers.call(u.token, 'crud.create', {
        module: 'tiket', tajuk: 'PC tidak boleh hidup', kategori: AppFx.catId(), keutamaan: 'KRITIKAL', lokasi: 'C23 Bilik 112', keterangan: 'PC nombor 5 tidak boleh dihidupkan sejak pagi.'
      }));
      t.eq(d.status, 'BARU');
      t.ok(!d.values.pegawai, 'pengguna tidak boleh menetapkan pegawai');
      const row = Repo.of('TIKET').findById(d.id);
      const hrs = (new Date(row.tarikh_sasaran) - new Date(row.created_at)) / 3600000;
      t.eq(Math.round(hrs), 4, 'SLA kritikal 4 jam');
      SettingsRepository.setMany({ NOTIFY_EMAIL_ENABLED: 'TRUE' }, 'TEST');
      const pg = AppFx.pegawai(a, 'teknikal@test.local');
      const box = typeof __mails !== 'undefined' ? __mails : (globalThis.__mails || []);
      const before = box.length;
      const e = TestAssert.apiOk(TestHelpers.call(a.token, 'crud.update', { module: 'tiket', id: d.id, pegawai: pg.id, keutamaan: 'RENDAH' }));
      t.eq(e.status, 'DITUGASKAN', 'penugasan menukar status Baharu → Ditugaskan');
      const r2 = Repo.of('TIKET').findById(d.id);
      t.ok(r2.diakui_pada, 'diakui pada direkod');
      t.eq(Math.round((new Date(r2.tarikh_sasaran) - new Date(r2.created_at)) / 3600000), 168, 'SLA dikira semula ikut keutamaan baharu');
      if (typeof __mails !== 'undefined' || globalThis.__mails) t.ok(box.slice(before).some(function (m) { return m.to === 'teknikal@test.local'; }), 'pegawai diemel');
      TestAssert.apiOk(TestHelpers.call(a.token, 'crud.setStatus', { module: 'tiket', id: d.id, status: 'SELESAI' }));
      t.ok(Repo.of('TIKET').findById(d.id).selesai_pada, 'selesai pada direkod');
      TestAssert.apiOk(TestHelpers.call(a.token, 'crud.setStatus', { module: 'tiket', id: d.id, status: 'DALAM_TINDAKAN' }));
      t.eq(Repo.of('TIKET').findById(d.id).selesai_pada, '', 'dibuka semula → selesai pada dikosongkan');
    }],

    ['Overview: agregat aset, tiket lewat SLA, keperluan makmal; hanya admin', function (t) {
      AppFx.real();
      const a = TestHelpers.admin(ROLES.ADMIN);
      const u = TestHelpers.user('biasa');
      TestAssert.apiFail(TestHelpers.call(u.token, 'aset.overview', {}), ERROR_CODES.FORBIDDEN);
      const base = TestAssert.apiOk(TestHelpers.call(a.token, 'aset.overview', { tahun: 2031 }));
      const lab = AppFx.lab(a);
      TestAssert.apiOk(TestHelpers.call(a.token, 'crud.create', { module: 'aset', noAset: 'OV-1', jenis: 'DESKTOP', makmal: lab.id, tahunPerolehan: 2018 }));
      const x = TestAssert.apiOk(TestHelpers.call(a.token, 'crud.create', { module: 'aset', noAset: 'OV-2', jenis: 'LAPTOP' }));
      TestAssert.apiOk(TestHelpers.call(a.token, 'crud.setStatus', { module: 'aset', id: x.id, status: 'TIDAK_BOLEH_GUNA' }));
      TestAssert.apiFail(TestHelpers.call(a.token, 'crud.create', { module: 'aset', noAset: 'ov-1', jenis: 'DESKTOP' }), ERROR_CODES.CONFLICT, 'no. aset unik');
      const tk = TestAssert.apiOk(TestHelpers.call(u.token, 'crud.create', {
        module: 'tiket', tajuk: 'WiFi putus', kategori: AppFx.catId(), keutamaan: 'TINGGI', lokasi: 'Bilik kuliah', keterangan: 'WiFi putus sepanjang kuliah pagi.'
      }));
      Repo.of('TIKET').update(tk.id, { tarikh_sasaran: '2020-01-01T00:00:00.000Z' });
      TestAssert.apiOk(TestHelpers.call(a.token, 'crud.create', {
        module: 'keperluan', makmal: lab.id, tahun: 2031, jumlahSediaAda: 10, berfungsi: 10, sasaranJumlah: 12, keutamaan: 'KRITIKAL', hargaSeunit: 5000,
        justifikasi: 'Tambahan tempat untuk kursus baharu.'
      }));
      const o = TestAssert.apiOk(TestHelpers.call(a.token, 'aset.overview', { tahun: 2031 }));
      t.eq(o.assets.total - base.assets.total, 2);
      t.eq(o.assets.operational - base.assets.operational, 1);
      t.eq(o.tickets.overdue - base.tickets.overdue, 1, 'tiket lewat SLA dikira');
      t.ok(o.tickets.unassigned >= 1);
      t.eq(o.labs.tambahan, 2); t.eq(o.labs.budget, 10000); t.eq(o.labs.assessed, 0, 'belum disahkan');
      t.ok(o.labs.top.length === 1 && o.labs.top[0].keutamaan === 'KRITIKAL');
      t.ok(o.issues.some(function (i) { return i.kind === 'tiket' && i.id === tk.id; }), 'isu: tiket tinggi lewat SLA');
      t.eq(o.tickets.slaTrend.length, 6);
    }],

    ['Import aset: semakan dahulu, label enum & kod makmal, upsert ikut No. aset, ralat per baris', function (t) {
      AppFx.real();
      const a = TestHelpers.admin(ROLES.ADMIN);
      const lab = AppFx.lab(a, 'IMP-01');
      const rows = [
        { noAset: 'IMP/001', jenis: 'Komputer meja', jenama: 'Dell', model: 'OptiPlex 7090', makmal: 'IMP-01', tahunPerolehan: '2019', tamatWaranti: '31/12/2024', disahkanFizikal: 'Ya', status: 'Berfungsi' },
        { noAset: 'IMP/002', jenis: 'LAPTOP', status: 'Tidak boleh digunakan' }
      ];
      const dry = TestAssert.apiOk(TestHelpers.call(a.token, 'aset.import', { rows: rows, dryRun: true }));
      t.ok(dry.dryRun && dry.created === 2 && !dry.errorCount);
      t.eq(Repo.of('ASET').all().filter(function (r) { return String(r.no_aset).indexOf('IMP/') === 0; }).length, 0, 'semakan tidak menulis');
      const bad = TestAssert.apiOk(TestHelpers.call(a.token, 'aset.import', { rows: rows.concat([{ noAset: 'IMP/003', jenis: 'DESKTOP', makmal: 'TIADA-99' }, { noAset: 'IMP/001' }]) }));
      t.ok(bad.dryRun && bad.errorCount === 1, 'ralat menghalang semua tulisan');
      t.ok(bad.skippedCount === 1 && /Pendua/.test(bad.skipped[0].reason), 'pendua dalam fail = amaran, bukan ralat');
      t.eq(bad.errors[0].line, 4);
      const ok = TestAssert.apiOk(TestHelpers.call(a.token, 'aset.import', { rows: rows }));
      t.ok(!ok.dryRun && ok.created === 2);
      const r1 = Repo.of('ASET').all().filter(function (r) { return r.no_aset === 'IMP/001'; })[0];
      t.eq(r1.jenis, 'DESKTOP'); t.eq(r1.makmal, lab.id); t.eq(r1.tamat_waranti, '2024-12-31'); t.eq(String(r1.disahkan_fizikal).toUpperCase(), 'TRUE');
      t.ok(/^AST-\d{5}$/.test(r1.ref_no), 'no. rujukan: ' + r1.ref_no);
      const up = TestAssert.apiOk(TestHelpers.call(a.token, 'aset.import', { rows: [{ noAset: 'imp/001', model: 'OptiPlex 7090 MT', status: 'Perlu dibaiki' }] }));
      t.ok(up.updated === 1 && up.created === 0, 'upsert ikut No. aset: ' + JSON.stringify(up));
      t.eq(Repo.of('ASET').findById(r1.id).model, 'OptiPlex 7090 MT');
      TestAssert.apiFail(TestHelpers.call(TestHelpers.user('x').token, 'aset.import', { rows: rows }), ERROR_CODES.FORBIDDEN);
    }]
  ]
};

/** Import data DATA PC / UTMFin (KEWPA) & jana makmal. Nama/email di bawah ialah rekaan. */
const TestSuiteUtmfin = {
  name: 'Data UTMFin / KEWPA',
  tests: [
    ['Penghurai: kod bilik, label lokasi, jenis & jenama daripada nama item', function (t) {
      t.eq(AsetHooks.roomOf('J.C24.01.108-01'), 'J.C24.01.108');
      t.eq(AsetHooks.roomOf('j.n28.05.517-01/02'), 'J.N28.05.517');
      t.eq(AsetHooks.lokasiLabel('J.C24.01.108-01'), 'C24 · Aras 01 · Bilik 108-01');
      t.eq(AsetHooks.lokasiLabel('J.E07.04.04.02.02'), 'E07 · Aras 04 · Bilik 04.02.02');
      t.eq(AsetHooks.jenisOf('HP PROBOOK 440 (LAPTOP TYPE L2 PAKEJ A)'), 'LAPTOP');
      t.eq(AsetHooks.jenisOf('NOOTBOOK'), 'LAPTOP');
      t.eq(AsetHooks.jenisOf('DESKTOP COMPUTER TYPE 2'), 'DESKTOP');
      t.eq(AsetHooks.jenisOf('CPU'), 'DESKTOP');
      t.eq(AsetHooks.jenamaOf('KOMPUTER DELL OPTIPLEX 3020 MT'), 'Dell');
      t.eq(AsetHooks.jenamaOf('DESKTOP HP PRODESK 400 G3'), 'HP');
      t.eq(AsetHooks.jenamaOf('PERSONAL COMPUTER'), '');
    }],

    ['Import lajur UTMFin: status pengesahan → status operasi/pengesahan fizikal, nilai, tarikh, "-" dikosongkan', function (t) {
      AppFx.real();
      const a = TestHelpers.admin(ROLES.ADMIN);
      const base = { model: 'DESKTOP COMPUTER TYPE 2', tahunPerolehan: '2019.0', pegawaiBertanggungjawab: 'PENJAGA REKAAN A', emailPenjaga: 'penjaga.a@test.local', noPekerjaPenjaga: '90001', disemakOleh: '90009 - PEGAWAI IT REKAAN' };
      const rows = [
        Object.assign({}, base, { noAset: 'KW0001', kodLokasi: 'J.C24.01.108-01', statusPengesahan: 'Penjaga - Penggunaan Makmal', nilaiPerolehan: '3570', tarikhAset: '25/2/2019', noSiri: '-' }),
        Object.assign({}, base, { noAset: 'KW0002', model: 'NOTEBOOK COMPUTER', kodLokasi: 'J.E01.02.216-01', statusPengesahan: 'Telah lupus tetapi rekod aktif di UTMFin' }),
        Object.assign({}, base, { noAset: 'KW0003', kodLokasi: 'J.C24.01.108-01', statusPengesahan: 'Status aset tidak dapat disahkan oleh penjaga' }),
        Object.assign({}, base, { noAset: 'KW0004', kodLokasi: 'J.C24.01.108-01', statusPengesahan: 'Penjaga - Penggunaan Makmal' }),
        Object.assign({}, base, { noAset: 'KW0005', kodLokasi: 'J.C24.04.408-01', statusPengesahan: 'Penjaga - Penggunaan Makmal' }),
        Object.assign({}, base, { noAset: 'KW0006', kodLokasi: 'J.E01.02.216-01', statusPengesahan: 'Dalam tindakan pelupusan oleh penjaga' })
      ];
      const r = TestAssert.apiOk(TestHelpers.call(a.token, 'aset.import', { rows: rows }));
      t.ok(!r.dryRun && r.created === 6, JSON.stringify(r.errors));
      const by = {};
      Repo.of('ASET').all().forEach(function (x) { by[x.no_aset] = x; });
      const k1 = by.KW0001;
      t.eq(k1.status, 'BERFUNGSI'); t.eq(k1.status_pengesahan, 'MAKMAL'); t.eq(String(k1.disahkan_fizikal).toUpperCase(), 'TRUE');
      t.eq(k1.jenis, 'DESKTOP'); t.eq(k1.lokasi, 'C24 · Aras 01 · Bilik 108-01'); t.eq(String(k1.tahun_perolehan), '2019');
      t.eq(Number(k1.nilai_perolehan), 3570); t.eq(k1.tarikh_aset, '2019-02-25'); t.eq(k1.no_siri, '', '"-" dianggap kosong');
      t.eq(by.KW0002.status, 'DILUPUS', 'lupus tetapi rekod aktif → Dilupus'); t.eq(by.KW0002.cadangan, 'LUPUS'); t.eq(by.KW0002.jenis, 'LAPTOP');
      t.eq(String(by.KW0003.disahkan_fizikal).toUpperCase(), 'FALSE', 'tidak dapat disahkan');
      t.eq(by.KW0006.status, 'TIDAK_BOLEH_GUNA');
      const o = TestAssert.apiOk(TestHelpers.call(a.token, 'aset.overview', {}));
      t.ok(o.assets.byPengesahan.LUPUS_REKOD_AKTIF >= 1, 'pengesahan termasuk rekod lupus');
      t.ok(o.assets.byVerifier.some(function (v) { return v.label === 'PEGAWAI IT REKAAN'; }), 'nama pegawai tanpa no. pekerja');
    }],

    ['Jana makmal daripada lokasi aset: had minimum, tiada pendua, aset dipautkan, import seterusnya auto-paut', function (t) {
      AppFx.real();
      const a = TestHelpers.admin(ROLES.ADMIN);
      const mk = function (no, loc, who) { return { noAset: no, model: 'DESKTOP (PAKEJ 2 - FKM)', kodLokasi: loc, statusPengesahan: 'Penjaga - Penggunaan Makmal', pegawaiBertanggungjawab: who }; };
      TestAssert.apiOk(TestHelpers.call(a.token, 'aset.import', { rows: [
        mk('LB1', 'J.C99.01.101-01', 'PENJAGA X'), mk('LB2', 'J.C99.01.101-01', 'PENJAGA X'), mk('LB3', 'J.C99.01.101-02', 'PENJAGA Y'),
        mk('LB4', 'J.C99.02.205-01', 'PENJAGA Z')
      ] }));
      const prev = TestAssert.apiOk(TestHelpers.call(a.token, 'aset.janaMakmal', { min: 3, dryRun: true }));
      const mine = prev.labs.filter(function (l) { return l.kod === 'C99-01-101'; });
      t.ok(mine.length === 1 && mine[0].pc === 3 && mine[0].penyelaras === 'PENJAGA X', JSON.stringify(prev.labs));
      t.ok(!prev.labs.some(function (l) { return l.kod === 'C99-02-205'; }), 'bawah minimum tidak dijana');
      const run = TestAssert.apiOk(TestHelpers.call(a.token, 'aset.janaMakmal', { min: 3 }));
      t.ok(run.created >= 1 && run.linked >= 3);
      const lab = Repo.of('MAKMAL').all().filter(function (l) { return l.kod === 'C99-01-101' && l.state === 'ACTIVE'; });
      t.eq(lab.length, 1); t.eq(lab[0].kod_lokasi, 'J.C99.01.101');
      t.eq(Repo.of('ASET').all().filter(function (x) { return x.makmal === lab[0].id; }).length, 3);
      const again = TestAssert.apiOk(TestHelpers.call(a.token, 'aset.janaMakmal', { min: 3 }));
      t.ok(!again.labs.some(function (l) { return l.kod === 'C99-01-101'; }), 'tiada pendua');
      TestAssert.apiOk(TestHelpers.call(a.token, 'aset.import', { rows: [mk('LB5', 'J.C99.01.101-03', 'PENJAGA X')] }));
      t.eq(Repo.of('ASET').all().filter(function (x) { return x.no_aset === 'LB5'; })[0].makmal, lab[0].id, 'import baharu dipautkan automatik');
      TestAssert.apiFail(TestHelpers.call(TestHelpers.user('z').token, 'aset.janaMakmal', {}), ERROR_CODES.FORBIDDEN);
    }]
  ]
};

/** Senarai penyelenggaraan PC makmal: lokasi fizikal vs UTMFin, status keadaan, baris tanpa barcode. */
const TestSuiteMaintenance = {
  name: 'Senarai penyelenggaraan makmal',
  tests: [
    ['physicalRoom & lokasiBerbeza', function (t) {
      t.eq(AsetHooks.physicalRoom('C24.411'), 'J.C24.04.411');
      t.eq(AsetHooks.physicalRoom('c24.108'), 'J.C24.01.108');
      t.eq(AsetHooks.physicalRoom('J.C24.04.411-01'), 'J.C24.04.411');
      t.eq(AsetHooks.physicalRoom('411'), '');
      t.ok(AsetHooks.lokasiBerbeza('J.C24.01.108-01', 'C24.411'));
      t.ok(!AsetHooks.lokasiBerbeza('J.C24.04.411-01', 'C24.411'));
      t.ok(!AsetHooks.lokasiBerbeza('', 'C24.411'), 'tiada rekod UTMFin → tidak dibandingkan');
      t.eq(AsetHooks.jenisOf('Laminate Machine AURORA A3'), 'LAIN');
      t.eq(AsetHooks.jenisOf('LCD Projector Epson EB-X04'), 'PROJEKTOR');
      t.eq(AsetHooks.jenisOf('Komputer HP Compaq 8000 Elite SFF'), 'DESKTOP');
      t.eq(AsetHooks.jenisOf('MEMBEKAL, MENGHANTAR, MEMASANG', 'DESKTOP'), 'DESKTOP', 'fallback kod SODO komputer');
    }],

    ['Kemas kini rekod UTMFin sedia ada tanpa pendua: medan UTMFin dikekalkan, lokasi fizikal & status keadaan dikemas kini, makmal dipaut semula', function (t) {
      AppFx.real();
      const a = TestHelpers.admin(ROLES.ADMIN);
      TestAssert.apiOk(TestHelpers.call(a.token, 'aset.import', { rows: [
        { noAset: 'MT0001', model: 'DESKTOP COMPUTER TYPE 2', kodSodo: 'B35201', tahunPerolehan: '2020', kodLokasi: 'J.C77.01.108-01', statusPengesahan: 'Penjaga - Penggunaan Makmal', pegawaiBertanggungjawab: 'PENJAGA REKAAN' },
        { noAset: 'MT0002', model: 'DESKTOP COMPUTER TYPE 2', kodSodo: 'B35201', tahunPerolehan: '2020', kodLokasi: 'J.C77.01.108-01', statusPengesahan: 'Penjaga - Penggunaan Makmal' },
        { noAset: 'MT0003', model: 'DESKTOP COMPUTER TYPE 2', kodSodo: 'B35201', tahunPerolehan: '2020', kodLokasi: 'J.C77.01.108-01', statusPengesahan: 'Penjaga - Penggunaan Makmal' }
      ] }));
      /* Makmal lama dijana ikut UTMFin (aras 01) */
      TestAssert.apiOk(TestHelpers.call(a.token, 'aset.janaMakmal', { min: 3 }));
      const before = Repo.of('ASET').all().filter(function (x) { return x.no_aset === 'MT0001'; })[0];
      t.ok(before.makmal, 'dipaut ke makmal UTMFin dahulu');
      const total0 = Repo.of('ASET').all().length;
      /* Senarai penyelenggaraan: PC sebenarnya di C77.411; satu baris monitor tanpa barcode; satu pendua */
      const r = TestAssert.apiOk(TestHelpers.call(a.token, 'aset.import', { rows: [
        { lokasiFizikal: 'C77.411', namaAlat: 'Desktop Type 2 HP Elite Desk 800 G4', tahunPerolehan: '2019', kategoriAset: 'Aset Tetap', statusPengesahan: 'Baik', kegunaan: 'Pengajaran', noAset: 'MT0001', borangKewpa: 'KEW.PA-2', sopAda: 'ADA', selenggaraCutiSem: '/', picMakmal: 'PIC REKAAN', monitor: 'HP N246v (S/N 6CM0001)' },
        { lokasiFizikal: '', namaAlat: 'Monitor HP N246v', noAset: '-' },
        { lokasiFizikal: 'C77.411', namaAlat: 'Desktop Type 2 HP Elite Desk 800 G4', statusPengesahan: 'Penyelenggaraan', noAset: 'MT0002' },
        { lokasiFizikal: 'C77.411', namaAlat: 'Desktop Type 2 HP Elite Desk 800 G4', statusPengesahan: 'Baik', noAset: 'MT0003' },
        { lokasiFizikal: 'C77.411', namaAlat: 'Desktop Type 2 HP Elite Desk 800 G4', statusPengesahan: 'Baik', noAset: 'MT0003' },
        { lokasiFizikal: 'C77.411', namaAlat: 'Printer Canon G3100', kategoriAset: 'Inventori', noAset: 'IAMT001', tahunPerolehan: '2022', nilaiPerolehan: '680' }
      ] }));
      t.ok(!r.dryRun && r.errorCount === 0, JSON.stringify(r.errors));
      t.eq(r.updated, 3, 'tiga rekod sedia ada dikemas kini'); t.eq(r.created, 1, 'hanya pencetak baharu');
      t.eq(r.skippedCount, 2, 'monitor tanpa barcode & pendua dilangkau');
      t.eq(Repo.of('ASET').all().length, total0 + 1, 'tiada pendua dicipta');
      const by = {};
      Repo.of('ASET').invalidate();
      Repo.of('ASET').all().forEach(function (x) { by[x.no_aset] = x; });
      const m1 = by.MT0001;
      t.eq(String(m1.tahun_perolehan), '2019', 'tahun dalam fail digunakan bila diberi (fail CSV gabungan tidak menghantar tahun bagi rekod sedia ada)');
      t.eq(m1.kod_lokasi, 'J.C77.01.108-01', 'kod lokasi UTMFin dikekalkan');
      t.eq(m1.status_pengesahan, 'MAKMAL', 'status pengesahan UTMFin dikekalkan');
      t.eq(m1.pegawai_bertanggungjawab, 'PENJAGA REKAAN');
      t.eq(m1.lokasi_fizikal, 'C77.411'); t.eq(String(m1.lokasi_berbeza).toUpperCase(), 'TRUE');
      t.eq(m1.lokasi, 'C77 · Aras 04 · Bilik 411'); t.eq(m1.jenama, 'HP'); t.eq(m1.kategori_aset, 'ASET_TETAP');
      t.eq(String(m1.sop_ada).toUpperCase(), 'TRUE'); t.eq(String(m1.selenggara_cuti_sem).toUpperCase(), 'TRUE');
      t.eq(m1.monitor, 'HP N246v (S/N 6CM0001)'); t.eq(m1.status, 'BERFUNGSI');
      t.eq(by.MT0002.status, 'PERLU_BAIKI', 'Penyelenggaraan → Perlu dibaiki');
      t.eq(by.IAMT001.jenis, 'PENCETAK'); t.eq(Number(by.IAMT001.nilai_perolehan), 680);
      /* Jana makmal ikut lokasi fizikal → aset dipaut semula dari makmal UTMFin lama */
      const g = TestAssert.apiOk(TestHelpers.call(a.token, 'aset.janaMakmal', { min: 3 }));
      const lab = g.labs.filter(function (l) { return l.kod === 'C77-04-411'; })[0];
      t.ok(lab && lab.pc === 3 && lab.penyelaras === 'PIC REKAAN', JSON.stringify(g.labs));
      Repo.of('ASET').invalidate();
      const newLab = Repo.of('MAKMAL').all().filter(function (l) { return l.kod === 'C77-04-411'; })[0];
      t.eq(Repo.of('ASET').findById(m1.id).makmal, newLab.id, 'dipaut semula ke makmal fizikal');
      t.ok(Repo.of('ASET').findById(m1.id).makmal !== before.makmal);
      t.ok(g.deactivated.indexOf('C77-01-108') >= 0, 'makmal UTMFin lama yang kosong dinyahaktif: ' + JSON.stringify(g.deactivated));
      t.eq(Repo.of('MAKMAL').findById(before.makmal).status, 'TIDAK_AKTIF');
      /* Sunting manual: tukar lokasi fizikal ikut UTMFin → bendera dibersihkan */
      TestAssert.apiOk(TestHelpers.call(a.token, 'crud.update', { module: 'aset', id: m1.id, lokasiFizikal: 'C77.108' }));
      t.eq(String(Repo.of('ASET').findById(m1.id).lokasi_berbeza).toUpperCase(), 'FALSE');
      const o = TestAssert.apiOk(TestHelpers.call(a.token, 'aset.overview', {}));
      t.ok(o.assets.lokasiBerbeza >= 2, 'overview kira lokasi berbeza');
    }]
  ]
};

/** Fasa 2a: susut nilai, cadangan penggantian, laporan. */
const TestSuiteNilai = {
  name: 'Nilai aset & cadangan penggantian',
  tests: [
    ['Susut nilai garis lurus: separuh hayat, habis, nilai sisa, tiada kos', function (t) {
      const now = new Date(Date.UTC(2026, 0, 1));
      const cfg = { hayat: 5, sisa: 0 };
      const half = AsetHooks.depreciation({ nilai_perolehan: 5000, tarikh_aset: '2023-07-02' }, now, cfg);
      t.ok(Math.abs(half.umurTahun - 2.5) < 0.05, 'umur ' + half.umurTahun);
      t.eq(half.susutTahunan, 1000); t.ok(Math.abs(half.nilaiBuku - 2500) < 5, 'nilai buku ~2500: ' + half.nilaiBuku); t.ok(!half.habis);
      const old = AsetHooks.depreciation({ nilai_perolehan: 4000, tahun_perolehan: 2016 }, now, cfg);
      t.eq(old.nilaiBuku, 0); t.ok(old.habis); t.eq(old.susutTerkumpul, 4000);
      const sisa = AsetHooks.depreciation({ nilai_perolehan: 4000, tahun_perolehan: 2016 }, now, { hayat: 5, sisa: 100 });
      t.eq(sisa.nilaiBuku, 100, 'tidak susut bawah nilai sisa');
      const nokos = AsetHooks.depreciation({ nilai_perolehan: '', tahun_perolehan: 2020 }, now, cfg);
      t.ok(nokos.tiadaKos && nokos.nilaiBuku === 0);
      t.eq(AsetHooks.depreciation({ nilai_perolehan: '', tahun_perolehan: '' }, now, cfg), null);
    }],

    ['Skor penggantian: tahap & sebab ikut kriteria', function (t) {
      const cfg = { umur: 7, ram: 8, aduan: 3, harga: 4500 };
      const oldDep = { umurTahun: 9.2, habis: true, kos: 2790 };
      const a = AsetHooks.replacementScore({ status: 'BERFUNGSI', jenis: 'DESKTOP', ram_gb: 4 }, oldDep, 0, cfg);
      t.eq(a.tahap, 'GANTI_SEGERA', JSON.stringify(a)); t.eq(a.skor, 6);
      t.ok(a.sebab.some(function (x) { return /Umur 9 tahun/.test(x); }) && a.sebab.some(function (x) { return /RAM 4GB/.test(x); }));
      const b = AsetHooks.replacementScore({ status: 'BERFUNGSI', jenis: 'DESKTOP' }, { umurTahun: 7.1, habis: true, kos: 4000 }, 0, cfg);
      t.eq(b.tahap, 'GANTI_TAHUN_DEPAN');
      const c = AsetHooks.replacementScore({ status: 'BERFUNGSI', jenis: 'DESKTOP' }, { umurTahun: 5.5, habis: true, kos: 4000 }, 0, cfg);
      t.eq(c.tahap, 'PANTAU', 'nilai buku habis sahaja');
      const d = AsetHooks.replacementScore({ status: 'BERFUNGSI', jenis: 'DESKTOP' }, { umurTahun: 2, habis: false, kos: 4000 }, 0, cfg);
      t.eq(d.tahap, 'OK');
      const e = AsetHooks.replacementScore({ status: 'TIDAK_BOLEH_GUNA', jenis: 'DESKTOP' }, { umurTahun: 2, habis: false, kos: 4000 }, 3, cfg);
      t.eq(e.tahap, 'GANTI_SEGERA', 'rosak + aduan kerap');
    }],

    ['Laporan nilai, penggantian (termasuk kiraan aduan ikut no. aset) & percanggahan lokasi', function (t) {
      AppFx.real();
      const a = TestHelpers.admin(ROLES.ADMIN);
      const u = TestHelpers.user('pengadu');
      TestAssert.apiFail(TestHelpers.call(u.token, 'aset.laporanNilai', {}), ERROR_CODES.FORBIDDEN);
      const lab = AppFx.lab(a, 'NV-01');
      TestAssert.apiOk(TestHelpers.call(a.token, 'aset.import', { rows: [
        { noAset: 'NV0001', model: 'DESKTOP LAMA', jenis: 'DESKTOP', makmal: 'NV-01', tahunPerolehan: '2015', nilaiPerolehan: '3000', kategoriAset: 'Aset Tetap', ramGb: '4' },
        { noAset: 'NV0002', model: 'DESKTOP BAHARU', jenis: 'DESKTOP', makmal: 'NV-01', tahunPerolehan: String(new Date().getFullYear()), nilaiPerolehan: '5000', kategoriAset: 'Aset Tetap' },
        { noAset: 'NV0003', model: 'PROJEKTOR', jenis: 'PROJEKTOR', makmal: 'NV-01', tahunPerolehan: '2015', nilaiPerolehan: '1500', kategoriAset: 'Inventori' },
        { noAset: 'NV0004', model: 'DESKTOP SEDERHANA', jenis: 'DESKTOP', makmal: 'NV-01', tahunPerolehan: '2023', nilaiPerolehan: '4000', status: 'Tidak boleh digunakan' }
      ] }));
      for (let i = 0; i < 3; i++) {
        TestAssert.apiOk(TestHelpers.call(u.token, 'crud.create', { module: 'tiket', tajuk: 'PC NV0004 rosak ' + i, kategori: AppFx.catId(), lokasi: 'Makmal NV', noAset: 'nv0004', keterangan: 'PC tidak boleh dihidupkan langsung.' }));
      }
      const v = TestAssert.apiOk(TestHelpers.call(a.token, 'aset.laporanNilai', { makmal: lab.id }));
      t.eq(v.total.aset, 4); t.eq(v.total.kos, 13500);
      t.ok(v.total.buku < v.total.kos && v.total.buku > 5000, 'nilai buku: ' + v.total.buku);
      t.eq(v.total.habis, 2, 'dua aset 2015 habis susut');
      t.ok(v.byKategori.some(function (k) { return k.label === 'Inventori' && k.kos === 1500; }));
      const g = TestAssert.apiOk(TestHelpers.call(a.token, 'aset.laporanGanti', { makmal: lab.id }));
      t.eq(g.jumlahDinilai, 3, 'komputer sahaja secara lalai');
      const by = {}; g.items.forEach(function (i) { by[i.noAset] = i; });
      t.eq(by.NV0001.tahap, 'GANTI_SEGERA'); t.eq(by.NV0004.aduan, 3, 'aduan dikira ikut no. aset (tak peka huruf)');
      t.eq(by.NV0004.tahap, 'GANTI_SEGERA'); t.ok(!by.NV0002, 'aset baharu (OK) tidak disenaraikan');
      t.eq(g.ringkasan.GANTI_SEGERA.kos, 7000, 'anggaran = nilai perolehan asal');
      const all = TestAssert.apiOk(TestHelpers.call(a.token, 'aset.laporanGanti', { makmal: lab.id, jenis: '', semua: true }));
      t.eq(all.jumlahDinilai, 4); t.ok(all.items.some(function (i) { return i.noAset === 'NV0002' && i.tahap === 'OK'; }));
      SettingsRepository.setMany({ GANTI_UMUR_TAHUN: '20' }, 'TEST');
      const g2 = TestAssert.apiOk(TestHelpers.call(a.token, 'aset.laporanGanti', { makmal: lab.id }));
      const n1 = g2.items.filter(function (i) { return i.noAset === 'NV0001'; })[0];
      t.ok(n1.tahap !== 'GANTI_SEGERA', 'kriteria ikut Tetapan: ' + n1.tahap);
      SettingsRepository.setMany({ GANTI_UMUR_TAHUN: '7' }, 'TEST');
      const o = TestAssert.apiOk(TestHelpers.call(a.token, 'aset.overview', {}));
      t.ok(o.nilai.kos >= 13500 && o.ganti.segera >= 2);
      const det = TestAssert.apiOk(TestHelpers.call(a.token, 'crud.get', { module: 'aset', id: v.items.filter(function (i) { return i.noAset === 'NV0001'; })[0].id }));
      t.eq(det.susutNilai.nilaiBuku, 0, 'butiran aset ada nilai buku');
      const l = TestAssert.apiOk(TestHelpers.call(a.token, 'aset.laporanLokasi', {}));
      t.ok(Array.isArray(l.items) && typeof l.total === 'number');
    }]
  ]
};

/** Fasa 2c: peranan Pengurusan (baca sahaja), pelan penggantian, indeks kesihatan makmal, laporan eksekutif. */
const TestSuitePengurusan = {
  name: 'Pengurusan & perancangan',
  tests: [
    ['Peranan PENGURUSAN: boleh baca laporan, tidak boleh ubah aset/import/tetapan, tiada notifikasi admin', function (t) {
      AppFx.real();
      const sup = TestHelpers.admin(ROLES.SUPER_ADMIN);
      const m = TestHelpers.user('dekan');
      TestAssert.apiOk(TestHelpers.call(sup.token, 'admin.user.role', { userId: m.user.id, role: 'PENGURUSAN' }));
      const tok = TestAssert.apiOk(api({ action: 'auth.login', payload: { email: m.user.email, password: 'Rahsia123' } })).token;
      ['aset.overview', 'aset.laporanNilai', 'aset.laporanGanti', 'aset.laporanLokasi', 'aset.pelan', 'aset.indeksMakmal', 'aset.eksekutif'].forEach(function (a) {
        TestAssert.apiOk(TestHelpers.call(tok, a, {}), a);
      });
      TestAssert.apiFail(TestHelpers.call(tok, 'aset.import', { rows: [{ noAset: 'X1' }] }), ERROR_CODES.FORBIDDEN);
      TestAssert.apiFail(TestHelpers.call(tok, 'aset.janaMakmal', {}), ERROR_CODES.FORBIDDEN);
      TestAssert.apiFail(TestHelpers.call(tok, 'crud.create', { module: 'aset', noAset: 'X2', jenis: 'DESKTOP' }), ERROR_CODES.FORBIDDEN);
      TestAssert.apiFail(TestHelpers.call(tok, 'admin.settings.update', { changes: { GANTI_UMUR_TAHUN: 3 } }), ERROR_CODES.FORBIDDEN);
      const list = TestAssert.apiOk(TestHelpers.call(tok, 'crud.list', { module: 'aset' }));
      t.eq(list.items.length, 0, 'tidak nampak daftar aset (butiran peribadi penjaga)');
      const u = TestHelpers.user('pengadu2');
      const before = Repo.of('NOTIFICATIONS').all().filter(function (n) { return n.user_id === m.user.id; }).length;
      TestAssert.apiOk(TestHelpers.call(u.token, 'crud.create', { module: 'tiket', tajuk: 'Uji notifikasi', kategori: AppFx.catId(), lokasi: 'C24', keterangan: 'Ujian notifikasi kepada admin sahaja.' }));
      t.eq(Repo.of('NOTIFICATIONS').all().filter(function (n) { return n.user_id === m.user.id; }).length, before, 'Pengurusan tidak menerima notifikasi tiket baharu');
    }],

    ['Pelan penggantian: tertunggak, unjuran tahunan, simulasi bajet ikut keutamaan', function (t) {
      AppFx.real();
      const a = TestHelpers.admin(ROLES.ADMIN);
      const lab = AppFx.lab(a, 'PL-01');
      const y = new Date().getFullYear();
      const rows = [];
      for (let i = 0; i < 4; i++) rows.push({ noAset: 'PL-OLD-' + i, jenis: 'DESKTOP', makmal: 'PL-01', tahunPerolehan: String(y - 9) });
      for (let i = 0; i < 3; i++) rows.push({ noAset: 'PL-MID-' + i, jenis: 'DESKTOP', makmal: 'PL-01', tahunPerolehan: String(y - 6) });
      for (let i = 0; i < 2; i++) rows.push({ noAset: 'PL-NEW-' + i, jenis: 'DESKTOP', makmal: 'PL-01', tahunPerolehan: String(y - 1) });
      TestAssert.apiOk(TestHelpers.call(a.token, 'aset.import', { rows: rows }));
      const p = TestAssert.apiOk(TestHelpers.call(a.token, 'aset.pelan', { makmal: lab.id, harga: 4000 }));
      t.eq(p.jumlahKomputer, 9); t.eq(p.tertunggak, 4, 'umur ≥ 7 → tahun ini');
      t.eq(p.keperluan[1].bil, 3, 'umur 6 → matang tahun depan'); t.eq(p.keperluan[1].tahun, y + 1);
      t.eq(p.keperluan[0].kos, 16000);
      t.eq(p.jumlahDalamTempoh, 7, 'umur 1 → matang tahun ke-6, di luar tempoh 5 tahun');
      const s = TestAssert.apiOk(TestHelpers.call(a.token, 'aset.pelan', { makmal: lab.id, harga: 4000, bajet: 8000 }));
      t.eq(s.simulasi.unitSetahun, 2);
      t.eq(s.simulasi.rows[0].diganti, 2); t.eq(s.simulasi.rows[0].tertunggakAkhirTahun, 2);
      t.eq(s.simulasi.rows[1].diganti, 2); t.eq(s.simulasi.rows[1].tertunggakAkhirTahun, 3, '2 lama + 3 matang − 2');
      t.ok(s.simulasi.tahunSelesai === null || s.simulasi.tahunSelesai > y + 1);
      const big = TestAssert.apiOk(TestHelpers.call(a.token, 'aset.pelan', { makmal: lab.id, harga: 4000, bajet: 100000 }));
      t.eq(big.simulasi.tahunSelesai, y, 'bajet besar → selesai tahun ini');
    }],

    ['Indeks kesihatan makmal & laporan eksekutif', function (t) {
      AppFx.real();
      const a = TestHelpers.admin(ROLES.ADMIN);
      const y = new Date().getFullYear();
      const bad = AppFx.lab(a, 'IK-BAD'); const good = AppFx.lab(a, 'IK-GOOD');
      const rows = [];
      for (let i = 0; i < 5; i++) rows.push({ noAset: 'IKB-' + i, jenis: 'DESKTOP', makmal: 'IK-BAD', tahunPerolehan: String(y - 11), status: i < 2 ? 'Tidak boleh digunakan' : 'Berfungsi', nilaiPerolehan: '3000' });
      for (let i = 0; i < 5; i++) rows.push({ noAset: 'IKG-' + i, jenis: 'DESKTOP', makmal: 'IK-GOOD', tahunPerolehan: String(y - 1), disahkanFizikal: 'Ya', nilaiPerolehan: '4500' });
      TestAssert.apiOk(TestHelpers.call(a.token, 'aset.import', { rows: rows }));
      const h = TestAssert.apiOk(TestHelpers.call(a.token, 'aset.indeksMakmal', {}));
      const B = h.items.filter(function (i) { return i.id === bad.id; })[0], G = h.items.filter(function (i) { return i.id === good.id; })[0];
      t.eq(B.tahap, 'KRITIKAL', JSON.stringify(B)); t.eq(G.tahap, 'BAIK', JSON.stringify(G));
      t.ok(B.skor < G.skor); t.eq(B.pc, 5); t.eq(B.rosak, 2); t.eq(G.pctDisahkan, 100);
      t.ok(h.items.indexOf(B) < h.items.indexOf(G), 'paling kritikal di atas');
      const e = TestAssert.apiOk(TestHelpers.call(a.token, 'aset.eksekutif', {}));
      t.ok(e.ringkasan.aset >= 10 && e.pelan.keperluan.length === 5 && e.makmal.length >= 2);
      t.ok(e.isu.some(function (i) { return /makmal berstatus kritikal/.test(i.teks); }), JSON.stringify(e.isu));
    }]
  ]
};

const KwFx = {
  byAset: function (no) {
    return Repo.of('TINDAKAN').all().filter(function (t) { return t.state === 'ACTIVE' && t.no_aset === no; });
  },
  open: function (no, jenis) {
    return KwFx.byAset(no).filter(function (t) { return t.jenis === jenis && TindakanHooks.OPEN.indexOf(t.status) >= 0; });
  },
  mails: function () { return typeof __mails !== 'undefined' ? __mails : (globalThis.__mails || null); }
};

const TestSuiteKewpa = {
  name: 'Penjejak tindakan KEWPA',
  tests: [
    ['Jana automatik daripada import: lokasi berbeza, penjaga bertukar, rekod lupus; tiada pendua; aset bersih tiada tindakan', function (t) {
      AppFx.real();
      const a = TestHelpers.admin(ROLES.ADMIN);
      const res = TestAssert.apiOk(TestHelpers.call(a.token, 'aset.import', { rows: [
        { noAset: 'KW-L1', jenis: 'DESKTOP', kodLokasi: 'J.C24.01.108-01', lokasiFizikal: 'C24.411' },
        { noAset: 'KW-P1', jenis: 'DESKTOP', statusPengesahan: 'BERTUKAR_PENJAGA', pegawaiBertanggungjawab: 'Penjaga Lama', penjagaTerkini: 'Penjaga Baru' },
        { noAset: 'KW-R1', jenis: 'LAPTOP', statusPengesahan: 'Telah lupus tetapi rekod aktif di UTMFin' },
        { noAset: 'KW-OK', jenis: 'DESKTOP', kodLokasi: 'J.C24.01.108-02', lokasiFizikal: 'C24.108' }
      ] }));
      t.ok(res.tindakan && res.tindakan.dicipta >= 3, JSON.stringify(res.tindakan));
      t.eq(KwFx.open('KW-L1', 'LOKASI').length, 1, 'lokasi berbeza');
      t.ok(/C24\.411/.test(KwFx.open('KW-L1', 'LOKASI')[0].butiran));
      t.eq(KwFx.open('KW-P1', 'PENJAGA').length, 1, 'penjaga bertukar');
      t.eq(KwFx.open('KW-R1', 'REKOD_LUPUS').length, 1, 'lupus tetapi rekod aktif');
      t.eq(KwFx.byAset('KW-OK').length, 0, 'aset bersih tiada tindakan');
      const r = KwFx.open('KW-L1', 'LOKASI')[0];
      t.ok(/^TND-\d{5}$/.test(r.ref_no), r.ref_no); t.ok(r.tarikh_sasaran > DateUtils.dayKey(new Date()), 'tarikh sasaran ditetapkan');
      t.eq(String(r.automatik).toUpperCase(), 'TRUE');
      TestAssert.apiOk(TestHelpers.call(a.token, 'tindakan.segerak', {}));
      t.eq(KwFx.byAset('KW-L1').length, 1, 'segerak semula tiada pendua');
    }],

    ['Tutup automatik apabila aset dibetulkan; jana semula jika isu kembali; keputusan pegawai dihormati', function (t) {
      AppFx.real();
      const a = TestHelpers.admin(ROLES.ADMIN);
      TestAssert.apiOk(TestHelpers.call(a.token, 'aset.import', { rows: [
        { noAset: 'KW-L2', jenis: 'DESKTOP', kodLokasi: 'J.C24.01.108-01', lokasiFizikal: 'C24.411' },
        { noAset: 'KW-P2', jenis: 'DESKTOP', statusPengesahan: 'BERTUKAR_PENJAGA' }
      ] }));
      const asetL = Repo.of('ASET').all().filter(function (x) { return x.no_aset === 'KW-L2'; })[0];
      /* Pegawai betulkan lokasi fizikal → tindakan ditutup automatik */
      TestAssert.apiOk(TestHelpers.call(a.token, 'crud.update', { module: 'aset', id: asetL.id, lokasiFizikal: 'C24.108' }));
      const s1 = TestAssert.apiOk(TestHelpers.call(a.token, 'tindakan.segerak', {}));
      t.ok(s1.ditutup >= 1, JSON.stringify(s1));
      const closed = KwFx.byAset('KW-L2')[0];
      t.eq(closed.status, 'SELESAI'); t.eq(closed.status_changed_by, 'Sistem'); t.ok(closed.selesai_pada, 'tarikh selesai');
      /* Isu kembali → tindakan baharu */
      TestAssert.apiOk(TestHelpers.call(a.token, 'crud.update', { module: 'aset', id: asetL.id, lokasiFizikal: 'C24.412' }));
      TestAssert.apiOk(TestHelpers.call(a.token, 'tindakan.segerak', {}));
      t.eq(KwFx.open('KW-L2', 'LOKASI').length, 1, 'dijana semula');
      t.eq(KwFx.byAset('KW-L2').length, 2);
      /* Pegawai tutup PENJAGA walaupun aset belum dikemas kini → tidak dijana semula */
      const p = KwFx.open('KW-P2', 'PENJAGA')[0];
      const d = TestAssert.apiOk(TestHelpers.call(a.token, 'crud.setStatus', { module: 'tindakan', id: p.id, status: 'SELESAI', note: 'KEW.PA dihantar' }));
      t.ok(d.values.selesaiPada, 'tarikh selesai dalam respons');
      TestAssert.apiOk(TestHelpers.call(a.token, 'tindakan.segerak', {}));
      t.eq(KwFx.byAset('KW-P2').length, 1, 'tidak dijana semula selepas ditutup pegawai');
      TestAssert.apiOk(TestHelpers.call(a.token, 'crud.setStatus', { module: 'tindakan', id: p.id, status: 'DALAM_TINDAKAN' }));
      t.eq(Repo.of('TINDAKAN').findById(p.id).selesai_pada, '', 'dibuka semula → tarikh selesai dikosongkan');
    }],

    ['Tindakan manual: no. aset & makmal dilengkapkan; ringkasan Pengurusan tanpa butiran peribadi; Pengurusan tidak nampak senarai', function (t) {
      AppFx.real();
      const sup = TestHelpers.admin(ROLES.SUPER_ADMIN);
      const lab = AppFx.lab(sup, 'KW-LAB');
      TestAssert.apiOk(TestHelpers.call(sup.token, 'aset.import', { rows: [{ noAset: 'KW-M1', jenis: 'DESKTOP', makmal: 'KW-LAB', pegawaiBertanggungjawab: 'Nama Rahsia Penjaga' }] }));
      const aset = Repo.of('ASET').all().filter(function (x) { return x.no_aset === 'KW-M1'; })[0];
      const d = TestAssert.apiOk(TestHelpers.call(sup.token, 'crud.create', { module: 'tindakan', jenis: 'PENGESAHAN', aset: aset.id, butiran: 'Semak semula label' }));
      t.eq(d.values.noAset, 'KW-M1'); t.eq(d.values.makmal, lab.id); t.ok(d.values.tarikhSasaran, 'sasaran lalai');
      t.eq(d.values.automatik, false);
      const m = TestHelpers.user('tpk');
      TestAssert.apiOk(TestHelpers.call(sup.token, 'admin.user.role', { userId: m.user.id, role: 'PENGURUSAN' }));
      const tok = TestAssert.apiOk(api({ action: 'auth.login', payload: { email: m.user.email, password: 'Rahsia123' } })).token;
      const s = TestAssert.apiOk(TestHelpers.call(tok, 'tindakan.ringkasan', {}));
      t.ok(s.jumlah.terbuka >= 1 && s.ikutJenis.length >= 1, JSON.stringify(s.jumlah));
      t.ok(JSON.stringify(s).indexOf('Rahsia') < 0, 'tiada nama penjaga');
      t.eq(TestAssert.apiOk(TestHelpers.call(tok, 'crud.list', { module: 'tindakan' })).items.length, 0, 'senarai tindakan untuk admin sahaja');
      TestAssert.apiFail(TestHelpers.call(tok, 'tindakan.segerak', {}), ERROR_CODES.FORBIDDEN);
      /* Lewat sasaran dikira */
      Repo.of('TINDAKAN').update(d.id, { tarikh_sasaran: '2020-01-01' });
      const s2 = TestAssert.apiOk(TestHelpers.call(tok, 'tindakan.ringkasan', {}));
      t.ok(s2.jumlah.lewat >= 1);
      const e = TestAssert.apiOk(TestHelpers.call(tok, 'aset.eksekutif', {}));
      t.ok(e.tindakan && e.isu.some(function (i) { return /tindakan KEWPA/.test(i.teks); }), JSON.stringify(e.isu));
    }]
  ]
};

const TestSuiteTrend = {
  name: 'Trend & email ringkasan bulanan',
  tests: [
    ['Simpan ringkasan bulan semasa; email bulan lepas sekali sahaja kepada Pengurusan, Admin & penerima tambahan', function (t) {
      AppFx.real();
      const sup = TestHelpers.admin(ROLES.SUPER_ADMIN);
      const m = TestHelpers.user('dekan2');
      TestAssert.apiOk(TestHelpers.call(sup.token, 'admin.user.role', { userId: m.user.id, role: 'PENGURUSAN' }));
      const biasa = TestHelpers.user('biasa');
      SettingsRepository.setMany({ EMAIL_RINGKASAN_BULANAN: 'TRUE', EMAIL_RINGKASAN_TAMBAHAN: 'pejabat.dekan@test.local, bukan-email' }, 'TEST');
      const month = DateUtils.monthKey(new Date());
      const prev = AsetTrend.prevMonth(month);
      Repo.of('RINGKASAN_BULANAN').deleteWhere(function () { return true; });
      Repo.of('RINGKASAN_BULANAN').insert({ bulan: prev, aset: '1', nilai_kos: '1000', ganti_segera: '0', emel_dihantar_pada: '', created_at: DateUtils.nowIso(), updated_at: DateUtils.nowIso() });
      const box = KwFx.mails();
      const before = box ? box.length : 0;
      const out = AsetHooks.maintenance();
      t.eq(out.bulan, month);
      const row = Repo.of('RINGKASAN_BULANAN').findById(month);
      t.ok(row && Number(row.aset) >= 0 && row.nilai_kos !== undefined, 'baris bulan semasa disimpan');
      t.ok(out.emel && out.emel.penerima >= 3, JSON.stringify(out.emel));
      t.ok(Repo.of('RINGKASAN_BULANAN').findById(prev).emel_dihantar_pada, 'ditanda dihantar');
      if (box) {
        const sent = box.slice(before).filter(function (x) { return /Ringkasan aset IT/.test(x.subject); });
        const to = sent.map(function (x) { return x.to; });
        t.ok(to.indexOf(m.user.email) >= 0, 'Pengurusan'); t.ok(to.indexOf(sup.user.email) >= 0 || to.indexOf(String(sup.user.email).toLowerCase()) >= 0, 'Admin');
        t.ok(to.indexOf('pejabat.dekan@test.local') >= 0, 'penerima tambahan'); t.ok(to.indexOf(biasa.user.email) < 0, 'pengguna biasa tidak');
        t.ok(to.indexOf('bukan-email') < 0);
        t.ok(/ringkasan bulanan/i.test(sent[0].htmlBody) || /Ringkasan aset IT FKM/.test(sent[0].htmlBody));
      }
      t.ok(Repo.of('NOTIFICATIONS').all().some(function (n) { return n.user_id === m.user.id && /Ringkasan aset IT/.test(n.title); }), 'notifikasi dalam app');
      const after = box ? box.length : 0;
      const out2 = AsetHooks.maintenance();
      t.ok(!out2.emel, 'tidak dihantar dua kali');
      if (box) t.eq(box.length, after);
      /* Dimatikan dalam Tetapan */
      Repo.of('RINGKASAN_BULANAN').update(prev, { emel_dihantar_pada: '' });
      SettingsRepository.setMany({ EMAIL_RINGKASAN_BULANAN: 'FALSE' }, 'TEST');
      t.ok(!AsetHooks.maintenance().emel, 'tetapan dimatikan → tiada email');
      SettingsRepository.setMany({ EMAIL_RINGKASAN_BULANAN: 'TRUE', EMAIL_RINGKASAN_TAMBAHAN: '' }, 'TEST');
    }],

    ['Laluan trend (Pengurusan) & hantar ujian (Admin sahaja); baris email dengan perubahan', function (t) {
      AppFx.real();
      const sup = TestHelpers.admin(ROLES.SUPER_ADMIN);
      const m = TestHelpers.user('td');
      TestAssert.apiOk(TestHelpers.call(sup.token, 'admin.user.role', { userId: m.user.id, role: 'PENGURUSAN' }));
      const tok = TestAssert.apiOk(api({ action: 'auth.login', payload: { email: m.user.email, password: 'Rahsia123' } })).token;
      const tr = TestAssert.apiOk(TestHelpers.call(tok, 'aset.trend', {}));
      const last = tr.items[tr.items.length - 1];
      t.eq(last.bulan, DateUtils.monthKey(new Date()), 'bulan semasa langsung');
      t.ok(typeof last.aset === 'number' && typeof last.nilaiKos === 'number');
      t.eq(tr.items.filter(function (i) { return i.bulan === last.bulan; }).length, 1, 'tiada pendua bulan semasa');
      TestAssert.apiFail(TestHelpers.call(tok, 'aset.hantarRingkasan', { ujian: true }), ERROR_CODES.FORBIDDEN);
      const box = KwFx.mails();
      const before = box ? box.length : 0;
      const r = TestAssert.apiOk(TestHelpers.call(sup.token, 'aset.hantarRingkasan', { ujian: true }));
      t.eq(r.penerima, 1); t.ok(r.ujian);
      if (box) t.eq(box.slice(before).filter(function (x) { return /\(ujian\)/.test(x.subject); }).length, 1);
      t.eq(Repo.of('RINGKASAN_BULANAN').findById(last.bulan).emel_dihantar_pada, '', 'ujian tidak menanda dihantar');
      const e = TestAssert.apiOk(TestHelpers.call(tok, 'aset.eksekutif', {}));
      t.ok(Array.isArray(e.trend) && e.trend[e.trend.length - 1].bulan === last.bulan);
      const L = AsetTrend.lines({ bulan: '2026-10', aset: 290, beroperasiPct: 92, nilaiKos: 1100000, nilaiBuku: 30000, gantiSegera: 3, gantiTahunDepan: 170, kosGanti: 500000, makmal: 8, makmalKritikal: 2, indeksPurata: 55, tiketBaru: 4, tiketSelesai: 3, slaPct: 100, tiketTerbuka: 1, tiketLewat: 0, disahkanPct: 60, lokasiBerbeza: 100, tindakanTerbuka: 10, tindakanLewat: 0, tindakanSelesai: 5 },
        { bulan: '2026-09', aset: 287, beroperasiPct: 92, nilaiKos: 1100732, nilaiBuku: 31563, gantiSegera: 3, gantiTahunDepan: 177, kosGanti: 0, makmal: 8, makmalKritikal: 3, indeksPurata: 50, disahkanPct: 55, lokasiBerbeza: 106, tindakanTerbuka: 15 });
      const txt = L.join('\n');
      t.ok(/Oktober 2026/.test(txt) && /September 2026/.test(txt), txt);
      t.ok(/290 \(\+3\)/.test(txt), 'perubahan aset');
      t.ok(/177|170 tahun depan \(−7\)/.test(txt), txt);
      t.ok(/92% beroperasi \(tiada perubahan\)/.test(txt), txt);
      t.eq(AsetTrend.prevMonth('2026-01'), '2025-12');
    }]
  ]
};

const BmFx = {
  pc: function (extra) {
    return api({ action: 'crud.publicCreate', payload: Object.assign({
      module: 'keperluan', formToken: SecurityUtils.signFormToken('crud:keperluan', Date.now() - 5000),
      namaPemohon: 'Dr. Pemilik Contoh', noStaf: 'S1234', emailPemohon: 'pemilik' + (++AppFx.seq) + '@utm.my', peranan: 'PEMILIK',
      tahun: 2026, jumlahSediaAda: 20, berfungsi: 18, tidakSesuai: 3, rosakBolehBaiki: 1, rosakLupus: 1, sasaranJumlah: 25,
      keutamaan: 'TINGGI', hargaSeunit: 4000, justifikasi: 'Perisian simulasi terkini memerlukan komputer lebih berkuasa.'
    }, extra || {}) });
  },
  row: function (refNo) { return Repo.of('KEPERLUAN').all().filter(function (r) { return r.ref_no === refNo; })[0]; },
  get: function (t) { return api({ action: 'keperluan.awamGet', payload: { t: t } }); }
};

const TestSuiteBanci = {
  name: 'Borang awam banci makmal',
  tests: [
    ['Hantar tanpa log masuk: email UTM wajib, kiraan, satu borang setiap makmal setahun, link edit peribadi (hash sahaja disimpan)', function (t) {
      AppFx.real();
      const a = TestHelpers.admin(ROLES.ADMIN);
      const lab = AppFx.lab(a, 'BM-01');
      TestAssert.apiFail(BmFx.pc({ makmal: lab.id, emailPemohon: 'orang@gmail.com' }), ERROR_CODES.VALIDATION_ERROR, 'email luar domain');
      TestAssert.apiFail(BmFx.pc({ makmal: lab.id, noStaf: '' }), ERROR_CODES.VALIDATION_ERROR, 'no. staf wajib');
      TestAssert.apiOk(BmFx.pc({ makmal: lab.id, emailPemohon: 'staf' + AppFx.seq + '@mail.fkm.utm.my', tahun: 2031 }), 'subdomain utm.my diterima');
      const box = KwFx.mails(); const before = box ? box.length : 0;
      const res = TestAssert.apiOk(BmFx.pc({ makmal: lab.id }));
      const token = KeperluanHooks.lastToken_;
      const row = BmFx.row(res.refNo);
      t.eq(row.nama_makmal, 'BM-01 · ' + lab.values.nama); t.ok(/\(awam\)/.test(row.owner_name));
      t.eq(Number(row.bilangan_ganti), 4); t.eq(Number(row.bilangan_tambahan), 5, '25 − (18 − 3 + 1) − 4');
      if (box) t.ok(box.slice(before).some(function (m) { return m.to === row.email_pemohon && /KPM-/.test(m.subject); }), 'link diemel walaupun NOTIFY_EMAIL_ENABLED mati');
      const links = Repo.of('PAUTAN_EDIT').all().filter(function (l) { return l.record_id === row.id; });
      t.eq(links.length, 1); t.ok(JSON.stringify(links).indexOf(token) < 0, 'token mentah tidak disimpan');
      const dup = BmFx.pc({ makmal: lab.id });
      TestAssert.apiFail(dup, ERROR_CODES.CONFLICT, 'makmal + tahun sama');
      t.ok(dup.message.indexOf(res.refNo) >= 0, dup.message);
      const g = TestAssert.apiOk(BmFx.get(token));
      t.eq(g.refNo, res.refNo); t.ok(g.canEdit); t.eq(g.values.berfungsi, 18); t.eq(g.values.noStaf, 'S1234');
      t.ok(g.values.catatanIt === undefined, 'medan admin tidak didedahkan');
      TestAssert.apiFail(BmFx.get('A'.repeat(43)), ERROR_CODES.NOT_FOUND);
      TestAssert.apiFail(BmFx.get('pendek'), ERROR_CODES.NOT_FOUND);
    }],

    ['Kemas kini melalui link: makmal/tahun/email dikunci; dikembalikan → link baharu, hantar semula; disahkan → baca sahaja', function (t) {
      AppFx.real();
      const a = TestHelpers.admin(ROLES.ADMIN);
      const lab = AppFx.lab(a, 'BM-02'); const other = AppFx.lab(a, 'BM-03');
      const res = TestAssert.apiOk(BmFx.pc({ makmal: lab.id }));
      const tok = KeperluanHooks.lastToken_;
      const row0 = BmFx.row(res.refNo);
      const full = { namaPemohon: 'Dr. Pemilik Contoh', noStaf: 'S1234', peranan: 'PENGURUS', jumlahSediaAda: 20, berfungsi: 18, tidakSesuai: 3, rosakBolehBaiki: 1, rosakLupus: 1,
        sasaranJumlah: 30, keutamaan: 'KRITIKAL', hargaSeunit: 4000, justifikasi: 'Kemas kini: pengambilan pelajar bertambah tahun ini.' };
      const u = TestAssert.apiOk(api({ action: 'keperluan.awamKemaskini', payload: Object.assign({ t: tok, makmal: other.id, tahun: 2030, emailPemohon: 'jahat@utm.my' }, full) }));
      t.eq(u.computed.tambahan, 10); t.eq(u.values.peranan, 'PENGURUS');
      const r1 = BmFx.row(res.refNo);
      t.eq(r1.makmal, lab.id, 'makmal dikunci'); t.eq(String(r1.tahun), '2026'); t.eq(r1.email_pemohon, row0.email_pemohon, 'email dikunci');
      TestAssert.apiFail(api({ action: 'keperluan.awamKemaskini', payload: Object.assign({ t: tok }, full, { berfungsi: 5 }) }), ERROR_CODES.VALIDATION_ERROR, 'kiraan tidak sepadan');
      /* Dikembalikan → link lama batal, link baharu diemel */
      TestAssert.apiOk(TestHelpers.call(a.token, 'crud.setStatus', { module: 'keperluan', id: r1.id, status: 'DIKEMBALIKAN', note: 'Sahkan bilangan rosak.' }));
      const tok2 = KeperluanHooks.lastToken_;
      t.ok(tok2 && tok2 !== tok, 'token baharu');
      TestAssert.apiFail(BmFx.get(tok), ERROR_CODES.NOT_FOUND, 'link lama dibatalkan');
      const g2 = TestAssert.apiOk(BmFx.get(tok2));
      t.eq(g2.status, 'DIKEMBALIKAN'); t.eq(g2.statusNote, 'Sahkan bilangan rosak.');
      TestAssert.apiOk(api({ action: 'keperluan.awamKemaskini', payload: Object.assign({ t: tok2 }, full, { rosakLupus: 2, berfungsi: 17, tidakSesuai: 2 }) }));
      t.eq(BmFx.row(res.refNo).status, 'DIHANTAR', 'dihantar semula');
      /* Disahkan → baca sahaja */
      TestAssert.apiOk(TestHelpers.call(a.token, 'crud.setStatus', { module: 'keperluan', id: r1.id, status: 'DISAHKAN' }));
      const g3 = TestAssert.apiOk(BmFx.get(tok2));
      t.eq(g3.canEdit, false);
      TestAssert.apiFail(api({ action: 'keperluan.awamKemaskini', payload: Object.assign({ t: tok2 }, full) }), ERROR_CODES.FORBIDDEN);
    }],

    ['Makmal baharu: nama wajib jika tiada makmal, tiada pendua, didaftarkan & dipautkan apabila disahkan', function (t) {
      AppFx.real();
      const a = TestHelpers.admin(ROLES.ADMIN);
      const base = { jumlahSediaAda: 0, berfungsi: 0, tidakSesuai: 0, rosakBolehBaiki: 0, rosakLupus: 0, sasaranJumlah: 30 };
      TestAssert.apiFail(BmFx.pc(base), ERROR_CODES.VALIDATION_ERROR, 'tiada makmal & tiada nama');
      const res = TestAssert.apiOk(BmFx.pc(Object.assign({ namaMakmalBaru: 'Makmal Fabrikasi Digital', bangunanMakmalBaru: 'C25', bilikMakmalBaru: '02.110', jabatanMakmalBaru: 'Pembuatan' }, base)));
      const r = BmFx.row(res.refNo);
      t.eq(r.nama_makmal, 'Makmal Fabrikasi Digital (makmal baharu)'); t.eq(Number(r.bilangan_tambahan), 30); t.eq(r.makmal, '');
      TestAssert.apiFail(BmFx.pc(Object.assign({ namaMakmalBaru: '  makmal fabrikasi   DIGITAL ' }, base)), ERROR_CODES.CONFLICT, 'nama sama');
      TestAssert.apiOk(TestHelpers.call(a.token, 'crud.setStatus', { module: 'keperluan', id: r.id, status: 'DISAHKAN' }));
      const r2 = BmFx.row(res.refNo);
      t.ok(r2.makmal, 'dipautkan');
      const lab = Repo.of('MAKMAL').findById(r2.makmal);
      t.eq(lab.nama, 'Makmal Fabrikasi Digital'); t.eq(lab.kod, 'C25-02.110'); t.eq(lab.bangunan, 'C25'); t.eq(lab.penyelaras, 'Dr. Pemilik Contoh');
      t.eq(r2.nama_makmal, 'C25-02.110 · Makmal Fabrikasi Digital');
    }],

    ['Dapatkan semula link (tiada pendedahan), link kongsi untuk admin sahaja, admin boleh isi tanpa maklumat pemohon', function (t) {
      AppFx.real();
      const a = TestHelpers.admin(ROLES.ADMIN);
      const lab = AppFx.lab(a, 'BM-04');
      const res = TestAssert.apiOk(BmFx.pc({ makmal: lab.id }));
      const tok = KeperluanHooks.lastToken_;
      const row = BmFx.row(res.refNo);
      const wrong = TestAssert.apiOk(api({ action: 'keperluan.awamPautan', payload: { refNo: res.refNo, email: 'lain@utm.my' } }));
      t.ok(wrong.sent); t.eq(KeperluanHooks.lastToken_, tok, 'email salah → tiada link baharu');
      const right = TestAssert.apiOk(api({ action: 'keperluan.awamPautan', payload: { refNo: res.refNo.toLowerCase(), email: row.email_pemohon.toUpperCase() } }));
      t.eq(right.message, wrong.message, 'jawapan sama');
      t.ok(KeperluanHooks.lastToken_ !== tok); TestAssert.apiFail(BmFx.get(tok), ERROR_CODES.NOT_FOUND);
      const u = TestHelpers.user('biasa-bm');
      TestAssert.apiFail(TestHelpers.call(u.token, 'keperluan.pautanBorang', {}), ERROR_CODES.FORBIDDEN);
      t.ok(/#\/banci-makmal$/.test(TestAssert.apiOk(TestHelpers.call(a.token, 'keperluan.pautanBorang', {})).path));
      const lab2 = AppFx.lab(a, 'BM-05');
      TestAssert.apiOk(TestHelpers.call(a.token, 'crud.create', { module: 'keperluan', makmal: lab2.id, tahun: 2026, jumlahSediaAda: 10, berfungsi: 10, sasaranJumlah: 10, keutamaan: 'RENDAH', justifikasi: 'Diisi oleh Unit IT bagi pihak makmal.' }), 'admin tanpa maklumat pemohon');
      SettingsRepository.setMany({ KEPERLUAN_DOMAIN_EMAIL: '*' }, 'TEST');
      t.ok(KeperluanHooks.emailAllowed('sesiapa@gmail.com'), 'tetapan * → semua domain');
      SettingsRepository.setMany({ KEPERLUAN_DOMAIN_EMAIL: 'utm.my' }, 'TEST');
      t.ok(!KeperluanHooks.emailAllowed('x@notutm.my'), 'bukan subdomain');
    }]
  ]
};

const TestSuiteDataMakmal = {
  name: 'Import makmal, staf, perisian & banci',
  tests: [
    ['Import makmal (upsert ikut kod), staf (ref ikut kod/nama, upsert no. pekerja), perisian (upsert makmal+nama), pegawai (email)', function (t) {
      AppFx.real();
      const a = TestHelpers.admin(ROLES.ADMIN);
      const r1 = TestAssert.apiOk(TestHelpers.call(a.token, 'makmal.import', { rows: [
        { kod: 'DM-01', nama: 'Makmal Ujian Bendalir', jenisMakmal: 'Makmal kejuruteraan / pengajaran', bangunan: 'E07' },
        { kod: 'DM-02', nama: 'Makmal Komputer Ujian', jenisMakmal: 'KOMPUTER', tempatKomputer: '40', spesifikasiKomputer: 'SET 1: 40 × PC' }
      ] }));
      t.eq(r1.created, 2);
      const r2 = TestAssert.apiOk(TestHelpers.call(a.token, 'makmal.import', { rows: [{ kod: 'dm-02', penyelaras: 'Penyelaras Ujian' }] }));
      t.eq(r2.created, 0); t.eq(r2.updated, 1, 'kod tidak peka huruf');
      const lab2 = Repo.of('MAKMAL').all().filter(function (l) { return String(l.kod).toUpperCase() === 'DM-02'; })[0];
      t.eq(lab2.penyelaras, 'Penyelaras Ujian');
      TestAssert.apiOk(TestHelpers.call(a.token, 'makmal.import', { rows: [{ kod: 'DM-03', nama: 'Makmal Lokasi', kodLokasi: 'J.C99.01.101' }] }));
      const r3 = TestAssert.apiOk(TestHelpers.call(a.token, 'makmal.import', { rows: [{ kod: 'DM-03-BARU', nama: 'Makmal Lokasi (nama baharu)', kodLokasi: 'J.C99.01.101' }] }));
      t.eq(r3.created, 0, 'padan ikut kod lokasi'); t.eq(r3.updated, 1); t.eq(lab2.nama, 'Makmal Komputer Ujian', 'medan lain kekal'); t.eq(lab2.jenis_makmal, 'KOMPUTER');
      const s1 = TestAssert.apiOk(TestHelpers.call(a.token, 'staf.import', { rows: [
        { nama: 'Staf Satu', noPekerja: '90001', makmal: 'DM-01', email: 'staf1@test.local' },
        { nama: 'Staf Dua', noPekerja: '90002', makmal: 'Makmal Komputer Ujian', email: ' Staf2@Test.local ' },
        { nama: 'Staf Pendua', noPekerja: '90001' }
      ] }));
      t.eq(s1.created, 2); t.eq(s1.skippedCount, 1, 'pendua dalam fail dilangkau');
      const st2 = Repo.of('STAF').all().filter(function (x) { return x.no_pekerja === '90002'; })[0];
      t.eq(st2.makmal, lab2.id, 'makmal ikut nama'); t.eq(st2.email, 'staf2@test.local'); t.eq(String(st2.terima_banci).toUpperCase(), 'TRUE', 'lalai terima banci');
      const bad = TestAssert.apiOk(TestHelpers.call(a.token, 'staf.import', { rows: [{ nama: 'X', noPekerja: '90009', makmal: 'TIADA-LAB' }] }));
      t.eq(bad.errorCount, 1); t.ok(bad.dryRun, 'ralat → tiada ditulis');
      TestAssert.apiOk(TestHelpers.call(a.token, 'staf.import', { rows: [{ noPekerja: '90001', jawatan: 'Penolong Jurutera' }] }));
      t.eq(Repo.of('STAF').all().filter(function (x) { return x.no_pekerja === '90001'; }).length, 1);
      const p1 = TestAssert.apiOk(TestHelpers.call(a.token, 'perisian.import', { rows: [
        { makmal: 'DM-02', nama: 'Solidworks 2024', jenisLesen: 'Berlesen', sumberLesen: 'FKM Server', bilLesen: '3000' },
        { makmal: 'DM-02', nama: 'GNU Octave', jenisLesen: 'SUMBER_TERBUKA', bilLesen: '5' }
      ] }));
      t.eq(p1.created, 2);
      const oct = Repo.of('PERISIAN').all().filter(function (x) { return x.nama === 'GNU Octave'; })[0];
      t.eq(oct.bil_lesen, '', 'sumber terbuka → tiada bilangan lesen');
      t.eq(TestAssert.apiOk(TestHelpers.call(a.token, 'perisian.import', { rows: [{ makmal: 'DM-02', nama: 'solidworks 2024', bilLesen: '20' }] })).updated, 1);
      TestAssert.apiFail(TestHelpers.call(a.token, 'crud.create', { module: 'perisian', makmal: lab2.id, nama: 'Solidworks 2024', jenisLesen: 'BERLESEN' }), ERROR_CODES.CONFLICT);
      const g = TestAssert.apiOk(TestHelpers.call(a.token, 'pegawai.import', { rows: [{ nama: 'Pegawai Import', email: 'pgimport@test.local', jawatan: 'Juruteknik' }, { nama: 'Pegawai Import B', email: 'PGIMPORT@test.local' }] }));
      t.eq(g.created, 1); t.eq(g.skippedCount, 1);
      /* Butiran makmal: perisian untuk semua, staf untuk admin sahaja */
      const dA = TestAssert.apiOk(TestHelpers.call(a.token, 'crud.get', { module: 'makmal', id: lab2.id }));
      t.eq(dA.perisian.length, 2); t.eq(dA.staf.length, 1);
      const u = TestHelpers.user('biasa-makmal');
      const dU = TestAssert.apiOk(TestHelpers.call(u.token, 'crud.get', { module: 'makmal', id: lab2.id }));
      t.ok(!dU.staf, 'pengguna biasa tidak nampak staf');
      ['makmal.import', 'staf.import', 'perisian.import', 'pegawai.import', 'keperluan.statusBanci', 'keperluan.emelBanci'].forEach(function (r) {
        TestAssert.apiFail(TestHelpers.call(u.token, r, { rows: [{ nama: 'x' }] }), ERROR_CODES.FORBIDDEN, r);
      });
    }],

    ['Status banci & emel link kepada staf makmal yang belum hantar (makmal dipilih dalam link)', function (t) {
      AppFx.real();
      const a = TestHelpers.admin(ROLES.ADMIN);
      TestAssert.apiOk(TestHelpers.call(a.token, 'makmal.import', { rows: [{ kod: 'BN-IT', nama: 'Makmal Komputer Banci', jenisMakmal: 'KOMPUTER', emailPenyelaras: 'unitit@test.local' }, { kod: 'BN-01', nama: 'Makmal Banci Satu' }, { kod: 'BN-02', nama: 'Makmal Banci Dua', emailPenyelaras: 'penyelaras.bn2@test.local' }, { kod: 'BN-03', nama: 'Makmal Banci Tiga' }] }));
      TestAssert.apiOk(TestHelpers.call(a.token, 'staf.import', { rows: [
        { nama: 'Staf BN A', noPekerja: '80001', makmal: 'BN-01', email: 'bna@test.local' },
        { nama: 'Staf BN B', noPekerja: '80002', makmal: 'BN-01', email: 'bnb@test.local' },
        { nama: 'Staf BN C', noPekerja: '80003', makmal: 'BN-01', email: 'bnc@test.local', terimaBanci: 'Tidak' },
        { nama: 'Staf BN D', noPekerja: '80004', makmal: 'BN-03', email: 'bnd@test.local' }
      ] }));
      const lab3 = Repo.of('MAKMAL').all().filter(function (l) { return l.kod === 'BN-03'; })[0];
      const yr = Number(DateUtils.format(new Date(), 'yyyy'));
      const u = TestHelpers.user('penyelaras-bn');
      TestAssert.apiOk(AppFx.need(u, lab3, { tahun: yr }));
      const st = TestAssert.apiOk(TestHelpers.call(a.token, 'keperluan.statusBanci', {}));
      const it = function (kod) { return st.items.filter(function (i) { return i.label.indexOf(kod) === 0; })[0]; };
      t.eq(it('BN-01').penerima, 2, 'staf yang tidak terima banci dikecualikan'); t.eq(it('BN-02').penerima, 1, 'penyelaras sebagai sandaran');
      t.ok(it('BN-03').dihantar && it('BN-03').refNo, 'telah hantar');
      t.ok(it('BN-IT').unitIt && it('BN-IT').penerima === 0, 'makmal komputer diisi Unit IT');
      const labIt = Repo.of('MAKMAL').all().filter(function (l) { return l.kod === 'BN-IT'; })[0];
      t.eq(TestAssert.apiOk(TestHelpers.call(a.token, 'keperluan.emelBanci', { makmal: [labIt.id] })).penerima, 0, 'makmal komputer tidak diemel');
      t.ok(st.items.indexOf(it('BN-01')) < st.items.indexOf(it('BN-03')), 'belum hantar di atas');
      const box = KwFx.mails();
      const before = box ? box.length : 0;
      const lab1 = Repo.of('MAKMAL').all().filter(function (l) { return l.kod === 'BN-01'; })[0];
      const r = TestAssert.apiOk(TestHelpers.call(a.token, 'keperluan.emelBanci', { makmal: [lab1.id, lab3.id] }));
      t.eq(r.makmal, 1, 'makmal yang telah hantar tidak diemel'); t.eq(r.penerima, 2);
      if (box) {
        const sent = box.slice(before);
        t.eq(sent.length, 2); t.ok(sent.every(function (m) { return /BN-01/.test(m.subject); }));
        t.ok(sent.some(function (m) { return m.to === 'bna@test.local'; }) && !sent.some(function (m) { return m.to === 'bnc@test.local' || m.to === 'bnd@test.local'; }));
      }
      const tst = TestAssert.apiOk(TestHelpers.call(a.token, 'keperluan.emelBanci', { ujian: true }));
      t.eq(tst.penerima, 1); t.ok(tst.ujian);
    }]
  ]
};

const TestSuitePrestasi = {
  name: 'Prestasi: cache laporan & bacaan sheet',
  tests: [
    ['Cache laporan: hit kedua dari cache; tulisan melalui sistem membatalkan cache serta-merta', function (t) {
      AppFx.real();
      const a = TestHelpers.admin(ROLES.ADMIN);
      const e1 = TestAssert.apiOk(TestHelpers.call(a.token, 'aset.eksekutif', {}));
      const e2 = TestAssert.apiOk(TestHelpers.call(a.token, 'aset.eksekutif', {}));
      t.eq(e2.generatedAt, e1.generatedAt, 'dari cache');
      t.eq(AsetCache.key('x', { b: '', a: 1, c: null }), AsetCache.key('x', { a: '1' }), 'kunci stabil (kosong dibuang)');
      TestAssert.apiOk(TestHelpers.call(a.token, 'aset.import', { rows: [{ noAset: 'CACHE-001', jenis: 'DESKTOP' }] }));
      const e3 = TestAssert.apiOk(TestHelpers.call(a.token, 'aset.eksekutif', {}));
      t.eq(e3.ringkasan.aset, e1.ringkasan.aset + 1, 'aset baharu dikira selepas import');
      const o1 = TestAssert.apiOk(TestHelpers.call(a.token, 'aset.overview', { tahun: 2026 }));
      SettingsRepository.setMany({ GANTI_HARGA_LALAI: '9999' }, 'TEST');
      const p1 = TestAssert.apiOk(TestHelpers.call(a.token, 'aset.pelan', { tahun: 5 }));
      t.eq(p1.harga, 9999, 'tetapan baharu membatalkan cache');
      SettingsRepository.setMany({ GANTI_HARGA_LALAI: '4500' }, 'TEST');
      t.ok(o1.assets, 'overview');
      const w = AsetCache.warm();
      t.eq(w.dipanaskan, 7);
    }],

    ['AppCache: nilai besar disimpan dalam ketul & dibaca semula; bacaan sheet satu panggilan', function (t) {
      const big = []; for (let i = 0; i < 3000; i++) big.push({ i: i, s: 'x'.repeat(60) });
      AppCache.put('ujian:besar', big, 60);
      const back = AppCache.get('ujian:besar');
      t.ok(back && back.length === 3000 && back[2999].i === 2999, 'ketul');
      const vs = AppCache.versions(['ASET', 'TIKET']);
      t.eq(vs.length, 2); t.ok(vs[0] && vs[1]);
      Database.resetRequestCache();
      const rows = Repo.of('ASET').all();
      t.ok(rows.length > 0 && rows[0].id, 'rekod dibaca');
      t.ok(Database.cacheGet('layout:ASET').idIndex >= 0, 'layout daripada bacaan sama');
    }]
  ]
};
