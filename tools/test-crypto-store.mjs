/**
 * test-crypto-store.mjs — ujian unit lapisan penyulitan (supabase/functions/api/crypto-store.mjs), tanpa Postgres.
 * Store dalaman tiruan merekod apa yang SEBENARNYA sampai ke pangkalan data.
 */
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const { createCryptoStore, keyFingerprint, parseDataKey, MARK } = await import(pathToFileURL(path.join(here, '../supabase/functions/api/crypto-store.mjs')).href);

let passed = 0;
let failed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log('✔ ' + name); } catch (e) { failed++; console.log('✘ ' + name + '\n    ' + (e && e.stack || e)); }
}
const assert = (c, m) => { if (!c) throw new Error(m || 'gagal'); };
const throwsAsync = async (fn, re) => { try { await fn(); } catch (e) { if (re && !re.test(e.message)) throw new Error('ralat lain: ' + e.message); return; } throw new Error('dijangka ralat'); };

const KEY = Buffer.alloc(32, 7).toString('base64');
const KEY2 = Buffer.alloc(32, 9).toString('hex');

/** Store dalaman tiruan: simpan apa sahaja yang dihantar (= isi pangkalan data). */
function fakeInner() {
  const db = { sheets: {}, kv: {}, props: {}, outbox: [] };
  return {
    db,
    versions: async () => ({ sheets: {}, headers: {}, props: '1' }),
    boot: async () => ({ vers: {}, sheets: Object.keys(db.sheets).map((n) => ({ name: n, ver: '1', header: [], rows: db.sheets[n] })), props: { ver: '1', map: db.props } }),
    loadSheets: async (names) => names.map((n) => ({ name: n, ver: '1', header: [], rows: db.sheets[n] || [] })),
    loadProps: async () => ({ ver: '1', map: db.props }),
    loadKv: async (keys) => { const o = {}; keys.forEach((k) => { if (db.kv[k]) o[k] = db.kv[k]; }); return o; },
    commit: async (ch) => {
      for (const e of ch.kv) {
        const cur = db.kv[e.k] ? db.kv[e.k].v : null;
        if (cur !== (e.expect === undefined ? null : e.expect)) return { conflict: ['kv:' + e.k] };
      }
      for (const e of ch.kv) { if (e.del) delete db.kv[e.k]; else db.kv[e.k] = { v: e.v, exp: e.exp }; }
      for (const s of ch.sheets) {
        db.sheets[s.name] = db.sheets[s.name] || [];
        for (const u of s.upserts || []) {
          const i = db.sheets[s.name].findIndex((r) => r[0] === u.vals[0]);
          if (i >= 0) db.sheets[s.name][i] = u.vals; else db.sheets[s.name].push(u.vals);
        }
      }
      if (ch.props) Object.assign(db.props, ch.props.set);
      db.outbox.push(...ch.outbox.map((o, i) => ({ id: String(db.outbox.length + i + 1), kind: o.kind, payload: o.payload })));
      return { vers: {} };
    },
    claimOutbox: async () => db.outbox.slice(),
    ackOutbox: async (r) => { db.acked = r; },
    importAll: async (sheets, props) => { sheets.forEach((s) => { db.sheets[s.name] = s.rows; }); Object.assign(db.props, props); return { sheets: sheets.length }; },
    exportAll: async () => Object.keys(db.sheets).map((n) => ({ name: n, header: [], rows: db.sheets[n] })),
    handback: async () => ({ sheets: Object.keys(db.sheets).map((n) => ({ name: n, header: [], rows: db.sheets[n] })) }),
    resume: async () => ({ resumed: true }),
    getMeta: async () => null, markOnce: async () => true, housekeeping: async () => ({}), outboxStatus: async () => ({})
  };
}

const ch = (o) => Object.assign({ kv: [], sheets: [], checks: [], outbox: [], props: null }, o);
const PERSONAL = ['Siti Contoh', 'siti.contoh@utm.my', '012-3456789', 'D12345'];

