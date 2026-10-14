/**
 * test-edge-pg.mjs — ujian integrasi runtime Supabase (supabase/functions/api) terhadap Postgres SEBENAR.
 *
 *   EDGE_TEST_PG=postgres://postgres@localhost:54329/postgres POSTGRES_JS=<dir node_modules/postgres> node tools/test-edge-pg.mjs
 *
 * Aliran: data demo dijana dengan backend GAS (mock) → diimport seperti pindahKeSupabase() → semua tindakan melalui
 * runtime.mjs + crypto-store.mjs + store-pg.mjs: log masuk, borang awam, peraturan satu-borang-setahun di bawah konkurensi,
 * kunci kongsi, sheet malas, penyelenggaraan, outbox email, Web Push, cache isolat, serah kembali ke Google Sheets.
 * Setiap ujian penting juga mengimbas pangkalan data MENTAH: tiada data peribadi dalam teks biasa.
 */
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..');
const PG = process.env.EDGE_TEST_PG;
if (!PG) { console.log('EDGE_TEST_PG tidak ditetapkan — ujian Postgres dilangkau.'); process.exit(0); }
const postgres = (await import(pathToFileURL(path.join(process.env.POSTGRES_JS || path.join(ROOT, 'node_modules/postgres'), 'src/index.js')).href)).default;

execFileSync(process.execPath, [path.join(here, 'build-edge.js')], { stdio: 'inherit' });
const FN = path.join(ROOT, 'supabase/functions/api');
const { createBackend } = await import(pathToFileURL(path.join(FN, 'backend.mjs')).href);
const { createRuntime } = await import(pathToFileURL(path.join(FN, 'runtime.mjs')).href);
const { createPgStore } = await import(pathToFileURL(path.join(FN, 'store-pg.mjs')).href);
const { createCryptoStore, MARK } = await import(pathToFileURL(path.join(FN, 'crypto-store.mjs')).href);
const { createFileRelay } = await import(pathToFileURL(path.join(FN, 'files.mjs')).href);
const { createWorkerApi } = await import(pathToFileURL(path.join(FN, 'worker.mjs')).href);

const sql = postgres(PG, { prepare: false, max: 6, onnotice: () => {} });
await sql.unsafe('drop schema if exists private cascade');
for (const f of fs.readdirSync(path.join(ROOT, 'supabase/migrations')).sort()) await sql.unsafe(fs.readFileSync(path.join(ROOT, 'supabase/migrations', f), 'utf8'));

let failed = 0;
let passed = 0;
const quiet = { log() {}, info() {}, warn() {}, error: (...a) => console.error('  [log]', ...a) };
async function test(name, fn) {
  try { await fn(); passed++; console.log('✔ ' + name); } catch (e) { failed++; console.log('✘ ' + name + '\n    ' + (e && e.stack || e)); }
}
const assert = (c, m) => { if (!c) throw new Error(m || 'gagal'); };

// ---------------------------------------------------------------- 1. Data sumber (Google Sheets tiruan) → import
const { loadGas } = require('./load-gas');
const gas = loadGas({ quiet: true, properties: { BOOTSTRAP_SUPER_ADMIN_EMAIL: 'super@demo.local', APP_ENV: 'PRODUCTION' } });
gas.context.setupDatabase();
require('./seed-demo')(gas.context, gas);
const ss = gas.env.state.spreadsheets[Object.keys(gas.env.state.spreadsheets)[0]];
const sheets = ss.getSheets().map((sh) => {
  const lr = sh.getLastRow();
  const lc = sh.getLastColumn();
  const values = lr && lc ? sh.getRange(1, 1, lr, lc).getValues() : [];
  return { name: sh.getName(), header: values[0] || [], rows: values.slice(1) };
});
const props = Object.assign({}, gas.env.state.props);
delete props.SPREADSHEET_ID;
props.DATA_KEY_SALINAN = 'tidak-boleh-dihantar';
props.WORKER_URL = 'https://script.google.com/macros/s/ujian/exec';
/* Apps Script (tiruan) dalam mod Supabase: menerima permintaan lampiran bertandatangan (doPost {fileRelay}) → Drive tiruan */
const vm = require('vm');
vm.runInContext("Env.set('SUPABASE_ACTIVE', '1')", gas.context);
const relayCalls = [];
const gasFetch = async (url, init) => {
  relayCalls.push(JSON.parse(init.body).fileRelay.op);
  const out = gas.context.doPost({ postData: { contents: init.body } });
  return { text: async () => out.getContent() };
};
/* Data lama yang "kotor": ID berganda & baris tanpa ID dalam PEGAWAI */
const pgSheet = sheets.find((x) => x.name === 'PEGAWAI');
const dupRow = pgSheet.rows[0].slice();
dupRow[pgSheet.header.indexOf('nama')] = 'Pendua Lama';
pgSheet.rows.push(dupRow, ['', 'tanpa id']);

