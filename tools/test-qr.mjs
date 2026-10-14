/**
 * test-qr.mjs — sahkan penjana kod QR frontend (src/frontend/modules/pinjaman.html):
 * setiap versi 1–10 dinyahkod semula dengan OpenCV (jika python3 + cv2 tersedia; jika tidak, semakan struktur sahaja).
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, '../src/frontend/modules/pinjaman.html'), 'utf8');
const start = src.indexOf('const QR = (function () {');
const end = src.indexOf('  KD.qr = QR;');
if (start < 0 || end < 0) throw new Error('Blok QR tidak ditemui');
const QR = new Function(src.slice(start, end) + '\nreturn QR;')();

const base = 'https://fkm-it.github.io/dashboard-unit-it/#/borang/pinjaman';
const samples = [ 'A', 'Unit IT FKM', base, base + '?kit=KT1A2B3C4D5E6F7A8B', base + '?kit=' + 'X'.repeat(60), 'é'.repeat(30) + ' Raspberry Pi ' + 'Z'.repeat(90),
  'Q'.repeat(150), 'W'.repeat(175), 'E'.repeat(205), 'b'.repeat(20), 'c'.repeat(35), 'd'.repeat(95), 'f'.repeat(115)];
let failed = 0;
const mats = samples.map((t) => {
  const m = QR.matrix(t);
  const n = m.length;
  const ver = (n - 17) / 4;
  if (!Number.isInteger(ver) || ver < 1 || ver > 10) { failed++; console.log('✘ saiz tidak sah', n); }
  /* corak pencari di tiga penjuru */
  const finderOk = [[0, 0], [n - 7, 0], [0, n - 7]].every(([c, r]) => m[r][c] && m[r + 6][c + 6] && !m[r + 1][c + 1] && m[r + 3][c + 3]);
  if (!finderOk) { failed++; console.log('✘ corak pencari', t.slice(0, 20)); }
  return { t, ver, m };
});
let tooLong = false;
try { QR.matrix('x'.repeat(300)); } catch (e) { tooLong = /terlalu panjang/.test(e.message); }
if (!tooLong) { failed++; console.log('✘ teks terlalu panjang sepatutnya ditolak'); }

let py = true;
try { execFileSync('python3', ['-c', 'import cv2, numpy'], { stdio: 'ignore' }); } catch (e) { py = false; }
if (py) {
  const tmp = path.join(os.tmpdir(), 'qr-test-' + process.pid + '.json');
  fs.writeFileSync(tmp, JSON.stringify(mats.map((x) => x.m.map((r) => r.map((v) => (v ? 1 : 0))))));
  const code = [
    'import json, sys, numpy as np, cv2',
    'mats = json.load(open(sys.argv[1]))',
    'out = []',
    'for m in mats:',
    '    a = np.array(m, dtype=np.uint8)',
    '    img = np.where(a == 1, 0, 255).astype(np.uint8)',
    '    img = np.pad(img, 4, constant_values=255)',
    '    img = cv2.resize(img, (img.shape[1] * 8, img.shape[0] * 8), interpolation=cv2.INTER_NEAREST)',
    '    txt, pts, _ = cv2.QRCodeDetector().detectAndDecode(img)',
    '    out.append(txt)',
    'print(json.dumps(out))'
  ].join('\n');
  const res = JSON.parse(execFileSync('python3', ['-c', code, tmp], { encoding: 'utf8' }));
  fs.unlinkSync(tmp);
  mats.forEach((x, i) => {
    if (res[i] === x.t) console.log('✔ versi ' + x.ver + ' (' + Buffer.byteLength(x.t) + ' bait) dinyahkod tepat');
    else { failed++; console.log('✘ versi ' + x.ver + ': dapat ' + JSON.stringify(res[i]).slice(0, 60)); }
  });
} else console.log('ℹ python3/cv2 tiada — semakan nyahkod dilangkau (struktur sahaja).');
const vers = [...new Set(mats.map((x) => x.ver))].sort((a, b) => a - b);
console.log('Versi diuji: ' + vers.join(', '));
console.log(failed ? failed + ' gagal.' : 'Semua lulus.');
process.exit(failed ? 1 : 0);
