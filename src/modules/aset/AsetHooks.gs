/**
 * @file AsetHooks.gs
 * Aset IT + dua laluan khusus pentadbir:
 *   aset.overview — agregat Executive Overview (aset, tiket, keperluan makmal) daripada rekod sebenar
 *   aset.import   — import pukal daftar aset (CSV yang dihurai di pelayar), upsert ikut No. aset
 */
const AsetHooks = {
  /** Status yang dikira "beroperasi" (masih boleh digunakan). */
  OPERATIONAL: ['BERFUNGSI', 'PERLAHAN'],
  MAX_IMPORT: 500,

  validate: function (data, info) {
    const cur = info.current || {};
    const no = String(data.noAset || '').trim().toLowerCase();
    if (!no) return;
    const dup = CrudEngine.repo(CrudEngine.get('aset')).all().some(function (r) {
      return r.state === 'ACTIVE' && r.id !== cur.id && String(r.no_aset).trim().toLowerCase() === no;
    });
    if (dup) throw Errors.conflict('No. aset ' + data.noAset + ' telah wujud.');
  },

  beforeSave: function (row, info) {
    const cur = info.current || {};
    if (row.kod_lokasi === undefined && row.lokasi_fizikal === undefined) return;
    const kod = row.kod_lokasi !== undefined ? row.kod_lokasi : cur.kod_lokasi;
    const fiz = row.lokasi_fizikal !== undefined ? row.lokasi_fizikal : cur.lokasi_fizikal;
    row.lokasi_berbeza = AsetHooks.lokasiBerbeza(kod, fiz);
  },

  toDTO: function (dto, row) {
    const dep = AsetHooks.depreciation(row, new Date());
    if (dep && dep.kos > 0) dto.susutNilai = dep;
    const y = Number(row.tahun_perolehan);
    dto.umurTahun = y ? Math.max(0, Number(DateUtils.format(new Date(), 'yyyy')) - y) : null;
    dto.warantiTamat = !!(row.tamat_waranti && String(row.tamat_waranti) < DateUtils.dayKey(new Date()));
    return dto;
  },

  routes: {
    'aset.overview': { role: 'PENGURUSAN', fn: function (payload) { return AsetCache.get('aset.overview', payload, function () { return AsetHooks.overview(payload || {}); }); } },
    'aset.import': { role: 'ADMIN', fn: function (payload, ctx) { return AsetHooks.importRows(payload || {}, ctx); } },
    'aset.janaMakmal': { role: 'ADMIN', fn: function (payload, ctx) { return AsetHooks.generateLabs(payload || {}, ctx); } },
    'aset.laporanNilai': { role: 'PENGURUSAN', fn: function (payload) { return AsetCache.get('aset.laporanNilai', payload, function () { return AsetHooks.reportValue(payload || {}); }); } },
    'aset.laporanGanti': { role: 'PENGURUSAN', fn: function (payload) { return AsetCache.get('aset.laporanGanti', payload, function () { return AsetHooks.reportReplacement(payload || {}); }); } },
    'aset.laporanLokasi': { role: 'PENGURUSAN', fn: function (payload) { return AsetCache.get('aset.laporanLokasi', payload, function () { return AsetHooks.reportLocation(payload || {}); }); } },
    'aset.pelan': { role: 'PENGURUSAN', fn: function (payload) { return AsetCache.get('aset.pelan', payload, function () { return AsetHooks.reportPlan(payload || {}); }); } },
    'aset.indeksMakmal': { role: 'PENGURUSAN', fn: function () { return AsetCache.get('aset.indeksMakmal', {}, function () { return AsetHooks.reportLabHealth(); }); } },
    'aset.eksekutif': { role: 'PENGURUSAN', fn: function (payload) { return AsetCache.get('aset.eksekutif', payload, function () { return AsetHooks.reportExecutive(payload || {}); }); } },
    'aset.trend': { role: 'PENGURUSAN', fn: function (payload) { return AsetCache.get('aset.trend', payload, function () { return AsetTrend.trend(payload || {}); }); } },
    'aset.sejarah': { role: 'ADMIN', fn: function (payload) { return AsetLink.history(payload || {}); } },
    'aset.kitarHayat': { role: 'PENGURUSAN', fn: function () { return AsetCache.get('aset.kitarHayat', {}, function () { return AsetLink.summary(); }); } },
    'aset.hantarRingkasan': { role: 'ADMIN', fn: function (payload, ctx) { return AsetTrend.sendNow(payload || {}, ctx); } }
  },

  /** Setiap jam: panaskan cache laporan supaya paparan pertama pantas. */
  hourly: function () { return AsetCache.warm(); },

  /** Harian: segerak tindakan KEWPA, simpan ringkasan bulanan, email ringkasan bulan lepas (sekali). */
  maintenance: function () { return AsetTrend.daily(); },

  // ================================================================== Susut nilai & cadangan penggantian

  COMPUTERS: ['DESKTOP', 'LAPTOP', 'WORKSTATION'],

  setting_: function (k, d) {
    let v;
    try { v = SettingsService.get(k); } catch (e) { v = undefined; }
    const n = Number(v);
    return v === undefined || v === null || v === '' || !isFinite(n) ? d : n;
  },

  depConfig: function () {
    return { hayat: AsetHooks.setting_('SUSUT_HAYAT_TAHUN', 5), sisa: AsetHooks.setting_('SUSUT_NILAI_SISA', 0) };
  },

  /** Tarikh mula aset: tarikh aset, jika tiada 1 Jan tahun perolehan. @return {Date|null} */
  startDate_: function (row) {
    if (row.tarikh_aset && /^\d{4}-\d{2}-\d{2}/.test(String(row.tarikh_aset))) return new Date(String(row.tarikh_aset).slice(0, 10) + 'T00:00:00Z');
    const y = Number(row.tahun_perolehan);
    return y > 1900 ? new Date(Date.UTC(y, 0, 1)) : null;
  },

  /**
   * Susut nilai garis lurus. Kos = nilai perolehan; tiada kos → null.
   * @return {{kos:number, umurTahun:number|null, susutTahunan:number, susutTerkumpul:number, nilaiBuku:number, habis:boolean}|null}
   */
  depreciation: function (row, now, cfg) {
    const kos = Number(row.nilai_perolehan);
    const start = AsetHooks.startDate_(row);
    const umur = start ? Math.max(0, ((now || new Date()) - start) / (365.25 * 86400000)) : null;
    if (!(kos > 0)) return umur === null ? null : { kos: 0, umurTahun: Math.round(umur * 10) / 10, susutTahunan: 0, susutTerkumpul: 0, nilaiBuku: 0, habis: false, tiadaKos: true };
    const c = cfg || AsetHooks.depConfig();
    const sisa = Math.min(c.sisa, kos);
    const tahunan = (kos - sisa) / c.hayat;
    const terkumpul = umur === null ? 0 : Math.min(kos - sisa, tahunan * umur);
    const r2 = function (x) { return Math.round(x * 100) / 100; };
    return {
      kos: r2(kos), umurTahun: umur === null ? null : Math.round(umur * 10) / 10, susutTahunan: r2(tahunan),
      susutTerkumpul: r2(terkumpul), nilaiBuku: r2(kos - terkumpul), habis: umur !== null && umur >= c.hayat
    };
  },

  /** Kiraan aduan bagi setiap no. aset dalam 12 bulan terakhir. @return {Object<string,number>} kunci huruf kecil */
  complaintCounts_: function () {
    const since = DateUtils.addDays(new Date(), -365).toISOString();
    const out = {};
    AsetHooks.active_('tiket').forEach(function (t) {
      const k = String(t.no_aset || '').trim().toLowerCase();
      if (!k || String(t.created_at) < since) return;
      out[k] = (out[k] || 0) + 1;
    });
    return out;
  },

  replacementConfig: function () {
    return {
      umur: AsetHooks.setting_('GANTI_UMUR_TAHUN', 7), ram: AsetHooks.setting_('GANTI_RAM_MIN_GB', 8),
      aduan: AsetHooks.setting_('GANTI_ADUAN_MIN', 3), harga: AsetHooks.setting_('GANTI_HARGA_LALAI', 4500)
    };
  },

  /**
   * Skor penggantian (lebih tinggi = lebih mendesak) dan sebab.
   * ≥ 6 → GANTI_SEGERA · 3–5 → GANTI_TAHUN_DEPAN · 1–2 → PANTAU · 0 → OK
   */
  replacementScore: function (row, dep, aduan, cfg) {
    const reasons = [];
    let s = 0;
    const add = function (n, why) { s += n; reasons.push(why); };
    if (row.status === 'TIDAK_BOLEH_GUNA') add(4, 'Tidak boleh digunakan');
    else if (row.status === 'PERLAHAN') add(3, 'Tidak memenuhi keperluan');
    else if (row.status === 'PERLU_BAIKI' || row.status === 'MENUNGGU_ALAT_GANTI') add(2, 'Bermasalah / menunggu pembaikan');
    if (dep && dep.umurTahun !== null && dep.umurTahun >= cfg.umur) add(3, 'Umur ' + Math.floor(dep.umurTahun) + ' tahun (≥ ' + cfg.umur + ')');
    if (dep && dep.habis && dep.kos > 0) add(1, 'Nilai buku telah habis');
    if (row.cadangan === 'GANTI') add(3, 'Ditanda "Ganti" oleh pegawai');
    if (row.cadangan === 'NAIK_TARAF') add(1, 'Ditanda "Naik taraf"');
    const ram = Number(row.ram_gb);
    if (ram > 0 && ram < cfg.ram && AsetHooks.COMPUTERS.indexOf(row.jenis) >= 0) add(2, 'RAM ' + ram + 'GB (< ' + cfg.ram + 'GB)');
    if (aduan >= cfg.aduan) add(2, aduan + ' aduan dalam 12 bulan');
    const level = s >= 6 ? 'GANTI_SEGERA' : s >= 3 ? 'GANTI_TAHUN_DEPAN' : s >= 1 ? 'PANTAU' : 'OK';
    return { skor: s, tahap: level, sebab: reasons };
  },

  /** Aset aktif dalam skop laporan (bukan dilupus) + penapis makmal/kategori/jenis. */
  scoped_: function (payload) {
    const labs = {};
    AsetHooks.active_('makmal').forEach(function (l) { labs[l.id] = l.kod ? l.kod + ' · ' + l.nama : l.nama; });
    const rows = AsetHooks.active_('aset').filter(function (r) {
      if (AsetLink.isGone(r)) return false;
      if (payload.makmal && r.makmal !== payload.makmal) return false;
      if (payload.kategori && r.kategori_aset !== payload.kategori) return false;
      if (payload.jenis === 'KOMPUTER' && AsetHooks.COMPUTERS.indexOf(r.jenis) < 0) return false;
      if (payload.jenis && payload.jenis !== 'KOMPUTER' && r.jenis !== payload.jenis) return false;
      return true;
    });
    return { rows: rows, labs: labs };
  },

  /** Laporan nilai aset & susut nilai. */
  reportValue: function (payload) {
    const sc = AsetHooks.scoped_(payload);
    const cfg = AsetHooks.depConfig();
    const now = new Date();
    const tot = { aset: 0, denganKos: 0, kos: 0, susut: 0, buku: 0, habis: 0, tanpaKos: 0 };
    const by = { makmal: {}, tahun: {}, kategori: {}, jenis: {} };
    const items = sc.rows.map(function (r) {
      const d = AsetHooks.depreciation(r, now, cfg);
      tot.aset++;
      const kos = d ? d.kos : 0;
      if (kos > 0) {
        tot.denganKos++; tot.kos += kos; tot.susut += d.susutTerkumpul; tot.buku += d.nilaiBuku; if (d.habis) tot.habis++;
      } else tot.tanpaKos++;
      const bump = function (map, key) {
        map[key] = map[key] || { label: key, bil: 0, kos: 0, buku: 0 };
        map[key].bil++; map[key].kos += kos; map[key].buku += d && kos > 0 ? d.nilaiBuku : 0;
      };
      bump(by.makmal, sc.labs[r.makmal] || 'Bukan makmal / tiada');
      bump(by.tahun, r.tahun_perolehan ? String(r.tahun_perolehan) : 'Tiada tahun');
      bump(by.kategori, r.kategori_aset === 'ASET_TETAP' ? 'Aset Tetap' : r.kategori_aset === 'INVENTORI' ? 'Inventori' : 'Tidak dinyatakan');
      bump(by.jenis, r.jenis || 'LAIN');
      return {
        id: r.id, noAset: r.no_aset, model: r.nama_alat || r.model, jenis: r.jenis, makmal: sc.labs[r.makmal] || '', tahun: r.tahun_perolehan || '',
        kos: kos, umur: d ? d.umurTahun : null, susutTahunan: d ? d.susutTahunan : 0, susutTerkumpul: d ? d.susutTerkumpul : 0, nilaiBuku: d ? d.nilaiBuku : 0, habis: !!(d && d.habis && kos > 0)
      };
    });
    const r2 = function (x) { return Math.round(x * 100) / 100; };
    const list = function (map, sortKey) {
      return Object.keys(map).map(function (k) { const v = map[k]; return { label: v.label, bil: v.bil, kos: r2(v.kos), buku: r2(v.buku) }; })
        .sort(sortKey === 'label' ? function (a, b) { return a.label < b.label ? -1 : 1; } : function (a, b) { return b.kos - a.kos; });
    };
    items.sort(function (a, b) { return b.kos - a.kos; });
    return {
      generatedAt: DateUtils.nowIso(), config: cfg,
      total: { aset: tot.aset, denganKos: tot.denganKos, tanpaKos: tot.tanpaKos, kos: r2(tot.kos), susut: r2(tot.susut), buku: r2(tot.buku), habis: tot.habis },
      byMakmal: list(by.makmal), byTahun: list(by.tahun, 'label'), byKategori: list(by.kategori), byJenis: list(by.jenis),
      items: items
    };
  },

  /** Laporan cadangan penggantian (skor ikut kriteria Tetapan). */
  reportReplacement: function (payload) {
    const sc = AsetHooks.scoped_(Object.assign({ jenis: 'KOMPUTER' }, payload));
    const dcfg = AsetHooks.depConfig();
    const cfg = AsetHooks.replacementConfig();
    const comp = AsetHooks.complaintCounts_();
    const now = new Date();
    const items = [];
    const sum = { GANTI_SEGERA: { bil: 0, kos: 0 }, GANTI_TAHUN_DEPAN: { bil: 0, kos: 0 }, PANTAU: { bil: 0, kos: 0 }, OK: { bil: 0, kos: 0 } };
    const byLab = {};
    sc.rows.forEach(function (r) {
      const d = AsetHooks.depreciation(r, now, dcfg);
      const n = comp[String(r.no_aset || '').trim().toLowerCase()] || 0;
      const sc2 = AsetHooks.replacementScore(r, d, n, cfg);
      const harga = Number(r.nilai_perolehan) > 0 ? Number(r.nilai_perolehan) : cfg.harga;
      sum[sc2.tahap].bil++;
      if (sc2.tahap !== 'OK' && sc2.tahap !== 'PANTAU') sum[sc2.tahap].kos += harga;
      const lab = sc.labs[r.makmal] || 'Bukan makmal / tiada';
      if (sc2.tahap === 'GANTI_SEGERA' || sc2.tahap === 'GANTI_TAHUN_DEPAN') {
        byLab[lab] = byLab[lab] || { label: lab, segera: 0, tahunDepan: 0, kos: 0 };
        byLab[lab][sc2.tahap === 'GANTI_SEGERA' ? 'segera' : 'tahunDepan']++;
        byLab[lab].kos += harga;
      }
      if (sc2.tahap === 'OK' && !payload.semua) return;
      items.push({
        id: r.id, noAset: r.no_aset, model: r.nama_alat || r.model, jenis: r.jenis, makmal: sc.labs[r.makmal] || '', lokasi: r.lokasi_fizikal || r.lokasi || '',
        tahun: r.tahun_perolehan || '', umur: d ? d.umurTahun : null, nilaiBuku: d ? d.nilaiBuku : 0, status: r.status, ram: r.ram_gb || '',
        aduan: n, skor: sc2.skor, tahap: sc2.tahap, sebab: sc2.sebab, anggaranKos: harga
      });
    });
    const order = { GANTI_SEGERA: 0, GANTI_TAHUN_DEPAN: 1, PANTAU: 2, OK: 3 };
    items.sort(function (a, b) { return (order[a.tahap] - order[b.tahap]) || (b.skor - a.skor) || ((b.umur || 0) - (a.umur || 0)); });
    Object.keys(sum).forEach(function (k) { sum[k].kos = Math.round(sum[k].kos * 100) / 100; });
    return {
      generatedAt: DateUtils.nowIso(), config: cfg, ringkasan: sum, jumlahDinilai: sc.rows.length,
      byMakmal: Object.keys(byLab).map(function (k) { const v = byLab[k]; v.kos = Math.round(v.kos * 100) / 100; return v; }).sort(function (a, b) { return (b.segera + b.tahunDepan) - (a.segera + a.tahunDepan); }),
      items: items
    };
  },

  // ================================================================== Perancangan (Pengurusan)

  /**
   * Pelan penggantian N tahun. Setiap komputer "matang" pada tahun mula + GANTI_UMUR_TAHUN;
   * yang sudah matang atau berskor "ganti segera" = tertunggak (tahun pertama).
   * Tanpa bajet → unjuran keperluan. Dengan bajet (RM/tahun) → simulasi ikut keutamaan (skor, umur).
   */
  reportPlan: function (payload) {
    const nowYear = Number(DateUtils.format(new Date(), 'yyyy'));
    const years = Math.max(1, Math.min(10, Number(payload.tahun) || 5));
    const cfg = AsetHooks.replacementConfig();
    const harga = Number(payload.harga) > 0 ? Number(payload.harga) : cfg.harga;
    const bajet = Number(payload.bajet) > 0 ? Number(payload.bajet) : 0;
    const sc = AsetHooks.scoped_({ jenis: 'KOMPUTER', makmal: payload.makmal || '' });
    const dcfg = AsetHooks.depConfig();
    const comp = AsetHooks.complaintCounts_();
    const now = new Date();
    const Y = []; for (let i = 0; i < years; i++) Y.push(nowYear + i);
    const queue = [];
    let tanpaTahun = 0;
    sc.rows.forEach(function (r) {
      const start = AsetHooks.startDate_(r);
      if (!start) { tanpaTahun++; return; }
      const d = AsetHooks.depreciation(r, now, dcfg);
      const s = AsetHooks.replacementScore(r, d, comp[String(r.no_aset || '').trim().toLowerCase()] || 0, cfg);
      let due = start.getUTCFullYear() + cfg.umur;
      if (s.tahap === 'GANTI_SEGERA' || due < nowYear) due = nowYear;
      queue.push({ lab: sc.labs[r.makmal] || 'Bukan makmal / tiada', due: due, skor: s.skor, umur: d ? d.umurTahun || 0 : 0 });
    });
    queue.sort(function (a, b) { return (a.due - b.due) || (b.skor - a.skor) || (b.umur - a.umur); });
    const inHorizon = queue.filter(function (q) { return q.due <= Y[Y.length - 1]; });
    /* Unjuran keperluan (tanpa had bajet) */
    const need = Y.map(function (y) {
      const n = queue.filter(function (q) { return q.due === y; }).length;
      return { tahun: y, bil: n, kos: n * harga };
    });
    const labNeed = {};
    inHorizon.forEach(function (q) {
      labNeed[q.lab] = labNeed[q.lab] || { label: q.lab, tahun: {} };
      labNeed[q.lab].tahun[q.due] = (labNeed[q.lab].tahun[q.due] || 0) + 1;
    });
    /* Simulasi dengan bajet */
    let sim = null;
    if (bajet) {
      const cap = Math.floor(bajet / harga);
      const pending = queue.slice();
      const done = [];
      const rows = Y.map(function (y) {
        const eligible = pending.filter(function (q) { return q.due <= y; })
          .sort(function (a, b) { return (b.skor - a.skor) || (b.umur - a.umur) || (a.due - b.due); });
        const take = eligible.slice(0, cap);
        take.forEach(function (q) { pending.splice(pending.indexOf(q), 1); q.diganti = y; done.push(q); });
        const tertunggak = pending.filter(function (q) { return q.due <= y; }).length;
        return { tahun: y, diganti: take.length, kos: take.length * harga, tertunggakAkhirTahun: tertunggak };
      });
      const clear = rows.filter(function (r) { return r.tertunggakAkhirTahun === 0; })[0];
      const labSim = {};
      done.forEach(function (q) {
        labSim[q.lab] = labSim[q.lab] || { label: q.lab, tahun: {} };
        labSim[q.lab].tahun[q.diganti] = (labSim[q.lab].tahun[q.diganti] || 0) + 1;
      });
      sim = {
        bajet: bajet, unitSetahun: cap, rows: rows, tahunSelesai: clear ? clear.tahun : null,
        byMakmal: Object.keys(labSim).map(function (k) { return labSim[k]; }).sort(function (a, b) { return a.label < b.label ? -1 : 1; })
      };
    }
    const totalNeed = inHorizon.length * harga;
    return {
      generatedAt: DateUtils.nowIso(), tahun: Y, harga: harga, umurGanti: cfg.umur, jumlahKomputer: sc.rows.length, tanpaTahun: tanpaTahun,
      tertunggak: need[0].bil, keperluan: need, jumlahDalamTempoh: inHorizon.length, kosDalamTempoh: totalNeed,
      bajetSetahunDiperlukan: Math.ceil(totalNeed / years),
      byMakmal: Object.keys(labNeed).map(function (k) { return labNeed[k]; }).sort(function (a, b) { return a.label < b.label ? -1 : 1; }),
      simulasi: sim
    };
  },

  /**
   * Indeks Kesihatan Makmal (0–100, tinggi = sihat). Penalti:
   * umur purata (30), % rosak (25, penuh pada 20%), % perlu ganti (25), aduan setiap PC 12 bln (10, penuh pada 0.5), % belum disahkan (10).
   * ≥ 70 Baik · 40–69 Sederhana · < 40 Kritikal.
   */
  reportLabHealth: function () {
    const cfg = AsetHooks.replacementConfig();
    const dcfg = AsetHooks.depConfig();
    const comp = AsetHooks.complaintCounts_();
    const now = new Date();
    const labs = AsetHooks.active_('makmal').filter(function (l) { return l.status !== 'TIDAK_AKTIF'; });
    const byLab = {};
    labs.forEach(function (l) { byLab[l.id] = { id: l.id, label: l.kod ? l.kod + ' · ' + l.nama : l.nama, pc: 0, umurSum: 0, umurN: 0, rosak: 0, ganti: 0, aduan: 0, disahkan: 0, buku: 0, kos: 0 }; });
    const BROKEN = ['PERLU_BAIKI', 'MENUNGGU_ALAT_GANTI', 'TIDAK_BOLEH_GUNA'];
    AsetHooks.active_('aset').forEach(function (r) {
      const L = byLab[r.makmal];
      if (!L || AsetLink.isGone(r) || AsetHooks.COMPUTERS.indexOf(r.jenis) < 0) return;
      const d = AsetHooks.depreciation(r, now, dcfg);
      const n = comp[String(r.no_aset || '').trim().toLowerCase()] || 0;
      const s = AsetHooks.replacementScore(r, d, n, cfg);
      L.pc++;
      if (d && d.umurTahun !== null) { L.umurSum += d.umurTahun; L.umurN++; }
      if (BROKEN.indexOf(r.status) >= 0) L.rosak++;
      if (s.tahap === 'GANTI_SEGERA' || s.tahap === 'GANTI_TAHUN_DEPAN') L.ganti++;
      L.aduan += n;
      if (String(r.disahkan_fizikal).toUpperCase() === 'TRUE') L.disahkan++;
      if (d) { L.kos += d.kos || 0; L.buku += d.nilaiBuku || 0; }
    });
    const items = Object.keys(byLab).map(function (k) { return byLab[k]; }).filter(function (L) { return L.pc > 0; }).map(function (L) {
      const umur = L.umurN ? L.umurSum / L.umurN : 0;
      const pRosak = L.rosak / L.pc, pGanti = L.ganti / L.pc, aduanPc = L.aduan / L.pc, pSah = L.disahkan / L.pc;
      const pen = {
        umur: 30 * Math.min(1, umur / (cfg.umur * 1.5)),
        rosak: 25 * Math.min(1, pRosak / 0.2),
        ganti: 25 * pGanti,
        aduan: 10 * Math.min(1, aduanPc / 0.5),
        pengesahan: 10 * (1 - pSah)
      };
      const skor = Math.max(0, Math.round(100 - pen.umur - pen.rosak - pen.ganti - pen.aduan - pen.pengesahan));
      const r1 = function (x) { return Math.round(x * 10) / 10; };
      return {
        id: L.id, label: L.label, pc: L.pc, umurPurata: r1(umur), rosak: L.rosak, pctRosak: r1(pRosak * 100), perluGanti: L.ganti, pctGanti: r1(pGanti * 100),
        aduan: L.aduan, pctDisahkan: r1(pSah * 100), nilaiBuku: Math.round(L.buku), skor: skor,
        tahap: skor >= 70 ? 'BAIK' : skor >= 40 ? 'SEDERHANA' : 'KRITIKAL'
      };
    }).sort(function (a, b) { return a.skor - b.skor; });
    return { generatedAt: DateUtils.nowIso(), umurGanti: cfg.umur, items: items };
  },

  /** Laporan Eksekutif: himpunan untuk Dekan / TDP (satu panggilan). */
  reportExecutive: function (payload) {
    const o = AsetHooks.overview(payload || {});
    const v = AsetHooks.reportValue({});
    const g = AsetHooks.reportReplacement({});
    const p = AsetHooks.reportPlan({ tahun: 5 });
    const h = AsetHooks.reportLabHealth();
    const isu = [];
    const rm = function (n) { return 'RM ' + Math.round(n).toLocaleString('en-US'); };
    if (g.ringkasan.GANTI_SEGERA.bil) isu.push({ tone: 'danger', teks: g.ringkasan.GANTI_SEGERA.bil + ' komputer perlu diganti segera (anggaran ' + rm(g.ringkasan.GANTI_SEGERA.kos) + ').' });
    if (p.tertunggak) isu.push({ tone: 'warn', teks: p.tertunggak + ' komputer telah melepasi umur ' + p.umurGanti + ' tahun atau perlu diganti tahun ini (anggaran ' + rm(p.tertunggak * p.harga) + ' pada harga semasa).' });
    const kritikal = h.items.filter(function (i) { return i.tahap === 'KRITIKAL'; });
    if (kritikal.length) isu.push({ tone: 'danger', teks: kritikal.length + ' makmal berstatus kritikal: ' + kritikal.slice(0, 4).map(function (i) { return i.label.split(' · ')[0]; }).join(', ') + (kritikal.length > 4 ? ', …' : '') + '.' });
    if (o.assets.lokasiBerbeza) isu.push({ tone: 'warn', teks: o.assets.lokasiBerbeza + ' aset berada di lokasi berbeza daripada rekod UTMFin — rekod pergerakan KEWPA perlu dikemas kini.' });
    if (o.assets.byPengesahan && o.assets.byPengesahan.LUPUS_REKOD_AKTIF) isu.push({ tone: 'warn', teks: o.assets.byPengesahan.LUPUS_REKOD_AKTIF + ' aset telah lupus tetapi rekod masih aktif di UTMFin.' });
    if (o.tickets.overdue) isu.push({ tone: 'warn', teks: o.tickets.overdue + ' aduan IT melepasi tempoh SLA.' });
    if (o.spesifikasi && o.spesifikasi.os.W10) {
      const w = o.spesifikasi.win11;
      isu.push({ tone: 'danger', teks: o.spesifikasi.os.W10 + ' komputer masih Windows 10 (sokongan keselamatan Microsoft tamat 14 Okt 2025): ' + w.layak + ' boleh dinaik taraf ke Windows 11, ' + w.perluGanti + ' perlu diganti kerana CPU tidak disokong' + (w.cpuTidakDiketahui ? ', ' + w.cpuTidakDiketahui + ' belum ada data CPU' : '') + '.' });
    }
    let tindakan = null;
    if (typeof TindakanHooks !== 'undefined') {
      try { tindakan = TindakanHooks.summary(); } catch (e) { tindakan = null; }
    }
    if (tindakan && tindakan.jumlah.lewat) isu.push({ tone: 'warn', teks: tindakan.jumlah.lewat + ' tindakan KEWPA melepasi tarikh sasaran (' + tindakan.jumlah.terbuka + ' masih terbuka).' });
    const out = {
      generatedAt: DateUtils.nowIso(),
      ringkasan: {
        aset: o.assets.total, beroperasiPct: o.assets.operationalPct, nilaiPerolehan: v.total.kos, nilaiBuku: v.total.buku, susutHabis: v.total.habis,
        gantiSegera: g.ringkasan.GANTI_SEGERA.bil, gantiTahunDepan: g.ringkasan.GANTI_TAHUN_DEPAN.bil, kosGanti: g.ringkasan.GANTI_SEGERA.kos + g.ringkasan.GANTI_TAHUN_DEPAN.kos,
        tiketTerbuka: o.tickets.open, tiketLewat: o.tickets.overdue, sla: (o.tickets.slaTrend.filter(function (m) { return m.total; }).slice(-1)[0] || {}).value,
        disahkanPct: o.assets.verifiedPct, lokasiBerbeza: o.assets.lokasiBerbeza, makmal: h.items.length
      },
      nilaiIkutMakmal: v.byMakmal.slice(0, 12), nilaiIkutTahun: v.byTahun,
      pelan: { tahun: p.tahun, keperluan: p.keperluan, harga: p.harga, umurGanti: p.umurGanti, bajetSetahunDiperlukan: p.bajetSetahunDiperlukan, kosDalamTempoh: p.kosDalamTempoh, jumlahDalamTempoh: p.jumlahDalamTempoh },
      makmal: h.items, pengesahan: o.assets.byPengesahan, isu: isu, tindakan: tindakan,
      keperluan: (function () { try { return KeperluanHooks.summary({}); } catch (e) { return null; } })(),
      kaedah: { susut: v.config, ganti: g.config }
    };
    if (!payload || !payload.skipTrend) {
      /* Trend 6 bulan: baris tersimpan + bulan semasa daripada angka laporan ini */
      const month = DateUtils.monthKey(new Date());
      out.trend = AsetTrend.history(5, month).concat([AsetTrend.out_(AsetTrend.fromExec(out, month))]);
    }
    return out;
  },

  /** Laporan percanggahan lokasi fizikal vs UTMFin (untuk kemas kini pergerakan aset KEWPA). */
  reportLocation: function (payload) {
    const sc = AsetHooks.scoped_(payload);
    const items = sc.rows.filter(function (r) { return String(r.lokasi_berbeza).toUpperCase() === 'TRUE'; }).map(function (r) {
      return {
        id: r.id, noAset: r.no_aset, model: r.nama_alat || r.model, kodLokasi: r.kod_lokasi, lokasiFizikal: r.lokasi_fizikal,
        makmal: sc.labs[r.makmal] || '', penjaga: r.pegawai_bertanggungjawab || '', picMakmal: r.pic_makmal || ''
      };
    }).sort(function (a, b) { return (a.lokasiFizikal + a.noAset) < (b.lokasiFizikal + b.noAset) ? -1 : 1; });
    const pairs = {};
    items.forEach(function (i) {
      const k = AsetHooks.roomOf(i.kodLokasi) + ' → ' + i.lokasiFizikal;
      pairs[k] = (pairs[k] || 0) + 1;
    });
    return {
      generatedAt: DateUtils.nowIso(), total: items.length,
      ringkasan: Object.keys(pairs).map(function (k) { return { label: k, value: pairs[k] }; }).sort(function (a, b) { return b.value - a.value; }),
      items: items
    };
  },

  // ================================================================== Executive Overview

  active_: function (key) {
    return CrudEngine.repo(CrudEngine.get(key)).all().filter(function (r) { return r.state === 'ACTIVE'; });
  },

  overview: function (payload) {
    const nowIso = DateUtils.nowIso();
    const year = Number(payload.tahun) || Number(DateUtils.format(new Date(), 'yyyy'));
    const pct = function (a, b) { return b ? Math.round((a / b) * 1000) / 10 : null; };

    // ---- Aset
    const assets = AsetHooks.active_('aset').filter(function (r) { return !AsetLink.isGone(r); });
    const aStatus = {};
    const aJenis = {};
    let verified = 0;
    let complete = 0;
    let nilai = 0;
    let lokasiBerbeza = 0;
    const byPengesahan = {};
    const byVerifier = {};
    assets.forEach(function (r) {
      nilai += Number(r.nilai_perolehan) || 0;
      if (String(r.lokasi_berbeza).toUpperCase() === 'TRUE') lokasiBerbeza++;

      aStatus[r.status] = (aStatus[r.status] || 0) + 1;
      aJenis[r.jenis] = (aJenis[r.jenis] || 0) + 1;
      if (String(r.disahkan_fizikal).toUpperCase() === 'TRUE') verified++;
      if (r.no_aset && r.jenis && (r.makmal || r.lokasi) && r.tahun_perolehan) complete++;
    });
    /* Pengesahan KEWPA dikira atas SEMUA rekod aktif (termasuk "telah lupus tetapi rekod aktif di UTMFin") */
    const allAssets = AsetHooks.active_('aset');
    allAssets.forEach(function (r) {
      if (r.status_pengesahan) byPengesahan[r.status_pengesahan] = (byPengesahan[r.status_pengesahan] || 0) + 1;
      if (r.disemak_oleh) {
        const who = String(r.disemak_oleh).replace(/^\d+\s*-\s*/, '');
        byVerifier[who] = (byVerifier[who] || 0) + 1;
      }
    });
    const operational = AsetHooks.OPERATIONAL.reduce(function (s, k) { return s + (aStatus[k] || 0); }, 0);

    // ---- Tiket
    const tickets = AsetHooks.active_('tiket');
    const cats = CategoryRepository.map();
    const open = tickets.filter(function (r) { return TiketHooks.OPEN.indexOf(r.status) >= 0; });
    const overdue = open.filter(function (r) { return TiketHooks.isOverdue(r, nowIso); });
    const highOpen = open.filter(function (r) { return r.keutamaan === 'KRITIKAL' || r.keutamaan === 'TINGGI'; });
    const byCat = {};
    open.forEach(function (r) {
      const c = cats[r.kategori];
      const k = c ? c.name_ms : 'Tidak dikategori';
      byCat[k] = (byCat[k] || 0) + 1;
    });
    const months = DateUtils.lastNMonths(6);
    const slaTrend = months.map(function (m) {
      const done = tickets.filter(function (r) { return r.selesai_pada && DateUtils.monthKey(r.selesai_pada) === m && r.tarikh_sasaran; });
      const ok = done.filter(function (r) { return String(r.selesai_pada) <= String(r.tarikh_sasaran); }).length;
      return { label: m, value: pct(ok, done.length), within: ok, total: done.length };
    });
    const unassigned = open.filter(function (r) { return !r.pegawai; }).length;
    const pegawai = {};
    AsetHooks.active_('pegawai').forEach(function (p) { pegawai[p.id] = p.nama; });
    const workload = {};
    open.forEach(function (r) {
      if (!r.pegawai) return;
      const n = pegawai[r.pegawai] || 'Lain';
      workload[n] = workload[n] || { name: n, open: 0, overdue: 0 };
      workload[n].open++;
      if (TiketHooks.isOverdue(r, nowIso)) workload[n].overdue++;
    });

    // ---- Makmal & keperluan
    const labs = AsetHooks.active_('makmal').filter(function (r) { return r.status !== 'TIDAK_AKTIF'; });
    const labById = {};
    labs.forEach(function (l) { labById[l.id] = l; });
    const needs = AsetHooks.active_('keperluan').filter(function (r) { return Number(r.tahun) === year && r.status !== 'DITOLAK'; });
    const sum = function (rows, col) { return rows.reduce(function (s, r) { return s + (Number(r[col]) || 0); }, 0); };
    const verifiedNeeds = needs.filter(function (r) { return r.status === 'DISAHKAN'; });
    const assessedLabs = {};
    verifiedNeeds.forEach(function (r) { assessedLabs[r.makmal] = true; });
    const PRI = { KRITIKAL: 0, TINGGI: 1, SEDERHANA: 2, RENDAH: 3 };
    const topLabs = needs.slice().sort(function (a, b) {
      const pa = PRI[a.keutamaan] === undefined ? 9 : PRI[a.keutamaan];
      const pb = PRI[b.keutamaan] === undefined ? 9 : PRI[b.keutamaan];
      if (pa !== pb) return pa - pb;
      return (Number(b.bilangan_ganti) + Number(b.bilangan_tambahan)) - (Number(a.bilangan_ganti) + Number(a.bilangan_tambahan));
    }).slice(0, 5).map(function (r) {
      const l = labById[r.makmal] || {};
      return {
        id: r.id, lab: l.kod ? l.kod + ' · ' + l.nama : (l.nama || '—'), keutamaan: r.keutamaan, status: r.status,
        ganti: Number(r.bilangan_ganti) || 0, tambahan: Number(r.bilangan_tambahan) || 0, kos: Number(r.anggaran_kos) || 0
      };
    });

    // ---- Isu yang memerlukan tindakan / keputusan
    const issues = [];
    overdue.filter(function (r) { return r.keutamaan === 'KRITIKAL' || r.keutamaan === 'TINGGI'; }).slice(0, 5).forEach(function (r) {
      issues.push({ kind: 'tiket', id: r.id, title: r.ref_no + ' · ' + r.tajuk, note: 'Tiket ' + String(r.keutamaan).toLowerCase() + ' melepasi SLA', tone: 'danger' });
    });
    needs.filter(function (r) { return r.keutamaan === 'KRITIKAL' && r.status !== 'DISAHKAN'; }).slice(0, 3).forEach(function (r) {
      const l = labById[r.makmal] || {};
      issues.push({ kind: 'keperluan', id: r.id, title: (l.kod || '') + ' ' + (l.nama || ''), note: 'Keperluan kritikal menunggu pengesahan', tone: 'warn' });
    });

    const nv = AsetHooks.reportValue({}).total;
    const rp = AsetHooks.reportReplacement({}).ringkasan;
    const pcLabs = AsetHooks.computersByLab_(assets, labs);
    const spec = AsetHooks.specProfile_(assets, labById);
    let penilaian = null;
    try {
      const cs = KeperluanHooks.censusStatus({ tahun: year });
      const sm = KeperluanHooks.summary({ tahun: year });
      penilaian = {
        tahun: year, jumlah: cs.jumlah, dihantar: cs.dihantar, belum: cs.belum, unitIt: cs.unitIt, bolehEmel: cs.bolehEmel,
        belumSenarai: cs.items.filter(function (i) { return !i.dihantar && !i.unitIt; }).slice(0, 8).map(function (i) { return { id: i.id, label: i.label, penerima: i.penerima }; }),
        rumusan: sm.jumlah, ikutJenis: sm.ikutJenis
      };
    } catch (e) { penilaian = null; }
    return {
      generatedAt: nowIso,
      tahun: year,
      nilai: { kos: nv.kos, buku: nv.buku, susut: nv.susut, habis: nv.habis, tanpaKos: nv.tanpaKos },
      ganti: { segera: rp.GANTI_SEGERA.bil, tahunDepan: rp.GANTI_TAHUN_DEPAN.bil, kos: Math.round((rp.GANTI_SEGERA.kos + rp.GANTI_TAHUN_DEPAN.kos) * 100) / 100, pantau: rp.PANTAU.bil },
      assets: {
        total: assets.length, operational: operational, operationalPct: pct(operational, assets.length),
        byStatus: aStatus, byJenis: aJenis, verified: verified, verifiedPct: pct(verified, assets.length),
        completePct: pct(complete, assets.length),
        nilai: Math.round(nilai * 100) / 100, lokasiBerbeza: lokasiBerbeza,
        byPengesahan: byPengesahan, recordTotal: allAssets.length,
        byVerifier: Object.keys(byVerifier).map(function (k) { return { label: k, value: byVerifier[k] }; }).sort(function (a, b) { return b.value - a.value; })
      },
      tickets: {
        open: open.length, overdue: overdue.length, overduePct: pct(overdue.length, open.length), highOpen: highOpen.length,
        unassigned: unassigned, total: tickets.length,
        byCategory: Object.keys(byCat).map(function (k) { return { label: k, value: byCat[k] }; }).sort(function (a, b) { return b.value - a.value; }),
        slaTrend: slaTrend,
        workload: Object.keys(workload).map(function (k) { return workload[k]; }).sort(function (a, b) { return b.open - a.open; })
      },
      labs: {
        total: labs.length, submitted: needs.length, assessed: Object.keys(assessedLabs).length,
        assessedPct: pct(Object.keys(assessedLabs).length, labs.length),
        ganti: sum(needs, 'bilangan_ganti'), tambahan: sum(needs, 'bilangan_tambahan'),
        gantiVerified: sum(verifiedNeeds, 'bilangan_ganti'), tambahanVerified: sum(verifiedNeeds, 'bilangan_tambahan'),
        budget: Math.round(sum(needs, 'anggaran_kos') * 100) / 100,
        budgetVerified: Math.round(sum(verifiedNeeds, 'anggaran_kos') * 100) / 100,
        withoutCost: needs.filter(function (r) { return (Number(r.bilangan_ganti) + Number(r.bilangan_tambahan)) > 0 && !(Number(r.harga_seunit) > 0); }).length,
        top: topLabs
      },
      komputerMakmal: pcLabs,
      spesifikasi: spec,
      penilaian: penilaian,
      issues: issues
    };
  },

  /** 'Windows 10 Pro (22H2)' → 'W10'. */
  osOf: function (v) {
    const t = String(v || '').toUpperCase();
    if (!t.trim()) return '';
    if (/(WIN(DOWS)?)\s*11/.test(t)) return 'W11';
    if (/(WIN(DOWS)?)\s*10/.test(t)) return 'W10';
    if (/(WIN(DOWS)?)\s*(7|8|XP|VISTA)/.test(t)) return 'W_LAMA';
    if (/UBUNTU|LINUX|MAC/.test(t)) return 'LAIN';
    return 'LAIN';
  },

  /** CPU → { keluarga, gen, win11 (layak ikut keperluan CPU Windows 11: Intel gen 8+, Ryzen 2000+) }. */
  cpuOf: function (v) {
    const t = String(v || '').toUpperCase().replace(/\(R\)|\(TM\)/g, '');
    if (!t.trim()) return null;
    let m = /\bI([3579])[\s-]*(\d{4,5})/.exec(t);
    if (m) {
      const n = m[2];
      const gen = n.length === 5 ? Number(n.slice(0, 2)) : Number(n.charAt(0));
      return { keluarga: 'Core i' + m[1], gen: gen, win11: gen >= 8 };
    }
    m = /RYZEN\s*([3579])\s*(PRO\s*)?(\d)\d{3}/.exec(t);
    if (m) return { keluarga: 'Ryzen ' + m[1], gen: Number(m[3]), win11: Number(m[3]) >= 2 };
    if (/CORE\s*ULTRA/.test(t)) return { keluarga: 'Core Ultra', gen: 14, win11: true };
    if (/XEON/.test(t)) return { keluarga: 'Xeon', gen: null, win11: null };
    if (/PENTIUM|CELERON|ATOM/.test(t)) return { keluarga: 'Pentium/Celeron', gen: null, win11: null };
    return { keluarga: 'Lain', gen: null, win11: null };
  },

  /**
   * Profil spesifikasi komputer + kesediaan Windows 11 (Windows 10 tamat sokongan 14 Okt 2025).
   * Kategori: W11 · W10 layak naik taraf (CPU disokong) · W10 perlu ganti (CPU tidak disokong) · W10 CPU tidak diketahui · OS lama · tiada data.
   */
  specProfile_: function (assets, labById) {
    const pcs = assets.filter(function (r) { return AsetHooks.COMPUTERS.indexOf(r.jenis) >= 0; });
    const os = { W11: 0, W10: 0, W_LAMA: 0, LAIN: 0, TIADA: 0 };
    const w11 = { sudah: 0, layak: 0, perluGanti: 0, cpuTidakDiketahui: 0, osLama: 0, tiadaData: 0 };
    const ram = { '< 8 GB': 0, '8–15 GB': 0, '16–31 GB': 0, '≥ 32 GB': 0, 'Tiada data': 0 };
    const cpu = {};
    const byLab = {};
    pcs.forEach(function (r) {
      const o = AsetHooks.osOf(r.sistem_operasi);
      const c = AsetHooks.cpuOf(r.cpu);
      os[o || 'TIADA']++;
      if (o === 'W11') w11.sudah++;
      else if (o === 'W10') { if (c && c.win11 === true) w11.layak++; else if (c && c.win11 === false) w11.perluGanti++; else w11.cpuTidakDiketahui++; }
      else if (o === 'W_LAMA') w11.osLama++;
      else w11.tiadaData++;
      const g = Number(r.ram_gb);
      ram[!g ? 'Tiada data' : g < 8 ? '< 8 GB' : g < 16 ? '8–15 GB' : g < 32 ? '16–31 GB' : '≥ 32 GB']++;
      const ck = c ? c.keluarga + (c.gen ? ' gen ' + c.gen : '') : 'Tiada data';
      cpu[ck] = (cpu[ck] || 0) + 1;
      if (o === 'W10' && r.makmal && labById[r.makmal]) {
        const l = labById[r.makmal];
        const b = byLab[r.makmal] = byLab[r.makmal] || { id: r.makmal, label: l.kod ? l.kod + ' · ' + l.nama : l.nama, w10: 0, layak: 0, perluGanti: 0 };
        b.w10++;
        if (c && c.win11 === true) b.layak++; else if (c && c.win11 === false) b.perluGanti++;
      }
    });
    const dikenalpasti = pcs.length - os.TIADA;
    return {
      jumlah: pcs.length, adaDataOs: dikenalpasti, os: os, win11: w11,
      ram: Object.keys(ram).map(function (k) { return { label: k, value: ram[k] }; }),
      cpu: Object.keys(cpu).map(function (k) { return { label: k, value: cpu[k] }; }).sort(function (a, b) { return b.value - a.value; }),
      w10Makmal: Object.keys(byLab).map(function (k) { return byLab[k]; }).sort(function (a, b) { return b.w10 - a.w10; })
    };
  },

  /**
   * Komputer (meja / riba / workstation, bukan dilupus) bagi setiap makmal aktif + ringkasan kesihatan.
   * @return {{items:Object[], jumlah:Object, tanpaMakmal:number, makmalTanpaPc:number}}
   */
  computersByLab_: function (assets, labs) {
    const now = new Date();
    const dcfg = AsetHooks.depConfig();
    const health = {};
    try { AsetHooks.reportLabHealth().items.forEach(function (h) { health[h.id] = h; }); } catch (e) { /* tiada */ }
    const by = {};
    labs.forEach(function (l) {
      by[l.id] = { id: l.id, label: l.kod ? l.kod + ' · ' + l.nama : l.nama, jenis: l.jenis_makmal || '', tempat: Number(l.tempat_komputer) || 0, pengguna: Number(l.pengguna_sesi) || 0,
        pc: 0, desktop: 0, laptop: 0, workstation: 0, beroperasi: 0, rosak: 0, umurSum: 0, umurN: 0, tertua: null };
    });
    let tanpa = 0;
    const BROKEN = ['PERLU_BAIKI', 'MENUNGGU_ALAT_GANTI', 'TIDAK_BOLEH_GUNA'];
    assets.forEach(function (r) {
      if (AsetHooks.COMPUTERS.indexOf(r.jenis) < 0) return;
      const L = by[r.makmal];
      if (!L) { tanpa++; return; }
      L.pc++;
      if (r.jenis === 'LAPTOP') L.laptop++; else if (r.jenis === 'WORKSTATION') L.workstation++; else L.desktop++;
      if (AsetHooks.OPERATIONAL.indexOf(r.status) >= 0) L.beroperasi++;
      if (BROKEN.indexOf(r.status) >= 0) L.rosak++;
      const d = AsetHooks.depreciation(r, now, dcfg);
      if (d && d.umurTahun !== null) { L.umurSum += d.umurTahun; L.umurN++; }
      const y = Number(r.tahun_perolehan);
      if (y && (!L.tertua || y < L.tertua)) L.tertua = y;
    });
    const all = Object.keys(by).map(function (k) { return by[k]; });
    const items = all.filter(function (L) { return L.pc > 0; }).map(function (L) {
      const h = health[L.id] || {};
      return {
        id: L.id, label: L.label, jenis: L.jenis, pc: L.pc, desktop: L.desktop, laptop: L.laptop, workstation: L.workstation, tempat: L.tempat, pengguna: L.pengguna,
        beroperasi: L.beroperasi, rosak: L.rosak, umurPurata: L.umurN ? Math.round((L.umurSum / L.umurN) * 10) / 10 : null, tahunTertua: L.tertua,
        perluGanti: h.perluGanti || 0, indeks: h.skor === undefined ? null : h.skor, tahap: h.tahap || ''
      };
    }).sort(function (a, b) { return b.pc - a.pc; });
    const sum = function (k) { return items.reduce(function (s2, i) { return s2 + (i[k] || 0); }, 0); };
    return {
      items: items, tanpaMakmal: tanpa, makmalTanpaPc: all.length - items.length,
      jumlah: { makmal: items.length, pc: sum('pc'), beroperasi: sum('beroperasi'), rosak: sum('rosak'), perluGanti: sum('perluGanti'), tempat: sum('tempat') }
    };
  },

  // ================================================================== Data UTMFin / KEWPA

  /** Kod bilik daripada ID_LOKASI UTMFin: 'J.C24.01.108-01' → 'J.C24.01.108'. */
  roomOf: function (kodLokasi) {
    return String(kodLokasi || '').trim().toUpperCase().split(/[-\/ ]/)[0];
  },

  /**
   * Kod bilik daripada lokasi fizikal senarai makmal: 'C24.411' → 'J.C24.04.411' (aras = digit pertama no. bilik).
   * Format UTMFin penuh ('J.C24.04.411-01') diterima terus.
   */
  physicalRoom: function (v) {
    const s = String(v || '').trim().toUpperCase().replace(/\s+/g, '');
    if (!s) return '';
    if (/^J\./.test(s)) return AsetHooks.roomOf(s);
    const m = s.match(/^([A-Z]+\d+[A-Z]?)[.\-\/](\d)(\d{2,})$/);
    if (m) return 'J.' + m[1] + '.0' + m[2] + '.' + m[2] + m[3];
    const m2 = s.match(/^([A-Z]+\d+[A-Z]?)[.\-\/](\d{2})[.\-\/](\d+)$/);
    if (m2) return 'J.' + m2[1] + '.' + m2[2] + '.' + m2[3];
    return '';
  },

  /** Lokasi fizikal & UTMFin kedua-duanya diketahui dan biliknya berbeza. */
  lokasiBerbeza: function (kodLokasi, lokasiFizikal) {
    const a = AsetHooks.roomOf(kodLokasi);
    const b = AsetHooks.physicalRoom(lokasiFizikal);
    return !!(a && b && a !== b);
  },

  /** Bilik berkesan untuk pautan makmal: lokasi fizikal (semakan terkini) mengatasi UTMFin. */
  effectiveRoom_: function (r) {
    return AsetHooks.physicalRoom(r.lokasi_fizikal) || AsetHooks.roomOf(r.kod_lokasi);
  },

  /** Lokasi mesra manusia: 'J.C24.01.108-01' → 'C24 · Aras 01 · Bilik 108-01'. */
  lokasiLabel: function (kodLokasi) {
    const p = String(kodLokasi || '').trim().replace(/^J\./i, '').split('.');
    if (p.length < 3) return String(kodLokasi || '').trim();
    return p[0] + ' · Aras ' + p[1] + ' · Bilik ' + p.slice(2).join('.');
  },

  /** Jenis aset daripada nama item UTMFin (semua data J24 ialah komputer). */
  jenisOf: function (text, fallback) {
    const t = String(text || '').toUpperCase();
    if (/LAPTOP|NOTEBOOK|NOOTBOOK|PROBOOK|ELITEBOOK|THINKPAD|VOSTRO 1[345]|RUGGED|ULTRABOOK/.test(t)) return 'LAPTOP';
    if (/WORKSTATION/.test(t)) return 'WORKSTATION';
    if (/PRINTER|PENCETAK|PENGIMBAS|SCANNER/.test(t)) return 'PENCETAK';
    if (/PROJECTOR|PROJEKTOR/.test(t)) return 'PROJEKTOR';
    if (/SERVER|PELAYAN/.test(t)) return 'PELAYAN';
    if (/SWITCH|ROUTER/.test(t)) return 'SWITCH';
    if (/ACCESS POINT/.test(t)) return 'AP';
    if (/DESKTOP|KOMPUTER|COMPUTER|\bCPU\b|\bPC\b|PRODESK|ELITE ?DESK|OPTIPLEX|COMPAQ|PAVIL+ION|SLIMLINE|ALL.IN.ONE/.test(t)) return 'DESKTOP';
    return fallback === null ? null : (fallback || 'LAIN');
  },

  /**
   * Jenis daripada nama item dahulu; deskripsi perolehan hanya jika nama item tidak jelas.
   * (Deskripsi tender selalunya menyenaraikan beberapa jenis, cth. "PC DESKTOP, LAPTOP ..." — tidak boleh diutamakan.)
   */
  jenisFor: function (item, desc, fallback) {
    return AsetHooks.jenisOf(item, null) || AsetHooks.jenisOf(String(item || '') + ' ' + String(desc || ''), fallback);
  },

  jenamaOf: function (text) {
    const m = String(text || '').toUpperCase().match(/\b(HP|DELL|TOSHIBA|LENOVO|ACER|ASUS|PHILIPS|APPLE|SAMSUNG|FUJITSU)\b/);
    if (!m) return '';
    return m[1] === 'HP' ? 'HP' : m[1].charAt(0) + m[1].slice(1).toLowerCase();
  },

  /** Makmal yang mempunyai kod lokasi: [{ id, room }] (kod lebih panjang dahulu supaya padanan paling khusus menang). */
  labRooms_: function () {
    return AsetHooks.active_('makmal').filter(function (l) { return l.kod_lokasi; })
      .map(function (l) { return { id: l.id, room: AsetHooks.roomOf(l.kod_lokasi) }; })
      .sort(function (a, b) { return b.room.length - a.room.length; });
  },

  labForLokasi_: function (kodLokasi, labRooms) {
    const r = AsetHooks.roomOf(kodLokasi);
    if (!r) return '';
    const hit = labRooms.filter(function (l) { return r === l.room || r.indexOf(l.room + '.') === 0; })[0];
    return hit ? hit.id : '';
  },

  /**
   * Isi medan terbitan bagi baris import (hanya jika tidak diberi dalam fail).
   * @param {Object} src nilai camelCase (diubah di tempat) @return {string} status operasi terbitan ('' = lalai)
   */
  /** Status keadaan daripada senarai makmal (lajur STATUS ALAT: Baik / Penyelenggaraan / Rosak). */
  CONDITION: { 'baik': 'BERFUNGSI', 'berfungsi': 'BERFUNGSI', 'penyelenggaraan': 'PERLU_BAIKI', 'dalam penyelenggaraan': 'PERLU_BAIKI', 'rosak': 'TIDAK_BOLEH_GUNA' },

  derive: function (src, labRooms, cur) {
    cur = cur || {};
    let condition = '';
    if (src.statusPengesahan && AsetHooks.CONDITION[String(src.statusPengesahan).trim().toLowerCase()]) {
      condition = AsetHooks.CONDITION[String(src.statusPengesahan).trim().toLowerCase()];
      delete src.statusPengesahan;
    }
    if (!src.jenis && (src.model || src.namaAlat) && !cur.id) src.jenis = AsetHooks.jenisFor(src.model || src.namaAlat, src.deskripsiPerolehan, /^B3[56]2/.test(String(src.kodSodo || '')) ? 'DESKTOP' : 'LAIN');
    if (!src.jenama && (src.model || src.namaAlat) && !cur.jenama) { const j = AsetHooks.jenamaOf(src.namaAlat || src.model); if (j) src.jenama = j; }
    if (!src.model && src.namaAlat && !cur.model) src.model = src.namaAlat;
    if (src.lokasiFizikal) {
      src.lokasiFizikal = String(src.lokasiFizikal).trim().toUpperCase();
      const room = AsetHooks.physicalRoom(src.lokasiFizikal);
      if (room) {
        if (!src.lokasi) src.lokasi = AsetHooks.lokasiLabel(room);
        if (!src.makmal) { const l = AsetHooks.labForLokasi_(room, labRooms || []); if (l) src.makmal = l; }
      }
      if (src.disahkanFizikal === undefined) src.disahkanFizikal = true; /* ditemui semasa semakan makmal */
    }
    if (!src.jenis && src.model) src.jenis = AsetHooks.jenisFor(src.model, src.deskripsiPerolehan);
    if (!src.jenama && src.model) { const j = AsetHooks.jenamaOf(src.model); if (j) src.jenama = j; }
    if (src.kodLokasi) {
      src.kodLokasi = String(src.kodLokasi).trim().toUpperCase();
      if (!src.lokasi && !src.lokasiFizikal && !cur.lokasi_fizikal) src.lokasi = AsetHooks.lokasiLabel(src.kodLokasi);
      if (!src.makmal && !src.lokasiFizikal && !cur.lokasi_fizikal && !cur.makmal) { const l = AsetHooks.labForLokasi_(src.kodLokasi, labRooms || []); if (l) src.makmal = l; }
    }
    const sp = src.statusPengesahan;
    if (!sp) return condition;
    if (src.disahkanFizikal === undefined) src.disahkanFizikal = sp !== 'TIDAK_DISAHKAN';
    if (!src.cadangan && (sp === 'PELUPUSAN' || sp === 'LUPUS_REKOD_AKTIF')) src.cadangan = 'LUPUS';
    if (sp === 'LUPUS_REKOD_AKTIF') return 'DILUPUS';
    if (sp === 'PELUPUSAN') return 'TIDAK_BOLEH_GUNA';
    return condition;
  },

  /**
   * Jana rekod Makmal daripada lokasi aset berstatus "Penjaga - Penggunaan Makmal" (min. N PC sebilik),
   * kemudian pautkan aset tanpa makmal mengikut kod lokasi. Selamat diulang.
   */
  generateLabs: function (payload, ctx) {
    const min = Math.max(1, Math.min(50, Number(payload.min) || 3));
    const dryRun = payload.dryRun === true;
    const mdef = CrudEngine.get('makmal');
    const assets = AsetHooks.active_('aset').filter(function (r) { return !AsetLink.isGone(r); });
    const groups = {};
    assets.forEach(function (r) {
      const fiz = AsetHooks.physicalRoom(r.lokasi_fizikal);
      if (!fiz && (r.status_pengesahan !== 'MAKMAL' || !r.kod_lokasi)) return;
      const room = fiz || AsetHooks.roomOf(r.kod_lokasi);
      groups[room] = groups[room] || { room: room, count: 0, penjaga: {}, pic: {} };
      if (['DESKTOP', 'LAPTOP', 'WORKSTATION'].indexOf(r.jenis) >= 0) groups[room].count++;
      if (r.pic_makmal) groups[room].pic[r.pic_makmal] = (groups[room].pic[r.pic_makmal] || 0) + 1;
      if (r.pegawai_bertanggungjawab) groups[room].penjaga[r.pegawai_bertanggungjawab] = (groups[room].penjaga[r.pegawai_bertanggungjawab] || 0) + 1;
    });
    const known = {};
    AsetHooks.active_('makmal').forEach(function (l) { if (l.kod_lokasi) known[AsetHooks.roomOf(l.kod_lokasi)] = true; });
    const now = DateUtils.nowIso();
    const toCreate = Object.keys(groups).map(function (k) { return groups[k]; })
      .filter(function (g) { return g.count >= min && !known[g.room]; })
      .sort(function (a, b) { return a.room < b.room ? -1 : 1; })
      .map(function (g) {
        const p = g.room.replace(/^J\./, '').split('.');
        const top = Object.keys(g.pic).sort(function (a, b) { return g.pic[b] - g.pic[a]; })[0] ||
          Object.keys(g.penjaga).sort(function (a, b) { return g.penjaga[b] - g.penjaga[a]; })[0] || '';
        const row = {
          id: IdUtils.generate(mdef.prefix), ref_no: '', owner_user_id: ctx.userId, owner_name: (ctx.user && ctx.user.full_name) || '',
          status: 'AKTIF', status_note: '', status_changed_at: '', status_changed_by: '',
          state: RECORD_STATE.ACTIVE, created_at: now, updated_at: now, deleted_at: ''
        };
        mdef.fields.forEach(function (f) { row[f.column] = f.type === 'bool' ? false : ''; });
        Object.assign(row, {
          kod: p.join('-'), nama: 'Makmal ' + p[0] + ' Aras ' + (p[1] || '') + ' Bilik ' + p.slice(2).join('.'),
          bangunan: p[0] || '', bilik: p.slice(2).join('.'), kod_lokasi: g.room, penyelaras: top,
          tempat_komputer: g.count, catatan: 'Dijana daripada data aset (' + g.count + ' komputer). Sila kemas kini nama makmal.'
        });
        return row;
      });
    let linked = 0;
    let deactivated = [];
    if (!dryRun) {
      const mrepo = CrudEngine.repo(mdef);
      Database.withLock(function () {
        AsetHooks.assignRefs_(mdef, toCreate);
        if (toCreate.length) mrepo.insertMany(toCreate);
      });
      mrepo.invalidate();
      linked = AsetHooks.linkToLabs();
      deactivated = AsetHooks.deactivateEmptyAutoLabs_();
      AuditService.log(ctx, AUDIT_ACTIONS.RECORD_CREATED, mdef.sheet, '', 'Jana makmal daripada aset: ' + toCreate.length + ' baharu, ' + linked + ' aset dipautkan');
    }
    return {
      dryRun: dryRun, created: toCreate.length, linked: linked, deactivated: deactivated,
      labs: toCreate.map(function (r) { return { kod: r.kod, nama: r.nama, pc: r.tempat_komputer, penyelaras: r.penyelaras }; })
    };
  },

  /**
   * Makmal yang DIJANA automatik (catatan asal belum diubah) tetapi kini tiada aset dipautkan
   * (cth. lokasi UTMFin lama selepas lokasi fizikal diimport) → Tidak aktif. Boleh diaktifkan semula.
   * @return {string[]} kod makmal yang dinyahaktifkan
   */
  deactivateEmptyAutoLabs_: function () {
    const used = {};
    AsetHooks.active_('aset').forEach(function (r) { if (r.makmal) used[r.makmal] = true; });
    const now = DateUtils.nowIso();
    const patch = {};
    const codes = [];
    AsetHooks.active_('makmal').forEach(function (l) {
      if (l.status !== 'AKTIF' || used[l.id] || String(l.catatan || '').indexOf('Dijana daripada data aset') !== 0) return;
      patch[l.id] = { status: 'TIDAK_AKTIF', status_note: 'Tiada aset selepas pautan ikut lokasi fizikal', status_changed_at: now, status_changed_by: 'Sistem', updated_at: now };
      codes.push(l.kod);
    });
    if (codes.length) CrudEngine.repo(CrudEngine.get('makmal')).updateMany(patch);
    return codes;
  },

  /** Pautkan aset tanpa makmal kepada makmal yang kod lokasinya sepadan. @return {number} bilangan dipautkan */
  linkToLabs: function () {
    const rooms = AsetHooks.labRooms_();
    if (!rooms.length) return 0;
    const patch = {};
    const now = DateUtils.nowIso();
    AsetHooks.active_('aset').forEach(function (r) {
      const fiz = AsetHooks.physicalRoom(r.lokasi_fizikal);
      if (fiz) {
        /* Lokasi fizikal mengatasi pautan lama berasaskan UTMFin */
        const l = AsetHooks.labForLokasi_(fiz, rooms);
        if (l && l !== r.makmal) patch[r.id] = { makmal: l, updated_at: now };
        return;
      }
      if (r.makmal || !r.kod_lokasi) return;
      const l = AsetHooks.labForLokasi_(r.kod_lokasi, rooms);
      if (l) patch[r.id] = { makmal: l, updated_at: now };
    });
    const n = Object.keys(patch).length;
    if (n) CrudEngine.repo(CrudEngine.get('aset')).updateMany(patch);
    return n;
  },

  // ================================================================== Import pukal

  /**
   * payload.rows = [{ noAset, jenis, jenama, model, makmal (kod/nama/ID), lokasi, … , status }]
   * payload.dryRun = true → semak sahaja (tiada tulisan).
   * Nilai enum boleh diberi sebagai nilai (DESKTOP) atau label (Komputer meja). Status juga.
   * @return {{created:number, updated:number, errors:Object[], dryRun:boolean}}
   */
  importRows: function (payload, ctx) {
    const def = CrudEngine.get('aset');
    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    if (!rows.length) throw Errors.validation('Tiada baris untuk diimport.');
    if (rows.length > AsetHooks.MAX_IMPORT) throw Errors.validation('Maksimum ' + AsetHooks.MAX_IMPORT + ' baris setiap kali import.');
    const dryRun = payload.dryRun === true;
    const repo = CrudEngine.repo(def);
    const existing = {};
    repo.all().forEach(function (r) { if (r.state === 'ACTIVE') existing[String(r.no_aset).trim().toLowerCase()] = r; });
    const labs = {};
    AsetHooks.active_('makmal').forEach(function (l) {
      [l.id, l.kod, l.nama].forEach(function (k) { if (k) labs[String(k).trim().toLowerCase()] = l.id; });
    });
    const labRooms = AsetHooks.labRooms_();
    const norm = function (f, v) {
      if (v === undefined || v === null) return v;
      const s = String(v).trim();
      if (s === '-') return '';
      if (f.type === 'int' && /^-?\d+(\.0+)?$/.test(s)) return String(parseInt(s, 10));
      if (f.type === 'bool') return /^(ya|yes|true|1|y|ada|\/|✓|✔|x)$/i.test(s);
      if (f.type === 'enum' && f.options) {
        const hit = f.options.filter(function (o) { return o.value.toLowerCase() === s.toLowerCase() || String(o.label).toLowerCase() === s.toLowerCase(); })[0];
        return hit ? hit.value : s;
      }
      if (f.type === 'ref' && f.ref === 'makmal') return s ? (labs[s.toLowerCase()] || ('?' + s)) : '';
      if (f.type === 'date' && /^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4}$/.test(s)) {
        const p = s.split(/[\/.-]/);
        return p[2] + '-' + ('0' + p[1]).slice(-2) + '-' + ('0' + p[0]).slice(-2);
      }
      return s;
    };
    const statusOf = function (v) {
      const s = String(v || '').trim().toLowerCase();
      if (!s) return '';
      /* Terima nilai (PERLU_BAIKI / perlu baiki), label penuh, atau sebahagian label dipisah "/" (cth. "Perlu dibaiki") */
      const hit = def.statuses.filter(function (o) {
        const parts = o.label.toLowerCase().split('/').map(function (x) { return x.trim(); });
        return o.value.toLowerCase() === s || o.value.toLowerCase().replace(/_/g, ' ') === s || o.label.toLowerCase() === s || parts.indexOf(s) >= 0;
      })[0];
      return hit ? hit.value : null;
    };
    const fields = def.fields.filter(function (f) { return f.type !== 'files' && !f.readonly; });
    const errors = [];
    const skipped = [];
    const inserts = [];
    const patches = {};
    const seen = {};
    const now = DateUtils.nowIso();
    rows.forEach(function (raw, i) {
      const line = i + (Number(payload.offset) || 0) + 2; /* baris 1 = pengepala */
      try {
        const src = {};
        fields.forEach(function (f) {
          if (raw[f.key] !== undefined && raw[f.key] !== '') {
            const nv = norm(f, raw[f.key]);
            if (nv !== '') src[f.key] = nv;
          }
        });
        const key0 = String(src.noAset || '').trim().toLowerCase();
        if (!key0 || key0 === '-') { skipped.push({ line: line, reason: 'Tiada no. aset / barcode' + (src.namaAlat || src.model ? ' (' + (src.namaAlat || src.model) + ')' : '') }); return; }
        if (seen[key0]) { skipped.push({ line: line, noAset: src.noAset, reason: 'Pendua dalam fail (sama dengan baris ' + seen[key0] + ') — baris pertama digunakan' }); return; }
        const derivedStatus = AsetHooks.derive(src, labRooms, existing[key0]);
        if (src.makmal && String(src.makmal).charAt(0) === '?') throw Errors.validation('Makmal "' + String(src.makmal).slice(1) + '" tidak ditemui dalam senarai makmal.');
        const st = statusOf(raw.status) || (raw.status ? null : derivedStatus);
        if (st === null) throw Errors.validation('Status "' + raw.status + '" tidak dikenali.');
        const key = String(src.noAset || '').trim().toLowerCase();
        seen[key] = line;
        const cur = existing[key];
        const v = CrudEngine.validate(def, src, ctx, cur ? 'update' : 'create');
        const kodL = v.row.kod_lokasi !== undefined ? v.row.kod_lokasi : (cur ? cur.kod_lokasi : '');
        const fizL = v.row.lokasi_fizikal !== undefined ? v.row.lokasi_fizikal : (cur ? cur.lokasi_fizikal : '');
        v.row.lokasi_berbeza = AsetHooks.lokasiBerbeza(kodL, fizL);
        if (cur) {
          const p = Object.assign({}, v.row, { updated_at: now });
          if (st && st !== cur.status) { p.status = st; p.status_changed_at = now; p.status_changed_by = 'Import'; }
          patches[cur.id] = p;
        } else {
          const row = Object.assign({}, v.row, {
            id: IdUtils.generate(def.prefix), ref_no: '', owner_user_id: ctx.userId, owner_name: (ctx.user && ctx.user.full_name) || '',
            status: st || def.defaultStatus, status_note: '', status_changed_at: '', status_changed_by: '',
            state: RECORD_STATE.ACTIVE, created_at: now, updated_at: now, deleted_at: ''
          });
          def.fields.forEach(function (f) { if (row[f.column] === undefined) row[f.column] = f.type === 'bool' ? false : ''; });
          inserts.push(row);
        }
      } catch (e) {
        errors.push({ line: line, noAset: raw && raw.noAset ? String(raw.noAset) : '', message: e && e.message ? e.message : String(e) });
      }
    });
    if (!dryRun && !errors.length) {
      Database.withLock(function () {
        AsetHooks.assignRefs_(def, inserts);
        if (inserts.length) repo.insertMany(inserts);
        if (Object.keys(patches).length) repo.updateMany(patches);
      });
      repo.invalidate();
      AppCache.remove('stats:admin');
      AuditService.log(ctx, AUDIT_ACTIONS.RECORD_CREATED, def.sheet, '', 'Import aset: ' + inserts.length + ' baharu, ' + Object.keys(patches).length + ' dikemas kini');
    }
    let linked = 0;
    let tindakan = null;
    if (!dryRun && !errors.length) {
      linked = AsetHooks.linkToLabs();
      if (typeof TindakanHooks !== 'undefined') {
        try { tindakan = TindakanHooks.sync(ctx); } catch (e) { ErrorHandler.record(e, { action: 'tindakan.sync' }); }
      }
    }
    return {
      dryRun: dryRun || errors.length > 0, created: inserts.length, updated: Object.keys(patches).length, linked: linked, tindakan: tindakan,
      errors: errors.slice(0, 100), errorCount: errors.length, skipped: skipped.slice(0, 200), skippedCount: skipped.length
    };
  },

  /** No. rujukan berjujukan untuk sekumpulan baris (dipanggil dalam kunci). */
  assignRefs_: function (def, rows) {
    if (!rows.length) return;
    const first = CrudEngine.nextRefNo(def, rows[0].id);
    const m = def.refFormat.match(/\{SEQ(\d)\}/);
    const width = m ? Number(m[1]) : 4;
    const prefix = first.slice(0, first.length - width);
    let n = parseInt(first.slice(prefix.length), 10);
    rows.forEach(function (r) { r.ref_no = prefix + String(n++).padStart(width, '0'); });
  }
};
