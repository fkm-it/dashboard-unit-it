/**
 * @file PenilaianHooks.gs
 * Penilaian aset: keadaan (skor 1–5 fizikal, prestasi, keperluan → skor keseluruhan %) dan/atau nilai semasa.
 *   - keputusan kosong → cadangan automatik daripada skor
 *   - nilai semasa kosong → nilai buku (susut nilai garis lurus, Tetapan SUSUT_*)
 * Disahkan → rekod aset dikemas kini (cadangan, skor keadaan, nilai semasa, tarikh penilaian).
 */
const PenilaianHooks = {
  FLOW: { DRAF: ['DISAHKAN'], DISAHKAN: ['DRAF'] },

  needsScore_: function (j) { return j === 'KEADAAN' || j === 'KEDUA'; },
  needsValue_: function (j) { return j === 'NILAI' || j === 'KEDUA'; },

  /** Cadangan daripada skor (%) dan skor komponen. */
  decide: function (pct, prestasi, keperluan) {
    if (pct === null || pct === undefined || pct === '') return '';
    if (pct >= 80) return 'KEKAL';
    if (pct >= 60) return (Number(prestasi) <= 2 || Number(keperluan) <= 2) ? 'NAIK_TARAF' : 'BAIKI';
    if (pct >= 40) return 'GANTI';
    return 'LUPUS';
  },

  validate: function (data, info) {
    const cur = info.current || {};
    AsetLink.require(data, info);
    const jenis = data.jenisPenilaian !== undefined ? data.jenisPenilaian : cur.jenis_penilaian;
    if (PenilaianHooks.needsScore_(jenis)) {
      const err = {};
      [['skorFizikal', 'skor_fizikal'], ['skorPrestasi', 'skor_prestasi'], ['skorKeperluan', 'skor_keperluan']].forEach(function (p) {
        const v = data[p[0]] !== undefined ? data[p[0]] : cur[p[1]];
        if (v === undefined || v === null || v === '') err[p[0]] = 'Diperlukan untuk penilaian keadaan.';
      });
      if (Object.keys(err).length) throw Errors.validation('Lengkapkan ketiga-tiga skor keadaan (1–5).', err);
    }
    const t = data.tarikhPenilaian !== undefined ? data.tarikhPenilaian : cur.tarikh_penilaian;
    if (t && String(t) > AsetLink.today()) throw Errors.validation('Tarikh penilaian tidak boleh pada masa hadapan.', { tarikhPenilaian: 'Tarikh masa hadapan.' });
  },

  beforeSave: function (row, info) {
    AsetLink.beforeSave(row);
    const m = Object.assign({}, info.current || {}, row);
    const a = AsetLink.byId(m.aset);
    const nums = [m.skor_fizikal, m.skor_prestasi, m.skor_keperluan].map(Number);
    const scored = PenilaianHooks.needsScore_(m.jenis_penilaian) && nums.every(function (n) { return n >= 1 && n <= 5; });
    row.skor_keseluruhan = scored ? Math.round((nums[0] + nums[1] + nums[2]) / 15 * 100) : '';
    if (!m.keputusan && scored) row.keputusan = PenilaianHooks.decide(row.skor_keseluruhan, nums[1], nums[2]);
    if (a) {
      row.nilai_perolehan = a.nilai_perolehan || '';
      row.nilai_buku = AsetLink.bookValue(a);
      if (PenilaianHooks.needsValue_(m.jenis_penilaian) && (m.nilai_semasa === '' || m.nilai_semasa === undefined || m.nilai_semasa === null) && row.nilai_buku !== '') row.nilai_semasa = row.nilai_buku;
    }
  },

  beforeStatus: function (row, next) { AsetLink.guard('penilaian', PenilaianHooks.FLOW, row, next); },

  afterStatus: function (row, prev, ctx) {
    if (row.status !== 'DISAHKAN') return;
    const p = { tarikh_penilaian: row.tarikh_penilaian };
    if (row.skor_keseluruhan !== '' && row.skor_keseluruhan !== undefined) p.skor_keadaan = row.skor_keseluruhan;
    if (row.nilai_semasa !== '' && row.nilai_semasa !== undefined) p.nilai_semasa = row.nilai_semasa;
    if (row.keputusan) p.cadangan = row.keputusan;
    AsetLink.updateAset(row.aset, p, ctx, row.ref_no + ': penilaian disahkan');
  }
};
