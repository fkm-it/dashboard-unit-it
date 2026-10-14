/**
 * @file StoktakeHooks.gs
 * Stock-take (verifikasi fizikal aset) secara berkumpulan.
 *   - skop sesi: makmal, lokasi fizikal, atau semua aset (tidak termasuk dilupus / hapus kira / keluar FKM)
 *   - stoktake.imbas : satu imbasan (QR label / barcode / taip) → rekod Pemeriksaan (ADA) → rekod aset dikemas kini
 *                      (tarikh semakan, disahkan fizikal, lokasi fizikal jika sesi berlokasi). Imbasan berulang diabaikan.
 *                      No. aset tiada dalam daftar → disenaraikan dalam sesi (untuk didaftarkan), bukan ralat.
 *   - stoktake.ringkasan : dijangka / dijumpai / belum dijumpai / di luar skop / tidak berdaftar
 *   - stoktake.tutup : tutup sesi; pilihan — rekod Pemeriksaan "Tidak dijumpai" bagi aset dijangka yang belum diimbas
 */
const StoktakeHooks = {
  routes: {
    'stoktake.imbas': { role: 'ADMIN', fn: function (payload, ctx) { return StoktakeHooks.scan(payload || {}, ctx); } },
    'stoktake.ringkasan': { role: 'ADMIN', fn: function (payload) { return StoktakeHooks.summary(payload || {}); } },
    'stoktake.tutup': { role: 'ADMIN', fn: function (payload, ctx) { return StoktakeHooks.close(payload || {}, ctx); } },
    'stoktake.daftar': { role: 'ADMIN', fn: function (payload, ctx) { return StoktakeHooks.register(payload || {}, ctx); } }
  },

  JENIS: ['DESKTOP', 'LAPTOP', 'WORKSTATION', 'PENCETAK', 'PROJEKTOR', 'PELAYAN', 'SWITCH', 'AP', 'LAIN'],

  /**
   * Daftar pantas aset yang diimbas tetapi tiada dalam daftar (data asas sahaja), kemudian
   * terus rekod sebagai dijumpai dalam sesi. Aset ditanda "perlu dilengkapkan".
   * @param {{sesi:string, kod:string, namaAlat:string, jenis?:string, noSiri?:string, keadaan?:string}} p
   */
  register: function (p, ctx) {
    const s = StoktakeHooks.session_(p.sesi, true);
    const no = StoktakeHooks.noFromScan(p.kod).slice(0, 40);
    const nama = String(p.namaAlat || '').trim().slice(0, 120);
    const errs = {};
    if (!no) errs.kod = 'Wajib diisi.';
    if (!nama) errs.namaAlat = 'Wajib diisi.';
    if (Object.keys(errs).length) throw Errors.validation('Lengkapkan no. aset dan nama alat.', errs);
    if (AsetLink.find(no)) throw Errors.conflict('No. aset ' + no + ' telah wujud dalam daftar.');
    const jenis = StoktakeHooks.JENIS.indexOf(p.jenis) >= 0 ? p.jenis : 'LAIN';
    const a = AsetLink.insert('aset', {
      no_aset: no, nama_alat: nama, jenis: jenis, no_siri: String(p.noSiri || '').trim().slice(0, 60),
      makmal: s.makmal || '', lokasi_fizikal: s.lokasi || '', status: 'BERFUNGSI', perlu_dilengkapkan: true,
      catatan: 'Didaftarkan secara pantas semasa stock-take ' + s.ref_no + '. Lengkapkan butiran aset.'
    }, ctx);
    try { AuditService.log(ctx, AUDIT_ACTIONS.RECORD_CREATED, 'ASET', a.id, 'Daftar pantas (stock-take ' + s.ref_no + '): ' + no); } catch (e) { /* audit tidak kritikal */ }
    const list = KitHooks.parseList(s.tidak_berdaftar).filter(function (x) { return AsetLink.norm(x) !== AsetLink.norm(no); });
    StoktakeHooks.repo_().update(s.id, { tidak_berdaftar: list.join('\n'), updated_at: DateUtils.nowIso() });
    const r = StoktakeHooks.scan({ sesi: s.id, kod: no, keadaan: p.keadaan }, ctx);
    r.asetId = a.id;
    r.didaftar = true;
    return r;
  },

  repo_: function () { return CrudEngine.repo(CrudEngine.get('stoktake')); },

  session_: function (id, open) {
    const s = id ? StoktakeHooks.repo_().findById(String(id)) : null;
    if (!s || s.state !== 'ACTIVE') throw Errors.notFound('Sesi stock-take');
    if (open && s.status !== 'BERJALAN') throw Errors.validation('Sesi ' + s.ref_no + ' telah ditutup.');
    return s;
  },

  /** Teks imbasan → no. aset (URL label QR "…#/qr?a=<no>" atau teks/barcode terus). */
  noFromScan: function (text) {
    const t = String(text || '').trim();
    const m = /[?&]a=([^&#\s]+)/.exec(t);
    if (m) { try { return decodeURIComponent(m[1]).trim(); } catch (e) { return m[1]; } }
    return t.slice(0, 80);
  },

  inScope: function (s, a) {
    if (s.makmal) return a.makmal === s.makmal;
    if (s.lokasi) {
      const want = AsetHooks.physicalRoom(s.lokasi);
      if (want) return AsetHooks.effectiveRoom_(a) === want;
      return String(a.lokasi_fizikal || '').toUpperCase().replace(/\s+/g, '') === String(s.lokasi).toUpperCase().replace(/\s+/g, '');
    }
    return true;
  },

  expected: function (s) {
    return AsetLink.repo_().all().filter(function (a) { return a.state === 'ACTIVE' && !AsetLink.isGone(a) && StoktakeHooks.inScope(s, a); });
  },

  scans_: function (s) {
    return CrudEngine.repo(CrudEngine.get('pemeriksaan')).all().filter(function (r) { return r.state === 'ACTIVE' && r.sesi === s.id; });
  },

  beforeSave: function (row, info) {
    const m = Object.assign({}, info.current || {}, row);
    if (info.mode !== 'update' || row.makmal !== undefined || row.lokasi !== undefined) row.dijangka = StoktakeHooks.expected(m).length;
    if (info.mode !== 'update') { row.dijumpai = 0; row.luar_skop = 0; row.tidak_dijumpai = ''; row.tidak_berdaftar = ''; }
  },

  /** Kemas kini kiraan pada rekod sesi. */
  recount_: function (s) {
    const scans = StoktakeHooks.scans_(s);
    const found = scans.filter(function (r) { return r.keberadaan === 'ADA'; });
    const byId = {};
    AsetLink.repo_().all().forEach(function (a) { byId[a.id] = a; });
    const luar = found.filter(function (r) { return byId[r.aset] && !StoktakeHooks.inScope(s, byId[r.aset]); }).length;
    const patch = { dijangka: StoktakeHooks.expected(s).length, dijumpai: found.length, luar_skop: luar, updated_at: DateUtils.nowIso() };
    StoktakeHooks.repo_().update(s.id, patch);
    return Object.assign({}, s, patch);
  },

  /**
   * @param {{sesi:string, kod:string, keadaan?:string, catatan?:string}} p
   * @return {{status:'DIREKOD'|'ULANG'|'TIDAK_BERDAFTAR'|'DILUPUS', noAset:string, label?:string, luarSkop?:boolean, kiraan:Object}}
   */
  scan: function (p, ctx) {
    const s = StoktakeHooks.session_(p.sesi, true);
    const no = StoktakeHooks.noFromScan(p.kod);
    if (!no) throw Errors.validation('Imbas atau taip no. aset.');
    const keadaan = ['BAIK', 'ROSAK', 'USANG', 'TIDAK_DIGUNAKAN'].indexOf(p.keadaan) >= 0 ? p.keadaan : 'BAIK';
    const a = AsetLink.find(no);
    const kiraan = function (x) { return { dijangka: Number(x.dijangka) || 0, dijumpai: Number(x.dijumpai) || 0, luarSkop: Number(x.luar_skop) || 0 }; };
    if (!a) {
      const list = KitHooks.parseList(s.tidak_berdaftar);
      if (!list.some(function (x) { return AsetLink.norm(x) === AsetLink.norm(no); })) {
        list.push(no);
        StoktakeHooks.repo_().update(s.id, { tidak_berdaftar: list.slice(-500).join('\n'), updated_at: DateUtils.nowIso() });
      }
      return { status: 'TIDAK_BERDAFTAR', noAset: no, kiraan: kiraan(s) };
    }
    if (AsetLink.isGone(a)) return { status: 'DILUPUS', noAset: a.no_aset, label: AsetLink.label(a), statusAset: AsetLink.statusLabel_('aset', a.status), kiraan: kiraan(s) };
    const dup = StoktakeHooks.scans_(s).filter(function (r) { return r.aset === a.id; })[0];
    if (dup) return { status: 'ULANG', noAset: a.no_aset, label: AsetLink.label(a), kiraan: kiraan(s) };
    const row = AsetLink.insert('pemeriksaan', {
      no_aset: a.no_aset, butiran_aset: AsetLink.label(a), aset: a.id, sesi: s.id,
      tarikh_pemeriksaan: s.tarikh || AsetLink.today(), pemeriksa: s.pemeriksa || (ctx.user && ctx.user.full_name) || '',
      keberadaan: 'ADA', keadaan: keadaan, lokasi_sebenar: s.lokasi || '', label_ada: true, maklumat_sepadan: StoktakeHooks.inScope(s, a),
      catatan: String(p.catatan || '').slice(0, 1000), status: 'DIREKOD'
    }, ctx);
    PemeriksaanHooks.afterCreate(row, ctx);
    const s2 = StoktakeHooks.recount_(s);
    return { status: 'DIREKOD', noAset: a.no_aset, label: AsetLink.label(a), luarSkop: !StoktakeHooks.inScope(s, a), kiraan: kiraan(s2) };
  },

  summary: function (p) {
    const s = StoktakeHooks.session_(p.sesi || p.id, false);
    const scans = StoktakeHooks.scans_(s);
    const seen = {};
    scans.forEach(function (r) { seen[r.aset] = r; });
    const expected = StoktakeHooks.expected(s);
    const brief = function (a) { return { id: a.id, noAset: a.no_aset, label: AsetLink.label(a) }; };
    const belum = expected.filter(function (a) { return !seen[a.id]; }).map(brief);
    const byId = {};
    AsetLink.repo_().all().forEach(function (a) { byId[a.id] = a; });
    const luar = scans.filter(function (r) { return r.keberadaan === 'ADA' && byId[r.aset] && !StoktakeHooks.inScope(s, byId[r.aset]); }).map(function (r) {
      const a = byId[r.aset];
      const mk = a.makmal ? CrudEngine.refTitle('makmal', a.makmal) : '';
      return Object.assign(brief(a), { daftar: mk || a.lokasi_fizikal || AsetHooks.lokasiLabel(a.kod_lokasi) || '—' });
    });
    const tiada = scans.filter(function (r) { return r.keberadaan === 'TIADA'; }).length;
    return {
      sesi: { id: s.id, refNo: s.ref_no, nama: s.nama, status: s.status },
      dijangka: expected.length, dijumpai: scans.length - tiada, belum: belum.slice(0, 500), belumJumlah: belum.length,
      luarSkop: luar, tidakBerdaftar: KitHooks.parseList(s.tidak_berdaftar), tidakDijumpaiDirekod: tiada,
      peratus: expected.length ? Math.round((expected.filter(function (a) { return seen[a.id] && seen[a.id].keberadaan === 'ADA'; }).length / expected.length) * 100) : null
    };
  },

  close: function (p, ctx) {
    const s = StoktakeHooks.session_(p.sesi, true);
    const seen = {};
    StoktakeHooks.scans_(s).forEach(function (r) { seen[r.aset] = true; });
    const missing = StoktakeHooks.expected(s).filter(function (a) { return !seen[a.id]; });
    if (p.tandaTidakDijumpai === true) {
      missing.forEach(function (a) {
        const row = AsetLink.insert('pemeriksaan', {
          no_aset: a.no_aset, butiran_aset: AsetLink.label(a), aset: a.id, sesi: s.id, tarikh_pemeriksaan: s.tarikh || AsetLink.today(),
          pemeriksa: s.pemeriksa || '', keberadaan: 'TIADA', keadaan: 'BAIK', catatan: 'Tidak dijumpai semasa ' + s.ref_no, status: 'DIREKOD'
        }, ctx);
        PemeriksaanHooks.afterCreate(row, ctx);
      });
    }
    const now = DateUtils.nowIso();
    StoktakeHooks.recount_(s);
    StoktakeHooks.repo_().update(s.id, {
      status: 'SELESAI', status_changed_at: now, status_changed_by: (ctx.user && ctx.user.full_name) || '', status_note: missing.length + ' aset tidak dijumpai',
      tidak_dijumpai: missing.length, tarikh_selesai: now, updated_at: now
    });
    AuditService.log(ctx, AUDIT_ACTIONS.RECORD_STATUS, 'STOKTAKE', s.id, 'Sesi ditutup · ' + missing.length + ' tidak dijumpai' + (p.tandaTidakDijumpai ? ' (direkod)' : ''));
    return { tidakDijumpai: missing.length, direkod: p.tandaTidakDijumpai === true ? missing.length : 0 };
  }
};