/* Nilai peribadi yang TIDAK boleh wujud dalam pangkalan data mentah (teks biasa) */
const SENTINELS = ['super@demo.local', 'user@demo.local', 'Nur Aisyah binti Ahmad', 'teknikal0@demo.local', 'Pegawai Teknologi Maklumat A'];
const DATA_KEY = crypto.randomBytes(32).toString('base64');
const rawDump = async () => {
  const parts = await Promise.all([
    sql`select coalesce(string_agg(vals::text, '|'), '') as t from private.sheet_rows`,
    sql`select coalesce(string_agg(k || '=' || v, '|'), '') as t from private.kv`,
    sql`select coalesce(string_agg(k || '=' || v, '|'), '') as t from private.props`,
    sql`select coalesce(string_agg(payload::text || coalesce(last_error, ''), '|'), '') as t from private.outbox`
  ]);
  return parts.map((p) => p[0].t).join('\n');
};
const assertNoPlain = async (extra) => {
  const dump = await rawDump();
  for (const v of SENTINELS.concat(extra || [])) assert(dump.indexOf(v) < 0, 'teks biasa dalam pangkalan data: ' + v);
};

const pgStore = createPgStore(sql);
const store = createCryptoStore(pgStore, DATA_KEY);
const mkRuntime = () => createRuntime({ store, createBackend, log: quiet, files: createFileRelay({ fetchImpl: gasFetch }) });
const NONCE = 'n'.repeat(43);
const pushCalls = [];
const pushFetch = async (url, init) => { pushCalls.push({ url, init }); return { status: url.indexOf('/gone') >= 0 ? 410 : 201, body: null }; };
const worker = createWorkerApi({ store, runtime: mkRuntime(), log: quiet, verifyImport: async (n) => n === NONCE, pushFetch });
const nodeCrypto = await import('node:crypto');
let PEPPER = '';
const signed = (action, payload, tsShift) => {
  const p = payload || {};
  const ts = Date.now() + (tsShift || 0);
  const h = nodeCrypto.createHash('sha256').update(JSON.stringify(p)).digest('hex');
  return { action, payload: p, ts, worker: nodeCrypto.createHmac('sha256', PEPPER).update('fkmit-worker-v1|' + ts + '|' + action + '|' + h).digest('hex') };
};

await test('Import: tanpa nonce sah ditolak; dengan nonce → semua sheet & Script Properties dipindah (TERSULIT); ditutup selepas itu', async () => {
  const bad = await worker.handle({ action: 'system.import', payload: { sheets, props, nonce: 'x'.repeat(43) } });
  assert(!bad.success && bad.code === 'FORBIDDEN', 'nonce palsu ' + JSON.stringify(bad));
  const r = await worker.handle({ action: 'system.import', payload: { sheets, props, nonce: NONCE } });
  assert(r.success, JSON.stringify(r));
  assert(r.data.sheets === sheets.length, 'bilangan sheet');
  assert(r.data.droppedBlankId === 1, 'baris tanpa ID dilaporkan');
  PEPPER = props.AUTH_PEPPER;
  const again = await worker.handle({ action: 'system.import', payload: { sheets, props, nonce: NONCE } });
  assert(!again.success, 'import kedua sepatutnya ditolak');
  await assertNoPlain([PEPPER, props.FORM_SECRET]);
  const pk = (await sql`select k from private.props`).map((x) => x.k);
  assert(pk.indexOf('DATA_KEY_SALINAN') < 0, 'salinan kunci tidak disimpan di Supabase');
  const one = (await sql`select k, vals from private.sheet_rows where sheet = 'USERS' limit 1`)[0];
  assert(one.vals.length === 2 && one.vals[0] === one.k && one.vals[1].indexOf(MARK) === 0, 'format baris [id, sifir]: ' + JSON.stringify(one.vals).slice(0, 80));
});

