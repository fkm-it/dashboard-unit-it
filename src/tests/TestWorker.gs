/**
 * @file TestWorker.gs
 * Mod Supabase (WorkerService): proksi klien lama, mod pemindahan, kitaran pekerja (email + ack), pemindahan data.
 * Semua ujian nodeOnly — mengubah Script Properties & memerlukan UrlFetchApp tiruan.
 */
/** Jalankan fn dengan tindihan Env tambahan, kemudian pulihkan tindihan asal. */
function withEnv_(extra, fn) {
  const prev = Env.currentOverrides();
  Env.useOverrides(Object.assign({}, prev || {}, extra));
  try { return fn(); } finally { Env.useOverrides(prev); }
}

/** Kunci ujian (32 bait 0x07) & cap jarinya — vektor sama disemak dalam tools/test-crypto-store.mjs. */
const TEST_DATA_KEY_ = 'BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc=';
const TEST_DATA_KEY_FP_ = '505f3f2e3923b6a5';

/** Pengendali fetch tiruan: GET → cap jari kunci pelayan; POST → fn(body). */
function workerFetch_(fn, serverFp) {
  return function (url, params) {
    if (String((params && params.method) || 'get').toLowerCase() === 'get') return { code: 200, body: { success: true, data: { service: 'api', ok: true, keyFp: serverFp === undefined ? TEST_DATA_KEY_FP_ : serverFp } } };
    return fn(JSON.parse(params.payload), url, params);
  };
}

