/**
 * @file PinjamanHooks.gs
 * Pinjaman aset oleh staf (log masuk) dan pelajar (borang awam, email UTM) — dua cara:
 *   1. Aset tertentu (no. aset): aset mesti "Boleh dipinjam"; tiada pertindihan tarikh
 *   2. Kit peralatan + bilangan unit (cth. 10 × Raspberry Pi): baki unit disemak ikut tarikh;
 *      unit sebenar dipilih / diimbas oleh Unit IT semasa serahan (atau dipilih automatik)
 * Wakil kelas: kod kursus + pensyarah wajib; pensyarah menerima salinan permohonan, keputusan & peringatan.
 * Peraturan umum: tarikh pulang ≥ tarikh pinjam; tempoh ≤ PINJAMAN_MAX_HARI; tarikh pinjam bukan tarikh lepas;
 * pelajar (bukan wakil kelas) wajib nyatakan penyelia.
 * Aliran: Dimohon → Diluluskan → Sedang dipinjam (unit ditanda dipinjam) → Dipulangkan (unit dibebaskan).
 * Harian: peringatan email sehari sebelum tarikh pulang dan semasa lewat (hari 1, kemudian setiap 7 hari).
 */
const PinjamanHooks = {
  OPEN: ['DIMOHON', 'DILULUSKAN', 'DIPINJAM'],
  /** Status yang "memegang" unit kit (baki tersedia). */
  HELD: ['DILULUSKAN', 'DIPINJAM'],
  FLOW: { DIMOHON: ['DILULUSKAN', 'DITOLAK', 'DIBATALKAN'], DILULUSKAN: ['DIPINJAM', 'DIBATALKAN'], DIPINJAM: ['DIPULANGKAN'] },
  BLOCKED: ['HILANG', 'TIDAK_BOLEH_GUNA'],
  STUDENT: ['PRASISWAZAH', 'PASCASISWAZAH'],

  maxHari: function () {
    let v;
    try { v = Number(SettingsService.get('PINJAMAN_MAX_HARI')); } catch (e) { v = NaN; }
    return v > 0 ? v : 30;
  },

  days_: function (a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000); },

  /** Kit aktif yang mengandungi aset ini (jika ada). */
  kitOf: function (a) {
    const n = AsetLink.norm(a.no_aset);
    return KitHooks.repo_().all().filter(function (k) {
      return k.state === 'ACTIVE' && KitHooks.parseList(k.senarai_aset).some(function (no) { return AsetLink.norm(no) === n; });
    })[0] || null;
  },

  validate: function (data, info) {
    const cur = info.current || {};
    const g = function (k, col) { return data[k] !== undefined ? data[k] : cur[col]; };
    const str = function (k, col) { return String(g(k, col) || '').trim(); };
    AsetLink.requireEmail(data, info);
    const emailPensyarah = str('emailPensyarah', 'email_pensyarah');
    if (emailPensyarah && !AsetLink.emailAllowed(emailPensyarah)) throw Errors.validation('Email pensyarah mesti email UTM.', { emailPensyarah: 'Gunakan email UTM.' });

    const kat = g('kategoriPemohon', 'kategori_pemohon');
    if (kat === 'WAKIL_KELAS') {
      const err = {};
      if (!str('kodKursus', 'kod_kursus')) err.kodKursus = 'Wajib bagi wakil kelas.';
      if (!str('namaPensyarah', 'nama_pensyarah')) err.namaPensyarah = 'Wajib bagi wakil kelas.';
      if (!emailPensyarah) err.emailPensyarah = 'Wajib bagi wakil kelas.';
      if (Object.keys(err).length) throw Errors.validation('Lengkapkan maklumat kursus dan pensyarah.', err);
    } else if (PinjamanHooks.STUDENT.indexOf(kat) >= 0 && !str('penyelia', 'penyelia')) {
      throw Errors.validation('Pelajar perlu menyatakan penyelia / pensyarah.', { penyelia: 'Wajib bagi pelajar.' });
    }

    const mula = str('tarikhPinjam', 'tarikh_pinjam');
    const tamat = str('tarikhPulang', 'tarikh_pulang');
    if (AsetLink.changed(data, info, 'tarikhPinjam', 'tarikh_pinjam') && mula && mula < AsetLink.today()) throw Errors.validation('Tarikh pinjam tidak boleh sebelum hari ini.', { tarikhPinjam: 'Tidak boleh tarikh lepas.' });
    if (mula && tamat && tamat < mula) throw Errors.validation('Tarikh pulang mesti pada atau selepas tarikh pinjam.', { tarikhPulang: 'Mesti selepas tarikh pinjam.' });
    const max = PinjamanHooks.maxHari();
    if (mula && tamat && PinjamanHooks.days_(mula, tamat) + 1 > max) throw Errors.validation('Tempoh pinjaman maksimum ' + max + ' hari.', { tarikhPulang: 'Melebihi ' + max + ' hari.' });

    const kitId = str('kit', 'kit');
    const noAset = str('noAset', 'no_aset');
    if (kitId && noAset) throw Errors.validation('Pilih kit peralatan ATAU isi no. aset tertentu — bukan kedua-duanya.', { noAset: 'Kosongkan jika meminjam kit.' });
    if (!kitId && !noAset) throw Errors.validation('Pilih kit peralatan atau isi no. aset yang hendak dipinjam.', { kit: 'Pilih kit', noAset: 'atau isi no. aset.' });
    const recheck = ['noAset', 'kit', 'kuantiti', 'tarikhPinjam', 'tarikhPulang'].some(function (k) {
      return AsetLink.changed(data, info, k, k.replace(/[A-Z]/g, function (c) { return '_' + c.toLowerCase(); }));
    });
    if (kitId) return PinjamanHooks.validateKit_(kitId, Number(g('kuantiti', 'kuantiti')) || 1, mula, tamat, cur.id, recheck);

    const a = AsetLink.require(data, info);
    if (!recheck) return;
    if (!AsetLink.isTrue(a.boleh_dipinjam)) throw Errors.validation('Aset ' + a.no_aset + ' tidak dibuka untuk pinjaman. Hubungi Unit IT FKM.', { noAset: 'Aset ini tidak boleh dipinjam.' });
    if (PinjamanHooks.BLOCKED.indexOf(a.status) >= 0) throw Errors.validation('Aset ' + a.no_aset + ' tidak boleh dipinjam buat masa ini (' + AsetLink.statusLabel_('aset', a.status) + ').', { noAset: 'Aset tidak tersedia.' });
    if (!mula || !tamat) return;
    const clash = CrudEngine.repo(CrudEngine.get('pinjaman')).all().filter(function (r) {
      return r.state === 'ACTIVE' && r.id !== cur.id && r.aset === a.id && PinjamanHooks.OPEN.indexOf(r.status) >= 0 &&
        String(r.tarikh_pinjam) <= tamat && mula <= String(r.tarikh_pulang);
    })[0];
    if (clash) throw Errors.conflict('Aset ' + a.no_aset + ' telah dimohon / dipinjam pada ' + clash.tarikh_pinjam + ' hingga ' + clash.tarikh_pulang + '. Pilih tarikh lain.');
    const k = PinjamanHooks.kitOf(a);
    if (k && KitHooks.available(k, mula, tamat, cur.id) < 1) throw Errors.conflict('Semua unit ' + k.nama + ' telah ditempah pada tarikh tersebut.');
  },

  validateKit_: function (kitId, qty, mula, tamat, exceptId, recheck) {
    const k = KitHooks.byId(kitId);
    if (!k) throw Errors.validation('Kit tidak ditemui.', { kit: 'Tidak ditemui.' });
    if (!recheck) return;
    if (k.status !== 'AKTIF') throw Errors.validation(k.nama + ' tidak dibuka untuk pinjaman.', { kit: 'Kit ditutup.' });
    const maks = Number(k.maks_pinjam) || 0;
    if (maks && qty > maks) throw Errors.validation('Maksimum ' + maks + ' unit ' + k.nama + ' setiap permohonan.', { kuantiti: 'Maksimum ' + maks + ' unit.' });
    if (!mula || !tamat) return;
    const avail = KitHooks.available(k, mula, tamat, exceptId);
    if (qty > avail) {
      throw Errors.conflict(avail ? 'Hanya ' + avail + ' unit ' + k.nama + ' tersedia pada ' + mula + ' hingga ' + tamat + '.' : 'Tiada unit ' + k.nama + ' tersedia pada ' + mula + ' hingga ' + tamat + '. Pilih tarikh lain.');
    }
  },

  beforeSave: function (row, info) {
    AsetLink.beforeSave(row);
    const m = Object.assign({}, info.current || {}, row);
    if (m.kit) {
      const k = KitHooks.byId(m.kit);
      row.no_aset = '';
      row.aset = '';
      row.butiran_aset = (k ? k.nama : 'Kit') + ' × ' + (Number(m.kuantiti) || 1) + ' unit';
    } else if (row.kuantiti !== undefined || info.mode !== 'update') {
      row.kuantiti = 1;
    }
  },

  /** Unit (baris aset) yang akan diserahkan. Lontar ralat jika tidak sah. */
  allocate: function (row) {
    if (!row.kit) {
      const a = AsetLink.byId(row.aset);
      if (!a || AsetLink.isGone(a)) throw Errors.validation('Rekod aset tidak ditemui atau telah dilupus.');
      if (AsetLink.isTrue(a.dipinjam)) throw Errors.conflict('Aset ' + a.no_aset + ' masih dipinjam (' + (a.peminjam_semasa || '-') + '). Rekodkan pemulangan dahulu.');
      return [a];
    }
    const k = KitHooks.byId(row.kit);
    if (!k) throw Errors.validation('Kit tidak ditemui.');
    const qty = Number(row.kuantiti) || 1;
    const given = KitHooks.parseList(row.unit_diserahkan);
    if (given.length) {
      const units = given.map(function (no) {
        const a = AsetLink.find(no);
        if (!a || AsetLink.isGone(a)) throw Errors.validation('No. aset ' + no + ' tidak ditemui atau telah dilupus.');
        if (AsetLink.isTrue(a.dipinjam)) throw Errors.conflict('Aset ' + a.no_aset + ' masih dipinjam (' + (a.peminjam_semasa || '-') + ').');
        return a;
      });
      if (units.length !== qty) throw Errors.validation('Bilangan no. aset diserahkan (' + units.length + ') tidak sama dengan bilangan unit dimohon (' + qty + '). Sunting rekod dahulu.');
      return units;
    }
    const free = KitHooks.usable(k).filter(function (a) { return !AsetLink.isTrue(a.dipinjam); })
      .sort(function (x, y) { return String(x.no_aset).localeCompare(String(y.no_aset)); });
    if (free.length < qty) throw Errors.conflict('Hanya ' + free.length + ' unit ' + k.nama + ' sedia untuk diserahkan sekarang (dimohon ' + qty + ').');
    return free.slice(0, qty);
  },

  beforeStatus: function (row, next) {
    AsetLink.guard('pinjaman', PinjamanHooks.FLOW, row, next);
    if (next === 'DILULUSKAN' && row.kit) PinjamanHooks.validateKit_(row.kit, Number(row.kuantiti) || 1, String(row.tarikh_pinjam), String(row.tarikh_pulang), row.id, true);
    if (next === 'DIPINJAM') PinjamanHooks.allocate(row);
  },

  borrower_: function (row) {
    const who = row.nama || String(row.owner_name || '').replace(/ \(awam\)$/, '');
    return who + (row.kategori_pemohon === 'WAKIL_KELAS' && row.kod_kursus ? ' — ' + row.kod_kursus : '');
  },

  units_: function (row) {
    const list = KitHooks.parseList(row.unit_diserahkan);
    return list.length ? list : (row.no_aset ? [row.no_aset] : []);
  },

  afterCreate: function (row) {
    if (!row.email_pensyarah) return;
    NotificationService.email(row.email_pensyarah, 'Salinan permohonan pinjaman ' + row.ref_no + ' (' + (row.kod_kursus || 'kelas') + ')', [
      'Salam ' + (row.nama_pensyarah || 'Dr.') + ',',
      PinjamanHooks.borrower_(row) + ' telah memohon pinjaman ' + (row.butiran_aset || row.no_aset) + ' untuk kursus anda.',
      'Tarikh: ' + row.tarikh_pinjam + ' hingga ' + row.tarikh_pulang + ' · Tujuan: ' + StringUtils.truncate(row.tujuan || '', 200),
      'Email ini untuk makluman. Unit IT FKM akan memproses permohonan ini.'
    ], { path: '#/' });
  },

  afterStatus: function (row, prev, ctx) {
    const repo = CrudEngine.repo(CrudEngine.get('pinjaman'));
    const today = AsetLink.today();
    const who = PinjamanHooks.borrower_(row) + ' (' + row.ref_no + ')';
    if (row.status === 'DIPINJAM') {
      const units = PinjamanHooks.allocate(row);
      repo.update(row.id, { tarikh_diserahkan: today, unit_diserahkan: row.kit ? units.map(function (a) { return a.no_aset; }).join('\n') : '' });
      units.forEach(function (a) {
        AsetLink.updateAset(a.id, { dipinjam: true, peminjam_semasa: who, tarikh_pulang_jangka: row.tarikh_pulang }, ctx, row.ref_no + ': diserahkan kepada peminjam');
      });
    } else if (row.status === 'DIPULANGKAN') {
      repo.update(row.id, { tarikh_dipulangkan: today });
      const kept = {};
      KitHooks.parseList(row.unit_tidak_dipulang).forEach(function (no) { kept[AsetLink.norm(no)] = true; });
      PinjamanHooks.units_(row).forEach(function (no) {
        if (kept[AsetLink.norm(no)]) return;
        const a = AsetLink.find(no);
        if (!a) return;
        const p = { dipinjam: false, peminjam_semasa: '', tarikh_pulang_jangka: '' };
        if (!row.kit && row.keadaan_pulang === 'ROSAK' && AsetHooks.OPERATIONAL.indexOf(a.status) >= 0) p.status = 'PERLU_BAIKI';
        AsetLink.updateAset(a.id, p, ctx, row.ref_no + ': dipulangkan' + (row.keadaan_pulang ? ' (' + row.keadaan_pulang + ')' : ''));
      });
    }
    if (row.email_pensyarah && ['DILULUSKAN', 'DITOLAK', 'DIPINJAM', 'DIPULANGKAN'].indexOf(row.status) >= 0) {
      NotificationService.email(row.email_pensyarah, 'Pinjaman ' + row.ref_no + ': ' + AsetLink.statusLabel_('pinjaman', row.status), [
        'Makluman untuk ' + (row.nama_pensyarah || 'pensyarah') + ' (' + (row.kod_kursus || 'kelas') + '):',
        'Pinjaman ' + (row.butiran_aset || row.no_aset) + ' oleh ' + PinjamanHooks.borrower_(row) + ' kini berstatus "' + AsetLink.statusLabel_('pinjaman', row.status) + '".',
        row.status_note ? 'Catatan Unit IT: ' + row.status_note : ''
      ].filter(String), { path: '#/' });
    }
  },

  toDTO: function (dto, row) {
    const today = AsetLink.today();
    dto.lewat = row.status === 'DIPINJAM' && !!row.tarikh_pulang && String(row.tarikh_pulang) < today;
    if (dto.lewat) dto.hariLewat = PinjamanHooks.days_(String(row.tarikh_pulang), today);
    return dto;
  },

  /** Peringatan email: esok tarikh pulang; lewat hari 1 dan setiap 7 hari (salinan kepada pensyarah bagi kelas). */
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
      const what = r.butiran_aset || r.no_aset;
      const subject = late ? 'Pinjaman ' + r.ref_no + ' telah lewat ' + late + ' hari' : 'Peringatan: pulangkan ' + what + ' esok';
      const lines = ['Salam ' + PinjamanHooks.borrower_(r) + ',',
        late ? 'Peralatan yang dipinjam sepatutnya dipulangkan pada ' + due + ' (' + late + ' hari lewat). Sila pulangkan kepada Unit IT FKM dengan segera.'
             : 'Peralatan yang dipinjam perlu dipulangkan kepada Unit IT FKM esok (' + due + ').',
        'Pinjaman: ' + what + ' · No. rujukan: ' + r.ref_no];
      const to = AsetLink.contactEmail(r);
      if (to && NotificationService.email(to, subject, lines, { path: '#/' })) sent++;
      if (r.email_pensyarah) NotificationService.email(r.email_pensyarah, subject + ' (' + (r.kod_kursus || 'kelas') + ')', lines, { path: '#/' });
    });
    return { peringatan: sent, lewat: lewat };
  }
};