const A = mkRuntime();
const B = mkRuntime();
const call = async (rt, action, payload, token, meta) => (await rt.handle({ action, payload: payload || {}, token: token || '', meta: meta || {} })).result;
const ok = (r) => { if (!r.success) throw new Error(r.code + ': ' + r.message); return r.data; };

let sup;
await test('Log masuk dengan kata laluan sedia ada (AUTH_PEPPER tersulit dibawa bersama)', async () => {
  sup = ok(await call(A, 'auth.login', { email: 'super@demo.local', password: 'Demo1234' }));
  const me = ok(await call(B, 'auth.me', {}, sup.token));
  ok(await call(A, 'admin.settings.update', { changes: { NOTIFY_EMAIL_ENABLED: true, ADMIN_EMAIL: 'unit.it.rahsia@utm.my' } }, sup.token));
  assert(me.user.role === 'SUPER_ADMIN', 'peranan');
});

let labs;
await test('Data diimport boleh dibaca (makmal, aset, tiket, overview)', async () => {
  const boot = ok(await call(A, 'public.bootstrap'));
  assert(boot.modules && boot.modules.length >= 5, 'modul');
  labs = ok(await call(A, 'crud.list', { module: 'makmal', pageSize: 50 }, sup.token)).items;
  assert(labs.length >= 6, 'makmal ' + labs.length);
  const aset = ok(await call(B, 'crud.list', { module: 'aset', pageSize: 100 }, sup.token));
  assert(aset.total >= 70 || aset.items.length >= 70, 'aset ' + aset.items.length);
  const ov = await call(A, 'aset.overview', {}, sup.token);
  assert(ov.success, 'overview: ' + ov.message);
});

let cats;
const tiket = (rt, extra) => call(rt, 'crud.publicCreate', Object.assign({
  module: 'tiket', formToken: gas.get('SecurityUtils').signFormToken('crud:tiket', Date.now() - 5000), nama: 'Pengadu Rahsia', email: 'pengadu.rahsia@utm.my',
  tajuk: 'PC makmal tidak boleh hidup', kategori: cats[0].id, lokasi: 'C23 Bilik 112', keterangan: 'PC nombor 12 tidak boleh hidup sejak pagi.'
}, extra));

await test('Borang awam tiket: dicipta, email masuk outbox (tersulit), kunci had kadar di kv (nama disamarkan)', async () => {
  cats = ok(await call(A, 'public.categories'));
  const before = (await sql`select count(*)::int as n from private.outbox`)[0].n;
  const r = ok(await tiket(A));
  assert(r.refNo, 'refNo');
  const after = (await sql`select count(*)::int as n from private.outbox`)[0].n;
  assert(after > before, 'outbox email');
  const kv = await sql`select k from private.kv`;
  assert(kv.length > 0 && kv.every((x) => x.k.indexOf('h1:') === 0), 'kunci kv disamarkan: ' + kv.map((x) => x.k).slice(0, 3));
  const got = ok(await call(B, 'crud.list', { module: 'tiket', q: r.refNo }, sup.token)).items;
  assert(got.length === 1, 'isolat lain nampak tiket');
  await assertNoPlain(['pengadu.rahsia@utm.my', 'Pengadu Rahsia', 'PC nombor 12']);
});

const year = new Date().getFullYear();
await test('Konkurensi: 6 permohonan serentak untuk makmal & tahun sama → tepat 1 berjaya (satu borang setiap makmal setahun)', async () => {
  const lab = labs.find((x) => x.values && x.values.kod === 'ME-06');
  assert(lab, 'makmal ME-06');
  const rts = [0, 1, 2, 3, 4, 5].map(() => mkRuntime());
  await Promise.all(rts.map((rt) => call(rt, 'public.config')));
  const res = await Promise.all(rts.map((rt) => call(rt, 'crud.create', {
    module: 'keperluan', makmal: lab.id, tahun: year, jumlahSediaAda: 20, berfungsi: 18, tidakSesuai: 1, rosakBolehBaiki: 2, rosakLupus: 0,
    jenisPermohonan: 'GANTI', keutamaan: 'TINGGI', hargaSeunit: 4500, spesifikasi: 'Core i7', justifikasi: 'Ujian konkurensi edge untuk satu makmal.'
  }, sup.token)));
  const okN = res.filter((r) => r.success).length;
  assert(okN === 1, 'berjaya: ' + okN + ' → ' + JSON.stringify(res.map((r) => r.code ? r.code + ' ' + r.message : 'OK')));
  const list = ok(await call(A, 'crud.list', { module: 'keperluan', pageSize: 50 }, sup.token)).items.filter((x) => x.values && x.values.makmal === lab.id && Number(x.values.tahun) === year);
  assert(list.length === 1, 'rekod: ' + list.length);
});