await test('Kunci: base64 & hex diterima; kunci pendek/kosong ditolak; cap jari = vektor Apps Script', async () => {
  assert(parseDataKey(KEY).length === 32 && parseDataKey(KEY2).length === 32, 'format');
  assert(keyFingerprint(KEY) === '505f3f2e3923b6a5', 'vektor sama dengan TestWorker.gs: ' + keyFingerprint(KEY));
  assert(keyFingerprint('07'.repeat(32)) === '505f3f2e3923b6a5', 'hex');
  for (const bad of ['', 'abc', Buffer.alloc(16).toString('base64'), 'z'.repeat(64)]) {
    let threw = false; try { createCryptoStore(fakeInner(), bad); } catch (e) { threw = true; }
    assert(threw, 'kunci tidak sah diterima: ' + bad);
  }
});

await test('Baris sheet: hanya ID kekal teks biasa; data peribadi tidak wujud dalam pangkalan data; dibaca semula utuh', async () => {
  const inner = fakeInner();
  const s = createCryptoStore(inner, KEY);
  const row = ['SF-1', 'REF-1', 'u1', 'Admin', ...PERSONAL, 42, true];
  await s.commit(ch({ sheets: [{ name: 'STAF', upserts: [{ k: 'SF-1', ord: 0, vals: row }], deletes: [] }] }));
  const raw = JSON.stringify(inner.db);
  PERSONAL.forEach((p) => assert(raw.indexOf(p) < 0, 'teks biasa bocor: ' + p));
  assert(inner.db.sheets.STAF[0][0] === 'SF-1' && inner.db.sheets.STAF[0][1].indexOf(MARK) === 0, 'format [id, sifir]');
  const back = (await s.loadSheets(['STAF']))[0].rows[0];
  assert(JSON.stringify(back) === JSON.stringify(row), 'dibaca semula: ' + JSON.stringify(back));
  const boot = await s.boot([]);
  assert(JSON.stringify(boot.sheets[0].rows[0]) === JSON.stringify(row), 'boot');
  const exp = await s.exportAll();
  assert(JSON.stringify(exp[0].rows[0]) === JSON.stringify(row), 'eksport (sandaran / pulih) dalam teks biasa');
  const hb = await s.handback();
  assert(JSON.stringify(hb.sheets[0].rows[0]) === JSON.stringify(row), 'handback dinyahsulit');
});

await test('Sifir rawak (data sama → sifir berbeza); diubah / dipindah ke sheet lain / ID ditukar / kunci salah → ditolak', async () => {
  const inner = fakeInner();
  const s = createCryptoStore(inner, KEY);
  const row = ['X-1', 'Siti Contoh'];
  await s.commit(ch({ sheets: [{ name: 'STAF', upserts: [{ k: 'X-1', vals: row }, { k: 'X-2', vals: ['X-2', 'Siti Contoh'] }], deletes: [] }] }));
  const [a, b] = inner.db.sheets.STAF;
  assert(a[1] !== b[1], 'IV rawak');
  const ct = a[1];
  const flip = ct.slice(0, -6) + (ct.slice(-6, -5) === 'A' ? 'B' : 'A') + ct.slice(-5);
  inner.db.sheets.STAF[0] = ['X-1', flip];
  await throwsAsync(() => s.loadSheets(['STAF']), /nyahsulit|rosak/);
  inner.db.sheets.STAF[0] = ['X-1', ct];
  inner.db.sheets.USERS = [['X-1', ct]];
  await throwsAsync(() => s.loadSheets(['USERS']), /nyahsulit/);
  inner.db.sheets.STAF[0] = ['X-9', ct];
  await throwsAsync(() => s.loadSheets(['STAF']), /tidak sepadan/);
  inner.db.sheets.STAF[0] = ['X-1', ct];
  await throwsAsync(() => createCryptoStore(inner, KEY2).loadSheets(['STAF']), /nyahsulit/);
});

await test('Data lama tanpa penanda dibaca seperti biasa (peralihan); ditulis semula → disulitkan', async () => {
  const inner = fakeInner();
  inner.db.sheets.STAF = [['L-1', 'Lama', 'x@y.z']];
  const s = createCryptoStore(inner, KEY);
  const rows = (await s.loadSheets(['STAF']))[0].rows;
  assert(rows[0][1] === 'Lama', 'teks biasa lama');
  await s.commit(ch({ sheets: [{ name: 'STAF', upserts: [{ k: 'L-1', vals: rows[0] }], deletes: [] }] }));
  assert(JSON.stringify(inner.db).indexOf('x@y.z') < 0, 'disulitkan selepas ditulis');
});

