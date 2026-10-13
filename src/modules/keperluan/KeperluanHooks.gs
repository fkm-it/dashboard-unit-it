/**
 * @file KeperluanHooks.gs
 * Banci & keperluan komputer makmal.
 *
 * Pengiraan (dokumen spesifikasi §9, dibezakan supaya tiada pengiraan berganda):
 *   kekal     = berfungsi − tidakSesuai + rosakBolehBaiki      (komputer sesuai yang dikekalkan selepas dibaiki)
 *   ganti     = tidakSesuai + rosakLupus                         (diganti satu-satu)
 *   tambahan  = max(0, sasaranJumlah − kekal − ganti)            (kapasiti tambahan)
 *   kos       = (ganti + tambahan) × hargaSeunit
 * Kekangan: berfungsi + rosakBolehBaiki + rosakLupus = jumlahSediaAda; tidakSesuai ≤ berfungsi.
 * Satu rekod aktif (bukan Ditolak) bagi setiap makmal bagi setiap tahun (makmal sedia ada ATAU makmal baharu ikut nama).
 *
 * Borang awam (link dikongsi, tanpa log masuk): #/banci-makmal
 *   - pemohon kenal pasti diri (nama, no. staf, email domain KEPERLUAN_DOMAIN_EMAIL)
 *   - selepas hantar, link edit peribadi diemel (token rawak; hanya hash disimpan dalam PAUTAN_EDIT)
 *   - link boleh mengemas kini semasa Dihantar / Dikembalikan; selepas itu baca sahaja (maks. 180 hari);
 *     link baharu (yang lama dibatalkan) dihantar apabila dikembalikan atau diminta semula
 *   - makmal baharu: didaftarkan automatik dalam modul Makmal apabila Unit IT mengesahkan permohonan
 */
