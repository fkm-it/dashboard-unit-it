/**
 * @file AsetUnjuran.gs
 * Unjuran pelajar → keperluan komputer makmal (perancangan Pengurusan / Dekan).
 *
 * Model jam-tempat (seat-hour):
 *   jam diperlukan / minggu = UG × %UG × jamUG + PG × %PG × jamPG
 *   PC diperlukan           = ceil(jam diperlukan ÷ (jam operasi makmal / minggu × kadar penggunaan sasaran))
 * Bekalan semasa (daripada daftar aset): PC dalam makmal dalam skop yang beroperasi (Berfungsi / Perlahan).
 *   PC tambahan (kumulatif) = max(0, PC diperlukan − PC beroperasi semasa)
 *   Penggantian tahun Y     = PC dalam skop yang mencapai had umur pada tahun Y (tertunggak → tahun pertama)
 *   Tempat makmal tambahan  = max(0, PC diperlukan − jumlah tempat komputer makmal); makmal = ceil(÷ saiz makmal)
 * Andaian disimpan dalam Tetapan UNJURAN_PELAJAR (JSON) supaya Dekan / Pengurusan melihat angka yang sama.
 */
const AsetUnjuran = {
  KEY: 'UNJURAN_PELAJAR',
  YEARS: 5,

  defaults_: function () {
    const y = Number(DateUtils.format(new Date(), 'yyyy'));
    const tahun = [];
    for (let i = 0; i < AsetUnjuran.YEARS; i++) tahun.push({ tahun: y + i, ug: null, pg: null });
    return {
      tahun: tahun, skop: 'KOMPUTER', pctUg: 100, jamUg: 4, pctPg: 40, jamPg: 6,
      jamOperasi: 40, kadarGuna: 80, saizMakmal: 40, harga: AsetHooks.replacementConfig().harga, nota: ''
    };
  },

  /** Bersihkan input (dipanggil untuk kira & simpan). */
  clean_: function (p) {
    const d = AsetUnjuran.defaults_();
    const num = function (v, def, min, max, isInt) {
      if (v === '' || v === null || v === undefined) return def;
      const n = Number(v);
      if (!isFinite(n) || n < min || n > max) throw Errors.validation('Nilai tidak sah: ' + v);
      return isInt ? Math.round(n) : Math.round(n * 100) / 100;
    };
    const src = Array.isArray(p.tahun) ? p.tahun : [];
    const byYear = {};
    src.forEach(function (r) { if (r && r.tahun) byYear[Number(r.tahun)] = r; });
    const first = src.length && Number(src[0].tahun) >= 2000 && Number(src[0].tahun) <= 2100 ? Number(src[0].tahun) : d.tahun[0].tahun;
    const tahun = [];
    for (let i = 0; i < AsetUnjuran.YEARS; i++) {
      const y = first + i, r = byYear[y] || {};
      tahun.push({ tahun: y, ug: num(r.ug, null, 0, 100000, true), pg: num(r.pg, null, 0, 100000, true) });
    }
    return {
      tahun: tahun, skop: p.skop === 'SEMUA' ? 'SEMUA' : 'KOMPUTER',
      pctUg: num(p.pctUg, d.pctUg, 0, 100), jamUg: num(p.jamUg, d.jamUg, 0, 80),
      pctPg: num(p.pctPg, d.pctPg, 0, 100), jamPg: num(p.jamPg, d.jamPg, 0, 80),
      jamOperasi: num(p.jamOperasi, d.jamOperasi, 1, 168), kadarGuna: num(p.kadarGuna, d.kadarGuna, 10, 100),
      saizMakmal: num(p.saizMakmal, d.saizMakmal, 1, 500, true), harga: num(p.harga, d.harga, 0, 1000000),
      nota: String(p.nota || '').slice(0, 500)
    };
  },

  saved_: function () {
    let raw = '';
    try { raw = SettingsService.get(AsetUnjuran.KEY) || ''; } catch (e) { raw = ''; }
    if (!raw) return AsetUnjuran.defaults_();
    try { return AsetUnjuran.clean_(JSON.parse(raw)); } catch (e) { return AsetUnjuran.defaults_(); }
  },

  /** Simpan andaian (Pengurusan / Admin). */
  save: function (payload, ctx) {
    const a = AsetUnjuran.clean_(payload || {});
    a.dikemaskini = DateUtils.nowIso();
    a.oleh = (ctx.user && ctx.user.full_name) || '';
    SettingsRepository.setMany({ UNJURAN_PELAJAR: JSON.stringify(a) }, ctx.userId);
    try { AuditService.log(ctx, AUDIT_ACTIONS.SETTINGS_UPDATED || 'SETTINGS_UPDATED', 'SETTINGS', AsetUnjuran.KEY, 'Andaian unjuran pelajar dikemas kini'); } catch (e) { /* audit tidak kritikal */ }
    return AsetUnjuran.compute({ guna: 'simpanan' });
  },

  /** Kiraan pelajar → PC (tulen; diuji terus). */
  needPc: function (a, ug, pg) {
    const jam = (Number(ug) || 0) * a.pctUg / 100 * a.jamUg + (Number(pg) || 0) * a.pctPg / 100 * a.jamPg;
    const perPc = a.jamOperasi * a.kadarGuna / 100;
    return { jam: Math.round(jam * 10) / 10, pc: perPc > 0 ? Math.ceil(jam / perPc - 1e-9) : 0 };
  },

  /**
   * @param {{guna?:'simpanan', ...andaian}} payload  tanpa andaian → guna simpanan
   */
  compute: function (payload) {
    const p = payload || {};
    const saved = AsetUnjuran.saved_();
    const a = p.guna === 'simpanan' || !Array.isArray(p.tahun) ? saved : AsetUnjuran.clean_(p);
    const cfg = AsetHooks.replacementConfig();
    const dcfg = AsetHooks.depConfig();
    const comp = AsetHooks.complaintCounts_();
    const now = new Date();
    const nowYear = Number(DateUtils.format(now, 'yyyy'));
    const labsAll = AsetHooks.active_('makmal');
    const anyKomputer = labsAll.some(function (l) { return l.jenis_makmal === 'KOMPUTER'; });
    const skop = a.skop === 'KOMPUTER' && anyKomputer ? 'KOMPUTER' : 'SEMUA';
    const labs = labsAll.filter(function (l) { return skop === 'SEMUA' || l.jenis_makmal === 'KOMPUTER'; });
    const labIds = {};
    labs.forEach(function (l) { labIds[l.id] = l; });
    const pcs = AsetHooks.active_('aset').filter(function (r) { return !AsetLink.isGone(r) && AsetHooks.COMPUTERS.indexOf(r.jenis) >= 0 && labIds[r.makmal]; });
    const byLab = {};
    labs.forEach(function (l) {
      byLab[l.id] = { label: l.kod ? l.kod + ' · ' + l.nama : l.nama, jenis: l.jenis_makmal || '', tempat: Number(l.tempat_komputer) || 0, pc: 0, beroperasi: 0, perluGanti: 0 };
    });
    const due = {};
    let beroperasi = 0;
    pcs.forEach(function (r) {
      const b = byLab[r.makmal];
      b.pc++;
      const ok = AsetHooks.OPERATIONAL.indexOf(r.status) >= 0;
      if (ok) { b.beroperasi++; beroperasi++; }
      const start = AsetHooks.startDate_(r);
      const d = AsetHooks.depreciation(r, now, dcfg);
      const s = AsetHooks.replacementScore(r, d, comp[String(r.no_aset || '').trim().toLowerCase()] || 0, cfg);
      let y = start ? start.getUTCFullYear() + cfg.umur : null;
      if (s.tahap === 'GANTI_SEGERA' || (y !== null && y < nowYear) || !ok) y = nowYear;
      if (y !== null) { due[y] = (due[y] || 0) + 1; if (y <= nowYear + 1) b.perluGanti++; }
    });
    const tempat = labs.reduce(function (s2, l) { return s2 + (Number(l.tempat_komputer) || byLab[l.id].pc); }, 0);
    const firstYear = a.tahun[0].tahun;
    let prevTambah = 0;
    const rows = a.tahun.map(function (t, i) {
      const ada = t.ug !== null || t.pg !== null;
      const n = AsetUnjuran.needPc(a, t.ug, t.pg);
      const ganti = (i === 0 ? Object.keys(due).filter(function (y) { return Number(y) <= t.tahun; }).reduce(function (s2, y) { return s2 + due[y]; }, 0) : (due[t.tahun] || 0));
      const tambah = ada ? Math.max(0, n.pc - pcs.length) : 0;
      const tambahBaru = Math.max(0, tambah - prevTambah);
      prevTambah = Math.max(prevTambah, tambah);
      const ruang = ada ? Math.max(0, n.pc - tempat) : 0;
      const pelajar = (t.ug || 0) + (t.pg || 0);
      return {
        tahun: t.tahun, ug: t.ug, pg: t.pg, adaUnjuran: ada, jamSeminggu: n.jam, pcDiperlukan: ada ? n.pc : null,
        pcBeroperasi: beroperasi, tambahan: tambah, tambahanBaru: tambahBaru, penggantian: ganti,
        kos: Math.round((tambahBaru + ganti) * a.harga * 100) / 100,
        tempatKurang: ruang, makmalTambahan: ruang ? Math.ceil(ruang / a.saizMakmal) : 0,
        nisbahDiperlukan: ada && n.pc ? Math.round(pelajar / n.pc * 10) / 10 : null,
        nisbahSemasa: ada && beroperasi ? Math.round(pelajar / beroperasi * 10) / 10 : null
      };
    });
    return {
      generatedAt: DateUtils.nowIso(), andaian: a, disimpan: saved, skop: skop, skopKomputerAda: anyKomputer,
      semasa: { makmal: labs.length, pc: pcs.length, beroperasi: beroperasi, tempat: tempat, perluGantiSegera: Object.keys(due).filter(function (y) { return Number(y) <= nowYear; }).reduce(function (s2, y) { return s2 + due[y]; }, 0) },
      tahunMula: firstYear, rows: rows,
      jumlah: rows.reduce(function (s2, r) { s2.tambahan += r.tambahanBaru; s2.penggantian += r.penggantian; s2.kos += r.kos; return s2; }, { tambahan: 0, penggantian: 0, kos: 0 }),
      byMakmal: Object.keys(byLab).map(function (k) { return byLab[k]; }).sort(function (x, y) { return x.label < y.label ? -1 : 1; })
    };
  }
};
