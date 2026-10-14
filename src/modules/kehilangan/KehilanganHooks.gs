/**
 * @file KehilanganHooks.gs
 * Laporan awal kehilangan aset (KEW.PA-28) oleh staf / pelajar, dan siasatan Unit IT.
 *   Dilaporkan → aset "Hilang / dalam siasatan" (status asal & nilai buku disimpan)
 *   Ditemui semula / laporan tidak sah → status asal aset dipulihkan
 *   Hapus kira → aset "Hapus kira" + status pengesahan "telah lupus, rekod aktif di UTMFin" (tindakan KEWPA)
 */
const KehilanganHooks = {
  OPEN: ['DILAPOR', 'DALAM_SIASATAN'],
  FLOW: { DILAPOR: ['DALAM_SIASATAN', 'DITEMUI', 'DITOLAK'], DALAM_SIASATAN: ['DITEMUI', 'HAPUS_KIRA', 'DITOLAK'] },

  validate: function (data, info) {
    const cur = info.current || {};
    AsetLink.requireEmail(data, info);
    const a = AsetLink.require(data, info, { allowGone: info.mode === 'update' && cur.status === 'HAPUS_KIRA' });
    const g = function (k, col) { return data[k] !== undefined ? data[k] : cur[col]; };
    const hilang = String(g('tarikhKehilangan', 'tarikh_kehilangan') || '');
    const tahu = String(g('tarikhDiketahui', 'tarikh_diketahui') || '');
    const today = AsetLink.today();
    if (hilang > today || tahu > today) throw Errors.validation('Tarikh tidak boleh pada masa hadapan.', { tarikhDiketahui: 'Tarikh masa hadapan.' });
    if (hilang && tahu && tahu < hilang) throw Errors.validation('Tarikh diketahui mesti pada atau selepas tarikh kehilangan.', { tarikhDiketahui: 'Sebelum tarikh kehilangan.' });
    if (AsetLink.isTrue(g('laporanPolis', 'laporan_polis')) && !String(g('noLaporanPolis', 'no_laporan_polis') || '').trim()) {
      throw Errors.validation('Nyatakan no. laporan polis.', { noLaporanPolis: 'Diperlukan jika laporan polis dibuat.' });
    }
    const open = AsetLink.openFor('kehilangan', a.id, KehilanganHooks.OPEN, cur.id);
    if (open) throw Errors.conflict('Kehilangan aset ' + a.no_aset + ' telah dilaporkan (' + open.ref_no + ').');
  },

  beforeSave: function (row, info) {
    AsetLink.beforeSave(row);
    if (info.mode === 'update') return;
    const a = AsetLink.byId(row.aset);
    if (!a) return;
    row.status_aset_asal = a.status === 'HILANG' ? 'BERFUNGSI' : a.status;
    row.nilai_kehilangan = AsetLink.bookValue(a);
  },

  afterCreate: function (row, ctx) {
    AsetLink.updateAset(row.aset, { status: 'HILANG' }, ctx, row.ref_no + ': laporan kehilangan');
  },

  beforeStatus: function (row, next) { AsetLink.guard('kehilangan', KehilanganHooks.FLOW, row, next); },

  afterStatus: function (row, prev, ctx) {
    const note = row.ref_no + ': ' + AsetLink.statusLabel_('kehilangan', row.status).toLowerCase();
    if (row.status === 'DITEMUI' || row.status === 'DITOLAK') {
      const p = { status: row.status_aset_asal && row.status_aset_asal !== 'HILANG' ? row.status_aset_asal : 'BERFUNGSI' };
      if (row.status === 'DITEMUI') p.disahkan_fizikal = true;
      AsetLink.updateAset(row.aset, p, ctx, note);
    } else if (row.status === 'HAPUS_KIRA') {
      AsetLink.updateAset(row.aset, { status: 'HAPUS_KIRA', status_pengesahan: 'LUPUS_REKOD_AKTIF', cadangan: 'LUPUS', dipinjam: false, peminjam_semasa: '' }, ctx, note);
    }
  }
};
