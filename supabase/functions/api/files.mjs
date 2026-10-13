/**
 * files.mjs — lampiran di pelayan Supabase disimpan dalam Google Drive UTM melalui Apps Script (bukan di Supabase).
 *
 * Edge Function → POST {fileRelay:{op, payload, ts, sig}} ke URL Web App Apps Script (Script Property WORKER_URL, dipindahkan
 * semasa import). sig = HMAC-SHA256(AUTH_PEPPER, 'fkmit-file-v1|' + ts + '|' + op + '|' + sha256(JSON payload)).
 * Apps Script (WorkerService.fileRelay) mengesahkan tandatangan, mengesahkan semula fail, kemudian menyimpan / membaca dari Drive.
 *   upload {recordId, name, mimeType, data(base64)} → {id, size}
 *   read   {id}                                     → {data(base64)}
 */
import nodeCrypto from 'node:crypto';

export const FILE_SIG_PREFIX = 'fkmit-file-v1';

export function signFileRelay(pepper, op, payload, ts) {
  const h = nodeCrypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  return nodeCrypto.createHmac('sha256', String(pepper)).update(FILE_SIG_PREFIX + '|' + ts + '|' + op + '|' + h).digest('hex');
}

/**
 * @param {{fetchImpl?:function, timeoutMs?:number}} [opts]
 * @return {{upload:function(Object, Object):Promise<{id:string,size:number}>, read:function(string, Object):Promise<string>}}
 */
export function createFileRelay(opts) {
  const o = opts || {};
  async function send(op, payload, props) {
    const url = String((props && props.WORKER_URL) || '');
    const pepper = props && props.AUTH_PEPPER;
    if (!/^https:\/\/script\.google\.com\//.test(url) || !pepper) throw new Error('Lampiran tidak tersedia: URL Apps Script (WORKER_URL) tiada.');
    const ts = Date.now();
    const body = JSON.stringify({ fileRelay: { op, payload, ts, sig: signFileRelay(pepper, op, payload, ts) } });
    const f = o.fetchImpl || fetch;
    const r = await f(url, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body, redirect: 'follow', signal: AbortSignal.timeout(o.timeoutMs || 60000) });
    let j;
    try { j = JSON.parse(await r.text()); } catch (e) { throw new Error('Pelayan fail Apps Script tidak memberi jawapan sah.'); }
    if (!j || !j.success) throw new Error('Pelayan fail: ' + ((j && j.message) || 'gagal'));
    return j.data;
  }
  return {
    upload: async (payload, props) => {
      const d = await send('upload', payload, props);
      if (!d || typeof d.id !== 'string') throw new Error('Pelayan fail: jawapan muat naik tidak sah.');
      return { id: d.id, size: Number(d.size) || 0 };
    },
    read: async (id, props) => {
      const d = await send('read', { id }, props);
      return String((d && d.data) || '');
    }
  };
}
