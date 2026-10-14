/**
 * @file AsetLink.gs
 * Kitar hayat aset (KEWPA): rekod pergerakan, pinjaman, aduan kerosakan, penyelenggaraan, pemeriksaan, penilaian,
 * pelupusan dan kehilangan dipautkan kepada rekod Aset IT melalui No. aset.
 *   - require()     : sahkan no. aset wujud (dan belum dilupus / hapus kira / keluar FKM)
 *   - beforeSave()  : simpan ID aset + ringkasan aset pada rekod modul
 *   - updateAset()  : kemas kini rekod aset (status, lokasi, tarikh …) dengan jejak audit
 *   - guard()       : aliran status yang dibenarkan
 *   - history()     : sejarah lengkap satu aset merentas semua modul (+ tiket Helpdesk ikut no. aset)
 *   - summary()     : kiraan untuk Executive Overview (tanpa nama / data peribadi)
 */
const AsetLink = {
  MODULES: ['pergerakan', 'pinjaman', 'aduanaset', 'selenggara', 'pemeriksaan', 'penilaian', 'pelupusan', 'kehilangan'],
  /** Status aset yang tidak lagi berada dalam simpanan FKM. */
  GONE: ['DILUPUS', 'HAPUS_KIRA', 'DIPINDAH_KELUAR'],
  /** Medan tarikh utama setiap modul (untuk sejarah). */
  DATE_COL: {
    pergerakan: 'tarikh_pergerakan', pinjaman: 'tarikh_pinjam', aduanaset: 'tarikh_kerosakan', selenggara: 'tarikh_selenggara',
    pemeriksaan: 'tarikh_pemeriksaan', penilaian: 'tarikh_penilaian', pelupusan: 'tarikh_lupus', kehilangan: 'tarikh_kehilangan'
  },

  isGone: function (r) { return !!r && AsetLink.GONE.indexOf(r.status) >= 0; },
  isTrue: function (v) { return v === true || String(v).toUpperCase() === 'TRUE'; },
  norm: function (s) { return String(s === undefined || s === null ? '' : s).toLowerCase().replace(/\s+/g, ''); },
  today: function () { return DateUtils.dayKey(new Date()); },
  def_: function (key) { return CrudEngine.get(key); },
  repo_: function (key) { return CrudEngine.repo(CrudEngine.get(key || 'aset')); },

  /** Rekod aset aktif ikut no. aset (tidak sensitif huruf & ruang). */
  find: function (noAset) {
    const n = AsetLink.norm(noAset);
    if (!n) return null;
    return AsetLink.repo_().all().filter(function (r) { return r.state === 'ACTIVE' && AsetLink.norm(r.no_aset) === n; })[0] || null;
  },

  byId: function (id) {
    if (!id) return null;
    const r = AsetLink.repo_().findById(id);
    return r && r.state === 'ACTIVE' ? r : null;
  },

  label: function (a) {
    if (!a) return '';
    const name = [a.jenama, a.model || a.nama_alat].filter(function (x) { return x && String(x).trim(); }).join(' ');
    const where = a.lokasi_fizikal || a.lokasi || '';
    return [name, where].filter(String).join(' · ').slice(0, 200);
  },

  statusLabel_: function (key, s) { return CrudEngine.statusLabel(CrudEngine.get(key), s); },

  /**
   * Sahkan no. aset (data baharu atau nilai semasa).
   * @param {{allowGone?:boolean}} [opts]
   * @return {Object} baris aset
   */
  require: function (data, info, opts) {
    const cur = (info && info.current) || {};
    const no = data.noAset !== undefined ? data.noAset : cur.no_aset;
    const a = AsetLink.find(no);
    if (!a) throw Errors.validation('No. aset "' + (no || '') + '" tidak ditemui dalam daftar aset FKM. Semak semula label aset.', { noAset: 'Tidak ditemui dalam daftar aset.' });
    /* Sunting rekod sedia ada tanpa menukar aset: dibenarkan walaupun aset kini telah dilupus / hilang */
    const sameAset = info && info.mode === 'update' && AsetLink.norm(no) === AsetLink.norm(cur.no_aset);
    if (!(opts && opts.allowGone) && !sameAset && AsetLink.isGone(a)) {
      const msg = 'Aset ' + a.no_aset + ' berstatus "' + AsetLink.statusLabel_('aset', a.status) + '".';
      throw Errors.validation(msg, { noAset: msg });
    }
    return a;
  },

  /** Nilai medan berubah berbanding rekod semasa (mod sunting)? */
  changed: function (data, info, key, col) {
    if (!info || info.mode !== 'update') return true;
    if (data[key] === undefined) return false;
    return AsetLink.norm(data[key]) !== AsetLink.norm((info.current || {})[col]);
  },

  /** Simpan pautan & ringkasan aset pada baris modul. */
  beforeSave: function (row) {
    if (row.no_aset === undefined) return;
    const a = AsetLink.find(row.no_aset);
    if (!a) return;
    row.aset = a.id;
    row.no_aset = a.no_aset;
    row.butiran_aset = AsetLink.label(a);
  },

  /** Domain email dibenarkan untuk borang awam (Tetapan ASET_DOMAIN_EMAIL; subdomain diterima, cth. graduate.utm.my). */
  emailAllowed: function (email) {
    let cfg;
    try { cfg = SettingsService.get('ASET_DOMAIN_EMAIL'); } catch (e) { cfg = 'utm.my'; }
    const domains = String(cfg === undefined || cfg === null ? 'utm.my' : cfg).split(/[,;\s]+/).map(function (d) { return d.trim().toLowerCase().replace(/^@/, ''); }).filter(String);
    if (!domains.length || domains.indexOf('*') >= 0) return true;
    const host = String(email || '').toLowerCase().split('@')[1] || '';
    return domains.some(function (d) { return host === d || host.slice(-(d.length + 1)) === '.' + d; });
  },

  requireEmail: function (data, info) {
    if (!info || info.mode !== 'public' || !data.email || AsetLink.emailAllowed(data.email)) return;
    let cfg = 'utm.my';
    try { cfg = SettingsService.get('ASET_DOMAIN_EMAIL') || cfg; } catch (e) { /* lalai */ }
    throw Errors.validation('Gunakan email UTM (' + cfg + ').', { email: 'Gunakan email UTM (' + cfg + ').' });
  },

  /** Rekod terbuka lain bagi aset yang sama dalam modul. */
  openFor: function (key, asetId, statuses, exceptId) {
    return AsetLink.repo_(key).all().filter(function (r) {
      return r.state === 'ACTIVE' && r.id !== exceptId && r.aset === asetId && statuses.indexOf(r.status) >= 0;
    })[0] || null;
  },

  /** Aliran status: flow = { DARI: [KE, …] }. */
  guard: function (key, flow, row, next) {
    if (row.status === next) return;
    const ok = flow[row.status] || [];
    if (ok.indexOf(next) < 0) {
      throw Errors.validation('Status tidak boleh ditukar daripada "' + AsetLink.statusLabel_(key, row.status) + '" kepada "' + AsetLink.statusLabel_(key, next) + '".');
    }
  },

  /** Nilai buku semasa aset (susut nilai garis lurus) atau '' jika tiada kos. */
  bookValue: function (a) {
    const d = a ? AsetHooks.depreciation(a, new Date()) : null;
    return d && d.kos > 0 ? d.nilaiBuku : '';
  },

  /**
   * Kemas kini rekod aset (hanya lajur yang berubah). Status → cap masa & catatan; lokasi → semak semula lokasi berbeza.
   * @return {Object|null} baris aset dikemas kini
   */
  updateAset: function (asetId, patch, ctx, note) {
    const repo = AsetLink.repo_();
    const a = asetId ? repo.findById(asetId) : null;
    if (!a) return null;
    const p = {};
    Object.keys(patch).forEach(function (k) {
      const v = patch[k];
      if (v === undefined) return;
      const before = a[k] === undefined || a[k] === null ? '' : a[k];
      if (typeof v === 'boolean' ? AsetLink.isTrue(before) !== v : String(before) !== String(v)) p[k] = v;
    });
    if (!Object.keys(p).length) return a;
    const now = DateUtils.nowIso();
    if (p.status) {
      p.status_changed_at = now;
      p.status_changed_by = (ctx && ctx.user && ctx.user.full_name) || 'Sistem';
      p.status_note = String(note || '').slice(0, 500);
    }
    if (p.lokasi_fizikal !== undefined || p.kod_lokasi !== undefined) {
      p.lokasi_berbeza = AsetHooks.lokasiBerbeza(p.kod_lokasi !== undefined ? p.kod_lokasi : a.kod_lokasi, p.lokasi_fizikal !== undefined ? p.lokasi_fizikal : a.lokasi_fizikal);
    }
    p.updated_at = now;
    const u = repo.update(asetId, p);
    repo.invalidate();
    AppCache.remove('stats:admin');
    try {
      AuditService.log(ctx && ctx.userId ? ctx : { role: 'SYSTEM', userId: '' }, AUDIT_ACTIONS.RECORD_UPDATED, 'ASET', asetId,
        StringUtils.truncate((note ? note + ' · ' : '') + Object.keys(p).filter(function (k) { return ['updated_at', 'status_changed_at', 'status_changed_by', 'status_note'].indexOf(k) < 0; }).join(', '), 200));
    } catch (e) { /* audit tidak kritikal */ }
    return u;
  },

  /** Sisip rekod modul oleh sistem (cth. rekod selenggara daripada aduan selesai). */
  insert: function (key, values, ctx) {
    const def = CrudEngine.get(key);
    const repo = CrudEngine.repo(def);
    const now = DateUtils.nowIso();
    const row = Object.assign({
      id: IdUtils.generate(def.prefix), ref_no: '', owner_user_id: (ctx && ctx.userId) || '', owner_name: (ctx && ctx.user && ctx.user.full_name) || 'Sistem',
      status: def.defaultStatus, status_note: '', status_changed_at: '', status_changed_by: '',
      state: RECORD_STATE.ACTIVE, created_at: now, updated_at: now, deleted_at: ''
    }, values);
    def.fields.forEach(function (f) { if (row[f.column] === undefined) row[f.column] = f.type === 'bool' ? false : ''; });
    Database.withLock(function () {
      AsetHooks.assignRefs_(def, [row]);
      repo.insertMany([row]);
    });
    repo.invalidate();
    return row;
  },

  /** E-mel pemohon: medan email (borang awam) atau email akaun pemilik. */
  contactEmail: function (row) {
    if (row.email) return row.email;
    if (!row.owner_user_id) return '';
    const u = UserRepository.findById(row.owner_user_id);
    return u && u.email ? u.email : '';
  },

  summaryOf_: function (key, r) {
    const def = CrudEngine.get(key);
    const en = function (col, k) {
      const f = def.fields.filter(function (x) { return x.key === k; })[0];
      const o = f && f.options ? f.options.filter(function (op) { return op.value === r[col]; })[0] : null;
      return o ? o.label : (r[col] || '');
    };
    const cut = function (s) { return StringUtils.truncate(String(s || ''), 120); };
    switch (key) {
      case 'pergerakan': return en('jenis_pergerakan', 'jenisPergerakan') + (r.lokasi_baru ? ' → ' + r.lokasi_baru : '') + (r.penjaga_baru ? ' · penjaga: ' + r.penjaga_baru : '');
      case 'pinjaman': return (r.nama || r.owner_name || '') + ' · ' + (r.tarikh_pinjam || '') + ' hingga ' + (r.tarikh_pulang || '');
      case 'aduanaset': return cut(r.keterangan_kerosakan);
      case 'selenggara': return en('jenis_selenggara', 'jenisSelenggara') + ' · ' + cut(r.butiran_kerja) + (Number(r.kos) > 0 ? ' · RM' + Number(r.kos).toFixed(2) : '');
      case 'pemeriksaan': return en('keberadaan', 'keberadaan') + ' · ' + en('keadaan', 'keadaan') + (r.pemeriksa ? ' · ' + r.pemeriksa : '');
      case 'penilaian': return (r.skor_keseluruhan !== '' && r.skor_keseluruhan !== undefined ? r.skor_keseluruhan + '% · ' : '') + en('keputusan', 'keputusan') + (Number(r.nilai_semasa) > 0 ? ' · RM' + Number(r.nilai_semasa).toFixed(2) : '');
      case 'pelupusan': return en('sebab', 'sebab') + (r.kaedah ? ' · ' + en('kaedah', 'kaedah') : '');
      case 'kehilangan': return cut(r.lokasi_kehilangan);
      case 'tiket': return cut(r.tajuk);
      default: return '';
    }
  },

  /** Sejarah satu aset merentas modul kitar hayat + tiket Helpdesk (ikut no. aset). ADMIN sahaja. */
  history: function (payload) {
    const a = AsetLink.byId(payload && payload.id);
    if (!a) throw Errors.notFound('Aset');
    const items = [];
    const counts = {};
    AsetLink.MODULES.concat(['tiket']).forEach(function (key) {
      let def;
      try { def = CrudEngine.get(key); } catch (e) { return; }
      const n = AsetLink.norm(a.no_aset);
      CrudEngine.repo(def).all().forEach(function (r) {
        if (r.state !== 'ACTIVE') return;
        if (key === 'tiket' ? AsetLink.norm(r.no_aset) !== n || !n : r.aset !== a.id) return;
        counts[key] = (counts[key] || 0) + 1;
        const tarikh = String(r[AsetLink.DATE_COL[key]] || r.created_at || '').slice(0, 10);
        items.push({
          module: key, modul: def.label, id: r.id, refNo: r.ref_no || r.id, status: r.status, statusLabel: CrudEngine.statusLabel(def, r.status),
          tone: ((def.statuses || []).filter(function (s) { return s.value === r.status; })[0] || {}).tone || 'muted',
          tarikh: tarikh, dicipta: r.created_at, ringkasan: AsetLink.summaryOf_(key, r)
        });
      });
    });
    items.sort(function (x, y) { return (y.tarikh + y.dicipta) < (x.tarikh + x.dicipta) ? -1 : 1; });
    return { aset: { id: a.id, noAset: a.no_aset, label: AsetLink.label(a), status: a.status }, counts: counts, items: items.slice(0, 200) };
  },

  /** Ringkasan kitar hayat untuk Executive Overview (kiraan sahaja, tiada data peribadi). */
  summary: function () {
    const today = AsetLink.today();
    const soon = DateUtils.dayKey(DateUtils.addDays(new Date(), 30));
    const y = today.slice(0, 4);
    const rows = function (key) {
      try { return CrudEngine.repo(CrudEngine.get(key)).all().filter(function (r) { return r.state === 'ACTIVE'; }); } catch (e) { return []; }
    };
    const pin = rows('pinjaman');
    const adu = rows('aduanaset');
    const sel = rows('selenggara');
    const pel = rows('pelupusan');
    const hil = rows('kehilangan');
    const per = rows('pergerakan');
    const pem = rows('pemeriksaan');
    const pen = rows('penilaian');
    const assets = rows('aset').filter(function (a) { return !AsetLink.isGone(a); });
    const thisYear = function (list, col) { return list.filter(function (r) { return String(r[col] || r.created_at || '').slice(0, 4) === y; }).length; };
    const sum = function (list, col) { return Math.round(list.reduce(function (s, r) { return s + (Number(r[col]) || 0); }, 0) * 100) / 100; };
    const selesaiTahunIni = sel.filter(function (r) { return r.status === 'SELESAI' && String(r.tarikh_selenggara || '').slice(0, 4) === y; });
    return {
      pinjaman: {
        dimohon: pin.filter(function (r) { return r.status === 'DIMOHON'; }).length,
        dipinjam: pin.filter(function (r) { return r.status === 'DIPINJAM'; }).length,
        lewat: pin.filter(function (r) { return r.status === 'DIPINJAM' && r.tarikh_pulang && String(r.tarikh_pulang) < today; }).length,
        bolehDipinjam: assets.filter(function (a) { return AsetLink.isTrue(a.boleh_dipinjam); }).length
      },
      aduan: {
        terbuka: adu.filter(function (r) { return AduanasetHooks.OPEN.indexOf(r.status) >= 0; }).length,
        tahunIni: thisYear(adu, 'tarikh_kerosakan'),
        tidakEkonomi: adu.filter(function (r) { return r.status === 'TIDAK_EKONOMI'; }).length
      },
      selenggara: {
        dijadualkan: sel.filter(function (r) { return r.status === 'DIJADUALKAN'; }).length,
        lewat: sel.filter(function (r) { return r.status === 'DIJADUALKAN' && String(r.tarikh_selenggara || '') < today; }).length,
        selesaiTahunIni: selesaiTahunIni.length,
        kosTahunIni: sum(selesaiTahunIni, 'kos'),
        asetPerluSelenggara: assets.filter(function (a) { return a.tarikh_selenggara_seterusnya && String(a.tarikh_selenggara_seterusnya) <= soon; }).length
      },
      pergerakan: { terbuka: per.filter(function (r) { return PergerakanHooks.OPEN.indexOf(r.status) >= 0; }).length, tahunIni: thisYear(per, 'tarikh_pergerakan') },
      pemeriksaan: {
        tahunIni: thisYear(pem, 'tarikh_pemeriksaan'),
        tidakDijumpai: pem.filter(function (r) { return r.keberadaan === 'TIADA' && String(r.tarikh_pemeriksaan || '').slice(0, 4) === y; }).length,
        asetDiperiksaTahunIni: assets.filter(function (a) { return String(a.tarikh_semakan || '').slice(0, 4) === y; }).length,
        jumlahAset: assets.length
      },
      penilaian: { tahunIni: thisYear(pen, 'tarikh_penilaian'), cadangLupus: assets.filter(function (a) { return a.cadangan === 'LUPUS'; }).length },
      pelupusan: {
        dalamProses: pel.filter(function (r) { return PelupusanHooks.OPEN.indexOf(r.status) >= 0; }).length,
        dilupusTahunIni: pel.filter(function (r) { return r.status === 'DILUPUSKAN' && String(r.tarikh_lupus || '').slice(0, 4) === y; }).length,
        hasilTahunIni: sum(pel.filter(function (r) { return r.status === 'DILUPUSKAN' && String(r.tarikh_lupus || '').slice(0, 4) === y; }), 'hasil_pelupusan')
      },
      kehilangan: {
        terbuka: hil.filter(function (r) { return KehilanganHooks.OPEN.indexOf(r.status) >= 0; }).length,
        hapusKiraTahunIni: hil.filter(function (r) { return r.status === 'HAPUS_KIRA' && String(r.status_changed_at || '').slice(0, 4) === y; }).length,
        nilaiTerbuka: sum(hil.filter(function (r) { return KehilanganHooks.OPEN.indexOf(r.status) >= 0; }), 'nilai_kehilangan')
      }
    };
  }
};
