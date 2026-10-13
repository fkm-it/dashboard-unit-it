/**
 * @file TindakanHooks.gs
 * Penjejak tindakan KEWPA. Rekod dijana automatik daripada daftar aset (sync):
 *   lokasi fizikal ≠ UTMFin → LOKASI · penjaga bertukar → PENJAGA · tidak dapat disahkan → PENGESAHAN
 *   dalam pelupusan → PELUPUSAN · telah lupus tetapi rekod aktif → REKOD_LUPUS
 * Peraturan:
 *   - satu tindakan terbuka bagi setiap (aset, jenis); tiada pendua
 *   - tindakan automatik yang masih terbuka ditutup automatik apabila keadaan aset telah dibetulkan
 *   - tindakan yang ditutup / dibatalkan oleh pegawai tidak dijana semula (keputusan pegawai dihormati);
 *     yang ditutup oleh sistem dijana semula jika isu timbul kembali
 */
const TindakanHooks = {
  OPEN: ['BARU', 'DALAM_TINDAKAN'],
  CLOSED: ['SELESAI', 'DIBATALKAN'],
  SYSTEM: 'Sistem',

  /** Peta status pengesahan aset → jenis tindakan. */
  PENGESAHAN_MAP: { BERTUKAR_PENJAGA: 'PENJAGA', TIDAK_DISAHKAN: 'PENGESAHAN', PELUPUSAN: 'PELUPUSAN', LUPUS_REKOD_AKTIF: 'REKOD_LUPUS' },

  routes: {
    'tindakan.segerak': { role: 'ADMIN', fn: function (payload, ctx) { return TindakanHooks.sync(ctx); } },
    'tindakan.ringkasan': { role: 'PENGURUSAN', fn: function () { return TindakanHooks.summary(); } }
  },

  repo_: function () { return CrudEngine.repo(CrudEngine.get('tindakan')); },
  today_: function () { return DateUtils.dayKey(new Date()); },

  sasaranHari_: function () {
    let v;
    try { v = Number(SettingsService.get('TINDAKAN_SASARAN_HARI')); } catch (e) { v = NaN; }
    return v > 0 ? v : 30;
  },

  beforeSave: function (row, info) {
    const cur = info.current || {};
    if (info.mode !== 'update' && !row.tarikh_sasaran) row.tarikh_sasaran = DateUtils.dayKey(DateUtils.addDays(new Date(), TindakanHooks.sasaranHari_()));
    /* Lengkapkan no. aset & makmal daripada rekod aset yang dipilih */
    const asetId = row.aset !== undefined ? row.aset : cur.aset;
    if (asetId && row.aset !== undefined) {
      const a = CrudEngine.repo(CrudEngine.get('aset')).findById(asetId);
      if (a) {
        if (!row.no_aset && !cur.no_aset) row.no_aset = a.no_aset;
        if (!row.makmal && !cur.makmal && a.makmal) row.makmal = a.makmal;
      }
    }
  },

  afterStatus: function (row, prev) {
    let patch = null;
    if (row.status === 'SELESAI' && !row.selesai_pada) patch = { selesai_pada: TindakanHooks.today_() };
    else if (TindakanHooks.OPEN.indexOf(row.status) >= 0 && row.selesai_pada) patch = { selesai_pada: '' };
    if (!patch) return;
    TindakanHooks.repo_().update(row.id, patch);
    Object.assign(row, patch);
  },

  toDTO: function (dto, row) {
    dto.lewat = TindakanHooks.isOverdue(row, TindakanHooks.today_());
    return dto;
  },

  isOverdue: function (row, today) {
    return TindakanHooks.OPEN.indexOf(row.status) >= 0 && !!row.tarikh_sasaran && String(row.tarikh_sasaran) < today;
  },

  maintenance: function () { return TindakanHooks.sync(null); },

  /**
   * Isu KEWPA bagi satu rekod aset.
   * @return {Array<{jenis:string, butiran:string}>}
   */
  conditions: function (a) {
    const out = [];
    if (a.state !== 'ACTIVE') return out;
    if (String(a.lokasi_berbeza).toUpperCase() === 'TRUE') {
      out.push({ jenis: 'LOKASI', butiran: 'Lokasi UTMFin ' + (AsetHooks.roomOf(a.kod_lokasi) || a.kod_lokasi || '—') + ' berbeza daripada lokasi fizikal ' + (a.lokasi_fizikal || '—') + '. Kemas kini rekod pergerakan aset.' });
    }
    const j = TindakanHooks.PENGESAHAN_MAP[a.status_pengesahan];
    if (j === 'PENJAGA') out.push({ jenis: j, butiran: 'Penjaga dalam UTMFin: ' + (a.pegawai_bertanggungjawab || '—') + '; penjaga terkini: ' + (a.penjaga_terkini || 'belum direkod') + '.' });
    else if (j === 'PENGESAHAN') out.push({ jenis: j, butiran: 'Status aset tidak dapat disahkan oleh penjaga. Semak fizikal dan sahkan.' });
    else if (j === 'PELUPUSAN') out.push({ jenis: j, butiran: 'Aset dalam tindakan pelupusan oleh penjaga. Pantau sehingga rekod dilupuskan.' });
    else if (j === 'REKOD_LUPUS') out.push({ jenis: j, butiran: 'Aset telah lupus tetapi rekod masih aktif di UTMFin. Mohon kemas kini rekod.' });
    return out;
  },

  /**
   * Segerakkan penjejak dengan daftar aset.
   * @param {Object|null} ctx null = pencetus harian
   * @return {{dicipta:number, ditutup:number, terbuka:number}}
   */
  sync: function (ctx) {
    const def = CrudEngine.get('tindakan');
    const repo = TindakanHooks.repo_();
    const assets = CrudEngine.repo(CrudEngine.get('aset')).all().filter(function (a) { return a.state === 'ACTIVE'; });
    const now = DateUtils.nowIso();
    const today = TindakanHooks.today_();
    const sasaran = DateUtils.dayKey(DateUtils.addDays(new Date(), TindakanHooks.sasaranHari_()));
    const byKey = {};
    repo.all().forEach(function (t) {
      if (t.state !== 'ACTIVE' || !t.aset) return;
      const k = t.aset + '|' + t.jenis;
      (byKey[k] = byKey[k] || []).push(t);
    });
    const wanted = {};
    const inserts = [];
    assets.forEach(function (a) {
      TindakanHooks.conditions(a).forEach(function (c) {
        const k = a.id + '|' + c.jenis;
        wanted[k] = true;
        const recs = byKey[k] || [];
        const blocked = recs.some(function (t) {
          return TindakanHooks.OPEN.indexOf(t.status) >= 0 || t.status_changed_by !== TindakanHooks.SYSTEM;
        });
        if (blocked) return;
        const row = {
          id: IdUtils.generate(def.prefix), ref_no: '', owner_user_id: ctx ? ctx.userId : '', owner_name: TindakanHooks.SYSTEM,
          jenis: c.jenis, aset: a.id, no_aset: a.no_aset || '', butiran: c.butiran, makmal: a.makmal || '', pegawai: '',
          tarikh_sasaran: sasaran, borang: '', catatan: '', automatik: true, selesai_pada: '',
          status: def.defaultStatus, status_note: '', status_changed_at: '', status_changed_by: '',
          state: RECORD_STATE.ACTIVE, created_at: now, updated_at: now, deleted_at: ''
        };
        inserts.push(row);
      });
    });
    const patches = {};
    Object.keys(byKey).forEach(function (k) {
      if (wanted[k]) return;
      byKey[k].forEach(function (t) {
        if (String(t.automatik).toUpperCase() !== 'TRUE' || TindakanHooks.OPEN.indexOf(t.status) < 0) return;
        patches[t.id] = {
          status: 'SELESAI', status_note: 'Diselesaikan automatik: rekod aset telah dikemas kini.', status_changed_at: now,
          status_changed_by: TindakanHooks.SYSTEM, selesai_pada: today, updated_at: now
        };
      });
    });
    if (inserts.length || Object.keys(patches).length) {
      Database.withLock(function () {
        AsetHooks.assignRefs_(def, inserts);
        if (inserts.length) repo.insertMany(inserts);
        if (Object.keys(patches).length) repo.updateMany(patches);
      });
      repo.invalidate();
      AppCache.remove('stats:admin');
      if (ctx) AuditService.log(ctx, AUDIT_ACTIONS.RECORD_CREATED, def.sheet, '', 'Segerak tindakan KEWPA: ' + inserts.length + ' baharu, ' + Object.keys(patches).length + ' ditutup');
    }
    const open = repo.all().filter(function (t) { return t.state === 'ACTIVE' && TindakanHooks.OPEN.indexOf(t.status) >= 0; }).length;
    return { dicipta: inserts.length, ditutup: Object.keys(patches).length, terbuka: open };
  },

  /**
   * Ringkasan untuk Pengurusan (tiada nama/penjaga).
   * @param {string=} bulan 'yyyy-MM' untuk kiraan selesai bulan itu (lalai bulan semasa)
   */
  summary: function (bulan) {
    const def = CrudEngine.get('tindakan');
    const labels = {};
    def.fields.filter(function (f) { return f.key === 'jenis'; })[0].options.forEach(function (o) { labels[o.value] = o.label; });
    const today = TindakanHooks.today_();
    const month = bulan || today.slice(0, 7);
    const since30 = DateUtils.dayKey(DateUtils.addDays(new Date(), -30));
    const by = {};
    const tot = { terbuka: 0, lewat: 0, baru: 0, dalamTindakan: 0, selesaiBulanIni: 0, selesai30: 0, selesai: 0 };
    TindakanHooks.repo_().all().forEach(function (t) {
      if (t.state !== 'ACTIVE' || t.status === 'DIBATALKAN') return;
      const b = by[t.jenis] = by[t.jenis] || { jenis: t.jenis, label: labels[t.jenis] || t.jenis, terbuka: 0, lewat: 0, selesai: 0 };
      if (TindakanHooks.OPEN.indexOf(t.status) >= 0) {
        tot.terbuka++; b.terbuka++;
        if (t.status === 'BARU') tot.baru++; else tot.dalamTindakan++;
        if (TindakanHooks.isOverdue(t, today)) { tot.lewat++; b.lewat++; }
      } else if (t.status === 'SELESAI') {
        tot.selesai++; b.selesai++;
        const d = String(t.selesai_pada || '');
        if (d.slice(0, 7) === month) tot.selesaiBulanIni++;
        if (d >= since30) tot.selesai30++;
      }
    });
    const all = tot.terbuka + tot.selesai;
    return {
      generatedAt: DateUtils.nowIso(), bulan: month, sasaranHari: TindakanHooks.sasaranHari_(),
      jumlah: tot, pctSelesai: all ? Math.round((tot.selesai / all) * 1000) / 10 : null,
      ikutJenis: Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return b.terbuka - a.terbuka; })
    };
  }
};