const TestSuiteWorker = {
  name: 'Pekerja Supabase',
  tests: [
    ['Mod biasa: API dilayan sendiri; mod pemindahan: ditolak sementara', function (t) {
      t.eq(WorkerService.state(), '');
      TestAssert.apiOk(api({ action: 'public.config' }));
      withEnv_({ SUPABASE_ACTIVE: 'migrating' }, function () {
        const r = api({ action: 'public.config' });
        t.eq(r.success, false);
        t.eq(r.code, ERROR_CODES.MAINTENANCE);
      });
    }, { nodeOnly: true }],
    ['Supabase aktif: klien lama diproksi; permintaan daripada pelayan Supabase tidak diproksi semula; penyelenggaraan GAS dilangkau', function (t) {
      const st = globalThis.__mockState;
      const seen = [];
      st.fetchHandler = function (url, params) { seen.push({ url: url, body: JSON.parse(params.payload) }); return { code: 200, body: { success: true, data: { dariSupabase: true }, code: 'OK', meta: {} } }; };
      try {
        withEnv_({ SUPABASE_ACTIVE: '1', SUPABASE_API_URL: 'https://abc.supabase.co/functions/v1/api' }, function () {
        const r = api({ action: 'public.config', meta: { rid: 'x' } });
        t.ok(r.success && r.data.dariSupabase, 'diproksi');
        t.eq(seen[0].url, 'https://abc.supabase.co/functions/v1/api');
        t.eq(seen[0].body.action, 'public.config');
        const own = api({ action: 'public.config', meta: { via: 'edge' } });
        t.eq(own.code, ERROR_CODES.MAINTENANCE, 'via edge selepas pemindahan → ditolak (Google Sheets tidak lagi dilayan)');
        t.ok(dailyMaintenance({ triggerUid: 't' }).skipped, 'harian dilangkau');
        t.ok(hourlyMaintenance({ triggerUid: 't' }).skipped, 'setiap jam dilangkau');
        });
      } finally { st.fetchHandler = null; }
    }, { nodeOnly: true }],
    ['Kitaran pekerja: email dihantar dengan MailApp & keputusan dihantar balik (ack); tandatangan HMAC', function (t) {
      const st = globalThis.__mockState;
      const calls = [];
      st.fetchHandler = function (url, params) {
        const b = JSON.parse(params.payload);
        calls.push(b);
        if (b.action === 'system.tick') return { code: 200, body: { success: true, data: { maintenance: {}, mails: [
          { id: '1', kind: 'mail', payload: { to: 'a@test.local', subject: 'S1', htmlBody: '<p>x</p>' } },
          { id: '2', kind: 'mail', payload: {} }
        ] } } };
        return { code: 200, body: { success: true, data: {} } };
      };
      const before = st.mails.length;
      try {
        withEnv_({ SUPABASE_ACTIVE: '1', SUPABASE_API_URL: 'https://abc.supabase.co/functions/v1/api', AUTH_PEPPER: 'pepper-ujian' }, function () {
        const out = WorkerService.tick();
        t.eq(out.sent + out.failed, 2);
        t.ok(st.mails.length > before, 'MailApp dipanggil');
        const ack = calls.filter(function (c) { return c.action === 'system.ack'; })[0];
        t.ok(ack && ack.payload.results.length === 2 && ack.payload.results[0].ok === true, 'ack');
        const c0 = calls[0];
        t.eq(c0.worker, SecurityUtils.bytesToHex(Utilities.computeHmacSha256Signature(
          'fkmit-worker-v1|' + c0.ts + '|system.tick|' + SecurityUtils.sha256Hex(JSON.stringify(c0.payload)), 'pepper-ujian')), 'tandatangan terikat pada ts, tindakan & kandungan');
        t.ok(Math.abs(Date.now() - c0.ts) < 60000, 'ts semasa');
        });
      } finally { st.fetchHandler = null; }
    }, { nodeOnly: true }],
    ['Push melalui Supabase: pelayan membaris gilir; pekerja hantar FCM, laporkan status & token mati', function (t) {
      const st = globalThis.__mockState;
      const u = TestHelpers.user('relay');
      TestAssert.apiOk(TestHelpers.call(u.token, 'push.register', { token: 'liveTok_' + 'c'.repeat(40) }));
      TestAssert.apiOk(TestHelpers.call(u.token, 'push.register', { token: 'deadTok_' + 'd'.repeat(40) }));
      /* 1) Sisi pelayan Supabase: tiada akaun servis; PUSH_RELAY menentukan status; mesej dibaris gilir */
      const queued = [];
      PushService.testOutbox = { queue: function (kind, payload) { queued.push({ kind: kind, payload: payload }); } };
      try {
        withEnv_({ FCM_SERVICE_ACCOUNT: '', PUSH_RELAY: '' }, function () {
          t.eq(PushService.enabled(), false, 'tiada pekerja FCM → tidak aktif');
          t.eq(PushService.sendToUser(u.user.id, { title: 'A', body: 'B' }), 0);
        });
        withEnv_({ FCM_SERVICE_ACCOUNT: '', PUSH_RELAY: '1' }, function () {
          t.eq(PushService.enabled(), true, 'pekerja melaporkan FCM → aktif');
          t.eq(TestAssert.apiOk(api({ action: 'public.config' })).PUSH_ENABLED, true, 'butang notifikasi telefon dipaparkan');
          const before = st.fetches.length;
          t.eq(PushService.sendToUser(u.user.id, { title: 'Tempahan baharu', body: 'X', path: '#/admin/tempahan/1' }), 2, 'dibaris gilir untuk 2 peranti');
          t.eq(st.fetches.length, before, 'tiada panggilan rangkaian di pelayan');
        });
      } finally { PushService.testOutbox = null; }
      t.eq(queued.length, 1);
      t.eq(queued[0].kind, 'push');
      t.eq(queued[0].payload.tokens.length, 2);
      t.eq(queued[0].payload.msg.title, 'Tempahan baharu');
      const deadId = queued[0].payload.tokens.filter(function (x) { return x.token.indexOf('deadTok') === 0; })[0].id;

      /* 2) Sisi pekerja Apps Script: tuntut item push → FCM; ack membawa token mati; status FCM dilaporkan */
      const calls = [];
      st.fetchHandler = function (url, params) {
        if (/oauth2/.test(url)) return { code: 200, body: { access_token: 'ya29.relay', expires_in: 3599 } };
        if (/fcm\.googleapis/.test(url)) {
          return JSON.parse(params.payload).message.token.indexOf('deadTok') === 0 ? { code: 404, body: { error: { details: [{ errorCode: 'UNREGISTERED' }] } } } : { code: 200, body: { name: 'm/1' } };
        }
        const b = JSON.parse(params.payload);
        calls.push(b);
        if (b.action === 'system.tick') return { code: 200, body: { success: true, data: { maintenance: {}, mails: [{ id: '9', kind: 'push', payload: queued[0].payload }] } } };
        return { code: 200, body: { success: true, data: {} } };
      };
      CacheService.getScriptCache().remove(PushService.TOKEN_CACHE_KEY);
      try {
        withEnv_({ SUPABASE_ACTIVE: '1', SUPABASE_API_URL: 'https://abc.supabase.co/functions/v1/api', AUTH_PEPPER: 'pepper-ujian', FCM_SERVICE_ACCOUNT: globalThis.__testServiceAccount }, function () {
          const out = WorkerService.tick();
          t.eq(out.pushed, 1, 'satu peranti berjaya');
        });
      } finally { st.fetchHandler = null; }
      t.eq(calls[0].payload.pushRelay, true, 'pekerja melaporkan FCM dikonfigurasi');
      const ack = calls.filter(function (c) { return c.action === 'system.ack'; })[0];
      t.ok(ack.payload.results[0].ok, 'ack ok');
      t.eq(ack.payload.results[0].revoke.join(','), deadId, 'token mati dilaporkan untuk dibatalkan');
      /* 3) Pelayan: batalkan token mati & simpan status relay */
      t.eq(PushService.revokeTokens([deadId, 'bukan-id']), 1);
      t.eq(PushTokenRepository.activeByUser(u.user.id).length, 1);
      const props = PropertiesService.getScriptProperties();
      try {
        t.eq(PushService.setRelay(true), true);
        t.eq(props.getProperty('PUSH_RELAY'), '1');
        t.eq(PushService.setRelay(true), false, 'tiada perubahan');
        t.eq(PushService.setRelay(false), true);
        t.eq(PushService.enabled(), false);
      } finally { props.deleteProperty('PUSH_RELAY'); Env.reset(); }
    }, { nodeOnly: true }],
    ['Web Push VAPID di pelayan Supabase: langganan disahkan; wp1_ → outbox webpush, token FCM → pekerja (jika relay)', function (t) {
      const sub = function (endpoint) {
        return 'wp1_' + Utilities.base64EncodeWebSafe(JSON.stringify({ endpoint: endpoint, keys: { p256dh: 'B' + 'x'.repeat(86), auth: 'a'.repeat(22) } })).replace(/=+$/, '');
      };
      t.ok(PushService.parseWebPush(sub('https://fcm.googleapis.com/fcm/send/abc')), 'Chrome/Android');
      t.ok(PushService.parseWebPush(sub('https://web.push.apple.com/QAbc')), 'Safari/iPhone');
      t.eq(PushService.parseWebPush(sub('https://evil.example.com/x')), null, 'hos luar ditolak');
      t.eq(PushService.parseWebPush(sub('https://fcm.googleapis.com.evil.com/x')), null, 'hos menyamar ditolak');
      t.eq(PushService.parseWebPush('wp1_rosak'), null);
      const u = TestHelpers.user('vapid');
      TestAssert.apiFail(TestHelpers.call(u.token, 'push.register', { token: sub('https://evil.example.com/x') }), ERROR_CODES.VALIDATION_ERROR);
      TestAssert.apiOk(TestHelpers.call(u.token, 'push.register', { token: sub('https://fcm.googleapis.com/fcm/send/' + 'q'.repeat(20)), platform: 'ANDROID' }));
      TestAssert.apiOk(TestHelpers.call(u.token, 'push.register', { token: 'oldFcmTok_' + 'f'.repeat(40) }));
      const queued = [];
      PushService.testOutbox = { queue: function (kind, payload) { queued.push({ kind: kind, payload: payload }); } };
      PushService.testVapid = 'BTestVapidPublicKey';
      try {
        withEnv_({ PUSH_RELAY: '', PUBLIC_BASE_URL: 'https://contoh.github.io/app/' }, function () {
          t.eq(PushService.enabled(), true, 'VAPID sahaja sudah mencukupi (tanpa Firebase)');
          const cfg = TestAssert.apiOk(api({ action: 'public.config' }));
          t.eq(cfg.VAPID_PUBLIC_KEY, 'BTestVapidPublicKey');
          t.eq(PushService.sendToUser(u.user.id, { title: 'Tempahan baharu', body: 'X', path: '#/admin/tempahan/1', type: 'RECORD_CREATED', ref: 'TP-1', badge: 3 }), 1, 'FCM tidak dihantar tanpa relay');
        });
        withEnv_({ PUSH_RELAY: '1' }, function () { t.eq(PushService.sendToUser(u.user.id, { title: 'T', body: 'B' }), 2, 'dengan relay: webpush + FCM'); });
      } finally { PushService.testOutbox = null; PushService.testVapid = null; }
      const w = queued.filter(function (q) { return q.kind === 'webpush'; });
      t.eq(w.length, 2);
      t.eq(w[0].payload.msg.wp, 1);
      t.eq(w[0].payload.msg.url, 'https://contoh.github.io/app/#/admin/tempahan/1', 'pautan penuh');
      t.eq(w[0].payload.msg.tag, 'RECORD_CREATED:TP-1', 'tag unik setiap rekod');
      t.eq(w[0].payload.msg.badge, '3');
      t.ok(/^K-/.test(w[0].payload.id) && w[0].payload.token.indexOf('wp1_') === 0);
      t.eq(queued.filter(function (q) { return q.kind === 'push'; }).length, 1, 'FCM lama → pekerja');
    }, { nodeOnly: true }],
    ['Pemindahan: semua sheet + Script Properties dihantar; gagal → kembali ke mod biasa', function (t) {
      const st = globalThis.__mockState;
      let sent = null;
      let okReply = false;
      st.fetchHandler = workerFetch_(function (b) {
        if (b.action === 'system.import') {
          sent = b.payload;
          t.ok(WorkerService.verifyImport(b.payload.nonce).ok, 'nonce disahkan semasa import');
          t.ok(!WorkerService.verifyImport('x'.repeat(43)).ok, 'nonce lain ditolak');
          return { code: 200, body: okReply ? { success: true, data: { sheets: 3, rows: 9, props: 2 } } : { success: false, code: 'FORBIDDEN', message: 'Import ditutup.' } }; }
        if (b.action === 'system.status') return { code: 200, body: okReply ? { success: true, data: {} } : { success: false, code: 'FORBIDDEN', message: 'Tandatangan pekerja tidak sah.' } };
        return { code: 200, body: { success: true, data: { maintenance: {}, mails: [] } } };
      });
      const props = PropertiesService.getScriptProperties();
      Env.set('SUPABASE_API_URL', 'https://abc.supabase.co/functions/v1/api');
      Env.set('DATA_KEY_SALINAN', TEST_DATA_KEY_);
      try {
        let threw = false;
        try { WorkerService.migrate(); } catch (e) { threw = true; }
        t.ok(threw, 'import ditolak → ralat');
        t.eq(WorkerService.state(), '', 'kembali ke mod biasa');
        t.ok(sent && sent.sheets.some(function (s) { return s.name === 'USERS' && s.header[0] === 'user_id'; }), 'sheet USERS dihantar');
        t.ok(sent.props.AUTH_PEPPER, 'AUTH_PEPPER dihantar');
        t.ok(!('DATA_KEY_SALINAN' in sent.props), 'salinan kunci TIDAK dihantar ke Supabase');
        t.ok(!WorkerService.verifyImport(sent.nonce).ok, 'nonce tidak sah selepas mod biasa dipulihkan');
        okReply = true;
        const r = WorkerService.migrate();
        t.eq(r.rows, 9);
        t.eq(WorkerService.state(), '1');
        t.ok(!PropertiesService.getScriptProperties().getProperty('SUPABASE_IMPORT_NONCE'), 'nonce dibuang');
        let blocked = null;
        try { Database.withLock(function () { return 1; }); } catch (e) { blocked = e; }
        t.ok(blocked && blocked.code === ERROR_CODES.MAINTENANCE, 'tulisan ke Google Sheets ditolak selepas pemindahan');
        t.ok(ScriptApp.getProjectTriggers().some(function (x) { return x.getHandlerFunction() === 'workerTick'; }), 'pencetus workerTick');
      } finally {
        props.deleteProperty('SUPABASE_ACTIVE');
        props.deleteProperty('SUPABASE_API_URL');
        props.deleteProperty('DATA_KEY_SALINAN');
        WorkerService.removeTrigger();
        Env.reset();
        st.fetchHandler = null;
      }
    }, { nodeOnly: true }],
    ['Pemindahan: jawapan import hilang tetapi import berjaya → pulih (tidak kembali ke Google Sheets)', function (t) {
      const st = globalThis.__mockState;
      st.fetchHandler = workerFetch_(function (b) {
        if (b.action === 'system.import') return { code: 502, body: '<html>Bad gateway</html>' };
        if (b.action === 'system.status') return { code: 200, body: { success: true, data: { pending: 0 } } };
        return { code: 200, body: { success: true, data: { maintenance: {}, mails: [] } } };
      });
      Env.set('SUPABASE_API_URL', 'https://abc.supabase.co/functions/v1/api');
      Env.set('DATA_KEY_SALINAN', TEST_DATA_KEY_);
      const props = PropertiesService.getScriptProperties();
      try {
        const r = WorkerService.migrate();
        t.ok(r.recovered, 'dipulihkan');
        t.eq(WorkerService.state(), '1');
      } finally {
        props.deleteProperty('SUPABASE_ACTIVE');
        props.deleteProperty('SUPABASE_API_URL');
        props.deleteProperty('SUPABASE_IMPORT_NONCE');
        props.deleteProperty('DATA_KEY_SALINAN');
        WorkerService.removeTrigger();
        Env.reset();
        st.fetchHandler = null;
      }
    }, { nodeOnly: true }],
    ['Lampiran untuk pelayan Supabase (fileRelay): tandatangan wajib, fail disahkan semula, baca hanya dalam folder lampiran, buang melalui pekerja', function (t) {
      const props = PropertiesService.getScriptProperties();
      const pepper = Env.get('AUTH_PEPPER') || 'pepper-ujian';
      const sign = function (op, payload, ts) {
        return SecurityUtils.bytesToHex(Utilities.computeHmacSha256Signature('fkmit-file-v1|' + ts + '|' + op + '|' + SecurityUtils.sha256Hex(JSON.stringify(payload)), pepper));
      };
      const req = function (op, payload, opts) {
        const o = opts || {};
        const ts = o.ts || Date.now();
        return { op: op, payload: payload, ts: ts, sig: o.sig || sign(op, payload, ts) };
      };
      const png = { recordId: 'TK-ABC', name: 'skrin.png', mimeType: 'image/png', data: TestHelpers.PNG_1PX };
      t.throws(function () { WorkerService.fileRelay(req('upload', png)); }, ERROR_CODES.FORBIDDEN, 'mod biasa: ditolak');
      Env.set('AUTH_PEPPER', pepper);
      Env.set('SUPABASE_ACTIVE', '1');
      try {
        t.throws(function () { WorkerService.fileRelay(req('upload', png, { sig: 'a'.repeat(64) })); }, ERROR_CODES.FORBIDDEN, 'tandatangan salah');
        t.throws(function () { WorkerService.fileRelay(req('upload', png, { ts: Date.now() - 10 * 60 * 1000 })); }, ERROR_CODES.FORBIDDEN, 'lapuk');
        const tampered = req('upload', png);
        tampered.payload = Object.assign({}, png, { name: 'lain.png' });
        t.throws(function () { WorkerService.fileRelay(tampered); }, ERROR_CODES.FORBIDDEN, 'kandungan diubah');
        t.throws(function () { WorkerService.fileRelay(req('upload', Object.assign({}, png, { mimeType: 'application/pdf', name: 'x.pdf' }))); }, ERROR_CODES.VALIDATION_ERROR, 'kandungan tidak sepadan jenis');
        const up = WorkerService.fileRelay(req('upload', png));
        t.ok(up.id && up.size > 0, 'disimpan di Drive');
        const got = WorkerService.fileRelay(req('read', { id: up.id }));
        t.eq(got.data.replace(/=+$/, ''), TestHelpers.PNG_1PX.replace(/=+$/, ''), 'dibaca semula');
        const outside = DriveApp.createFolder('Folder lain').createFile(Utilities.newBlob([1, 2, 3], 'image/png', 'luar.png'));
        t.throws(function () { WorkerService.fileRelay(req('read', { id: outside.getId() })); }, ERROR_CODES.NOT_FOUND, 'fail di luar folder lampiran');
        t.throws(function () { WorkerService.fileRelay(req('hapus', { id: up.id })); }, ERROR_CODES.VALIDATION_ERROR);
        const out = { sent: 0, failed: 0 };
        const res = WorkerService.deliver_([{ id: '1', kind: 'drive', payload: { op: 'trash', id: up.id } }, { id: '2', kind: 'drive', payload: { op: 'trash', id: outside.getId() } }], out);
        t.ok(res[0].ok && res[1].ok, 'ack');
        t.ok(DriveApp.getFileById(up.id).isTrashed(), 'lampiran dibuang');
        t.ok(!DriveApp.getFileById(outside.getId()).isTrashed(), 'fail luar folder tidak disentuh');
      } finally {
        props.deleteProperty('SUPABASE_ACTIVE');
        Env.reset();
      }
    }, { nodeOnly: true }],
    ['Kunci data: cap jari sama dengan pelayan (vektor silang); tanpa salinan / kunci berbeza → pemindahan ditolak tanpa menghantar data', function (t) {
      t.eq(WorkerService.keyFingerprint(TEST_DATA_KEY_), TEST_DATA_KEY_FP_, 'base64');
      t.eq(WorkerService.keyFingerprint('07'.repeat(32)), TEST_DATA_KEY_FP_, 'hex');
      t.throws(function () { WorkerService.keyBytes_('pendek'); });
      t.eq(WorkerService.keyBytes_(WorkerService.newDataKey()).length, 32, 'kunci baharu 32 bait');
      t.ok(WorkerService.newDataKey() !== WorkerService.newDataKey(), 'rawak');
      const st = globalThis.__mockState;
      const props = PropertiesService.getScriptProperties();
      let imports = 0;
      Env.set('SUPABASE_API_URL', 'https://abc.supabase.co/functions/v1/api');
      try {
        st.fetchHandler = workerFetch_(function (b) { if (b.action === 'system.import') imports++; return { code: 200, body: { success: true, data: {} } }; });
        t.throws(function () { WorkerService.migrate(); }, '', 'tiada salinan kunci');
        Env.set('DATA_KEY_SALINAN', TEST_DATA_KEY_);
        st.fetchHandler = workerFetch_(function (b) { if (b.action === 'system.import') imports++; return { code: 200, body: { success: true, data: {} } }; }, 'ffffffffffffffff');
        t.throws(function () { WorkerService.migrate(); }, '', 'kunci pelayan berbeza');
        st.fetchHandler = workerFetch_(function (b) { if (b.action === 'system.import') imports++; return { code: 200, body: { success: true, data: {} } }; }, '');
        t.throws(function () { WorkerService.migrate(); }, '', 'pelayan tanpa DATA_KEY');
        t.eq(imports, 0, 'tiada data dihantar');
        t.eq(WorkerService.state(), '');
      } finally {
        props.deleteProperty('SUPABASE_API_URL');
        props.deleteProperty('DATA_KEY_SALINAN');
        Env.reset();
        st.fetchHandler = null;
      }
    }, { nodeOnly: true }],
    ['Berpatah balik (pindahKeSheets): data Supabase ditulis ke spreadsheet asal, email tertunggak dihantar, mod Google Sheets aktif', function (t) {
      const st = globalThis.__mockState;
      const props = PropertiesService.getScriptProperties();
      const snap = WorkerService.snapshot();
      /* Data "di Supabase": tetapan diubah & satu maklum balas baharu ditambah semasa mod Supabase */
      const edge = snap.map(function (s) { return { name: s.name, header: s.header, rows: s.rows.map(function (r) { return r.slice(); }) }; });
      const settings = edge.filter(function (s) { return s.name === 'SETTINGS'; })[0];
      const kcol = settings.header.indexOf('setting_key');
      const vcol = settings.header.indexOf('setting_value');
      let lm = settings.rows.filter(function (r) { return r[kcol] === 'LANDING_MESSAGE'; })[0];
      if (!lm) { lm = settings.header.map(function () { return ''; }); lm[kcol] = 'LANDING_MESSAGE'; settings.rows.push(lm); }
      lm[vcol] = 'Ditulis semasa mod Supabase';
      const fb = edge.filter(function (s) { return s.name === 'FEEDBACK'; })[0];
      const row = fb.header.map(function () { return ''; });
      row[0] = 'B-EDGE-1'; row[fb.header.indexOf('name')] = 'Pengguna Supabase'; row[fb.header.indexOf('message')] = '=HYPERLINK("x")'; row[fb.header.indexOf('status')] = 'NEW';
      fb.rows.push(row);
      const calls = [];
      let failExport = false;
      st.fetchHandler = workerFetch_(function (b) {
        calls.push(b.action);
        if (b.action === 'system.handback') {
          return { code: 200, body: { success: true, data: { sheets: failExport ? edge.filter(function (s) { return s.name !== 'USERS'; }) : edge,
            mails: [{ id: '77', kind: 'mail', payload: { to: 'tertunggak@test.local', subject: 'Email tertunggak', htmlBody: '<p>x</p>' } }] } } };
        }
        return { code: 200, body: { success: true, data: {} } };
      });
      Env.set('SUPABASE_API_URL', 'https://abc.supabase.co/functions/v1/api');
      Env.set('AUTH_PEPPER', Env.get('AUTH_PEPPER') || 'pepper-ujian');
      try {
        t.throws(function () { WorkerService.restore(); }, '', 'mod biasa → tiada apa untuk dipulangkan');
        Env.set('SUPABASE_ACTIVE', '1');
        WorkerService.ensureTrigger();
        /* Gagal selepas handback → pelayan dibuka semula, mod Supabase kekal */
        failExport = true;
        t.throws(function () { WorkerService.restore(); });
        t.eq(WorkerService.state(), '1', 'mod Supabase kekal');
        t.ok(calls.indexOf('system.resume') >= 0, 'system.resume dipanggil');
        failExport = false;
        calls.length = 0;
        const mailsBefore = st.mails.length;
        const r = pindahKeSheets();
        t.eq(WorkerService.state(), '', 'mod Google Sheets aktif');
        t.ok(calls.indexOf('system.handback') >= 0 && calls.indexOf('system.resume') < 0, 'handback tanpa resume');
        t.eq(r.emailDihantar, 1);
        t.ok(st.mails.length > mailsBefore, 'email tertunggak dihantar oleh MailApp');
        t.ok(!ScriptApp.getProjectTriggers().some(function (x) { return x.getHandlerFunction() === 'workerTick'; }), 'pencetus workerTick dibuang');
        TestAssert.apiOk(api({ action: 'public.config' }));
        t.eq(TestAssert.apiOk(api({ action: 'public.config' })).LANDING_MESSAGE, 'Ditulis semasa mod Supabase', 'tetapan daripada Supabase (cache dibatalkan)');
        const sh = Database.open().getSheetByName('FEEDBACK');
        const vals = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
        const got = vals.filter(function (v) { return v[0] === 'B-EDGE-1'; })[0];
        t.ok(got, 'rekod baharu daripada Supabase wujud dalam Google Sheets');
        t.eq(got[fb.header.indexOf('message')], '=HYPERLINK("x")', 'teks seperti formula disimpan sebagai teks (awalan apostrof)');
        t.eq(r.rows, edge.reduce(function (n, s) { return n + s.rows.length; }, 0));
        let ok = true;
        try { Database.withLock(function () { return 1; }); } catch (e) { ok = false; }
        t.ok(ok, 'tulisan ke Google Sheets dibenarkan semula');
      } finally {
        props.deleteProperty('SUPABASE_ACTIVE');
        props.deleteProperty('SUPABASE_API_URL');
        props.deleteProperty('SUPABASE_RETURNED_AT');
        WorkerService.removeTrigger();
        Env.reset();
        st.fetchHandler = null;
      }
    }, { nodeOnly: true }]
  ]
};

