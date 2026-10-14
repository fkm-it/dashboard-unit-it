/**
 * @file PergerakanHooks.gs
 * Pergerakan aset (KEW.PA-6). Staf memohon; Unit IT meluluskan. Apabila status "Selesai dipindahkan":
 * lokasi fizikal / makmal / penjaga terkini aset dikemas kini (keluar FKM → aset "Dipindahkan keluar FKM").
 * Lokasi berbeza daripada UTMFin akan menjana tindakan KEWPA "kemas kini lokasi" secara automatik.
 */
const PergerakanHooks = {
  OPEN: ['DIMOHON', 'DILULUSKAN'],
  FLOW: { DIMOHON: ['DILULUSKAN', 'DITOLAK', 'DIBATALKAN'], DILULUSKAN: ['SELESAI', 'DIBATALKAN'] },

  validate: function (data, info) {
    const cur = info.current || {};
    const a = AsetLink.require(data, info);
    if (a.status === 'HILANG') throw Errors.validation('Aset ' + a.no_aset + ' sedang dilaporkan hilang.', { noAset: 'Aset dilaporkan hilang.' });
    const g = function (k, col) { return data[k] !== undefined ? data[k] : cur[col]; };
    const jenis = g('jenisPergerakan', 'jenis_pergerakan');
    const has = function (k, col) { return !!String(g(k, col) || '').trim(); };
    const err = {};
    if ((jenis === 'PINDAH_LOKASI' || jenis === 'PINDAH_TUKAR') && !has('lokasiBaru', 'lokasi_baru') && !has('makmalBaru', 'makmal_baru')) err.lokasiBaru = 'Nyatakan lokasi atau makmal baharu.';
    if ((jenis === 'TUKAR_PENJAGA' || jenis === 'PINDAH_TUKAR') && !has('penjagaBaru', 'penjaga_baru')) err.penjagaBaru = 'Nyatakan penjaga baharu.';
    if (jenis === 'KELUAR_PTJ' && !has('ptjBaru', 'ptj_baru')) err.ptjBaru = 'Nyatakan PTJ penerima.';
    if (Object.keys(err).length) throw Errors.validation('Lengkapkan maklumat pergerakan.', err);
    const open = AsetLink.openFor('pergerakan', a.id, PergerakanHooks.OPEN, cur.id);
    if (open) throw Errors.conflict('Aset ' + a.no_aset + ' sudah ada permohonan pergerakan yang belum selesai (' + open.ref_no + ').');
  },

  beforeSave: function (row, info) {
    AsetLink.beforeSave(row);
    if (info.mode !== 'update') {
      const a = AsetLink.find(row.no_aset);
      if (a) row.lokasi_asal = a.lokasi_fizikal || a.lokasi || '';
    }
  },

  beforeStatus: function (row, next) {
    AsetLink.guard('pergerakan', PergerakanHooks.FLOW, row, next);
    if (next === 'SELESAI' && !AsetLink.byId(row.aset)) throw Errors.validation('Rekod aset tidak ditemui.');
  },

  afterStatus: function (row, prev, ctx) {
    if (row.status !== 'SELESAI') return;
    const p = {};
    if (row.lokasi_baru) p.lokasi_fizikal = String(row.lokasi_baru).trim().toUpperCase();
    if (row.makmal_baru) p.makmal = row.makmal_baru;
    if (row.penjaga_baru) p.penjaga_terkini = row.penjaga_baru;
    if (row.jenis_pergerakan === 'KELUAR_PTJ') p.status = 'DIPINDAH_KELUAR';
    AsetLink.updateAset(row.aset, p, ctx, row.ref_no + ': pergerakan aset selesai');
  }
};