await test('Idempotensi meta.rid: cubaan semula tindakan menulis → jawapan asal, tiada rekod berganda', async () => {
  const rid = 'rid' + Date.now() + 'abcdef';
  const p = { module: 'tiket', formToken: gas.get('SecurityUtils').signFormToken('crud:tiket', Date.now() - 5000), nama: 'Ujian Rid', email: 'rid@utm.my', tajuk: 'Ujian rid edge', kategori: cats[0].id, lokasi: 'C24', keterangan: 'Ujian idempotensi permintaan.' };
  const r1 = (await A.handle({ action: 'crud.publicCreate', payload: p, meta: { rid } })).result;
  const r2 = (await mkRuntime().handle({ action: 'crud.publicCreate', payload: p, meta: { rid } })).result;
  assert(r1.success && r2.success && r1.data.refNo === r2.data.refNo, JSON.stringify([r1, r2]).slice(0, 300));
  const n = ok(await call(B, 'crud.list', { module: 'tiket', q: 'Ujian rid edge', pageSize: 50 }, sup.token)).items.length;
  assert(n === 1, 'rekod ' + n);
});

await test('Status: admin tukar status tiket → isolat lain nampak perubahan', async () => {
  const list = ok(await call(A, 'crud.list', { module: 'tiket', status: 'BARU', pageSize: 50 }, sup.token));
  const t = list.items[0];
  ok(await call(A, 'crud.setStatus', { module: 'tiket', id: t.id, status: 'DALAM_TINDAKAN', note: 'ok' }, sup.token));
  const got = ok(await call(B, 'crud.get', { module: 'tiket', id: t.id }, sup.token));
  const st = (got.record || got).status;
  assert(st === 'DALAM_TINDAKAN', 'status ' + st);
});

const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
await test('Lampiran: disimpan dalam Google Drive melalui Apps Script (bertandatangan), bukan di Supabase; dibaca semula; dibuang melalui pekerja', async () => {
  const png = { name: 'skrin-rahsia.png', mimeType: 'image/png', data: PNG };
  const usr = ok(await call(A, 'auth.login', { email: 'user@demo.local', password: 'Demo1234' }));
  const d = ok(await call(A, 'crud.create', { module: 'tiket', tajuk: 'Tiket dengan lampiran', kategori: cats[0].id, lokasi: 'C23', keterangan: 'Ujian lampiran melalui Apps Script.', lampiran: [png] }, usr.token));
  assert(relayCalls.filter((x) => x === 'upload').length === 1, 'satu muat naik: ' + relayCalls.join(','));
  const full = ok(await call(B, 'crud.get', { module: 'tiket', id: d.id }, sup.token));
  assert(full.attachments && full.attachments.length === 1, 'lampiran direkod');
  const att = ok(await call(B, 'crud.attachment', { id: full.attachments[0].id }, sup.token));
  assert(att.data.replace(/=+$/, '') === PNG.replace(/=+$/, ''), 'dibaca semula daripada Drive');
  const dump = await rawDump();
  assert(dump.indexOf(PNG.slice(0, 40)) < 0 && dump.indexOf('skrin-rahsia') < 0, 'kandungan / nama fail tidak disimpan dalam teks biasa');
  const bad = await call(A, 'crud.create', { module: 'tiket', tajuk: 'Palsu', kategori: cats[0].id, lokasi: 'C23', keterangan: 'Fail palsu tidak dihantar.', lampiran: [{ name: 'x.png', mimeType: 'image/png', data: Buffer.from('bukan png').toString('base64') }] }, usr.token);
  assert(!bad.success && relayCalls.filter((x) => x === 'upload').length === 1, 'fail tidak sah ditolak di Supabase sebelum dihantar');
  ok(await call(A, 'crud.update', { module: 'tiket', id: d.id, removeAttachmentIds: [full.attachments[0].id] }, usr.token));
  const q = await store.claimOutbox(50, ['drive']);
  assert(q.some((r) => r.payload.op === 'trash'), 'tugasan buang fail untuk pekerja: ' + JSON.stringify(q));
  await store.ackOutbox(q.map((r) => ({ id: r.id, ok: true })));
});

