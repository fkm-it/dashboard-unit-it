/**
 * @file TiketHooks.gs
 * Helpdesk: SLA ikut keutamaan, cap masa akuan/selesai, penugasan pegawai (+ email).
 *
 * SLA dikira dalam JAM KALENDAR (Tetapan → SLA_JAM_*). Waktu operasi & hari bekerja belum diambil kira —
 * perlu dimuktamadkan bersama definisi SLA rasmi FKM (spesifikasi §6).
 */
const TiketHooks = {
  OPEN: ['BARU', 'DITUGASKAN', 'DALAM_TINDAKAN', 'MENUNGGU_PENGGUNA'],
  DONE: ['SELESAI', 'DITUTUP'],

  slaHours: function (keutamaan) {
    const k = 'SLA_JAM_' + (keutamaan || 'SEDERHANA');
    const fallback = { KRITIKAL: 4, TINGGI: 24, SEDERHANA: 72, RENDAH: 168 };
    let v;
    try { v = SettingsService.get(k); } catch (e) { v = null; }
    const n = Number(v);
    return n > 0 ? n : (fallback[keutamaan] || 72);
  },

  dueIso: function (createdIso, keutamaan) {
    const base = DateUtils.parse(createdIso) || new Date();
    return DateUtils.addMinutes(base, TiketHooks.slaHours(keutamaan) * 60).toISOString();
  },

  isOverdue: function (row, nowIso) {
    if (TiketHooks.OPEN.indexOf(row.status) < 0 || !row.tarikh_sasaran) return false;
    return String(row.tarikh_sasaran) < (nowIso || DateUtils.nowIso());
  },

  beforeSave: function (row, info) {
    const cur = info.current || {};
    /* Pautan tiket ↔ aset: no. aset (taip / imbas QR label) dipadankan dengan daftar aset */
    if (row.no_aset !== undefined) {
      const a = AsetLink.find(row.no_aset);
      row.aset = a ? a.id : '';
      if (a) row.no_aset = a.no_aset;
    }
    if (info.mode !== 'update') {
      row.tarikh_sasaran = TiketHooks.dueIso(row.created_at, row.keutamaan || 'SEDERHANA');
      if (row.pegawai && row.status === 'BARU') { row.status = 'DITUGASKAN'; row.diakui_pada = row.created_at; }
      return;
    }
    if (row.keutamaan && row.keutamaan !== cur.keutamaan) row.tarikh_sasaran = TiketHooks.dueIso(cur.created_at, row.keutamaan);
    if (row.pegawai && row.pegawai !== cur.pegawai) {
      if (cur.status === 'BARU') {
        row.status = 'DITUGASKAN';
        row.status_changed_at = DateUtils.nowIso();
        row.status_changed_by = (info.ctx && info.ctx.user && info.ctx.user.full_name) || '';
      }
      if (!cur.diakui_pada) row.diakui_pada = DateUtils.nowIso();
      TiketHooks.emailAssignee_(row.pegawai, Object.assign({}, cur, row));
    }
  },

  afterCreate: function (row) {
    if (row.pegawai) TiketHooks.emailAssignee_(row.pegawai, row);
  },

  afterStatus: function (row, prev) {
    const patch = {};
    const now = DateUtils.nowIso();
    if (prev === 'BARU' && row.status !== 'BARU' && !row.diakui_pada) patch.diakui_pada = now;
    if (TiketHooks.DONE.indexOf(row.status) >= 0 && !row.selesai_pada) patch.selesai_pada = now;
    if (TiketHooks.OPEN.indexOf(row.status) >= 0 && row.selesai_pada) patch.selesai_pada = '';
    if (Object.keys(patch).length) CrudEngine.repo(CrudEngine.get('tiket')).update(row.id, patch);
  },

  toDTO: function (dto, row) {
    dto.sla = { overdue: TiketHooks.isOverdue(row), due: row.tarikh_sasaran || '' };
    return dto;
  },

  emailAssignee_: function (pegawaiId, row) {
    try {
      const p = CrudEngine.repo(CrudEngine.get('pegawai')).findById(pegawaiId);
      if (!p || !p.email) return;
      NotificationService.email(p.email, 'Tiket ditugaskan: ' + (row.ref_no || '') + ' ' + (row.tajuk || ''), [
        'Salam ' + (p.nama || '') + ',',
        'Tiket berikut ditugaskan kepada anda:',
        'Rujukan: ' + (row.ref_no || '-'),
        'Tajuk: ' + (row.tajuk || '-'),
        'Lokasi: ' + (row.lokasi || '-'),
        'Keutamaan: ' + (row.keutamaan || '-'),
        'Sasaran selesai: ' + (row.tarikh_sasaran ? DateUtils.format(row.tarikh_sasaran, 'dd/MM/yyyy HH:mm') : '-')
      ], { path: '#/admin/tiket/' + row.id });
    } catch (e) { ErrorHandler.record(e, { action: 'tiket.emailAssignee' }); }
  }
};
