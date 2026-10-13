/**
 * @file WorkerService.gs
 * Mod Supabase: data sistem berada dalam Postgres (Supabase Edge Function `api`, lihat supabase/functions/api).
 * Apps Script kekal sebagai PEKERJA:
 *   - menghantar email (MailApp) dan notifikasi telefon (FCM) yang dibaris gilir oleh pelayan Supabase → pencetus `workerTick` setiap minit
 *     (+ "kejutan" segera daripada pelayan selepas setiap tindakan yang menghasilkan email)
 *   - mencetuskan penyelenggaraan berkala (peringatan, auto-selesai) melalui system.tick
 *   - sandaran harian: salin semua data ke Google Sheets dalam folder Backup
 *   - meneruskan permintaan lama (klien yang masih menggunakan URL /exec) ke Supabase
 *
 * Keadaan (Script Property SUPABASE_ACTIVE):
 *   ''          → mod biasa (Google Sheets) — sebelum pemindahan
 *   'migrating' → pemindahan sedang berjalan: tulisan ditolak sementara
 *   '1'         → Supabase aktif: Apps Script tidak lagi melayan API sendiri
 *   'returning' → pindahKeSheets() sedang memulangkan data ke Google Sheets: tulisan ditolak sementara
 *
 * Penyulitan (Pilihan A): semua data di Supabase disulitkan dengan DATA_KEY (rahsia fungsi, bukan dalam pangkalan data).
 * Salinan kunci disimpan di sini (Script Property DATA_KEY_SALINAN, akaun Google UTM) — tidak pernah dihantar ke Supabase.
 * Boleh berpatah balik pada bila-bila masa: pindahKeSheets() memulangkan semua data ke spreadsheet asal.
 */
