/**
 * @file PinjamanHooks.gs
 * Pinjaman aset oleh staf (log masuk) dan pelajar (borang awam, email UTM).
 * Peraturan:
 *   - aset mesti ditanda "Boleh dipinjam", tidak hilang / rosak / dilupus
 *   - tarikh pulang ≥ tarikh pinjam; tempoh ≤ PINJAMAN_MAX_HARI; tarikh pinjam bukan tarikh lepas
 *   - pelajar wajib nyatakan penyelia
 *   - tiada pertindihan tarikh dengan permohonan lain (dimohon / diluluskan / dipinjam) bagi aset sama
 * Aliran: Dimohon → Diluluskan → Sedang dipinjam (aset ditanda dipinjam) → Dipulangkan (aset dibebaskan; rosak → perlu dibaiki).
 * Harian: peringatan email sehari sebelum tarikh pulang dan semasa lewat (hari 1, kemudian setiap 7 hari).
 */
const PinjamanHooks = {
  OPEN: ['DIMOHON', 'DILULUSKAN', 'DIPINJAM'],
  FLOW: { DIMOHON: ['DILULUSKAN', 'DITOLAK', 'DIBATALKAN'], DILULUSKAN: ['DIPINJAM', 'DIBATALKAN'], DIPINJAM: ['DIPULANGKAN'] },
  BLOCKED: ['HILANG', 'TIDAK_BOLEH_GUNA'],

  maxHari: function () {
    let v;
    try { v = Number(SettingsService.get('PINJAMAN_MAX_HARI')); } catch (e) { v = NaN; }
    return v > 0 ? v : 30;
  },

  days_: function (a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000); },

  validate: function (data, info) {
    const cur = info.current || {};
    AsetLink.requireEmail(data, info);
    const a = AsetLink.require(data, info);
    /* Semakan ketersediaan hanya semasa memohon atau apabila aset / tarikh ditukar (admin boleh sunting catatan kemudian) */
    const recheck = AsetLink.changed(data, info, 'noAset', 'no_aset') || AsetLink.changed(data, info, 'tarikhPinjam', 'tarikh_pinjam') || AsetLink.changed(data, info, 'tarikhPulang', 'tarikh_pulang');
    if (recheck && !AsetLink.isTrue(a.boleh_dipinjam)) throw Errors.validation('Aset ' + a.no_aset + ' tidak dibuka untuk pinjaman. Hubungi Unit IT FKM.', { noAset: 'Aset ini tidak boleh dipinjam.' });
    if (recheck && PinjamanHooks.BLOCKED.indexOf(a.status) >= 0) throw Errors.validation('Aset ' + a.no_aset + ' tidak boleh dipinjam buat masa ini (' + AsetLink.statusLabel_('aset', a.status) + ').', { noAset: 'Aset tidak tersedia.' });
    const g = function (k, col) { return data[k] !== undefined ? data[k] : cur[col]; };
    const mula = String(g('tarikhPinjam', 'tarikh_pinjam') || '');
    const tamat = String(g('tarikhPulang', 'tarikh_pulang') || '');
    if (AsetLink.changed(data, info, 'tarikhPinjam', 'tarikh_pinjam') && mula && mula < AsetLink.today()) throw Errors.validation('Tarikh pinjam tidak boleh sebelum hari ini.', { tarikhPinjam: 'Tidak boleh tarikh lepas.' });
    if (mula && tamat && tamat < mula) throw Errors.validation('Tarikh pulang mesti pada atau selepas tarikh pinjam.', { tarikhPulang: 'Mesti selepas tarikh pinjam.' });
    const max = PinjamanHooks.maxHari();
    if (mula && tamat && PinjamanHooks.days_(mula, tamat) + 1 > max) throw Errors.validation('Tempoh pinjaman maksimum ' + max + ' hari.', { tarikhPulang: 'Melebihi ' + max + ' hari.' });
    const kat = g('kategoriPemohon', 'kategori_pemohon');
    if ((kat === 'PRASISWAZAH' || kat === 'PASCASISWAZAH') && !String(g('penyelia', 'penyelia') || '').trim()) {
      throw Errors.validation('Pelajar perlu menyatakan penyelia / pensyarah.', { penyelia: 'Wajib bagi pelajar.' });
    }
    if (!recheck || !mula || !tamat) return;
    const clash = CrudEngine.repo(CrudEngine.get('pinjaman')).all().filter(function (r) {
      return r.state === 'ACTIVE' && r.id !== cur.id && r.aset === a.id && PinjamanHooks.OPEN.indexOf(r.status) >= 0 &&
        String(r.tarikh_pinjam) <= tamat && mula <= String(r.tarikh_pulang);
    })[0];
    if (clash) throw Errors.conflict('Aset ' + a.no_aset + ' telah dimohon / dipinjam pada ' + clash.tarikh_pinjam + ' hingga ' + clash.tarikh_pulang + '. Pilih tarikh lain.');
  },

  beforeSave: function (row) { AsetLink.beforeSave(row); },

  beforeStatus: function (row, next) {
    AsetLink.guard('pinjaman', PinjamanHooks.FLOW, row, next);
    if (next === 'DIPINJAM') {
      const a = AsetLink.byId(row.aset);
      if (!a || AsetLink.isGone(a)) throw Errors.validation('Rekod aset tidak ditemui atau telah dilupus.');
      if (AsetLink.isTrue(a.dipinjam)) throw Errors.conflict('Aset ' + a.no_aset + ' masih dipinjam (' + (a.peminjam_semasa || '-') + '). Rekodkan pemulangan dahulu.');
    }
  },

  borrower_: function (row) { return row.nama || row.owner_name || ''; },

  afterStatus: function (row, prev, ctx) {
    const repo = CrudEngine.repo(CrudEngine.get('pinjaman'));
    const today = AsetLink.today();
    if (row.status === 'DIPINJAM') {
      repo.update(row.id, { tarikh_diserahkan: today });
      AsetLink.updateAset(row.aset, { dipinjam: true, peminjam_semasa: PinjamanHooks.borrower_(row) + ' (' + row.ref_no + ')', tarikh_pulang_jangka: row.tarikh_pulang }, ctx, row.ref_no + ': diserahkan kepada peminjam');
    } else if (row.status === 'DIPULANGKAN') {
      repo.update(row.id, { tarikh_dipulangkan: today });
      const p = { dipinjam: false, peminjam_semasa: '', tarikh_pulang_jangka: '' };
      const a = AsetLink.byId(row.aset);
      if (row.keadaan_pulang === 'ROSAK' && a && AsetHooks.OPERATIONAL.indexOf(a.status) >= 0) p.status = 'PERLU_BAIKI';
      AsetLink.updateAset(row.aset, p, ctx, row.ref_no + ': dipulangkan' + (row.keadaan_pulang ? ' (' + row.keadaan_pulang + ')' : ''));
    }
  },

  toDTO: function (dto, row) {
    const today = AsetLink.today();
    dto.lewat = row.status === 'DIPINJAM' && !!row.tarikh_pulang && String(row.tarikh_pulang) < today;
    if (dto.lewat) dto.hariLewat = PinjamanHooks.days_(String(row.tarikh_pulang), today);
    return dto;
  },

  /** Peringatan email: esok tarikh pulang; lewat hari 1 dan setiap 7 hari. */
  maintenance: function () {
    const today = AsetLink.today();
    const tomorrow = DateUtils.dayKey(DateUtils.addDays(new Date(), 1));
    let sent = 0;
    let lewat = 0;
    CrudEngine.repo(CrudEngine.get('pinjaman')).all().forEach(function (r) {
      if (r.state !== 'ACTIVE' || r.status !== 'DIPINJAM' || !r.tarikh_pulang) return;
      const due = String(r.tarikh_pulang);
      const late = due < today ? PinjamanHooks.days_(due, today) : 0;
      if (late) lewat++;
      const remind = due === tomorrow || late === 1 || (late > 0 && late % 7 === 0);
      if (!remind) return;
      const to = AsetLink.contactEmail(r);
      const subject = late ? 'Pinjaman ' + r.ref_no + ' telah lewat ' + late + ' hari' : 'Peringatan: pulangkan aset ' + r.no_aset + ' esok';
      const lines = ['Salam ' + PinjamanHooks.borrower_(r) + ',',
        late ? 'Aset yang anda pinjam sepatutnya dipulangkan pada ' + due + ' (' + late + ' hari lewat). Sila pulangkan kepada Unit IT FKM dengan segera.'
             : 'Aset yang anda pinjam perlu dipulangkan kepada Unit IT FKM esok (' + due + ').',
        'Aset: ' + r.no_aset + (r.butiran_aset ? ' (' + r.butiran_aset + ')' : '') + ' · No. rujukan: ' + r.ref_no];
      if (to && NotificationService.email(to, subject, lines, { path: '#/' })) sent++;
    });
    return { peringatan: sent, lewat: lewat };
  }
};
