/**
 * @file AsetTrend.gs
 * Ringkasan bulanan aset IT (sheet RINGKASAN_BULANAN) + email ringkasan awal bulan.
 *   - daily(): dipanggil oleh AsetHooks.maintenance setiap hari. Kemas kini baris bulan semasa;
 *     baris bulan lepas kekal sebagai nilai akhir bulan itu.
 *   - Pada larian pertama bulan baharu, ringkasan bulan lepas diemelkan kepada Pengurusan & Admin
 *     (tetapan EMAIL_RINGKASAN_BULANAN) sekali sahaja (lajur emel_dihantar_pada).
 */
const AsetTrend = {
  MONTHS: ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'],
  NUM: ['aset', 'beroperasi_pct', 'nilai_kos', 'nilai_buku', 'susut_habis', 'ganti_segera', 'ganti_tahun_depan', 'kos_ganti',
    'tiket_baru', 'tiket_selesai', 'tiket_terbuka', 'tiket_lewat', 'sla_pct', 'disahkan_pct', 'lokasi_berbeza', 'makmal', 'makmal_kritikal',
    'indeks_purata', 'tindakan_terbuka', 'tindakan_lewat', 'tindakan_selesai'],

  repo_: function () { return Repo.of('RINGKASAN_BULANAN'); },

  monthLabel: function (key) {
    const p = String(key).split('-');
    return p.length === 2 ? AsetTrend.MONTHS[Number(p[1]) - 1] + ' ' + p[0] : String(key);
  },

  /** 'yyyy-MM' sebelum kunci diberi. */
  prevMonth: function (key) {
    const p = String(key).split('-');
    let y = Number(p[0]), m = Number(p[1]) - 1;
    if (m === 0) { m = 12; y--; }
    return y + '-' + (m < 10 ? '0' + m : String(m));
  },

  /**
   * Bina baris ringkasan daripada Laporan Eksekutif (elak kiraan berganda).
   * @param {Object} e hasil AsetHooks.reportExecutive
   */
  fromExec: function (e, month) {
    const r = e.ringkasan;
    const tickets = AsetHooks.active_('tiket');
    const baru = tickets.filter(function (t) { return DateUtils.monthKey(t.created_at) === month; }).length;
    const done = tickets.filter(function (t) { return t.selesai_pada && DateUtils.monthKey(t.selesai_pada) === month; });
    const withTarget = done.filter(function (t) { return t.tarikh_sasaran; });
    const ok = withTarget.filter(function (t) { return String(t.selesai_pada) <= String(t.tarikh_sasaran); }).length;
    const labs = e.makmal || [];
    const t = e.tindakan || null;
    const r1 = function (x) { return x === null || x === undefined ? null : Math.round(x * 10) / 10; };
    return {
      bulan: month, aset: r.aset, beroperasi_pct: r.beroperasiPct, nilai_kos: r.nilaiPerolehan, nilai_buku: r.nilaiBuku, susut_habis: r.susutHabis,
      ganti_segera: r.gantiSegera, ganti_tahun_depan: r.gantiTahunDepan, kos_ganti: Math.round(r.kosGanti * 100) / 100,
      tiket_baru: baru, tiket_selesai: done.length, tiket_terbuka: r.tiketTerbuka, tiket_lewat: r.tiketLewat,
      sla_pct: withTarget.length ? r1((ok / withTarget.length) * 100) : null,
      disahkan_pct: r.disahkanPct, lokasi_berbeza: r.lokasiBerbeza, makmal: labs.length,
      makmal_kritikal: labs.filter(function (l) { return l.tahap === 'KRITIKAL'; }).length,
      indeks_purata: labs.length ? r1(labs.reduce(function (s, l) { return s + l.skor; }, 0) / labs.length) : null,
      tindakan_terbuka: t ? t.jumlah.terbuka : null, tindakan_lewat: t ? t.jumlah.lewat : null, tindakan_selesai: t ? t.jumlah.selesaiBulanIni : null
    };
  },

  compute: function (now) {
    const month = DateUtils.monthKey(now || new Date());
    return AsetTrend.fromExec(AsetHooks.reportExecutive({ skipTrend: true }), month);
  },

  /** Simpan / kemas kini baris bulan semasa. */
  capture: function (now) {
    const row = AsetTrend.compute(now);
    const repo = AsetTrend.repo_();
    const ts = DateUtils.nowIso();
    const store = {};
    Object.keys(row).forEach(function (k) { store[k] = row[k] === null || row[k] === undefined ? '' : String(row[k]); });
    store.updated_at = ts;
    if (repo.findById(row.bulan)) repo.update(row.bulan, store);
    else repo.insert(Object.assign(store, { emel_dihantar_pada: '', created_at: ts }));
    return row;
  },

  /** Baris tersimpan → objek nombor (camelCase). */
  out_: function (row) {
    const o = { bulan: row.bulan, label: AsetTrend.monthLabel(row.bulan), emelDihantarPada: row.emel_dihantar_pada || '' };
    AsetTrend.NUM.forEach(function (k) {
      const v = row[k];
      const n = Number(v);
      o[k.replace(/_([a-z])/g, function (m, c) { return c.toUpperCase(); })] = v === '' || v === null || v === undefined || !isFinite(n) ? null : n;
    });
    return o;
  },

  /** Baris tersimpan (menaik), tidak termasuk bulan `exclude`. */
  history: function (n, exclude) {
    return AsetTrend.repo_().all().filter(function (r) { return r.bulan && r.bulan !== exclude; })
      .sort(function (a, b) { return a.bulan < b.bulan ? -1 : 1; })
      .slice(-(n || 12)).map(AsetTrend.out_);
  },

  /** Trend N bulan: sejarah tersimpan + nilai langsung bulan semasa. */
  trend: function (payload) {
    const n = Math.max(2, Math.min(36, Number(payload && payload.bulan) || 12));
    const month = DateUtils.monthKey(new Date());
    const live = AsetTrend.out_(Object.assign({}, AsetTrend.compute(new Date())));
    const items = AsetTrend.history(n - 1, month).concat([live]);
    return {
      generatedAt: DateUtils.nowIso(), bulanSemasa: month, items: items,
      emelAktif: !!AsetTrend.setting_('EMAIL_RINGKASAN_BULANAN', true)
    };
  },

  setting_: function (k, d) {
    try { const v = SettingsService.get(k); return v === undefined || v === null ? d : v; } catch (e) { return d; }
  },

  /** Kerja harian: segerak tindakan KEWPA, simpan ringkasan, hantar email bulan lepas sekali. */
  daily: function () {
    const out = {};
    if (typeof TindakanHooks !== 'undefined') {
      try { out.tindakan = TindakanHooks.sync(null); } catch (e) { out.tindakan = 'ralat'; ErrorHandler.record(e, { action: 'tindakan.sync' }); }
    }
    const row = AsetTrend.capture(new Date());
    out.bulan = row.bulan;
    const prev = AsetTrend.repo_().findById(AsetTrend.prevMonth(row.bulan));
    if (prev && !prev.emel_dihantar_pada && AsetTrend.setting_('EMAIL_RINGKASAN_BULANAN', true)) {
      out.emel = AsetTrend.send(prev.bulan, { tandakan: true });
    }
    return out;
  },

  /** Senarai penerima: Pengurusan + Admin aktif, dan email tambahan dalam Tetapan. */
  recipients: function () {
    const roles = [ROLES.PENGURUSAN, ROLES.ADMIN, ROLES.SUPER_ADMIN];
    const seen = {};
    const out = [];
    UserRepository.all().forEach(function (u) {
      const em = String(u.email || '').trim().toLowerCase();
      if (!em || seen[em] || u.status !== USER_STATUS.ACTIVE || roles.indexOf(u.role) < 0) return;
      seen[em] = true;
      out.push({ userId: u.user_id, email: em, role: u.role });
    });
    String(AsetTrend.setting_('EMAIL_RINGKASAN_TAMBAHAN', '') || '').split(/[,;\s]+/).forEach(function (x) {
      const em = x.trim().toLowerCase();
      if (!em || seen[em] || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return;
      seen[em] = true;
      out.push({ userId: '', email: em, role: '' });
    });
    return out;
  },

  /** Baris email (teks biasa; NotificationService.email meng-escape). */
  lines: function (cur, prev) {
    const nf = function (n) { return n === null || n === undefined ? '—' : Math.round(n).toLocaleString('en-US'); };
    const d = function (k, unit, lowerIsBetter) {
      if (!prev || cur[k] === null || prev[k] === null) return '';
      const x = Math.round((cur[k] - prev[k]) * 10) / 10;
      if (!x) return ' (tiada perubahan)';
      return ' (' + (x > 0 ? '+' : '−') + (unit === 'RM' ? 'RM ' + nf(Math.abs(x)) : Math.abs(x).toLocaleString('en-US') + (unit || '')) + ')';
    };
    const L = [
      'Ringkasan aset IT FKM bagi ' + AsetTrend.monthLabel(cur.bulan) + (prev ? ' (perubahan berbanding ' + AsetTrend.monthLabel(prev.bulan) + ' dalam kurungan)' : '') + ':',
      '• Aset IT aktif: ' + nf(cur.aset) + d('aset') + ', ' + (cur.beroperasiPct === null ? '—' : cur.beroperasiPct + '%') + ' beroperasi' + d('beroperasiPct', ' mata %'),
      '• Nilai perolehan: RM ' + nf(cur.nilaiKos) + d('nilaiKos', 'RM') + '; nilai buku: RM ' + nf(cur.nilaiBuku) + d('nilaiBuku', 'RM'),
      '• Komputer perlu diganti: ' + nf(cur.gantiSegera) + ' segera' + d('gantiSegera') + ', ' + nf(cur.gantiTahunDepan) + ' tahun depan' + d('gantiTahunDepan') + ' — anggaran RM ' + nf(cur.kosGanti),
      '• Makmal: ' + nf(cur.makmal) + ' dinilai, ' + nf(cur.makmalKritikal) + ' kritikal' + d('makmalKritikal') + (cur.indeksPurata === null ? '' : ', indeks purata ' + cur.indeksPurata + '/100' + d('indeksPurata')),
      '• Aduan IT: ' + nf(cur.tiketBaru) + ' baharu, ' + nf(cur.tiketSelesai) + ' selesai' + (cur.slaPct === null ? '' : ' (' + cur.slaPct + '% dalam SLA)') + '; ' + nf(cur.tiketTerbuka) + ' masih terbuka, ' + nf(cur.tiketLewat) + ' lewat SLA',
      '• Aset disahkan secara fizikal: ' + (cur.disahkanPct === null ? '—' : cur.disahkanPct + '%') + d('disahkanPct', ' mata %') + '; lokasi berbeza daripada UTMFin: ' + nf(cur.lokasiBerbeza) + d('lokasiBerbeza')
    ];
    if (cur.tindakanTerbuka !== null) L.push('• Tindakan KEWPA: ' + nf(cur.tindakanSelesai) + ' selesai bulan ini; ' + nf(cur.tindakanTerbuka) + ' masih terbuka' + d('tindakanTerbuka') + (cur.tindakanLewat ? ', ' + nf(cur.tindakanLewat) + ' melepasi tarikh sasaran' : ''));
    L.push('Laporan penuh, pelan penggantian dan trend boleh dilihat dalam sistem.');
    return L;
  },

  /**
   * Hantar ringkasan bulan `bulan`.
   * @param {{ujianKepada?:string, tandakan?:boolean}} opts ujianKepada = hantar hanya kepada email ini;
   *   tandakan = rekod emel_dihantar_pada (hanya penghantaran automatik awal bulan)
   */
  send: function (bulan, opts) {
    const o = opts || {};
    const raw = AsetTrend.repo_().findById(bulan);
    if (!raw) throw Errors.notFound();
    const cur = AsetTrend.out_(raw);
    const p = AsetTrend.repo_().findById(AsetTrend.prevMonth(bulan));
    const lines = AsetTrend.lines(cur, p ? AsetTrend.out_(p) : null);
    const subject = 'Ringkasan aset IT ' + AsetTrend.monthLabel(bulan);
    const pathFor = function (role) { return role === ROLES.PENGURUSAN ? '#/pengurusan?t=trend' : role ? '#/admin/perancangan?t=trend' : '#/'; };
    if (o.ujianKepada) {
      const okT = NotificationService.email(o.ujianKepada, subject + ' (ujian)', lines, { force: true, path: '#/admin/perancangan?t=trend' });
      return { penerima: 1, dihantar: okT ? 1 : 0, ujian: true };
    }
    const list = AsetTrend.recipients();
    let sent = 0;
    list.forEach(function (r) {
      if (NotificationService.email(r.email, subject, lines, { force: true, path: pathFor(r.role) })) sent++;
      if (r.userId) NotificationService.notify(r.userId, NOTIF_TYPE.BROADCAST, subject, 'Ringkasan bulanan aset IT telah dijana. Lihat trend dan laporan dalam sistem.', '', pathFor(r.role));
    });
    if (o.tandakan) AsetTrend.repo_().update(bulan, { emel_dihantar_pada: DateUtils.nowIso() });
    return { penerima: list.length, dihantar: sent };
  },

  /** Laluan admin: hantar sekarang (bulan semasa setakat hari ini). */
  sendNow: function (payload, ctx) {
    const row = AsetTrend.capture(new Date());
    const bulan = payload && payload.bulan && /^\d{4}-\d{2}$/.test(payload.bulan) ? payload.bulan : row.bulan;
    if (payload && payload.ujian) {
      const em = ctx && ctx.user && ctx.user.email;
      if (!em) throw Errors.validation('Akaun anda tiada email.');
      return AsetTrend.send(bulan, { ujianKepada: em });
    }
    const res = AsetTrend.send(bulan, {});
    AuditService.log(ctx, AUDIT_ACTIONS.RECORD_STATUS, 'RINGKASAN_BULANAN', bulan, 'Email ringkasan bulanan dihantar kepada ' + res.dihantar + ' penerima');
    return res;
  }
};
