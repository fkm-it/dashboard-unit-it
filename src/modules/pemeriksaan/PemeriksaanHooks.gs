/**
 * @file PemeriksaanHooks.gs
 * Pemeriksaan aset (KEW.PA-10/11). Setiap laporan mengemas kini rekod aset serta-merta:
 *   tarikh semakan, disahkan fizikal, keadaan fizikal, lokasi & pengguna sebenar.
 *   Rosak → aset "Perlu dibaiki". Tidak dijumpai → status pengesahan "tidak dapat disahkan"
 *   (tindakan KEWPA dijana; laporkan kehilangan jika masih tidak ditemui).
 */
const PemeriksaanHooks = {
  FLOW: { DIREKOD: ['DISAHKAN'], DISAHKAN: ['DIREKOD'] },
  KEADAAN: { BAIK: 'BAIK', ROSAK: 'SEDERHANA', USANG: 'USANG' },

  validate: function (data, info) {
    const cur = info.current || {};
    AsetLink.require(data, info);
    const t = data.tarikhPemeriksaan !== undefined ? data.tarikhPemeriksaan : cur.tarikh_pemeriksaan;
    if (t && String(t) > AsetLink.today()) throw Errors.validation('Tarikh pemeriksaan tidak boleh pada masa hadapan.', { tarikhPemeriksaan: 'Tarikh masa hadapan.' });
  },

  beforeSave: function (row) { AsetLink.beforeSave(row); },

  beforeStatus: function (row, next) { AsetLink.guard('pemeriksaan', PemeriksaanHooks.FLOW, row, next); },

  afterCreate: function (row, ctx) {
    const a = AsetLink.byId(row.aset);
    if (!a) return;
    const ada = row.keberadaan !== 'TIADA';
    const p = { disahkan_fizikal: ada };
    if (!a.tarikh_semakan || String(row.tarikh_pemeriksaan) >= String(a.tarikh_semakan)) p.tarikh_semakan = row.tarikh_pemeriksaan;
    if (ada) {
      if (PemeriksaanHooks.KEADAAN[row.keadaan]) p.keadaan_fizikal = PemeriksaanHooks.KEADAAN[row.keadaan];
      if (row.keadaan === 'ROSAK' && AsetHooks.OPERATIONAL.indexOf(a.status) >= 0) p.status = 'PERLU_BAIKI';
      if (row.lokasi_sebenar) p.lokasi_fizikal = String(row.lokasi_sebenar).trim().toUpperCase();
      if (row.pengguna_sebenar) p.penjaga_terkini = row.pengguna_sebenar;
      if (a.status_pengesahan === 'TIDAK_DISAHKAN') p.status_pengesahan = 'AKTIF';
    } else {
      p.status_pengesahan = 'TIDAK_DISAHKAN';
    }
    AsetLink.updateAset(a.id, p, ctx, row.ref_no + ': pemeriksaan aset');
  },

  toDTO: function (dto, row) {
    if (row.keberadaan === 'TIADA') dto.cadanganTindakan = 'Aset tidak dijumpai. Jika masih tidak ditemui selepas semakan, buat Laporan Kehilangan (KEW.PA-28).';
    return dto;
  }
};
