/**
 * @file AsetCache.gs
 * Cache hasil laporan (CacheService) supaya paparan dashboard/laporan tidak mengira semula daripada Sheets setiap kali.
 *   - Kunci mengandungi versi data setiap sheet berkaitan → sebarang tulisan melalui repository membatalkan cache serta-merta.
 *   - Kunci juga mengandungi jam semasa → angka bergantung masa (umur, lewat SLA) dikira semula sekurang-kurangnya sejam sekali.
 *   - Pencetus setiap jam (hook `hourly`) memanaskan cache laporan utama supaya paparan pertama juga pantas.
 * Suntingan terus dalam Google Sheets (bukan melalui sistem) kelihatan selepas jam berikutnya.
 */
const AsetCache = {
  SHEETS: ['ASET', 'TIKET', 'MAKMAL', 'KEPERLUAN', 'TINDAKAN', 'PEGAWAI', 'STAF', 'PERISIAN', 'SETTINGS', 'CATEGORIES', 'RINGKASAN_BULANAN'],
  TTL: 3600,

  /** Payload → kunci stabil (kunci disusun, nilai kosong dibuang). */
  key: function (name, payload) {
    const p = payload || {};
    const parts = Object.keys(p).sort().filter(function (k) {
      const v = p[k];
      return v !== '' && v !== null && v !== undefined && typeof v !== 'object';
    }).map(function (k) { return k + '=' + String(p[k]).slice(0, 40); });
    return 'lap:' + name + ':' + DateUtils.format(new Date(), 'yyyyMMddHH') + ':' + parts.join('&');
  },

  get: function (name, payload, compute) {
    return AppCache.rememberFor(AsetCache.SHEETS, AsetCache.key(name, payload), AsetCache.TTL, compute);
  },

  /** Panaskan laporan utama (payload sama seperti yang dihantar oleh paparan). */
  warm: function () {
    const y = Number(DateUtils.format(new Date(), 'yyyy'));
    const jobs = [
      ['aset.overview', { tahun: y }, function () { return AsetHooks.overview({ tahun: y }); }],
      ['aset.eksekutif', {}, function () { return AsetHooks.reportExecutive({}); }],
      ['aset.indeksMakmal', {}, function () { return AsetHooks.reportLabHealth(); }],
      ['aset.pelan', { tahun: 5 }, function () { return AsetHooks.reportPlan({ tahun: 5 }); }],
      ['aset.laporanNilai', {}, function () { return AsetHooks.reportValue({}); }],
      ['aset.laporanGanti', { jenis: 'KOMPUTER' }, function () { return AsetHooks.reportReplacement({ jenis: 'KOMPUTER' }); }],
      ['aset.trend', { bulan: 12 }, function () { return AsetTrend.trend({ bulan: 12 }); }]
    ];
    let ok = 0;
    jobs.forEach(function (j) {
      try { AsetCache.get(j[0], j[1], j[2]); ok++; } catch (e) { ErrorHandler.record(e, { action: 'cache.warm ' + j[0] }); }
    });
    return { dipanaskan: ok };
  }
};