await test('Kitar hayat aset di Supabase: pinjaman awam → dipinjam → dipulangkan; rekod aset dikemas kini merentas isolat', async () => {
  const pin = ok(await call(A, 'crud.list', { module: 'pinjaman', status: 'DIMOHON', pageSize: 20 }, sup.token)).items[0];
  assert(pin, 'pinjaman demo');
  ok(await call(A, 'crud.setStatus', { module: 'pinjaman', id: pin.id, status: 'DILULUSKAN' }, sup.token));
  ok(await call(B, 'crud.setStatus', { module: 'pinjaman', id: pin.id, status: 'DIPINJAM' }, sup.token));
  const asetId = (await call(A, 'crud.get', { module: 'pinjaman', id: pin.id }, sup.token)).data.values.aset;
  let as = ok(await call(B, 'crud.get', { module: 'aset', id: asetId }, sup.token));
  assert(as.values.dipinjam === true && /PJM-/.test(as.values.peminjamSemasa), 'aset dipinjam: ' + JSON.stringify(as.values.peminjamSemasa));
  ok(await call(A, 'crud.setStatus', { module: 'pinjaman', id: pin.id, status: 'DIPULANGKAN' }, sup.token));
  as = ok(await call(B, 'crud.get', { module: 'aset', id: asetId }, sup.token));
  assert(as.values.dipinjam === false && !as.values.peminjamSemasa, 'aset dibebaskan');
  const h = ok(await call(A, 'aset.sejarah', { id: asetId }, sup.token));
  assert(h.counts.pinjaman >= 1, 'sejarah');
  const k = ok(await call(B, 'aset.kitarHayat', {}, sup.token));
  assert(k.kehilangan.terbuka >= 1 && k.aduan.terbuka >= 1, 'ringkasan kitar hayat');
  await assertNoPlain(['Pelajar Contoh', 'pelajar.contoh@graduate.utm.my']);
});

await test('Sheet malas (AUDIT_LOGS) dimuat apabila diperlukan', async () => {
  const r = ok(await call(mkRuntime(), 'admin.audit', {}, sup.token));
  assert(r && (Array.isArray(r) ? r.length : (r.items || []).length) > 0, 'audit kosong');
});

await test('Cache isolat: permintaan baca berulang tidak memuat semula sheet', async () => {
  await call(A, 'public.config');
  const loads = A.stats.loads;
  for (let i = 0; i < 3; i++) await call(A, 'public.config');
  assert(A.stats.loads === loads, 'loads ' + loads + ' → ' + A.stats.loads);
});

await test('Kunci log masuk kongsi (kv tersulit): 5 cubaan gagal (pelbagai isolat) → akaun dikunci', async () => {
  for (let i = 0; i < 5; i++) await call(mkRuntime(), 'auth.login', { email: 'user@demo.local', password: 'salah' + i });
  const r = await call(mkRuntime(), 'auth.login', { email: 'user@demo.local', password: 'Demo1234' });
  assert(!r.success, 'sepatutnya dikunci: ' + JSON.stringify(r).slice(0, 120));
  await assertNoPlain();
});

await test('Tetapan admin disimpan (sheet SETTINGS) & dibaca isolat lain', async () => {
  ok(await call(A, 'admin.settings.update', { changes: { LANDING_MESSAGE: 'Ujian edge ' + Date.now() } }, sup.token));
  const cfg = ok(await call(B, 'public.config'));
  assert(String(cfg.LANDING_MESSAGE || '').indexOf('Ujian edge') === 0, 'tetapan');
});

