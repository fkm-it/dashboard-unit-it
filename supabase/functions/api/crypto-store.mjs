/**
 * crypto-store.mjs — lapisan penyulitan di atas store-pg.mjs (Pilihan A: "kurangkan + sulitkan").
 *
 * Supabase (pangkalan data, sandaran, konsol SQL) hanya menyimpan TEKS SIFIR. Yang kekal boleh dibaca:
 * nama sheet, tajuk lajur, ID rekod (lajur pertama: id / setting_key / token_hash — bukan data peribadi),
 * bilangan baris dan cap masa. Semua nilai lain dibuka hanya di dalam memori Edge Function.
 *
 *   sheet_rows.vals : [id, "\u0001e1:" + base64(iv|sifir|tag)]  — AES-256-GCM, IV rawak, AAD = 'row|' + nama sheet
 *   props.v         : sama (AAD = 'prop|' + kunci) — AUTH_PEPPER, FORM_SECRET … tidak boleh dibaca di pangkalan data
 *   outbox.payload  : {"e":"…"} (AAD = 'outbox|' + jenis) — alamat & kandungan email / notifikasi
 *   kv.k            : 'h1:' + HMAC(kunci) — kunci had kadar mengandungi email → disamarkan
 *   kv.v            : AES-GCM dengan IV deterministik (HMAC nilai) — compare-and-set kekal berfungsi
 *
 * Kunci induk: rahsia Edge Function DATA_KEY (32 bait, base64/hex). TIDAK disimpan dalam pangkalan data.
 * Nilai lama tanpa penanda dibaca seperti biasa (teks biasa) dan disulitkan apabila ditulis semula.
 */
import nodeCrypto from 'node:crypto';
import { Buffer } from 'node:buffer';

export const MARK = '\u0001e1:';

/** DATA_KEY → Buffer 32 bait. Diterima: base64 / base64url (43–44 aksara) atau hex (64 aksara). */
export function parseDataKey(raw) {
  const s = String(raw || '').trim();
  let b = null;
  if (/^[0-9a-fA-F]{64}$/.test(s)) b = Buffer.from(s, 'hex');
  else if (/^[A-Za-z0-9+/_-]{43}={0,1}$/.test(s)) b = Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  if (!b || b.length !== 32) throw new Error('DATA_KEY tidak sah: perlukan 32 bait rawak (base64 atau hex).');
  return b;
}

/** Cap jari kunci (bukan rahsia): membolehkan Apps Script mengesahkan kunci yang sama digunakan sebelum import / pulih. */
export function keyFingerprint(raw) {
  return nodeCrypto.createHmac('sha256', parseDataKey(raw)).update('fkmit-data-fp-v1').digest('hex').slice(0, 16);
}

/**
 * @param {Object} inner store (createPgStore)
 * @param {string} rawKey DATA_KEY
 */