const KeperluanHooks = {
  /** Nilai gabungan (data baharu, jika tiada guna rekod semasa). @return {Object} nombor */
  merged_: function (data, cur) {
    const c = cur || {};
    const pick = function (k, col) {
      const v = data[k] !== undefined && data[k] !== null && data[k] !== '' ? data[k] : c[col];
      const n = Number(v);
      return isFinite(n) ? n : 0;
    };
    return {
      sediaAda: pick('jumlahSediaAda', 'jumlah_sedia_ada'),
      berfungsi: pick('berfungsi', 'berfungsi'),
      tidakSesuai: pick('tidakSesuai', 'tidak_sesuai'),
      rosakBaiki: pick('rosakBolehBaiki', 'rosak_boleh_baiki'),
      rosakLupus: pick('rosakLupus', 'rosak_lupus'),
      sasaran: pick('sasaranJumlah', 'sasaran_jumlah'),
      harga: pick('hargaSeunit', 'harga_seunit'),
      jenis: String((data.jenisPermohonan !== undefined && data.jenisPermohonan !== '' ? data.jenisPermohonan : c.jenis_permohonan) || ''),
      adaSasaran: (data.sasaranJumlah !== undefined && data.sasaranJumlah !== null && data.sasaranJumlah !== '') || (c.sasaran_jumlah !== undefined && c.sasaran_jumlah !== null && c.sasaran_jumlah !== '')
    };
  },

  /** Kiraan tulen (diuji terus). */
  /**
   * Kiraan tulen (diuji terus). n.jenis: GANTI | TAMBAH | GANTI_TAMBAH | TIADA (kosong = GANTI_TAMBAH, rekod lama).
   * Penggantian dan penambahan dikira berasingan supaya rumusan fakulti tidak mencampurkan kedua-duanya.
   */
  compute: function (n) {
    const jenis = n.jenis || 'GANTI_TAMBAH';
    const kekal = n.berfungsi - n.tidakSesuai + n.rosakBaiki;
    const gantiCalon = n.tidakSesuai + n.rosakLupus;
    const tambahCalon = Math.max(0, n.sasaran - kekal - gantiCalon);
    const ganti = jenis === 'GANTI' || jenis === 'GANTI_TAMBAH' ? gantiCalon : 0;
    const tambahan = jenis === 'TAMBAH' || jenis === 'GANTI_TAMBAH' ? tambahCalon : 0;
    const r2 = function (x) { return Math.round(x * 100) / 100; };
    const kosGanti = r2(ganti * (n.harga || 0));
    const kosTambahan = r2(tambahan * (n.harga || 0));
    return { jenis: jenis, kekal: kekal, gantiCalon: gantiCalon, tambahCalon: tambahCalon, ganti: ganti, tambahan: tambahan, kosGanti: kosGanti, kosTambahan: kosTambahan, kos: r2(kosGanti + kosTambahan) };
  },

  /** Jenis permohonan tidak dinyatakan (rekod lama / import) → ikut angka. */
  deriveJenis: function (n) {
    const c = KeperluanHooks.compute(Object.assign({}, n, { jenis: 'GANTI_TAMBAH' }));
    return c.gantiCalon > 0 && c.tambahCalon > 0 ? 'GANTI_TAMBAH' : c.gantiCalon > 0 ? 'GANTI' : c.tambahCalon > 0 ? 'TAMBAH' : 'TIADA';
  },

  JENIS_LABEL: { GANTI: 'Penggantian sahaja', TAMBAH: 'Penambahan sahaja', GANTI_TAMBAH: 'Penggantian dan penambahan', TIADA: 'Tiada permohonan' },

  EDITABLE: ['DIHANTAR', 'DIKEMBALIKAN'],
  /** Wajib dalam borang awam (pengguna log masuk / admin dikenali melalui akaun). */
  PUBLIC_REQUIRED: ['namaPemohon', 'noStaf', 'emailPemohon', 'peranan', 'jenisPermohonan'],
  LINK_DAYS: 180,
  ROUTE: '#/banci-makmal',

  routes: {
    'keperluan.awamGet': { role: 'PUBLIC', fn: function (payload) { return KeperluanHooks.publicGet(payload || {}); } },
    'keperluan.awamKemaskini': { role: 'PUBLIC', fn: function (payload) { return KeperluanHooks.publicUpdate(payload || {}); } },
    'keperluan.awamPautan': { role: 'PUBLIC', fn: function (payload) { return KeperluanHooks.resendLink(payload || {}); } },
    'keperluan.pautanBorang': { role: 'ADMIN', fn: function () { return { url: PushService.baseUrl() + KeperluanHooks.ROUTE, path: KeperluanHooks.ROUTE }; } },
    'keperluan.rumusan': { role: 'PENGURUSAN', fn: function (payload) { return AsetCache.get('keperluan.rumusan', payload, function () { return KeperluanHooks.summary(payload || {}); }); } },
    'keperluan.statusBanci': { role: 'ADMIN', fn: function (payload) { return KeperluanHooks.censusStatus(payload || {}); } },
    'keperluan.emelBanci': { role: 'ADMIN', fn: function (payload, ctx) { return KeperluanHooks.emailCensus(payload || {}, ctx); } }
  },

  // ---------------------------------------------------------------- Rumusan keperluan fakulti

  /**
   * Rumusan seluruh fakulti bagi satu tahun: penggantian dan penambahan dijumlah BERASINGAN.
   * Rekod Ditolak tidak dikira. `disahkan` = hanya rekod Disahkan Unit IT.
   */
  summary: function (payload) {
    const tahun = KeperluanHooks.year_(payload);
    const rows = KeperluanHooks.repo_().all().filter(function (r) { return r.state === 'ACTIVE' && Number(r.tahun) === tahun && r.status !== 'DITOLAK'; });
    const blank = function () { return { makmal: 0, ganti: 0, tambahan: 0, kosGanti: 0, kosTambahan: 0 }; };
    const tot = { semua: blank(), disahkan: blank() };
    const byJenis = {};
    Object.keys(KeperluanHooks.JENIS_LABEL).forEach(function (k) { byJenis[k] = { jenis: k, label: KeperluanHooks.JENIS_LABEL[k], makmal: 0, ganti: 0, tambahan: 0, kos: 0 }; });
    const r2 = function (x) { return Math.round(x * 100) / 100; };
    const items = rows.map(function (r) {
      const j = r.jenis_permohonan || 'GANTI_TAMBAH';
      const g = Number(r.bilangan_ganti) || 0, t = Number(r.bilangan_tambahan) || 0;
      const kg = Number(r.anggaran_kos_ganti) || 0, kt = Number(r.anggaran_kos_tambahan) || 0;
      [tot.semua].concat(r.status === 'DISAHKAN' ? [tot.disahkan] : []).forEach(function (b) {
        b.makmal++; b.ganti += g; b.tambahan += t; b.kosGanti += kg; b.kosTambahan += kt;
      });
      const bj = byJenis[j] || byJenis.GANTI_TAMBAH;
      bj.makmal++; bj.ganti += g; bj.tambahan += t; bj.kos += kg + kt;
      return { id: r.id, refNo: r.ref_no, makmal: r.nama_makmal || '', jenis: j, jenisLabel: KeperluanHooks.JENIS_LABEL[j] || j, ganti: g, tambahan: t,
        kosGanti: r2(kg), kosTambahan: r2(kt), keutamaan: r.keutamaan, status: r.status };
    }).sort(function (a, b) { return a.makmal < b.makmal ? -1 : 1; });
    [tot.semua, tot.disahkan].forEach(function (b) { b.kosGanti = r2(b.kosGanti); b.kosTambahan = r2(b.kosTambahan); b.kos = r2(b.kosGanti + b.kosTambahan); });
    return {
      generatedAt: DateUtils.nowIso(), tahun: tahun, jumlah: tot,
      ikutJenis: Object.keys(byJenis).map(function (k) { const b = byJenis[k]; b.kos = r2(b.kos); return b; }),
      items: items
    };
  },

  // ---------------------------------------------------------------- Jejak banci & hantar link kepada staf makmal

  year_: function (payload) {
    const y = Number(payload && payload.tahun);
    return y >= 2000 && y <= 2100 ? y : Number(DateUtils.format(new Date(), 'yyyy'));
  },

  /** Penerima bagi setiap makmal: staf aktif (terima banci) dengan email; jika tiada, email penyelaras. */
  recipients_: function () {
    const by = {};
    let staf = [];
    try { staf = CrudEngine.repo(CrudEngine.get('staf')).all(); } catch (e) { staf = []; }
    staf.forEach(function (s) {
      if (s.state !== 'ACTIVE' || s.status === 'TIDAK_AKTIF' || !s.makmal || !s.email || String(s.terima_banci).toUpperCase() === 'FALSE') return;
      (by[s.makmal] = by[s.makmal] || []).push({ nama: s.nama, email: String(s.email).toLowerCase() });
    });
    return by;
  },

  /** Status banci tahun semasa bagi setiap makmal aktif. */
  censusStatus: function (payload) {
    const tahun = KeperluanHooks.year_(payload);
    const sub = {};
    KeperluanHooks.repo_().all().forEach(function (r) {
      if (r.state === 'ACTIVE' && r.makmal && Number(r.tahun) === tahun && r.status !== 'DITOLAK') sub[r.makmal] = r;
    });
    const rec = KeperluanHooks.recipients_();
    const items = CrudEngine.repo(CrudEngine.get('makmal')).all().filter(function (l) { return l.state === 'ACTIVE' && l.status !== 'TIDAK_AKTIF'; })
      .map(function (l) {
        const r = sub[l.id];
        const to = rec[l.id] || (l.email_penyelaras ? [{ nama: l.penyelaras, email: String(l.email_penyelaras).toLowerCase() }] : []);
        const unitIt = l.jenis_makmal === 'KOMPUTER';
        return { id: l.id, label: l.kod ? l.kod + ' · ' + l.nama : l.nama, jenis: l.jenis_makmal || '', unitIt: unitIt, dihantar: !!r, refNo: r ? r.ref_no : '', status: r ? r.status : '', penerima: unitIt ? 0 : to.length };
      }).sort(function (a, b) { return (a.dihantar - b.dihantar) || (a.unitIt - b.unitIt) || (a.label < b.label ? -1 : 1); });
    const belum = items.filter(function (i) { return !i.dihantar; });
    return {
      tahun: tahun, items: items, jumlah: items.length, dihantar: items.length - belum.length, belum: belum.length,
      unitIt: belum.filter(function (i) { return i.unitIt; }).length,
      tanpaPenerima: belum.filter(function (i) { return !i.unitIt && !i.penerima; }).length,
      bolehEmel: belum.filter(function (i) { return !i.unitIt && i.penerima; }).length
    };
  },

  /**
   * Emel link borang (makmal dipilih awal) kepada staf makmal yang belum menghantar banci tahun ini.
   * @param {{tahun?:number, makmal?:string[], ujian?:boolean}} payload makmal kosong = semua yang belum hantar
   */
  emailCensus: function (payload, ctx) {
    const st = KeperluanHooks.censusStatus(payload);
    const want = Array.isArray(payload.makmal) && payload.makmal.length ? payload.makmal : null;
    /* Makmal komputer diisi sendiri oleh Unit IT — tidak diemel */
    const labs = st.items.filter(function (i) { return !i.dihantar && !i.unitIt && (!want || want.indexOf(i.id) >= 0); });
    const rec = KeperluanHooks.recipients_();
    const labRows = {};
    CrudEngine.repo(CrudEngine.get('makmal')).all().forEach(function (l) { labRows[l.id] = l; });
    let app = '';
    if (!PushService.baseUrl()) { try { app = ScriptApp.getService().getUrl() || ''; } catch (e) { app = ''; } }
    const lines = function (lab, nama) {
      const L = ['Salam ' + (nama || 'tuan/puan') + ',',
        'Unit IT FKM sedang menjalankan Penilaian Keperluan ICT Makmal bagi tahun ' + st.tahun + ' untuk menilai status dan keperluan ICT setiap makmal (banci komputer sedia ada serta permohonan penggantian/tambahan).',
        'Mohon isi satu borang bagi ' + lab.label + ' melalui butang di bawah. Log masuk tidak diperlukan; gunakan email rasmi UTM. Selepas dihantar, link untuk mengemas kini borang akan diemel kepada anda.',
        'Jika makmal anda tiada komputer, isi jumlah sedia ada 0 dan nyatakan keperluan (jika ada). Terima kasih.'];
      if (app) L.push('Link borang: ' + app + path(lab.id));
      return L;
    };
    const path = function (id) { return KeperluanHooks.ROUTE + '?makmal=' + encodeURIComponent(id); };
    const subject = 'Penilaian Keperluan ICT Makmal ' + st.tahun;
    if (payload.ujian) {
      const em = ctx && ctx.user && ctx.user.email;
      if (!em) throw Errors.validation('Akaun anda tiada email.');
      const lab = labs[0] || st.items[0];
      if (!lab) throw Errors.validation('Tiada makmal aktif.');
      const ok = NotificationService.email(em, subject + ' (ujian) — ' + lab.label, lines(lab, (ctx.user && ctx.user.full_name) || ''), { force: true, path: path(lab.id) });
      return { ujian: true, makmal: 1, penerima: 1, dihantar: ok ? 1 : 0 };
    }
    let penerima = 0, sent = 0;
    const tanpa = [];
    labs.forEach(function (lab) {
      const l = labRows[lab.id] || {};
      const to = rec[lab.id] || (l.email_penyelaras ? [{ nama: l.penyelaras, email: String(l.email_penyelaras).toLowerCase() }] : []);
      if (!to.length) { tanpa.push(lab.label); return; }
      to.forEach(function (r) {
        penerima++;
        if (NotificationService.email(r.email, subject + ' — ' + lab.label, lines(lab, r.nama), { force: true, path: path(lab.id) })) sent++;
      });
    });
    AuditService.log(ctx, AUDIT_ACTIONS.RECORD_STATUS, KeperluanHooks.def_().sheet, '', 'Link banci ' + st.tahun + ' diemel: ' + labs.length + ' makmal, ' + sent + ' penerima');
    return { makmal: labs.length - tanpa.length, penerima: penerima, dihantar: sent, tanpaPenerima: tanpa };
  },

  def_: function () { return CrudEngine.get('keperluan'); },
  repo_: function () { return CrudEngine.repo(KeperluanHooks.def_()); },
  norm_: function (s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); },

  /** Email dalam domain dibenarkan (subdomain diterima). Tetapan '*' = semua domain. */
  emailAllowed: function (email) {
    let cfg;
    try { cfg = SettingsService.get('KEPERLUAN_DOMAIN_EMAIL'); } catch (e) { cfg = 'utm.my'; }
    const domains = String(cfg === undefined || cfg === null ? 'utm.my' : cfg).split(/[,;\s]+/).map(function (d) { return d.trim().toLowerCase().replace(/^@/, ''); }).filter(String);
    if (!domains.length || domains.indexOf('*') >= 0) return true;
    const host = String(email || '').toLowerCase().split('@')[1] || '';
    return domains.some(function (d) { return host === d || host.slice(-(d.length + 1)) === '.' + d; });
  },

  validate: function (data, info) {
    const cur = info.current || {};
    if (info.mode === 'public') {
      const miss = {};
      KeperluanHooks.PUBLIC_REQUIRED.forEach(function (k) { if (!String(data[k] === undefined || data[k] === null ? '' : data[k]).trim()) miss[k] = 'Diperlukan.'; });
      if (Object.keys(miss).length) throw Errors.validation(miss.jenisPermohonan && Object.keys(miss).length === 1 ? 'Pilih jenis permohonan.' : 'Lengkapkan maklumat yang diperlukan.', miss);
    }
    if (info.mode === 'public' && data.emailPemohon && !KeperluanHooks.emailAllowed(data.emailPemohon)) {
      let cfg = 'utm.my';
      try { cfg = SettingsService.get('KEPERLUAN_DOMAIN_EMAIL') || cfg; } catch (e) { /* lalai */ }
      throw Errors.validation('Gunakan email rasmi (' + cfg + ').', { emailPemohon: 'Gunakan email rasmi (' + cfg + ').' });
    }
    const makmalId = data.makmal !== undefined ? data.makmal : cur.makmal;
    const baru = String((data.namaMakmalBaru !== undefined ? data.namaMakmalBaru : cur.nama_makmal_baru) || '').trim();
    if (!makmalId && !baru) {
      throw Errors.validation('Pilih makmal, atau isi nama makmal baharu.', { makmal: 'Pilih makmal atau isi nama makmal baharu.', namaMakmalBaru: 'Isi jika makmal tiada dalam senarai.' });
    }
    const n = KeperluanHooks.merged_(data, cur);
    if (n.berfungsi + n.rosakBaiki + n.rosakLupus !== n.sediaAda) {
      throw Errors.validation('Berfungsi + rosak (boleh dibaiki) + rosak (tidak ekonomi) mesti sama dengan jumlah sedia ada (' + n.sediaAda + ').',
        { berfungsi: 'Jumlah mengikut status tidak sepadan dengan jumlah sedia ada.' });
    }
    if (n.tidakSesuai > n.berfungsi) {
      throw Errors.validation('Komputer tidak sesuai tidak boleh melebihi komputer berfungsi.', { tidakSesuai: 'Melebihi bilangan berfungsi.' });
    }
    /* Jenis permohonan mesti selaras dengan angka (rumusan fakulti tidak bercampur) */
    const j = n.jenis || KeperluanHooks.deriveJenis(n);
    const cc = KeperluanHooks.compute(Object.assign({}, n, { jenis: j }));
    const wantTambah = j === 'TAMBAH' || j === 'GANTI_TAMBAH';
    const wantGanti = j === 'GANTI' || j === 'GANTI_TAMBAH';
    if (wantTambah && !n.adaSasaran) {
      throw Errors.validation('Isi jumlah komputer diperlukan untuk permohonan penambahan.', { sasaranJumlah: 'Wajib untuk penambahan.' });
    }
    if (wantGanti && cc.gantiCalon < 1) {
      throw Errors.validation('Permohonan penggantian memerlukan sekurang-kurangnya satu komputer "tidak lagi sesuai" atau "rosak tidak ekonomi". Pilih "Penambahan sahaja" atau "Tiada permohonan" jika tiada.',
        { jenisPermohonan: 'Tiada komputer untuk diganti.', tidakSesuai: 'Isi bilangan yang perlu diganti.' });
    }
    if (wantTambah && cc.tambahCalon < 1) {
      throw Errors.validation('Permohonan penambahan memerlukan jumlah diperlukan melebihi ' + (cc.kekal + cc.gantiCalon) + ' (komputer sedia ada yang dikekalkan dan diganti).',
        { sasaranJumlah: 'Mesti melebihi ' + (cc.kekal + cc.gantiCalon) + '.', jenisPermohonan: 'Tiada penambahan dikira.' });
    }
    const tahun = String(data.tahun || cur.tahun || '');
    if (!tahun) return;
    const key = KeperluanHooks.norm_(baru);
    const dup = KeperluanHooks.repo_().all().filter(function (r) {
      if (r.state !== 'ACTIVE' || r.id === cur.id || String(r.tahun) !== tahun || r.status === 'DITOLAK') return false;
      return makmalId ? r.makmal === makmalId : (!r.makmal && KeperluanHooks.norm_(r.nama_makmal_baru) === key);
    })[0];
    if (dup) {
      throw Errors.conflict('Borang bagi makmal ini untuk tahun ' + tahun + ' telah dihantar (' + dup.ref_no + '). ' +
        (info.mode === 'public' ? 'Gunakan link kemas kini dalam email pemohon, atau hubungi Unit IT FKM.' : 'Sunting rekod sedia ada.'));
    }
  },

  beforeSave: function (row, info) {
    const cur = info.current || {};
    /* Makmal sedia ada dipilih → maklumat makmal baharu tidak relevan */
    const makmalId = row.makmal !== undefined ? row.makmal : cur.makmal;
    if (makmalId) ['nama_makmal_baru', 'bangunan_makmal_baru', 'bilik_makmal_baru', 'jabatan_makmal_baru'].forEach(function (c) { if (cur[c] || row[c]) row[c] = ''; });
    const lab = makmalId ? CrudEngine.repo(CrudEngine.get('makmal')).findById(makmalId) : null;
    const baru = row.nama_makmal_baru !== undefined ? row.nama_makmal_baru : cur.nama_makmal_baru;
    row.nama_makmal = lab ? (lab.kod ? lab.kod + ' · ' + lab.nama : lab.nama) : (baru ? baru + ' (makmal baharu)' : '');
    const merged = Object.assign({}, cur, row);
    const num = function (c) { return Number(merged[c]) || 0; };
    if (!merged.jenis_permohonan) {
      row.jenis_permohonan = merged.jenis_permohonan = KeperluanHooks.deriveJenis({
        berfungsi: num('berfungsi'), tidakSesuai: num('tidak_sesuai'), rosakBaiki: num('rosak_boleh_baiki'), rosakLupus: num('rosak_lupus'), sasaran: num('sasaran_jumlah'), harga: 0
      });
    }
    /* Tiada penambahan → jumlah diperlukan = jumlah sedia ada (jika tidak diisi) */
    if ((merged.sasaran_jumlah === '' || merged.sasaran_jumlah === null || merged.sasaran_jumlah === undefined) && merged.jenis_permohonan !== 'TAMBAH' && merged.jenis_permohonan !== 'GANTI_TAMBAH') {
      row.sasaran_jumlah = merged.sasaran_jumlah = Number(merged.jumlah_sedia_ada) || 0;
    }
    const c = KeperluanHooks.compute({
      jenis: merged.jenis_permohonan,
      berfungsi: Number(merged.berfungsi) || 0,
      tidakSesuai: Number(merged.tidak_sesuai) || 0,
      rosakBaiki: Number(merged.rosak_boleh_baiki) || 0,
      rosakLupus: Number(merged.rosak_lupus) || 0,
      sasaran: Number(merged.sasaran_jumlah) || 0,
      harga: Number(merged.harga_seunit) || 0
    });
    row.bilangan_ganti = c.ganti;
    row.bilangan_tambahan = c.tambahan;
    row.anggaran_kos_ganti = c.kosGanti;
    row.anggaran_kos_tambahan = c.kosTambahan;
    row.anggaran_kos = c.kos;
  },

  afterCreate: function (row) {
    if (row.owner_user_id || !row.email_pemohon) return;
    KeperluanHooks.sendLink_(row, 'Borang anda telah diterima oleh Unit IT FKM.');
  },

  /**
   * Selepas status: makmal baharu didaftarkan apabila disahkan; pemohon awam dimaklumkan
   * (dikembalikan → link kemas kini baharu).
   */
  afterStatus: function (row, prev, ctx) {
    if (row.status === 'DISAHKAN' && !row.makmal && row.nama_makmal_baru) {
      try { KeperluanHooks.registerLab_(row, ctx); } catch (e) { ErrorHandler.record(e, { action: 'keperluan.registerLab' }); }
    }
    if (row.owner_user_id || !row.email_pemohon || prev === row.status) return;
    const label = CrudEngine.statusLabel(KeperluanHooks.def_(), row.status);
    const lines = ['Salam ' + (row.nama_pemohon || '') + ',', 'Status borang Penilaian Keperluan ICT Makmal ' + row.ref_no + ' (' + (row.nama_makmal || '') + ', ' + row.tahun + '): ' + label + '.'];
    if (row.status_note) lines.push('Catatan Unit IT: ' + StringUtils.truncate(row.status_note, 400));
    if (row.status === 'DIKEMBALIKAN') KeperluanHooks.sendLink_(row, lines.join('\n'));
    else NotificationService.email(row.email_pemohon, 'Borang ' + row.ref_no + ': ' + label, lines, { force: true, path: '#/' });
  },

  /** Daftar makmal baharu daripada permohonan yang disahkan, kemudian pautkan. */
  registerLab_: function (row, ctx) {
    const labs = CrudEngine.repo(CrudEngine.get('makmal')).all().filter(function (l) { return l.state === 'ACTIVE'; });
    const key = KeperluanHooks.norm_(row.nama_makmal_baru);
    let lab = labs.filter(function (l) { return KeperluanHooks.norm_(l.nama) === key; })[0];
    if (!lab) {
      const used = {};
      labs.forEach(function (l) { used[String(l.kod).toUpperCase()] = true; });
      let kod = String(row.bilik_makmal_baru || '').trim() ? (String(row.bangunan_makmal_baru || '').trim() + ' ' + String(row.bilik_makmal_baru).trim()).trim().toUpperCase().replace(/\s+/g, '-').slice(0, 30) : '';
      if (!kod || used[kod]) { let i = 1; while (used['BARU-' + i]) i++; kod = 'BARU-' + i; }
      const dto = CrudEngine.insert(CrudEngine.get('makmal'), ctx, {
        kod: kod, nama: row.nama_makmal_baru, bangunan: row.bangunan_makmal_baru || '', bilik: row.bilik_makmal_baru || '',
        jabatan: row.jabatan_makmal_baru || '', penyelaras: row.nama_pemohon || '', emailPenyelaras: row.email_pemohon || '',
        kapasiti: Number(row.sasaran_jumlah) || 0, catatan: 'Didaftarkan daripada borang keperluan ' + row.ref_no + '.'
      }, 'create', { userId: ctx.userId, name: (ctx.user && ctx.user.full_name) || '' });
      lab = { id: dto.id, kod: kod, nama: row.nama_makmal_baru };
    }
    const patch = { makmal: lab.id, nama_makmal: (lab.kod ? lab.kod + ' · ' : '') + lab.nama, updated_at: DateUtils.nowIso() };
    KeperluanHooks.repo_().update(row.id, patch);
    Object.assign(row, patch);
  },

  // ---------------------------------------------------------------- Link edit peribadi

  links_: function () { return Repo.of('PAUTAN_EDIT'); },

  revokeLinks_: function (recordId) {
    const now = DateUtils.nowIso();
    const patch = {};
    KeperluanHooks.links_().all().forEach(function (l) { if (l.record_id === recordId && !l.revoked_at) patch[l.token_hash] = { revoked_at: now }; });
    if (Object.keys(patch).length) KeperluanHooks.links_().updateMany(patch);
  },

  /** Jana token baharu (yang lama dibatalkan) dan emelkan link. @return {string} token (untuk ujian) */
  sendLink_: function (row, intro) {
    KeperluanHooks.revokeLinks_(row.id);
    const token = SecurityUtils.randomToken();
    const now = new Date();
    KeperluanHooks.links_().insert({
      token_hash: SecurityUtils.sha256Hex(token), modul: 'keperluan', record_id: row.id, email: row.email_pemohon,
      created_at: now.toISOString(), expires_at: DateUtils.addDays(now, KeperluanHooks.LINK_DAYS).toISOString(), revoked_at: '', used_at: ''
    });
    const lines = String(intro || '').split('\n').concat([
      'No. rujukan: ' + row.ref_no + ' · ' + (row.nama_makmal || '') + ' · tahun ' + row.tahun + '.',
      'Gunakan butang di bawah untuk melihat atau mengemas kini borang ini. Link ini peribadi, jangan kongsikan. Ia sah sehingga borang disahkan oleh Unit IT.'
    ]);
    if (!PushService.baseUrl()) {
      /* Tiada URL GitHub Pages → butang tidak dijana; sertakan link web app Apps Script sebagai teks */
      let app = '';
      try { app = ScriptApp.getService().getUrl() || ''; } catch (e) { app = ''; }
      if (app) lines.push('Link kemas kini: ' + app + KeperluanHooks.ROUTE + '?t=' + token);
    }
    NotificationService.email(row.email_pemohon, 'Borang Penilaian Keperluan ICT Makmal ' + row.ref_no, lines, { force: true, path: KeperluanHooks.ROUTE + '?t=' + token });
    KeperluanHooks.lastToken_ = token;
    return token;
  },

  /** Rekod bagi token sah. @return {Object} baris keperluan */
  byToken_: function (token) {
    if (!SecurityUtils.isTokenFormat(token)) throw Errors.notFound('Link');
    const l = KeperluanHooks.links_().findById(SecurityUtils.sha256Hex(token));
    if (!l || l.revoked_at || String(l.expires_at) < DateUtils.nowIso()) throw Errors.notFound('Link');
    const row = KeperluanHooks.repo_().findById(l.record_id);
    if (!row || row.state !== 'ACTIVE') throw Errors.notFound('Link');
    return row;
  },

  /** Medan yang dipaparkan / boleh dikemas kini melalui link awam. */
  publicFields_: function () {
    return KeperluanHooks.def_().fields.filter(function (f) { return f.public !== false && !f.adminOnly && !f.readonly; });
  },

  publicGet: function (payload) {
    SecurityService.rateLimit('keperluan.awam', String(payload.t || '').slice(0, 12));
    const row = KeperluanHooks.byToken_(payload.t);
    const def = KeperluanHooks.def_();
    const values = {};
    KeperluanHooks.publicFields_().forEach(function (f) {
      let v = row[f.column];
      if ((f.type === 'int' || f.type === 'number') && v !== '' && v !== null && v !== undefined) v = Number(v);
      values[f.key] = v === undefined || v === null ? '' : v;
    });
    return {
      refNo: row.ref_no, status: row.status, statusLabel: CrudEngine.statusLabel(def, row.status), statusNote: row.status_note || '',
      catatanIt: row.catatan_it || '', canEdit: KeperluanHooks.EDITABLE.indexOf(row.status) >= 0, namaMakmal: row.nama_makmal,
      values: values, computed: { ganti: Number(row.bilangan_ganti) || 0, tambahan: Number(row.bilangan_tambahan) || 0, kos: Number(row.anggaran_kos) || 0,
        kosGanti: Number(row.anggaran_kos_ganti) || 0, kosTambahan: Number(row.anggaran_kos_tambahan) || 0, jenis: row.jenis_permohonan || 'GANTI_TAMBAH' },
      updatedAt: row.updated_at
    };
  },

  publicUpdate: function (payload) {
    SecurityService.rateLimit('keperluan.awam', String(payload.t || '').slice(0, 12));
    const cur = KeperluanHooks.byToken_(payload.t);
    if (KeperluanHooks.EDITABLE.indexOf(cur.status) < 0) throw Errors.forbidden('Borang ini telah diproses oleh Unit IT dan tidak boleh dikemas kini lagi.');
    const def = KeperluanHooks.def_();
    const ctx = { userId: '', role: ROLES.PUBLIC, user: null };
    /* Makmal, tahun & email pemohon dikunci; nilai lain dihantar penuh oleh borang */
    const src = Object.assign({}, payload, {
      makmal: cur.makmal || '', tahun: Number(cur.tahun), emailPemohon: cur.email_pemohon, namaMakmalBaru: cur.makmal ? '' : cur.nama_makmal_baru,
      jenisPermohonan: payload.jenisPermohonan || cur.jenis_permohonan || ''
    });
    delete src.t;
    const v = CrudEngine.validate(def, src, ctx, 'public');
    KeperluanHooks.validate(v.data, { ctx: ctx, mode: 'public', current: cur });
    const patch = v.row;
    delete patch.makmal; delete patch.tahun; delete patch.email_pemohon; delete patch.nama_makmal_baru;
    KeperluanHooks.beforeSave(patch, { ctx: ctx, mode: 'update', current: cur });
    const now = DateUtils.nowIso();
    patch.updated_at = now;
    const wasReturned = cur.status === 'DIKEMBALIKAN';
    if (wasReturned) Object.assign(patch, { status: 'DIHANTAR', status_note: 'Dikemas kini oleh pemohon selepas dikembalikan.', status_changed_at: now, status_changed_by: cur.nama_pemohon || 'Pemohon' });
    const updated = KeperluanHooks.repo_().update(cur.id, patch);
    AppCache.remove('stats:admin');
    AuditService.log({ role: ROLES.PUBLIC }, AUDIT_ACTIONS.RECORD_UPDATED, def.sheet, cur.id, cur.ref_no + ' · dikemas kini melalui link pemohon');
    NotificationService.notifyAdmins(NOTIF_TYPE.RECORD_STATUS, def.label + ' ' + cur.ref_no + ' dikemas kini',
      (cur.nama_pemohon || 'Pemohon') + ' mengemas kini borang' + (wasReturned ? ' yang dikembalikan (kini Dihantar semula).' : '.'), cur.id, '#/admin' + def.path + '/' + cur.id);
    return KeperluanHooks.publicGet({ t: payload.t, _row: updated });
  },

  /** Hantar semula link (lupa / hilang email). Jawapan sentiasa sama — tiada pendedahan. */
  resendLink: function (payload) {
    const data = Validator.validate(payload, {
      refNo: { type: 'string', required: true, max: 40, label: 'No. rujukan' },
      email: { type: 'email', required: true, label: 'Email' }
    });
    SecurityService.rateLimit('keperluan.pautan.global', 'all');
    SecurityService.rateLimit('keperluan.pautan', data.email);
    const ref = String(data.refNo).trim().toUpperCase();
    const row = KeperluanHooks.repo_().all().filter(function (r) { return r.state === 'ACTIVE' && String(r.ref_no).toUpperCase() === ref; })[0];
    if (row && !row.owner_user_id && String(row.email_pemohon).toLowerCase() === String(data.email).toLowerCase() && KeperluanHooks.EDITABLE.indexOf(row.status) >= 0) {
      KeperluanHooks.sendLink_(row, 'Anda meminta link baharu untuk borang ini. Link lama tidak lagi sah.');
    }
    return { sent: true, message: 'Jika no. rujukan dan email sepadan dengan borang yang masih boleh dikemas kini, link baharu telah dihantar ke email tersebut.' };
  },

  toDTO: function (dto, row) {
    dto.computed = {
      jumlahCadangan: (Number(row.bilangan_ganti) || 0) + (Number(row.bilangan_tambahan) || 0),
      anggaranKos: Number(row.anggaran_kos) || 0,
      ganti: Number(row.bilangan_ganti) || 0, tambahan: Number(row.bilangan_tambahan) || 0,
      kosGanti: Number(row.anggaran_kos_ganti) || 0, kosTambahan: Number(row.anggaran_kos_tambahan) || 0
    };
    return dto;
  }
};
