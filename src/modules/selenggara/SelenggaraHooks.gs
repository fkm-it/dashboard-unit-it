/**
 * @file SelenggaraHooks.gs
 * Daftar penyelenggaraan aset (KEW.PA-14). Rekod "Selesai" mengemas kini tarikh selenggara terakhir & seterusnya pada aset.
 * Aduan kerosakan yang selesai mencipta rekod pembetulan di sini secara automatik.
 * Harian: makluman kepada admin bagi penyelenggaraan berjadual 3 hari lagi / hari ini.
 */
const SelenggaraHooks = {
  FLOW: { DIJADUALKAN: ['SELESAI', 'DIBATALKAN'], SELESAI: ['DIJADUALKAN'], DIBATALKAN: ['DIJADUALKAN'] },

  validate: function (data, info) {
    const cur = info.current || {};
    AsetLink.require(data, info);
    const t = data.tarikhSelenggara !== undefined ? data.tarikhSelenggara : cur.tarikh_selenggara;
    const n = data.tarikhSeterusnya !== undefined ? data.tarikhSeterusnya : cur.tarikh_seterusnya;
    if (t && n && String(n) <= String(t)) throw Errors.validation('Tarikh selenggara seterusnya mesti selepas tarikh selenggara.', { tarikhSeterusnya: 'Mesti selepas tarikh selenggara.' });
  },

  beforeSave: function (row) { AsetLink.beforeSave(row); },

  beforeStatus: function (row, next) { AsetLink.guard('selenggara', SelenggaraHooks.FLOW, row, next); },

  afterCreate: function (row, ctx) { if (row.status === 'SELESAI') SelenggaraHooks.apply_(row, ctx); },

  afterStatus: function (row, prev, ctx) { if (row.status === 'SELESAI') SelenggaraHooks.apply_(row, ctx); },

  apply_: function (row, ctx) {
    const a = AsetLink.byId(row.aset);
    if (!a) return;
    const p = {};
    if (row.tarikh_selenggara && String(row.tarikh_selenggara) >= String(a.tarikh_selenggara_terakhir || '')) {
      p.tarikh_selenggara_terakhir = row.tarikh_selenggara;
      p.tarikh_selenggara_seterusnya = row.tarikh_seterusnya || '';
    }
    AsetLink.updateAset(a.id, p, ctx, row.ref_no + ': penyelenggaraan selesai');
  },

  /** Rekod pembetulan daripada aduan kerosakan yang selesai. */
  fromAduan: function (aduan, ctx) {
    const vendor = aduan.tindakan === 'PEMBEKAL' || aduan.tindakan === 'WARANTI';
    const row = AsetLink.insert('selenggara', {
      no_aset: aduan.no_aset, butiran_aset: aduan.butiran_aset, aset: aduan.aset,
      jenis_selenggara: 'PEMBETULAN', tarikh_selenggara: AsetLink.today(),
      butiran_kerja: String(aduan.laporan_teknikal || aduan.keterangan_kerosakan || 'Pembaikan kerosakan').slice(0, 2000),
      dilaksanakan_oleh: vendor ? 'PEMBEKAL' : 'DALAMAN', kos: aduan.kos_pembaikan || '', rujukan_aduan: aduan.ref_no,
      status: 'SELESAI', status_changed_at: DateUtils.nowIso(), status_changed_by: 'Sistem', status_note: 'Daripada aduan ' + aduan.ref_no
    }, ctx);
    SelenggaraHooks.apply_(row, ctx);
    return row;
  },

  maintenance: function () {
    const today = AsetLink.today();
    const in3 = DateUtils.dayKey(DateUtils.addDays(new Date(), 3));
    const due = CrudEngine.repo(CrudEngine.get('selenggara')).all().filter(function (r) {
      return r.state === 'ACTIVE' && r.status === 'DIJADUALKAN' && (String(r.tarikh_selenggara) === in3 || String(r.tarikh_selenggara) === today);
    });
    if (due.length) {
      NotificationService.notifyAdmins(NOTIF_TYPE.RECORD_STATUS, 'Penyelenggaraan berjadual: ' + due.length + ' aset',
        due.slice(0, 5).map(function (r) { return r.no_aset + ' (' + r.tarikh_selenggara + ')'; }).join(', ') + (due.length > 5 ? ' …' : ''), '', '#/admin/selenggara');
    }
    return { peringatan: due.length };
  }
};