await test('Pekerja: tandatangan (ts + tindakan + kandungan); tick menjalankan penyelenggaraan & menuntut email; kandungan dibuang selepas dihantar', async () => {
  assert(!(await worker.handle({ action: 'system.tick', worker: 'salah', ts: Date.now() })).success, 'tandatangan salah ditolak');
  assert(!(await worker.handle(signed('system.tick', { force: true }, -10 * 60 * 1000))).success, 'tandatangan lapuk ditolak');
  const reuse = signed('system.status', {});
  assert(!(await worker.handle(Object.assign({}, reuse, { action: 'system.handback' }))).success, 'tandatangan tidak boleh diguna untuk tindakan lain');
  const tampered = signed('system.tick', { force: false });
  tampered.payload = { force: true, limit: 999 };
  assert(!(await worker.handle(tampered)).success, 'kandungan diubah ditolak');
  const st = await worker.handle(signed('system.status', {}));
  assert(st.success && st.data.keyFp === store.fingerprint && st.data.handback === false, 'status + cap jari kunci');
  const r = await worker.handle(signed('system.tick', { force: true, limit: 50 }));
  assert(r.success, JSON.stringify(r));
  assert(r.data.mails.length > 0, 'tiada email dituntut');
  assert(r.data.maintenance && r.data.maintenance.daily, 'penyelenggaraan harian');
  const m = r.data.mails[0];
  assert(m.payload.to && m.payload.subject, 'format email (dinyahsulit untuk pekerja)');
  const ack = await worker.handle(signed('system.ack', { results: r.data.mails.map((x) => ({ id: x.id, ok: true })) }));
  assert(ack.success, 'ack');
  for (let i = 0; i < 5; i++) {
    const more = await worker.handle(signed('system.tick', { limit: 50 }));
    if (!more.data.mails.length) break;
    await worker.handle(signed('system.ack', { results: more.data.mails.map((x) => ({ id: x.id, ok: true })) }));
  }
  const pending = (await sql`select count(*)::int as n from private.outbox where sent_at is null and kind = 'mail'`)[0].n;
  assert(pending === 0, 'masih tertunggak ' + pending);
  const kept = (await sql`select count(*)::int as n from private.outbox where sent_at is not null and payload <> '{}'::jsonb`)[0].n;
  assert(kept === 0, 'kandungan email dihantar masih disimpan: ' + kept);
});

await test('Web Push VAPID: kunci awam dalam config, langganan didaftar, tiket baharu → dihantar terus oleh pelayan', async () => {
  const cfg = ok(await call(A, 'public.config'));
  assert(cfg.PUSH_ENABLED === true && /^[A-Za-z0-9_-]{87}$/.test(cfg.VAPID_PUBLIC_KEY || ''), 'kunci VAPID: ' + cfg.VAPID_PUBLIC_KEY);
  const mk = (endpoint) => {
    const e = crypto.createECDH('prime256v1'); e.generateKeys();
    return 'wp1_' + Buffer.from(JSON.stringify({ endpoint, keys: { p256dh: e.getPublicKey().toString('base64url'), auth: crypto.randomBytes(16).toString('base64url') } })).toString('base64url');
  };
  assert(!(await call(A, 'push.register', { token: mk('https://evil.example.com/x') }, sup.token)).success, 'endpoint luar ditolak');
  ok(await call(A, 'push.register', { token: mk('https://fcm.googleapis.com/fcm/send/live-admin'), platform: 'ANDROID' }, sup.token));
  ok(await call(A, 'push.register', { token: mk('https://web.push.apple.com/gone'), platform: 'IOS' }, sup.token));
  ok(await tiket(B, { tajuk: 'Push VAPID terus', email: 'push.vapid@utm.my' }));
  const q = await sql`select payload from private.outbox where kind = 'webpush' and sent_at is null`;
  assert(q.length >= 1 && q.every((r) => typeof r.payload.e === 'string'), 'outbox webpush tersulit');
  const t = await worker.handle(signed('system.tick', {}));
  assert(t.success && t.data.maintenance.webpush && t.data.maintenance.webpush.sent >= 1, 'dihantar oleh pelayan: ' + JSON.stringify(t.data.maintenance.webpush));
  assert(!t.data.mails.some((m) => m.kind === 'webpush'), 'webpush tidak diserahkan kepada Apps Script');
  const live = pushCalls.find((c) => c.url.indexOf('live-admin') >= 0);
  assert(live && /^vapid t=.+, k=/.test(live.init.headers.Authorization) && live.init.headers['Content-Encoding'] === 'aes128gcm', 'permintaan Web Push');
  const left = (await sql`select count(*)::int as n from private.outbox where kind = 'webpush' and sent_at is null`)[0].n;
  assert(left === 0, 'tertunggak ' + left);
  const toks = (await store.loadSheets(['PUSH_TOKENS']))[0].rows.map((r) => JSON.stringify(r));
  assert(toks.some((v) => v.indexOf('REVOKED') >= 0), 'langganan mati (410) dibatalkan');
  const mails = await worker.handle(signed('system.tick', { limit: 50 }));
  await worker.handle(signed('system.ack', { results: mails.data.mails.map((x) => ({ id: x.id, ok: true })) }));
});