const WorkerService = {
  SIG_PREFIX: 'fkmit-worker-v1',

  /** URL API Supabase (ditulis oleh CI ke DeployInfo.gs daripada backend.json; Script Property mengatasi). */
  apiUrl: function () {
    return Env.get('SUPABASE_API_URL', '') || (typeof DEPLOY_INFO !== 'undefined' && DEPLOY_INFO.apiUrl ? DEPLOY_INFO.apiUrl : '');
  },

  state: function () {
    if (typeof EDGE_RUNTIME !== 'undefined' && EDGE_RUNTIME) return '';
    return String(Env.get('SUPABASE_ACTIVE', '') || '');
  },

  active: function () { return WorkerService.state() === '1' && !!WorkerService.apiUrl(); },

  /**
   * Tandatangan pekerja = HMAC-SHA256(AUTH_PEPPER, 'fkmit-worker-v1|' + ts + '|' + action + '|' + sha256(JSON payload)).
   * Pelayan Supabase menyemak dengan pepper yang sama (dipindahkan semasa import); sah 5 minit, terikat pada kandungan.
   */
  signature: function (action, payload, ts) {
    const pepper = Env.get('AUTH_PEPPER');
    if (!pepper) throw new AppError(ERROR_CODES.CONFIG_ERROR, 'AUTH_PEPPER tiada.');
    const bodyHash = SecurityUtils.sha256Hex(JSON.stringify(payload));
    return SecurityUtils.bytesToHex(Utilities.computeHmacSha256Signature(WorkerService.SIG_PREFIX + '|' + ts + '|' + action + '|' + bodyHash, pepper));
  },

  /** POST ke API Supabase. @return {Object} respons JSON */
  post: function (body, timeoutNote) {
    const url = WorkerService.apiUrl();
    if (!url) throw new AppError(ERROR_CODES.CONFIG_ERROR, 'URL API Supabase belum ditetapkan.');
    const res = UrlFetchApp.fetch(url, {
      method: 'post', contentType: 'text/plain; charset=utf-8', payload: JSON.stringify(body), muteHttpExceptions: true, followRedirects: true,
      /* Pelayan Google berada di AS — paksa fungsi berjalan di Singapura (dekat pangkalan data), bukan us-east */
      headers: { 'x-region': 'ap-southeast-1' }
    });
    const code = res.getResponseCode();
    const text = res.getContentText();
    try { return JSON.parse(text); } catch (e) {
      throw new Error('Respons Supabase tidak sah (HTTP ' + code + ')' + (timeoutNote ? ' ' + timeoutNote : '') + ': ' + String(text).slice(0, 200));
    }
  },

  call: function (action, payload) {
    const p = payload || {};
    const ts = Date.now();
    const r = WorkerService.post({ action: action, payload: p, ts: ts, worker: WorkerService.signature(action, p, ts) });
    if (!r || !r.success) throw new Error((r && r.code) + ': ' + (r && r.message));
    return r.data;
  },

  /** Teruskan permintaan API klien lama ke Supabase. */
  proxy: function (request) {
    try {
      return WorkerService.post(request);
    } catch (e) {
      return ApiResponse.fail(ERROR_CODES.BUSY, 'Sambungan ke pelayan gagal. Sila muat semula halaman.');
    }
  },

  /** Hantar email / push yang dituntut daripada baris gilir pelayan. @return {Object[]} keputusan untuk system.ack */
  deliver_: function (mails, out) {
    return mails.map(function (m) {
      try {
        if (m.kind === 'push') {
          const r = PushService.relay(m.payload);
          out.pushed = (out.pushed || 0) + r.sent;
          return { id: m.id, ok: true, revoke: r.dead };
        }
        if (m.kind === 'drive') {
          /* Lampiran dibuang di pelayan Supabase → buang fail Drive (hanya dalam folder lampiran) */
          if (m.payload && m.payload.op === 'trash' && WorkerService.inAttachmentFolder_(String(m.payload.id))) DriveApp.getFileById(String(m.payload.id)).setTrashed(true);
          return { id: m.id, ok: true };
        }
        if (m.kind !== 'mail') throw new Error('Jenis tidak disokong: ' + m.kind);
        MailApp.sendEmail(m.payload);
        out.sent++;
        return { id: m.id, ok: true };
      } catch (e) {
        out.failed++;
        return { id: m.id, ok: false, error: String(e && e.message || e) };
      }
    });
  },

  /**
   * Satu kitaran pekerja: penyelenggaraan (pelayan memutuskan sama ada tiba masanya) + hantar email tertunggak.
   * @param {{force?:boolean}} [opts]
   */
  tick: function (opts) {
    if (!WorkerService.active()) return { skipped: 'Supabase belum aktif' };
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(2000)) return { skipped: 'kitaran lain sedang berjalan' };
    const out = { sent: 0, failed: 0 };
    try {
      for (let round = 0; round < 5; round++) {
        const tickPayload = { force: !!(opts && opts.force && round === 0), limit: 20 };
        /* Laporkan sekali setiap kitaran sama ada FCM dikonfigurasi di sini (pelayan memaparkan butang notifikasi telefon) */
        if (round === 0) tickPayload.pushRelay = PushService.enabled();
        const data = WorkerService.call('system.tick', tickPayload);
        if (round === 0) out.maintenance = data.maintenance;
        const mails = data.mails || [];
        if (!mails.length) break;
        WorkerService.call('system.ack', { results: WorkerService.deliver_(mails, out) });
        if (mails.length < 20) break;
      }
      if (out.maintenance && out.maintenance.daily) {
        try { out.backup = WorkerService.backup(); } catch (e) { out.backupError = String(e && e.message || e); }
      }
    } finally {
      lock.releaseLock();
    }
    if (out.sent || out.failed || out.pushed || out.backup || out.backupError) console.log('Pekerja: ' + JSON.stringify(out));
    return out;
  },

  /** Sandaran harian: semua data Supabase → spreadsheet baharu dalam folder Backup (simpan beberapa salinan terkini). */
  backup: function () {
    const folderId = Env.get('BACKUP_FOLDER_ID');
    if (!folderId) return { skipped: 'BACKUP_FOLDER_ID tiada' };
    const data = WorkerService.call('system.export', {});
    const root = DriveApp.getFolderById(folderId);
    const folder = DriveService.child(root, Utilities.formatDate(new Date(), DateUtils.tz(), 'yyyy'));
    const name = CONFIG.APP_SLUG + '_Backup_' + Utilities.formatDate(new Date(), DateUtils.tz(), 'yyyyMMdd_HHmm');
    const ss = SpreadsheetApp.create(name);
    const first = ss.getSheets()[0];
    (data.sheets || []).forEach(function (s, i) {
      const sh = i === 0 ? first.setName(s.name) : ss.insertSheet(s.name);
      const width = Math.max(1, (s.header || []).length, (s.rows || []).reduce(function (m, r) { return Math.max(m, r.length); }, 0));
      const pad = function (r) { const x = r.slice(0, width); while (x.length < width) x.push(''); return x.map(function (v) { return v === null || v === undefined ? '' : (typeof v === 'string' ? StringUtils.sheetSafe(v) : v); }); };
      const values = [pad(s.header || [])].concat((s.rows || []).map(pad));
      if (sh.getMaxRows() < values.length) sh.insertRowsAfter(sh.getMaxRows(), values.length - sh.getMaxRows());
      if (sh.getMaxColumns() < width) sh.insertColumnsAfter(sh.getMaxColumns(), width - sh.getMaxColumns());
      sh.getRange(1, 1, values.length, width).setNumberFormat('@').setValues(values);
    });
    const file = DriveApp.getFileById(ss.getId());
    file.moveTo(folder);
    try { file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE); } catch (e) { /* polisi domain */ }
    Env.set('LAST_BACKUP_AT', DateUtils.nowIso());
    return { fileId: ss.getId(), name: name, sheets: (data.sheets || []).length, pruned: BackupService.prune(folder) };
  },

  /** Semua sheet pangkalan data Google Sheets semasa → format import. */
  snapshot: function () {
    const ss = Database.open();
    return ss.getSheets().map(function (sh) {
      const lr = sh.getLastRow();
      const lc = sh.getLastColumn();
      const values = lr && lc ? sh.getRange(1, 1, lr, lc).getValues() : [];
      const conv = function (row) {
        return row.map(function (v) {
          if (v instanceof Date) return isNaN(v.getTime()) ? '' : v.toISOString();
          return v === null || v === undefined ? '' : v;
        });
      };
      return { name: sh.getName(), header: values.length ? conv(values[0]) : [], rows: values.slice(1).map(conv) };
    });
  },

  /** Pelayan Supabase bertanya: adakah import dengan nonce ini dimulakan oleh skrip ini? */
  verifyImport: function (nonce) {
    const props = PropertiesService.getScriptProperties();
    const want = props.getProperty('SUPABASE_IMPORT_NONCE') || '';
    const ok = !!want && props.getProperty('SUPABASE_ACTIVE') === 'migrating' && SecurityUtils.constantTimeEquals(String(nonce || ''), want);
    return { ok: ok };
  },

  // ------------------------------------------------------------------ Lampiran (Google Drive) untuk pelayan Supabase

  FILE_SIG_PREFIX: 'fkmit-file-v1',

  /** Fail berada dalam folder lampiran sistem (Attachments/YYYY/MM)? Elak pelayan membaca fail Drive lain pemilik skrip. */
  inAttachmentFolder_: function (fileId) {
    let file;
    try { file = DriveApp.getFileById(fileId); } catch (e) { return false; }
    const rootId = DriveService.attachmentRoot().getId();
    let level = [file];
    for (let depth = 0; depth < 4; depth++) {
      const next = [];
      for (let i = 0; i < level.length; i++) {
        const it = level[i].getParents();
        while (it.hasNext()) {
          const p = it.next();
          if (p.getId() === rootId) return true;
          next.push(p);
        }
      }
      if (!next.length) return false;
      level = next;
    }
    return false;
  },

  /**
   * Permintaan lampiran daripada pelayan Supabase (doPost {fileRelay}). Ditandatangani dengan AUTH_PEPPER (sah 5 minit).
   * @param {{op:string, payload:Object, ts:number, sig:string}} req
   */
  fileRelay: function (req) {
    if (WorkerService.state() !== '1') throw Errors.forbidden();
    const r = req || {};
    const ts = Number(r.ts);
    const pepper = Env.get('AUTH_PEPPER');
    if (!pepper || !isFinite(ts) || Math.abs(Date.now() - ts) > 5 * 60 * 1000 || typeof r.sig !== 'string') throw Errors.forbidden();
    const payload = r.payload || {};
    const want = SecurityUtils.bytesToHex(Utilities.computeHmacSha256Signature(
      WorkerService.FILE_SIG_PREFIX + '|' + ts + '|' + String(r.op) + '|' + SecurityUtils.sha256Hex(JSON.stringify(payload)), pepper));
    if (!SecurityUtils.constantTimeEquals(r.sig, want)) throw Errors.forbidden();
    if (r.op === 'upload') {
      const f = SecurityService.validateUpload({ name: payload.name, mimeType: payload.mimeType, data: payload.data });
      return DriveService.upload(f, String(payload.recordId || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40));
    }
    if (r.op === 'read') {
      const id = String(payload.id || '');
      if (!WorkerService.inAttachmentFolder_(id)) throw Errors.notFound('Lampiran');
      return { data: DriveService.readBase64(id) };
    }
    throw Errors.validation('Operasi tidak dikenali.');
  },

  // ------------------------------------------------------------------ Kunci penyulitan (DATA_KEY)

  /** Script Property yang menyimpan salinan DATA_KEY (TIDAK dihantar ke Supabase). */
  KEY_PROP: 'DATA_KEY_SALINAN',

  /** Kunci rawak 32 bait (base64) — sama format dengan rahsia Edge Function DATA_KEY. */
  newDataKey: function () {
    return Utilities.base64Encode(SecurityUtils.randomBytes(32));
  },

  /** Bait kunci daripada base64/base64url/hex (sama seperti crypto-store.mjs parseDataKey). */
  keyBytes_: function (raw) {
    const s = String(raw || '').trim();
    let b = null;
    if (/^[0-9a-fA-F]{64}$/.test(s)) { b = []; for (let i = 0; i < 64; i += 2) b.push(((parseInt(s.substr(i, 2), 16) << 24) >> 24)); }
    else if (/^[A-Za-z0-9+\/_-]{43}=?$/.test(s)) b = Utilities.base64Decode(s.replace(/-/g, '+').replace(/_/g, '/').replace(/=?$/, '='));
    if (!b || b.length !== 32) throw new Error('DATA_KEY tidak sah (perlukan 32 bait rawak, base64 atau hex).');
    return b;
  },

  /** Cap jari kunci (bukan rahsia) — mesti sama dengan yang dilaporkan pelayan Supabase. */
  keyFingerprint: function (raw) {
    const sig = Utilities.computeHmacSha256Signature(Utilities.newBlob('fkmit-data-fp-v1').getBytes(), WorkerService.keyBytes_(raw));
    return SecurityUtils.bytesToHex(sig).slice(0, 16);
  },

  /** Cap jari DATA_KEY yang digunakan pelayan Supabase (GET awam; '' jika tidak dapat dihubungi / belum ditetapkan). */
  serverKeyFp: function () {
    try {
      const res = UrlFetchApp.fetch(WorkerService.apiUrl(), { method: 'get', muteHttpExceptions: true, headers: { 'x-region': 'ap-southeast-1' } });
      const j = JSON.parse(res.getContentText());
      return String((j && j.data && j.data.keyFp) || '');
    } catch (e) {
      return '';
    }
  },

  /**
   * Pastikan Supabase menggunakan kunci yang sama dengan salinan di sini (elak data disulitkan dengan kunci yang tiada salinan).
   * @return {string} cap jari
   */
  checkKey: function () {
    const local = Env.get(WorkerService.KEY_PROP, '');
    if (!local) throw new Error('Salinan DATA_KEY tiada. Jalankan janaKunciData() dahulu dan simpan kunci itu sebagai GitHub Secret SUPABASE_DATA_KEY.');
    const want = WorkerService.keyFingerprint(local);
    const got = WorkerService.serverKeyFp();
    if (got !== want) {
      throw new Error('DATA_KEY di Supabase (' + (got || 'tiada / tidak dapat dihubungi') + ') tidak sama dengan salinan di sini (' + want + '). ' +
        'Pastikan GitHub Secret SUPABASE_DATA_KEY = nilai DATA_KEY_SALINAN, kemudian deploy semula.');
    }
    return want;
  },

  /** Pindah data + Script Properties ke Supabase (sekali). Dipanggil oleh pindahKeSupabase(). */
  migrate: function () {
    if (!WorkerService.apiUrl()) throw new Error('URL API Supabase belum ditetapkan (DEPLOY_INFO.apiUrl / SUPABASE_API_URL).');
    if (WorkerService.state() === '1') throw new Error('Supabase sudah aktif. Pemindahan telah dibuat.');
    if (WorkerService.state() === 'returning') throw new Error('pindahKeSheets() belum selesai. Jalankannya semula dahulu.');
    WorkerService.checkKey();
    const nonce = SecurityUtils.randomToken();
    Env.set('SUPABASE_IMPORT_NONCE', nonce);
    Env.set('SUPABASE_ACTIVE', 'migrating');
    /* Tunggu tulisan yang sedang berjalan selesai; tulisan baharu menyemak semula keadaan di bawah kunci (Database.withLock) */
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const sheets = WorkerService.snapshot();
      const props = PropertiesService.getScriptProperties().getProperties();
      delete props.SUPABASE_ACTIVE;
      delete props.SUPABASE_IMPORT_NONCE;
      delete props[WorkerService.KEY_PROP]; /* kunci TIDAK sekali-kali dihantar ke Supabase */
      ['AUTH_PEPPER', 'FORM_SECRET'].forEach(function (k) { if (!props[k] && Env.get(k)) props[k] = Env.get(k); });
      props.WORKER_URL = ScriptApp.getService().getUrl() || '';
      props.OWNER_EMAIL = Session.getEffectiveUser().getEmail() || '';
      let r = null;
      let sendError = null;
      try { r = WorkerService.post({ action: 'system.import', payload: { sheets: sheets, props: props, nonce: nonce } }); } catch (e) { sendError = e; }
      if (!r || !r.success) {
        /* Jawapan mungkin hilang walaupun import berjaya → semak dengan pelayan sebelum kembali ke Google Sheets */
        let done = false;
        try { WorkerService.call('system.status', {}); done = true; } catch (e2) { done = false; }
        if (!done) throw sendError || new Error('Import gagal: ' + (r && r.code) + ' — ' + (r && r.message));
        r = { success: true, data: { recovered: true, sheets: sheets.length, rows: 0, props: 0 } };
      }
      Env.set('SUPABASE_ACTIVE', '1');
      PropertiesService.getScriptProperties().deleteProperty('SUPABASE_IMPORT_NONCE');
      WorkerService.ensureTrigger();
      return r.data;
    } catch (e) {
      Env.set('SUPABASE_ACTIVE', '');
      throw e;
    } finally {
      lock.releaseLock();
    }
  },

  // ------------------------------------------------------------------ Berpatah balik ke Google Sheets

  /**
   * Pulangkan SEMUA data daripada Supabase ke spreadsheet asal, kemudian kembali ke mod Google Sheets.
   *   1. Apps Script menolak tulisan sementara (SUPABASE_ACTIVE = 'returning')
   *   2. system.handback: pelayan Supabase berhenti menerima tulisan (menunggu tulisan semasa) & memulangkan data dinyahsulit
   *   3. salinan keselamatan spreadsheet semasa dibuat, kemudian setiap sheet ditulis semula
   *   4. email tertunggak dihantar; cache dibatalkan; pencetus workerTick dibuang; mod Google Sheets aktif
   * Gagal selepas langkah 2 → pelayan Supabase dibuka semula (system.resume) dan mod Supabase kekal (tiada data hilang).
   * Data di Supabase TIDAK dipadam (kekal tersulit) — boleh dipindah semula kemudian dengan pindahKeSupabase().
   */
  restore: function () {
    if (WorkerService.state() !== '1' && WorkerService.state() !== 'returning') throw new Error('Mod Supabase tidak aktif — data sudah berada di Google Sheets.');
    if (!WorkerService.apiUrl()) throw new Error('URL API Supabase belum ditetapkan.');
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    let handedBack = false;
    try {
      Env.set('SUPABASE_ACTIVE', 'returning');
      const data = WorkerService.call('system.handback', {});
      handedBack = true;
      const sheets = data.sheets || [];
      if (!sheets.length || !sheets.some(function (s) { return s.name === 'USERS'; })) throw new Error('Eksport Supabase tidak lengkap (tiada sheet USERS).');
      const copy = WorkerService.safetyCopy_();
      const rows = WorkerService.writeSheets_(sheets);
      WorkerService.clearCaches_(sheets);
      const out = { sent: 0, failed: 0 };
      const mails = data.mails || [];
      if (mails.length) {
        const results = WorkerService.deliver_(mails, out);
        try { WorkerService.call('system.ack', { results: results }); } catch (e) { /* pelayan tidak lagi aktif — tidak kritikal */ }
      }
      Env.set('SUPABASE_ACTIVE', '');
      WorkerService.removeTrigger();
      Env.set('SUPABASE_RETURNED_AT', DateUtils.nowIso());
      return { sheets: sheets.length, rows: rows, emailDihantar: out.sent, emailGagal: out.failed, salinanSebelum: copy };
    } catch (e) {
      if (handedBack) { try { WorkerService.call('system.resume', {}); } catch (e2) { console.error('system.resume gagal: ' + e2); } }
      Env.set('SUPABASE_ACTIVE', '1');
      throw e;
    } finally {
      lock.releaseLock();
    }
  },

  /** Salinan spreadsheet semasa (keadaan sebelum Supabase) sebelum ditulis ganti. @return {string} nama fail atau '' */
  safetyCopy_: function () {
    try {
      const ss = Database.open();
      const file = DriveApp.getFileById(ss.getId());
      const folderId = Env.get('BACKUP_FOLDER_ID', '');
      const name = CONFIG.APP_SLUG + '_SebelumPulih_' + Utilities.formatDate(new Date(), DateUtils.tz(), 'yyyyMMdd_HHmm');
      const c = folderId ? file.makeCopy(name, DriveApp.getFolderById(folderId)) : file.makeCopy(name);
      try { c.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE); } catch (e) { /* polisi domain */ }
      return name;
    } catch (e) {
      console.warn('Salinan keselamatan gagal (diteruskan): ' + e);
      return '';
    }
  },

  /** Tulis ganti setiap sheet dengan data eksport (format teks, seperti RepositoryBase). @return {number} jumlah baris */
  writeSheets_: function (sheets) {
    const ss = Database.open();
    let total = 0;
    sheets.forEach(function (s) {
      const sh = ss.getSheetByName(s.name) || ss.insertSheet(s.name);
      const header = s.header || [];
      const width = Math.max(1, header.length, (s.rows || []).reduce(function (m, r) { return Math.max(m, r.length); }, 0));
      const pad = function (r) {
        const x = r.slice(0, width);
        while (x.length < width) x.push('');
        return x.map(function (v) { return v === null || v === undefined ? '' : (typeof v === 'string' ? StringUtils.sheetSafe(v) : v); });
      };
      const values = [pad(header)].concat((s.rows || []).map(pad));
      const lr = sh.getLastRow();
      const lc = sh.getLastColumn();
      if (lr && lc) sh.getRange(1, 1, lr, lc).clearContent();
      if (sh.getMaxRows() < values.length) sh.insertRowsAfter(sh.getMaxRows(), values.length - sh.getMaxRows());
      if (sh.getMaxColumns() < width) sh.insertColumnsAfter(sh.getMaxColumns(), width - sh.getMaxColumns());
      sh.getRange(1, 1, values.length, width).setNumberFormat('@').setValues(values);
      total += values.length - 1;
    });
    SpreadsheetApp.flush();
    return total;
  },

  /** Cache merentas permintaan yang mungkin lapuk (dari sebelum pemindahan). */
  clearCaches_: function (sheets) {
    sheets.forEach(function (s) { AppCache.bump(s.name); });
    const keys = ['stats:admin', CategoryRepository.CACHE_KEY, SettingsRepository.CACHE_KEY];
    sheets.forEach(function (s) {
      const col = s.name === 'USERS' ? (s.header || []).indexOf('user_id') : s.name === 'SESSIONS' ? (s.header || []).indexOf('session_id') : -1;
      if (col < 0) return;
      (s.rows || []).forEach(function (r) { keys.push(s.name === 'USERS' ? UserService.cacheKey(r[col]) : AuthService.sessionCacheKey(r[col])); });
    });
    keys.forEach(function (k) { try { AppCache.remove(k); } catch (e) { /* abaikan */ } });
    return keys.length;
  },

  removeTrigger: function () {
    ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'workerTick') ScriptApp.deleteTrigger(t); });
  },

  /** Pencetus pekerja setiap minit (idempoten). */
  ensureTrigger: function () {
    const have = ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); });
    if (have.indexOf('workerTick') < 0) ScriptApp.newTrigger('workerTick').timeBased().everyMinutes(1).create();
    return true;
  }
};