await test('Script Properties (AUTH_PEPPER …) & import: disulitkan, dibaca semula', async () => {
  const inner = fakeInner();
  const s = createCryptoStore(inner, KEY);
  await s.importAll([{ name: 'USERS', header: ['user_id', 'email'], rows: [['U-1', 'siti.contoh@utm.my'], ['', 'tanpa id']] }], { AUTH_PEPPER: 'pepper-rahsia-123', FORM_SECRET: 'fs-456' });
  const raw = JSON.stringify(inner.db);
  ['pepper-rahsia-123', 'fs-456', 'siti.contoh@utm.my'].forEach((p) => assert(raw.indexOf(p) < 0, 'bocor: ' + p));
  assert(inner.db.sheets.USERS[1][0] === '', 'baris tanpa ID tidak diubah (dibuang oleh keyRows)');
  const p = await s.loadProps();
  assert(p.map.AUTH_PEPPER === 'pepper-rahsia-123' && p.map.FORM_SECRET === 'fs-456', 'props');
  await s.commit(ch({ props: { set: { PUSH_RELAY: '1' }, del: [] } }));
  assert(inner.db.props.PUSH_RELAY.indexOf(MARK) === 0, 'tulisan props disulitkan');
  assert((await s.boot([])).props.map.PUSH_RELAY === '1', 'boot props');
});

await test('kv: nama kunci disamarkan (email dalam kunci had kadar); compare-and-set berfungsi; konflik dipetakan semula', async () => {
  const inner = fakeInner();
  const s = createCryptoStore(inner, KEY);
  const k = 'kd1:loginfail:siti.contoh@utm.my';
  const r1 = await s.commit(ch({ kv: [{ k, v: '1', exp: Date.now() + 60000, expect: null }] }));
  assert(!r1.conflict, 'tulis pertama');
  assert(JSON.stringify(inner.db.kv).indexOf('siti.contoh') < 0, 'email dalam kunci kv bocor');
  const got = await s.loadKv([k, 'tiada']);
  assert(got[k].v === '1' && !got.tiada, 'baca semula');
  const ok2 = await s.commit(ch({ kv: [{ k, v: '2', exp: Date.now() + 60000, expect: '1' }] }));
  assert(!ok2.conflict, 'CAS dengan nilai dibaca berjaya (sifir deterministik)');
  const bad = await s.commit(ch({ kv: [{ k, v: '3', exp: Date.now() + 60000, expect: '1' }] }));
  assert(bad.conflict && bad.conflict[0] === 'kv:' + k, 'konflik dipetakan ke kunci asal: ' + JSON.stringify(bad));
  const del = await s.commit(ch({ kv: [{ k, del: true, expect: '2' }] }));
  assert(!del.conflict && !(await s.loadKv([k]))[k], 'padam');
});

await test('Outbox: alamat & kandungan email disulitkan; pekerja menerima teks biasa; ralat ack disulitkan', async () => {
  const inner = fakeInner();
  const s = createCryptoStore(inner, KEY);
  await s.commit(ch({ outbox: [{ kind: 'mail', payload: { to: 'siti.contoh@utm.my', subject: 'Link banci', htmlBody: '<p>D12345</p>' } }] }));
  const raw = JSON.stringify(inner.db.outbox);
  ['siti.contoh@utm.my', 'Link banci', 'D12345'].forEach((p) => assert(raw.indexOf(p) < 0, 'bocor: ' + p));
  const c = await s.claimOutbox(10, ['mail']);
  assert(c[0].payload.to === 'siti.contoh@utm.my' && c[0].payload.subject === 'Link banci', 'dinyahsulit untuk pekerja');
  await s.ackOutbox([{ id: '1', ok: false, error: 'Invalid email: siti.contoh@utm.my' }, { id: '2', ok: true }]);
  assert(JSON.stringify(inner.db.acked).indexOf('siti.contoh') < 0 && inner.db.acked[1].ok === true, 'ralat disulitkan');
});

console.log(`\n${passed} lulus, ${failed} gagal.`);
process.exit(failed ? 1 : 0);