await test('Eksport untuk sandaran pekerja (dinyahsulit)', async () => {
  const r = await worker.handle(signed('system.export', {}));
  const users = r.success && r.data.sheets.find((s) => s.name === 'USERS');
  assert(users && users.rows.some((row) => row.indexOf('super@demo.local') >= 0), 'eksport ' + JSON.stringify(r).slice(0, 200));
});

await test('ID berganda (data lama): kunci konsisten; suntingan tidak menggandakan rekod', async () => {
  const before = (await sql`select k from private.sheet_rows where sheet = 'PEGAWAI' order by pos`).map((r) => r.k);
  assert(before.some((k) => /#2$/.test(k)), 'kunci #2 ' + before.join(','));
  const list = ok(await call(A, 'crud.list', { module: 'pegawai', pageSize: 100 }, sup.token));
  const target = list.items.find((x) => x.values && x.values.nama !== 'Pendua Lama');
  ok(await call(A, 'crud.update', { module: 'pegawai', id: target.id, nama: 'Pegawai Dikemas Kini' }, sup.token));
  const after = (await sql`select k from private.sheet_rows where sheet = 'PEGAWAI' order by pos`).map((r) => r.k);
  assert(after.length === before.length, 'bilangan baris berubah: ' + before.length + ' → ' + after.length);
});

await test('rid sama dihantar serentak dari 4 isolat → satu rekod sahaja, semua mendapat jawapan sama', async () => {
  const rid = 'serentak' + Date.now() + 'xyz';
  const p = { module: 'tiket', formToken: gas.get('SecurityUtils').signFormToken('crud:tiket', Date.now() - 5000), nama: 'Serentak', email: 'serentak@utm.my', tajuk: 'Serentak rid edge', kategori: cats[0].id, lokasi: 'C24', keterangan: 'Ujian rid serentak dari empat isolat.' };
  const res = await Promise.all([0, 1, 2, 3].map(() => mkRuntime().handle({ action: 'crud.publicCreate', payload: p, meta: { rid } })));
  const refs = new Set(res.map((x) => x.result.success && x.result.data.refNo));
  assert(refs.size === 1 && !refs.has(false), JSON.stringify(res.map((x) => x.result.code || x.result.data.refNo)));
  const n = ok(await call(B, 'crud.list', { module: 'tiket', q: 'Serentak rid edge', pageSize: 50 }, sup.token)).items.length;
  assert(n === 1, 'rekod ' + n);
});

await test('Kiraan kongsi tidak hilang di bawah konkurensi: 5 cubaan log masuk gagal serentak → akaun dikunci', async () => {
  const email = 'user0@demo.local';
  await Promise.all([0, 1, 2, 3, 4].map((i) => call(mkRuntime(), 'auth.login', { email, password: 'salah' + i })));
  const r = await call(mkRuntime(), 'auth.login', { email, password: 'Demo1234' });
  assert(!r.success, 'sepatutnya dikunci: ' + JSON.stringify(r).slice(0, 160));
});

await test('Kunci salah: pelayan dengan DATA_KEY lain tidak dapat membaca data (gagal, bukan data rosak)', async () => {
  const wrong = createRuntime({ store: createCryptoStore(pgStore, crypto.randomBytes(32).toString('base64')), createBackend, log: quiet });
  let threw = false;
  try { await call(wrong, 'public.config'); } catch (e) { threw = /nyahsulit/.test(e.message); }
  assert(threw, 'sepatutnya gagal menyahsulit');
});

await test('Prestasi (dengan penyahsulitan): permintaan panas < 40 ms; isolat sejuk dimuat < 1.5 s', async () => {
  const t0 = Date.now();
  const rt = mkRuntime();
  await call(rt, 'crud.list', { module: 'aset', pageSize: 20 }, sup.token);
  const cold = Date.now() - t0;
  const t = Date.now();
  for (let i = 0; i < 20; i++) await call(rt, 'crud.list', { module: 'aset', pageSize: 20 }, sup.token);
  const ms = (Date.now() - t) / 20;
  console.log('    sejuk ' + cold + ' ms · panas purata ' + ms.toFixed(1) + ' ms / permintaan (senarai aset)');
  assert(ms < 40, ms + ' ms');
  assert(cold < 1500, 'sejuk ' + cold + ' ms');
});

await test('Pangkalan data mentah: tiada data peribadi / rahsia dalam teks biasa (imbasan akhir)', async () => {
  await assertNoPlain(['unit.it.rahsia@utm.my', PEPPER, props.FORM_SECRET, 'pengadu.rahsia@utm.my', 'push.vapid@utm.my', 'serentak@utm.my', 'Pegawai Dikemas Kini']);
});

// ---------------------------------------------------------------- Berpatah balik (pindahKeSheets) & pindah semula
let handed;
await test('Serah kembali: system.handback memulangkan semua data (dinyahsulit) + email tertunggak; tulisan selepas itu ditolak (HANDBACK)', async () => {
  ok(await tiket(A, { tajuk: 'Tiket sebelum serah kembali', email: 'sebelum@utm.my' }));
  const r = await worker.handle(signed('system.handback', {}));
  assert(r.success, JSON.stringify(r).slice(0, 200));
  handed = r.data.sheets;
  const tk = handed.find((s) => s.name === 'TIKET');
  const tcol = tk.header.indexOf('tajuk');
  assert(tk.rows.some((row) => row[tcol] === 'Tiket sebelum serah kembali'), 'tiket terkini ada dalam data dipulangkan');
  assert(r.data.mails.some((m) => m.kind === 'mail' && m.payload.to), 'email tertunggak diserahkan (dinyahsulit)');
  const st = await worker.handle(signed('system.status', {}));
  assert(st.data.handback === true, 'status handback');
  let code = '';
  try { await call(mkRuntime(), 'crud.publicCreate', { module: 'tiket', formToken: gas.get('SecurityUtils').signFormToken('crud:tiket', Date.now() - 5000), nama: 'Lewat', email: 'lewat@utm.my', tajuk: 'Selepas serah', kategori: cats[0].id, lokasi: 'C24', keterangan: 'Tulisan selepas serah kembali.' }); } catch (e) { code = e.code; }
  assert(code === 'HANDBACK', 'tulisan ditolak: ' + code);
  const n = (await store.loadSheets(['TIKET']))[0].rows.filter((row) => row.indexOf('Selepas serah') >= 0).length;
  assert(n === 0, 'tiada tulisan selepas serah kembali');
  const read = ok(await call(mkRuntime(), 'public.config'));
  assert(read && read.SYSTEM_NAME !== undefined, 'bacaan masih boleh (tidak menulis)');
});

await test('Batal serah kembali (system.resume) → tulisan diterima semula; serah semula', async () => {
  ok(await worker.handle(signed('system.resume', {})));
  ok(await tiket(B, { tajuk: 'Selepas resume', email: 'resume@utm.my' }));
  const r = await worker.handle(signed('system.handback', {}));
  assert(r.success && r.data.sheets.find((s) => s.name === 'TIKET').rows.some((row) => row.indexOf('Selepas resume') >= 0), 'data selepas resume dipulangkan');
  handed = r.data.sheets;
});

await test('Pindah semula ke Supabase selepas serah kembali: import dibuka semula, data diganti, kv & baris gilir lama dibuang', async () => {
  const changed = handed.map((s) => ({ name: s.name, header: s.header, rows: s.rows }));
  const st = changed.find((s) => s.name === 'SETTINGS');
  const kc = st.header.indexOf('setting_key'); const vc = st.header.indexOf('setting_value');
  const lm = st.rows.find((row) => row[kc] === 'LANDING_MESSAGE');
  lm[vc] = 'Ditulis di Google Sheets selepas pulang';
  const r = await worker.handle({ action: 'system.import', payload: { sheets: changed, props, nonce: NONCE } });
  assert(r.success, JSON.stringify(r).slice(0, 200));
  assert((await sql`select count(*)::int as n from private.kv`)[0].n === 0, 'kv dibuang');
  const cfg = ok(await call(mkRuntime(), 'public.config'));
  assert(cfg.LANDING_MESSAGE === 'Ditulis di Google Sheets selepas pulang', 'data baharu: ' + cfg.LANDING_MESSAGE);
  ok(await tiket(mkRuntime(), { tajuk: 'Selepas pindah semula', email: 'semula@utm.my' }));
  const again = await worker.handle({ action: 'system.import', payload: { sheets: changed, props, nonce: NONCE } });
  assert(!again.success, 'import ditutup semula');
  await assertNoPlain(['semula@utm.my']);
});

await sql.end();
console.log(`\n${passed} lulus, ${failed} gagal.`);
process.exit(failed ? 1 : 0);
