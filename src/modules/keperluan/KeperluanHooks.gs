/**
 * @file KeperluanHooks.gs
 * Banci & keperluan komputer makmal.
 *
 * Pengiraan (dokumen spesifikasi §9, dibezakan supaya tiada pengiraan berganda):
 *   kekal     = berfungsi − tidakSesuai + rosakBolehBaiki      (komputer sesuai yang dikekalkan selepas dibaiki)
 *   ganti     = tidakSesuai + rosakLupus                         (diganti satu-satu)
 *   tambahan  = max(0, sasaranJumlah − kekal − ganti)            (kapasiti tambahan)
 *   kos       = (ganti + tambahan) × hargaSeunit
 * Kekangan: berfungsi + rosakBolehBaiki + rosakLupus = jumlahSediaAda; tidakSesuai ≤ berfungsi.
 * Satu rekod aktif (bukan Ditolak) bagi setiap makmal bagi setiap tahun.
 */
const KeperluanHooks = {
  /** Nilai gabungan (data baharu, jika tiada guna rekod semasa). @return {Object} nombor */
  merged_: function (data, cur) {
    const c = cur || {};
    const pick = function (k, col) {
      const v = data[k] !== undefined && data[k] !== null && data[k] !== '' ? data[k] : c[col];
      const n = Number(v);
      return isFinite(n) ? n : 0;
    };
    return {
      sediaAda: pick('jumlahSediaAda', 'jumlah_sedia_ada'),
      berfungsi: pick('berfungsi', 'berfungsi'),
      tidakSesuai: pick('tidakSesuai', 'tidak_sesuai'),
      rosakBaiki: pick('rosakBolehBaiki', 'rosak_boleh_baiki'),
      rosakLupus: pick('rosakLupus', 'rosak_lupus'),
      sasaran: pick('sasaranJumlah', 'sasaran_jumlah'),
      harga: pick('hargaSeunit', 'harga_seunit')
    };
  },

  /** Kiraan tulen (diuji terus). */
  compute: function (n) {
    const kekal = n.berfungsi - n.tidakSesuai + n.rosakBaiki;
    const ganti = n.tidakSesuai + n.rosakLupus;
    const tambahan = Math.max(0, n.sasaran - kekal - ganti);
    const kos = Math.round((ganti + tambahan) * (n.harga || 0) * 100) / 100;
    return { kekal: kekal, ganti: ganti, tambahan: tambahan, kos: kos };
  },

  validate: function (data, info) {
    const cur = info.current || {};
    const n = KeperluanHooks.merged_(data, cur);
    if (n.berfungsi + n.rosakBaiki + n.rosakLupus !== n.sediaAda) {
      throw Errors.validation('Berfungsi + rosak (boleh dibaiki) + rosak (tidak ekonomi) mesti sama dengan jumlah sedia ada (' + n.sediaAda + ').',
        { berfungsi: 'Jumlah mengikut status tidak sepadan dengan jumlah sedia ada.' });
    }
    if (n.tidakSesuai > n.berfungsi) {
      throw Errors.validation('Komputer tidak sesuai tidak boleh melebihi komputer berfungsi.', { tidakSesuai: 'Melebihi bilangan berfungsi.' });
    }
    const makmal = data.makmal || cur.makmal;
    const tahun = String(data.tahun || cur.tahun || '');
    if (!makmal || !tahun) return;
    const dup = CrudEngine.repo(CrudEngine.get('keperluan')).all().some(function (r) {
      return r.state === 'ACTIVE' && r.id !== cur.id && r.makmal === makmal && String(r.tahun) === tahun && r.status !== 'DITOLAK';
    });
    if (dup) throw Errors.conflict('Rekod keperluan bagi makmal ini untuk tahun ' + tahun + ' telah wujud. Sunting rekod sedia ada.');
  },

  beforeSave: function (row, info) {
    const cur = info.current || {};
    const merged = Object.assign({}, cur, row);
    const c = KeperluanHooks.compute({
      berfungsi: Number(merged.berfungsi) || 0,
      tidakSesuai: Number(merged.tidak_sesuai) || 0,
      rosakBaiki: Number(merged.rosak_boleh_baiki) || 0,
      rosakLupus: Number(merged.rosak_lupus) || 0,
      sasaran: Number(merged.sasaran_jumlah) || 0,
      harga: Number(merged.harga_seunit) || 0
    });
    row.bilangan_ganti = c.ganti;
    row.bilangan_tambahan = c.tambahan;
    row.anggaran_kos = c.kos;
  },

  toDTO: function (dto, row) {
    dto.computed = {
      jumlahCadangan: (Number(row.bilangan_ganti) || 0) + (Number(row.bilangan_tambahan) || 0),
      anggaranKos: Number(row.anggaran_kos) || 0
    };
    return dto;
  }
};
