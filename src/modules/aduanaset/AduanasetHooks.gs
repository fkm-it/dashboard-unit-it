/**
 * @file AduanasetHooks.gs
 * Aduan kerosakan aset (KEW.PA-9) oleh staf dan pelajar.
 *   Disemak / dalam pembaikan → aset "Perlu dibaiki" (alat ganti → "Menunggu alat ganti")
 *   Selesai → aset "Berfungsi" + rekod penyelenggaraan pembetulan (KEW.PA-14) dicipta automatik
 *   Tidak ekonomi → aset "Tidak boleh digunakan", cadangan "Lupus"
 * Satu aduan terbuka bagi setiap aset.
 */
const AduanasetHooks = {
  OPEN: ['BARU', 'DISEMAK', 'DALAM_PEMBAIKAN'],
  FLOW: {
    BARU: ['DISEMAK', 'DALAM_PEMBAIKAN', 'SELESAI', 'TIDAK_EKONOMI', 'DITOLAK'],
    DISEMAK: ['DALAM_PEMBAIKAN', 'SELESAI', 'TIDAK_EKONOMI', 'DITOLAK'],
    DALAM_PEMBAIKAN: ['SELESAI', 'TIDAK_EKONOMI'],
    SELESAI: ['DALAM_PEMBAIKAN'],
    DITOLAK: ['BARU']
  },

  validate: function (data, info) {
    const cur = info.current || {};
    AsetLink.requireEmail(data, info);
    const a = AsetLink.require(data, info);
    const t = data.tarikhKerosakan !== undefined ? data.tarikhKerosakan : cur.tarikh_kerosakan;
    if (t && String(t) > AsetLink.today()) throw Errors.validation('Tarikh kerosakan tidak boleh pada masa hadapan.', { tarikhKerosakan: 'Tarikh masa hadapan.' });
    const open = AsetLink.openFor('aduanaset', a.id, AduanasetHooks.OPEN, cur.id);
    if (open) throw Errors.conflict('Aduan kerosakan bagi aset ' + a.no_aset + ' sedang diproses (' + open.ref_no + ').');
  },

  beforeSave: function (row) { AsetLink.beforeSave(row); },

  beforeStatus: function (row, next) { AsetLink.guard('aduanaset', AduanasetHooks.FLOW, row, next); },

  afterStatus: function (row, prev, ctx) {
    const a = AsetLink.byId(row.aset);
    if (!a) return;
    const note = row.ref_no + ': ' + AsetLink.statusLabel_('aduanaset', row.status).toLowerCase();
    if (row.status === 'DISEMAK' || row.status === 'DALAM_PEMBAIKAN') {
      const target = row.status === 'DALAM_PEMBAIKAN' && row.tindakan === 'ALAT_GANTI' ? 'MENUNGGU_ALAT_GANTI' : 'PERLU_BAIKI';
      if (AsetHooks.OPERATIONAL.indexOf(a.status) >= 0 || (target === 'MENUNGGU_ALAT_GANTI' && a.status === 'PERLU_BAIKI')) AsetLink.updateAset(a.id, { status: target }, ctx, note);
    } else if (row.status === 'SELESAI') {
      const today = AsetLink.today();
      CrudEngine.repo(CrudEngine.get('aduanaset')).update(row.id, { tarikh_selesai: today });
      SelenggaraHooks.fromAduan(row, ctx);
      AsetLink.updateAset(a.id, { status: 'BERFUNGSI' }, ctx, note);
    } else if (row.status === 'TIDAK_EKONOMI') {
      AsetLink.updateAset(a.id, { status: 'TIDAK_BOLEH_GUNA', cadangan: 'LUPUS' }, ctx, note);
    }
  }
};
