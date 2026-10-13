/**
 * @file AppTests.gs
 * Ujian domain Dashboard Unit IT FKM (modul sebenar dalam modules/*.json).
 * Dalam Apps Script: runTestsPart5. Dalam Node: npm test.
 */
const AppTests = {
  suites: function () { return [TestSuiteDashboardIT]; }
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
      t.ok(bad.dryRun && bad.errorCount === 2, 'ralat menghalang semua tulisan');
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
