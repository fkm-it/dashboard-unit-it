/**
 * @file PelupusanHooks.gs
 * Pelupusan aset (KEW.PA-16/17): Dicadangkan → Diperiksa Lembaga Pemeriksa → Diluluskan → Dilupuskan.
 *   Dicadangkan → aset: cadangan "Lupus", status pengesahan "Dalam tindakan pelupusan" (asal disimpan)
 *   Dilupuskan  → aset "Dilupus" + status pengesahan "telah lupus, rekod aktif di UTMFin" (tindakan KEWPA: kemas kini UTMFin)
 *   Ditolak / dibatalkan → status pengesahan asal dipulihkan
 * Nilai semasa kosong → penilaian terakhir yang disahkan, atau nilai buku.
 */
const PelupusanHooks = {
  OPEN: ['DICADANGKAN', 'DIPERIKSA', 'DILULUSKAN'],
  FLOW: { DICADANGKAN: ['DIPERIKSA', 'DITOLAK', 'DIBATALKAN'], DIPERIKSA: ['DILULUSKAN', 'DITOLAK', 'DIBATALKAN'], DILULUSKAN: ['DILUPUSKAN', 'DIBATALKAN'] },

  validate: function (data, info) {
    const cur = info.current || {};
    const a = AsetLink.require(data, info, { allowGone: info.mode === 'update' && cur.status === 'DILUPUSKAN' });
    if (info.mode !== 'update' && AsetLink.isTrue(a.dipinjam)) throw Errors.validation('Aset ' + a.no_aset + ' sedang dipinjam. Rekodkan pemulangan dahulu.', { noAset: 'Aset sedang dipinjam.' });
    const open = AsetLink.openFor('pelupusan', a.id, PelupusanHooks.OPEN, cur.id);
    if (open) throw Errors.conflict('Aset ' + a.no_aset + ' sudah dalam proses pelupusan (' + open.ref_no + ').');
  },

  latestValue_: function (asetId) {
    const ok = CrudEngine.repo(CrudEngine.get('penilaian')).all().filter(function (r) {
      return r.state === 'ACTIVE' && r.aset === asetId && r.status === 'DISAHKAN' && r.nilai_semasa !== '' && r.nilai_semasa !== undefined;
    }).sort(function (x, y) { return String(y.tarikh_penilaian).localeCompare(String(x.tarikh_penilaian)); })[0];
    return ok ? ok.nilai_semasa : '';
  },

  beforeSave: function (row, info) {
    AsetLink.beforeSave(row);
    if (info.mode === 'update') return;
    const a = AsetLink.byId(row.aset);
    if (!a) return;
    row.nilai_perolehan = a.nilai_perolehan || '';
    row.status_pengesahan_asal = a.status_pengesahan || '';
    if (row.nilai_semasa === '' || row.nilai_semasa === undefined || row.nilai_semasa === null) {
      const v = PelupusanHooks.latestValue_(a.id);
      row.nilai_semasa = v !== '' ? v : AsetLink.bookValue(a);
    }
  },

  afterCreate: function (row, ctx) {
    AsetLink.updateAset(row.aset, { cadangan: 'LUPUS', status_pengesahan: 'PELUPUSAN' }, ctx, row.ref_no + ': pelupusan dicadangkan');
  },

  beforeStatus: function (row, next) {
    AsetLink.guard('pelupusan', PelupusanHooks.FLOW, row, next);
    if (next === 'DILUPUSKAN') {
      const miss = {};
      if (!row.no_rujukan_kelulusan) miss.noRujukanKelulusan = 'Diperlukan.';
      if (!row.kaedah) miss.kaedah = 'Diperlukan.';
      if (!row.tarikh_lupus) miss.tarikhLupus = 'Diperlukan.';
      if (Object.keys(miss).length) throw Errors.validation('Sunting rekod dan isi no. rujukan kelulusan, kaedah serta tarikh dilupuskan dahulu.', miss);
    }
  },

  afterStatus: function (row, prev, ctx) {
    if (row.status === 'DILUPUSKAN') {
      AsetLink.updateAset(row.aset, { status: 'DILUPUS', status_pengesahan: 'LUPUS_REKOD_AKTIF', cadangan: 'LUPUS', dipinjam: false, peminjam_semasa: '' }, ctx, row.ref_no + ': dilupuskan');
    } else if (row.status === 'DITOLAK' || row.status === 'DIBATALKAN') {
      AsetLink.updateAset(row.aset, { status_pengesahan: row.status_pengesahan_asal || '' }, ctx, row.ref_no + ': pelupusan ' + row.status.toLowerCase());
    }
  }
};