export function createCryptoStore(inner, rawKey) {
  const master = parseDataKey(rawKey);
  const sub = (label) => nodeCrypto.createHmac('sha256', master).update(label).digest();
  const kEnc = sub('fkmit-data-enc-v1');
  const kIv = sub('fkmit-data-siv-v1');
  const kName = sub('fkmit-data-name-v1');
  const fingerprint = keyFingerprint(rawKey);

  function seal(text, aad, iv) {
    const c = nodeCrypto.createCipheriv('aes-256-gcm', kEnc, iv);
    c.setAAD(Buffer.from(aad, 'utf8'));
    const ct = Buffer.concat([c.update(String(text), 'utf8'), c.final()]);
    return MARK + Buffer.concat([iv, ct, c.getAuthTag()]).toString('base64');
  }
  const enc = (text, aad) => seal(text, aad, nodeCrypto.randomBytes(12));
  /* IV deterministik (gaya SIV): nilai sama + konteks sama → sifir sama; digunakan untuk kv (compare-and-set) */
  const encDet = (text, aad) => seal(text, aad, nodeCrypto.createHmac('sha256', kIv).update(aad + '\u0000' + text).digest().subarray(0, 12));

  function dec(v, aad) {
    if (typeof v !== 'string' || v.indexOf(MARK) !== 0) return v;
    const b = Buffer.from(v.slice(MARK.length), 'base64');
    if (b.length < 28) throw new Error('Data tersulit rosak.');
    const d = nodeCrypto.createDecipheriv('aes-256-gcm', kEnc, b.subarray(0, 12));
    d.setAAD(Buffer.from(aad, 'utf8'));
    d.setAuthTag(b.subarray(b.length - 16));
    try {
      return Buffer.concat([d.update(b.subarray(12, b.length - 16)), d.final()]).toString('utf8');
    } catch (e) {
      throw new Error('Data tidak dapat dinyahsulit (DATA_KEY salah atau data diubah).');
    }
  }

  const kvName = (k) => 'h1:' + nodeCrypto.createHmac('sha256', kName).update(String(k)).digest('base64url');

  /* ------------------------------------------------------------ baris sheet */
  function encRow(sheet, vals) {
    if (!Array.isArray(vals) || !vals.length) return vals;
    return [vals[0], enc(JSON.stringify(vals), 'row|' + sheet)];
  }
  function decRow(sheet, vals) {
    if (!Array.isArray(vals) || vals.length !== 2 || typeof vals[1] !== 'string' || vals[1].indexOf(MARK) !== 0) return vals;
    const full = JSON.parse(dec(vals[1], 'row|' + sheet));
    if (!Array.isArray(full) || String(full[0]) !== String(vals[0])) throw new Error('Data tersulit tidak sepadan dengan ID baris.');
    return full;
  }
  const decSheet = (s) => Object.assign({}, s, { rows: (s.rows || []).map((r) => decRow(s.name, r)) });
  const decProps = (map) => {
    const out = {};
    for (const k of Object.keys(map || {})) out[k] = dec(map[k], 'prop|' + k);
    return out;
  };

  /* ------------------------------------------------------------ outbox */
  const encPayload = (kind, payload) => ({ e: enc(JSON.stringify(payload), 'outbox|' + kind) });
  const decPayload = (kind, p) => (p && typeof p.e === 'string' && p.e.indexOf(MARK) === 0 ? JSON.parse(dec(p.e, 'outbox|' + kind)) : p);

  return {
    fingerprint,
    /* Untuk ujian: buka nilai mentah daripada pangkalan data */
    _decRow: decRow,
    _kvName: kvName,

    versions: () => inner.versions(),

    async boot(lazy) {
      const b = await inner.boot(lazy);
      return { vers: b.vers, sheets: b.sheets.map(decSheet), props: { ver: b.props.ver, map: decProps(b.props.map) } };
    },

    async loadSheets(names) { return (await inner.loadSheets(names)).map(decSheet); },

    async loadProps() {
      const p = await inner.loadProps();
      return { ver: p.ver, map: decProps(p.map) };
    },

    async loadKv(keys) {
      const names = keys.map(kvName);
      const got = await inner.loadKv(names);
      const out = {};
      keys.forEach((k, i) => {
        const e = got[names[i]];
        if (e) out[k] = { v: dec(e.v, 'kv|' + k), exp: e.exp };
      });
      return out;
    },

    async commit(ch) {
      const byName = new Map();
      const kv = ch.kv.map((e) => {
        const n = kvName(e.k);
        byName.set(n, e.k);
        const x = { k: n, exp: e.exp };
        if (e.del) x.del = true;
        if (e.v !== undefined) x.v = encDet(e.v, 'kv|' + e.k);
        if (e.expect !== undefined) x.expect = e.expect === null ? null : encDet(e.expect, 'kv|' + e.k);
        return x;
      });
      const sheets = ch.sheets.map((s) => (s.upserts && s.upserts.length
        ? Object.assign({}, s, { upserts: s.upserts.map((u) => Object.assign({}, u, { vals: encRow(s.name, u.vals) })) })
        : s));
      let props = ch.props;
      if (props) {
        const set = {};
        for (const k of Object.keys(props.set)) set[k] = enc(props.set[k], 'prop|' + k);
        props = { set, del: props.del };
      }
      const outbox = ch.outbox.map((o) => ({ kind: o.kind, payload: encPayload(o.kind, o.payload) }));
      const res = await inner.commit(Object.assign({}, ch, { kv, sheets, props, outbox }));
      if (res && res.conflict) {
        return { conflict: res.conflict.map((c) => (c.indexOf('kv:') === 0 && byName.has(c.slice(3)) ? 'kv:' + byName.get(c.slice(3)) : c)) };
      }
      return res;
    },

    async claimOutbox(limit, kinds) {
      const rows = await inner.claimOutbox(limit, kinds);
      return rows.map((r) => Object.assign({}, r, { payload: decPayload(r.kind, r.payload) }));
    },

    /* Ralat penghantaran mungkin mengandungi alamat email → disulitkan */
    ackOutbox: (results) => inner.ackOutbox((results || []).map((r) => (r && !r.ok && r.error ? Object.assign({}, r, { error: enc(String(r.error).slice(0, 300), 'err') }) : r))),

    markOnce: (k, v) => inner.markOnce(k, v),
    getMeta: (k) => inner.getMeta(k),
    housekeeping: () => inner.housekeeping(),
    outboxStatus: () => inner.outboxStatus(),

    importAll(sheets, props) {
      const encSheets = sheets.map((s) => Object.assign({}, s, { rows: (s.rows || []).map((r) => (r && r[0] !== '' && r[0] !== undefined && r[0] !== null ? encRow(s.name, r) : r)) }));
      const encProps = {};
      for (const k of Object.keys(props || {})) encProps[k] = enc(String(props[k]), 'prop|' + k);
      return inner.importAll(encSheets, encProps);
    },

    async exportAll() { return (await inner.exportAll()).map(decSheet); },

    async handback() {
      const r = await inner.handback();
      return Object.assign({}, r, { sheets: r.sheets.map(decSheet) });
    },
    resume: () => inner.resume()
  };
}
