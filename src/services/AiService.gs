/**
 * @file AiService.gs
 * AI Advisor (Google Gemini API) untuk Pengurusan + Unit IT: tanya jawab data & jana taklimat.
 *
 * Prinsip keselamatan:
 *   - AI TIDAK membaca pangkalan data. Ia hanya menerima KONTEKS AGREGAT yang dibina di sini daripada laporan sistem
 *     (senarai putih medan) — tiada nama penjaga / pegawai / pemohon, email, no. pekerja atau no. telefon.
 *   - Baca sahaja: tiada laluan tulis diberikan kepada AI.
 *   - Kunci API disimpan dalam Script Properties (GEMINI_API_KEY; tersulit di Supabase), ditetapkan oleh Admin melalui
 *     laluan tulis-sahaja dan tidak pernah dipulangkan kepada pelayar.
 *   - Had kadar setiap pengguna + had harian keseluruhan (Tetapan AI_HAD_SEHARI) supaya kekal dalam kuota percuma.
 * HTTP: Apps Script → UrlFetchApp; Supabase → EDGE_HTTP (runtime, hos dihadkan kepada generativelanguage.googleapis.com).
 */
const AiService = {
  KEY_PROP: 'GEMINI_API_KEY',
  HOST: 'https:' + '//generativelanguage.googleapis.com/v1beta/models/',
  MAX_Q: 1500,
  MAX_HISTORY: 6,
  MAX_CONTEXT: 60000,
  /** Ujian: gantikan pengangkutan HTTP. function(url, params) → {code, text} */
  transport: null,

  setting_: function (k, d) {
    let v;
    try { v = SettingsService.get(k); } catch (e) { v = undefined; }
    return v === undefined || v === null || v === '' ? d : v;
  },

  key_: function () {
    try { return PropertiesService.getScriptProperties().getProperty(AiService.KEY_PROP) || ''; } catch (e) { return ''; }
  },

  /** Status untuk paparan (tiada kunci didedahkan). */
  status: function (ctx) {
    const key = AiService.key_();
    return {
      aktif: AiService.setting_('AI_AKTIF', true) !== false && !!key,
      adaKunci: !!key, kunciHujung: key ? key.slice(-4) : '', model: AiService.setting_('AI_MODEL', 'gemini-flash-latest'),
      hadSehari: Number(AiService.setting_('AI_HAD_SEHARI', 200)) || 200, bolehUrus: CrudEngine.isAdmin(ctx),
      penyedia: 'Google Gemini API (peringkat percuma)'
    };
  },

  /** Admin: tetapkan / buang kunci API (tulis sahaja). */
  setKey: function (payload, ctx) {
    const k = String((payload && payload.kunci) || '').replace(/\s+/g, '').replace(/^["'`]+|["'`]+$/g, '');
    const props = PropertiesService.getScriptProperties();
    if (payload && payload.buang === true) {
      props.deleteProperty(AiService.KEY_PROP);
      AuditService.log(ctx, AUDIT_ACTIONS.SETTINGS_UPDATED, 'SETTINGS', AiService.KEY_PROP, 'Kunci AI dibuang');
      return AiService.status(ctx);
    }
    if (!/^[A-Za-z0-9._\-]{20,300}$/.test(k)) {
      throw Errors.validation('Format kunci tidak dikenali. Salin semula kunci penuh daripada Google AI Studio (biasanya bermula "AIza", 39 aksara), tanpa teks lain.',
        { kunci: 'Format kunci tidak dikenali (' + k.length + ' aksara).' });
    }
    /* Uji kunci dengan Google sebelum disimpan (models.get: tiada kuota token digunakan) */
    const model = AiService.setting_('AI_MODEL', 'gemini-flash-latest');
    let res = null;
    try { res = AiService.http_(AiService.HOST + encodeURIComponent(model), { method: 'get', headers: { 'x-goog-api-key': k } }); } catch (e) {
      if (e && e.name === 'NeedData') throw e;
      res = { code: 0, text: '' };
    }
    let nota = '';
    if (res.code === 404) nota = 'Kunci sah, tetapi model "' + model + '" tidak ditemui. Semak Tetapan AI_MODEL.';
    else if (res.code === 0 || res.code >= 500) nota = 'Kunci disimpan tetapi tidak dapat diuji sekarang (Google tidak dapat dihubungi).';
    else if (res.code !== 200) throw Errors.validation('Kunci tidak disimpan: ' + AiService.googleReason_(res), { kunci: 'Ditolak oleh Google.' });
    props.setProperty(AiService.KEY_PROP, k);
    AuditService.log(ctx, AUDIT_ACTIONS.SETTINGS_UPDATED, 'SETTINGS', AiService.KEY_PROP, 'Kunci AI ditetapkan (…' + k.slice(-4) + ')' + (nota ? ' · ' + nota : ''));
    return Object.assign(AiService.status(ctx), { diuji: res.code === 200, nota: nota });
  },

  /**
   * Jawapan ralat Google → sebab dalam BM (tanpa mendedahkan kunci).
   * Sebab biasa: kunci salah/dipadam, Generative Language API tidak diaktifkan, sekatan kunci (referrer / IP / API),
   * lokasi tidak disokong, kuota.
   */
  googleReason_: function (res) {
    let err = null;
    try { err = JSON.parse(res.text || '{}').error || null; } catch (e) { err = null; }
    const msg = err && err.message ? String(err.message) : '';
    const reasons = [];
    ((err && err.details) || []).forEach(function (d) { if (d && d.reason) reasons.push(String(d.reason)); });
    const has = function (r) { return reasons.indexOf(r) >= 0 || msg.indexOf(r) >= 0; };
    AppLogger.warn('AI: ditolak', { code: res.code, status: err && err.status, reasons: reasons.join(','), message: msg.slice(0, 200) });
    if (res.code === 429 || has('RESOURCE_EXHAUSTED')) return 'kuota percuma Gemini telah habis buat sementara. Cuba lagi selepas beberapa minit atau esok.';
    if (has('API_KEY_INVALID') || /API key not valid|API key expired/i.test(msg)) return 'kunci API tidak sah, telah dipadam atau tamat tempoh. Jana kunci baharu di aistudio.google.com dan salin sepenuhnya.';
    if (has('SERVICE_DISABLED') || /has not been used|is disabled/i.test(msg)) return '"Generative Language API" belum diaktifkan untuk projek Google kunci ini. Aktifkan di Google Cloud Console (APIs & Services), atau jana kunci melalui AI Studio.';
    if (has('API_KEY_HTTP_REFERRER_BLOCKED') || has('API_KEY_IP_ADDRESS_BLOCKED') || has('API_KEY_ANDROID_APP_BLOCKED') || has('API_KEY_IOS_APP_BLOCKED')) return 'kunci ini mempunyai sekatan aplikasi (laman web / IP). Panggilan datang dari pelayan, jadi tetapkan "Application restrictions: None" pada kunci di Google Cloud Console.';
    if (has('API_KEY_SERVICE_BLOCKED')) return 'kunci ini disekat daripada Generative Language API (sekatan API pada kunci). Benarkan "Generative Language API" pada kunci tersebut.';
    if (/location is not supported/i.test(msg)) return 'lokasi pelayan tidak disokong oleh Gemini API.';
    if (res.code === 403 || has('PERMISSION_DENIED')) return 'akses ditolak oleh Google (' + (err && err.status ? err.status : res.code) + '). Semak kunci dan projek Google.';
    return 'Google menolak permintaan (' + res.code + (err && err.status ? ' ' + err.status : '') + ').';
  },

  // ================================================================== Konteks agregat (senarai putih)

  pick_: function (o, keys) {
    const out = {};
    if (!o) return out;
    keys.forEach(function (k) { if (o[k] !== undefined) out[k] = o[k]; });
    return out;
  },

  /** @return {Object} angka agregat sahaja — TIADA data peribadi. */
  context: function () {
    const safe = function (fn) { try { return fn(); } catch (e) { return null; } };
    const y = Number(DateUtils.format(new Date(), 'yyyy'));
    const pick = AiService.pick_;
    const e = safe(function () { return AsetHooks.reportExecutive({ skipTrend: false }); }) || {};
    const o = safe(function () { return AsetHooks.overview({ tahun: y }); }) || {};
    const g = safe(function () { return AsetHooks.reportReplacement({ jenis: 'KOMPUTER' }); }) || {};
    const u = safe(function () { return AsetUnjuran.compute({}); });
    const k = e.keperluan || safe(function () { return KeperluanHooks.summary({}); });
    const kh = safe(function () { return AsetLink.summary(); });
    return {
      tarikhData: DateUtils.dayKey(new Date()),
      fakulti: 'Fakulti Kejuruteraan Mekanikal (FKM), UTM',
      ringkasan: e.ringkasan || null,
      isuUtama: (e.isu || []).map(function (i) { return i.teks; }),
      aset: o.assets ? { jumlah: o.assets.total, beroperasi: o.assets.operational, beroperasiPct: o.assets.operationalPct, ikutStatus: o.assets.byStatus, ikutJenis: o.assets.byJenis,
        disahkanPct: o.assets.verifiedPct, lokasiBerbezaUtmfin: o.assets.lokasiBerbeza, statusPengesahan: o.assets.byPengesahan } : null,
      nilai: { ikutMakmal: (e.nilaiIkutMakmal || []).map(function (x) { return pick(x, ['label', 'bil', 'kos', 'buku']); }), ikutTahunPerolehan: (e.nilaiIkutTahun || []).map(function (x) { return pick(x, ['label', 'bil', 'kos', 'buku']); }), kaedah: e.kaedah || null },
      spesifikasiKomputer: o.spesifikasi || null,
      cadanganPenggantian: g.ringkasan ? { ringkasan: g.ringkasan, kriteria: g.config, ikutMakmal: (g.byMakmal || []).map(function (x) { return pick(x, ['label', 'segera', 'tahunDepan', 'pantau', 'kos']); }) } : null,
      pelanPenggantian5Tahun: e.pelan || null,
      indeksKesihatanMakmal: (e.makmal || []).map(function (x) { return pick(x, ['label', 'skor', 'tahap', 'pc', 'umurPurata', 'rosak', 'perluGanti', 'pctGanti', 'aduan', 'pctDisahkan']); }),
      keperluanMakmal: k ? { tahun: k.tahun, jumlah: k.jumlah, ikutJenis: k.ikutJenis, ikutPeralatan: k.ikutPeralatan || [],
        permohonan: (k.items || []).map(function (x) { return pick(x, ['makmal', 'jenisLabel', 'ganti', 'tambahan', 'kosGanti', 'kosTambahan', 'peralatanRingkas', 'kosPeralatan', 'keutamaan', 'status']); }) } : null,
      unjuranPelajar: u ? { andaian: pick(u.andaian, ['pctUg', 'jamUg', 'pctPg', 'jamPg', 'jamOperasi', 'kadarGuna', 'saizMakmal', 'harga', 'skop', 'nota']), semasa: u.semasa, tahun: u.rows, jumlah: u.jumlah } : null,
      aduanIt: o.tickets ? { terbuka: o.tickets.open, lewatSla: o.tickets.overdue, keutamaanTinggiTerbuka: o.tickets.highOpen, belumDitugaskan: o.tickets.unassigned, jumlah: o.tickets.total,
        ikutKategoriTerbuka: o.tickets.byCategory, trendSla: o.tickets.slaTrend } : null,
      tindakanKewpa: e.tindakan ? { jumlah: e.tindakan.jumlah, ikutJenis: e.tindakan.ikutJenis } : null,
      kitarHayatAset: kh ? AiService.stripPeople_(kh) : null,
      trendBulanan: e.trend || []
    };
  },

  /** Buang kunci yang mungkin mengandungi data peribadi (pertahanan tambahan). */
  PERSONAL: /^(nama.*|name|penjaga.*|pegawai.*|pemohon.*|peminjam.*|owner.*|e-?mail.*|e-?mel.*|telefon.*|phone|no_?pekerja.*|nopekerja.*|no_?pengenalan|ic|penyelaras.*|pic_?makmal|oleh|workload|byverifier|disemak_?oleh)$/i,
  stripPeople_: function (v) {
    if (Array.isArray(v)) return v.map(AiService.stripPeople_);
    if (!v || typeof v !== 'object') return v;
    const out = {};
    Object.keys(v).forEach(function (k) { if (!AiService.PERSONAL.test(k)) out[k] = AiService.stripPeople_(v[k]); });
    return out;
  },

  contextText_: function () {
    let s = JSON.stringify(AiService.stripPeople_(AiService.context()));
    if (s.length > AiService.MAX_CONTEXT) s = s.slice(0, AiService.MAX_CONTEXT) + '…(dipotong)';
    return s;
  },

  SYSTEM: function () {
    return [
      'Anda ialah "Penasihat AI Unit IT FKM", pembantu perancangan aset ICT untuk pengurusan Fakulti Kejuruteraan Mekanikal (FKM), Universiti Teknologi Malaysia.',
      'Pengguna ialah Dekan, Timbalan Dekan, Ketua Jabatan atau staf Unit IT.',
      'PERATURAN:',
      '1. Jawab dalam Bahasa Melayu yang profesional dan ringkas, melainkan pengguna menulis dalam bahasa lain.',
      '2. Gunakan HANYA angka dalam DATA SISTEM di bawah. Jangan reka angka. Jika maklumat tiada dalam data, katakan dengan jelas apa yang tiada dan dari mana ia boleh diperoleh.',
      '3. Nyatakan angka penting secara tepat (RM dengan pemisah ribu). Bezakan fakta (daripada data) dengan cadangan (pandangan anda).',
      '4. Untuk cadangan, beri justifikasi berdasarkan data (umur PC, kadar rosak, aduan, keutamaan, kos) dan sebut risiko atau andaian.',
      '5. Format: tajuk kecil dengan "## ", senarai dengan "- ", tebal dengan **…**. Elakkan jadual lebar.',
      '6. Anggaran kos ialah perancangan dalaman, bukan kelulusan bajet; keputusan rasmi tertakluk kepada prosedur kewangan UTM.',
      '7. Data tidak mengandungi nama individu; jangan cuba meneka identiti sesiapa.',
      'Tarikh hari ini: ' + DateUtils.dayKey(new Date()) + '.'
    ].join('\n');
  },

  // ================================================================== Panggilan model

  http_: function (url, params) {
    if (AiService.transport) return AiService.transport(url, params);
    if (typeof EDGE_HTTP !== 'undefined' && EDGE_HTTP) return EDGE_HTTP.fetch(url, params);
    const r = UrlFetchApp.fetch(url, Object.assign({ muteHttpExceptions: true }, params));
    return { code: r.getResponseCode(), text: r.getContentText() };
  },

  limit_: function (ctx) {
    SecurityService.rateLimit('ai.pengguna', ctx.userId);
    const had = Number(AiService.setting_('AI_HAD_SEHARI', 200)) || 200;
    const day = DateUtils.dayKey(new Date());
    const cache = CacheService.getScriptCache();
    const key = AppCache.PREFIX + 'ai:hari:' + day;
    const n = parseInt(cache.get(key) || '0', 10);
    if (n >= had) throw new AppError(ERROR_CODES.RATE_LIMITED, 'Had penggunaan AI hari ini (' + had + ' soalan) telah dicapai. Cuba lagi esok.');
    cache.put(key, String(n + 1), 90000);
  },

  /**
   * @param {Array<{role:'user'|'model', text:string}>} turns
   * @return {{text:string, model:string}}
   */
  generate_: function (turns, ctx, opts) {
    const st = AiService.status(ctx);
    if (!st.adaKunci) throw Errors.validation('AI Advisor belum dikonfigurasi. Admin perlu menetapkan kunci API Gemini (Perancangan → AI Advisor).');
    if (!st.aktif) throw Errors.forbidden('AI Advisor dimatikan dalam Tetapan.');
    AiService.limit_(ctx);
    const body = {
      systemInstruction: { parts: [{ text: AiService.SYSTEM() + '\n\nDATA SISTEM (JSON, agregat, dijana ' + DateUtils.nowIso() + '):\n' + AiService.contextText_() }] },
      contents: turns.map(function (t) { return { role: t.role === 'model' ? 'model' : 'user', parts: [{ text: t.text }] }; }),
      generationConfig: { temperature: (opts && opts.temperature) || 0.3, maxOutputTokens: (opts && opts.maxTokens) || 2048 }
    };
    const url = AiService.HOST + encodeURIComponent(st.model) + ':generateContent';
    let res;
    try {
      res = AiService.http_(url, { method: 'post', contentType: 'application/json', headers: { 'x-goog-api-key': AiService.key_() }, payload: JSON.stringify(body) });
    } catch (e) {
      if (e && e.name === 'NeedData') throw e;
      AppLogger.warn('AI: sambungan gagal', { message: String(e && e.message) });
      throw Errors.validation('Perkhidmatan AI tidak dapat dihubungi. Cuba lagi sebentar.');
    }
    let data = null;
    try { data = JSON.parse(res.text || '{}'); } catch (e) { data = null; }
    if (res.code === 429) throw new AppError(ERROR_CODES.RATE_LIMITED, 'Kuota percuma Gemini telah habis buat sementara. Cuba lagi selepas beberapa minit atau esok.');
    if (res.code === 400 || res.code === 403) {
      const why = AiService.googleReason_(res);
      throw Errors.validation('AI tidak dapat digunakan: ' + why + (/kunci/.test(why) ? ' Admin perlu menetapkan kunci baharu (AI Advisor → Urus kunci API).' : ''));
    }
    if (res.code === 404) throw Errors.validation('Model AI "' + st.model + '" tidak ditemui. Tukar Tetapan AI_MODEL (cth. gemini-flash-latest).');
    if (res.code !== 200 || !data) {
      AppLogger.warn('AI: ralat', { code: res.code });
      throw Errors.validation('Perkhidmatan AI sedang bermasalah (' + res.code + '). Cuba lagi sebentar.');
    }
    const cand = (data.candidates || [])[0];
    const text = cand && cand.content && cand.content.parts ? cand.content.parts.map(function (p) { return p.text || ''; }).join('').trim() : '';
    if (!text) throw Errors.validation(cand && cand.finishReason === 'SAFETY' ? 'Jawapan disekat oleh penapis keselamatan AI. Cuba ubah soalan.' : 'AI tidak memberi jawapan. Cuba ubah soalan.');
    return { text: text.slice(0, 20000), model: st.model };
  },

  clean_: function (s, max) { return String(s === undefined || s === null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max); },

  /** Tanya jawab. payload: { soalan, sejarah?: [{role, text}] } */
  ask: function (payload, ctx) {
    const q = AiService.clean_(payload && payload.soalan, AiService.MAX_Q);
    if (q.length < 3) throw Errors.validation('Tulis soalan anda.', { soalan: 'Tulis soalan anda.' });
    const hist = (Array.isArray(payload && payload.sejarah) ? payload.sejarah : []).slice(-AiService.MAX_HISTORY).map(function (t) {
      return { role: t && t.role === 'model' ? 'model' : 'user', text: AiService.clean_(t && t.text, 4000) };
    }).filter(function (t) { return t.text; });
    while (hist.length && hist[0].role !== 'user') hist.shift();
    const r = AiService.generate_(hist.concat([{ role: 'user', text: q }]), ctx);
    AuditService.log(ctx, AUDIT_ACTIONS.AI_QUERY, 'AI', '', 'Tanya: ' + StringUtils.truncate(q, 180));
    return { jawapan: r.text, model: r.model, dijana: DateUtils.nowIso() };
  },

  AUDIENS: {
    DEKAN: 'Dekan FKM (mesyuarat pengurusan fakulti)',
    NC: 'Naib Canselor UTM (pertemuan Dekan dengan NC; fokus keperluan strategik & bajet)',
    JKF: 'Jawatankuasa Fakulti (JKF)',
    UNIT_IT: 'mesyuarat dalaman Unit IT (fokus tindakan operasi)'
  },

  /** Jana taklimat. payload: { audiens, fokus? } */
  briefing: function (payload, ctx) {
    const aud = AiService.AUDIENS[payload && payload.audiens] ? payload.audiens : 'DEKAN';
    const fokus = AiService.clean_(payload && payload.fokus, 500);
    const prompt = [
      'Sediakan TAKLIMAT ringkas (1–2 muka surat) tentang kedudukan aset ICT dan keperluan makmal FKM untuk ' + AiService.AUDIENS[aud] + '.',
      'Struktur: ## Ringkasan eksekutif (3–5 poin), ## Kedudukan semasa (aset, keadaan makmal, aduan IT), ## Isu utama & risiko,',
      '## Keperluan & anggaran kos (penggantian, tambahan, peralatan lain, unjuran pelajar jika ada), ## Cadangan & keputusan diperlukan (bernombor, dengan anggaran kos dan keutamaan).',
      'Gunakan angka daripada data sahaja. Jika sesuatu bahagian tiada data (cth. unjuran pelajar belum diisi), nyatakan "belum ada data" dan cadangkan sumbernya.',
      fokus ? 'Fokus tambahan yang diminta: ' + fokus : ''
    ].join('\n');
    const r = AiService.generate_([{ role: 'user', text: prompt }], ctx, { maxTokens: 4096, temperature: 0.25 });
    AuditService.log(ctx, AUDIT_ACTIONS.AI_QUERY, 'AI', '', 'Taklimat: ' + aud + (fokus ? ' · ' + StringUtils.truncate(fokus, 120) : ''));
    return { taklimat: r.text, audiens: AiService.AUDIENS[aud], model: r.model, dijana: DateUtils.nowIso() };
  }
};
