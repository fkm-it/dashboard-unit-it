/**
 * @file Migration.gs
 * Migrasi berversi, idempoten, direkod dalam sheet MIGRATIONS.
 *
 * Menambah migrasi baharu:
 *   1. Tambah objek { id:'MIGRATION_00N', description, up: function(){...} } di hujung LIST.
 *   2. `up` MESTI idempoten (selamat jika dijalankan semula) dan TIDAK menulis ganti data sedia ada.
 *   3. Jalankan runMigration({dryRun:true}) dahulu, kemudian runMigration().
 */
const Migration = {
  LIST: [
    {
      id: 'MIGRATION_001',
      description: 'Cipta semua sheet & header asas',
      up: function () {
        return Object.keys(SCHEMA).map(function (k) { return SheetManager.ensure(k); });
      }
    },
    {
      id: 'MIGRATION_002',
      description: 'Seed kategori lalai',
      up: function () { return { added: SeedData.categories() }; }
    },
    {
      id: 'MIGRATION_003',
      description: 'Seed tetapan lalai',
      up: function () { return { added: SeedData.settings() }; }
    },
    // Migrasi modul (cipta sheet / tambah lajur) — DIJANA oleh `npm run gen`. ID berubah apabila medan berubah.
    // @generator:migrations:start
    { id: 'MODULE_TIKET_1B38A9FF', description: 'Modul Tiket: sheet TIKET & lajur', up: function () { return SheetManager.ensure('TIKET'); } },
    { id: 'MODULE_ASET_14F2EC4A', description: 'Modul Aset IT: sheet ASET & lajur', up: function () { return SheetManager.ensure('ASET'); } },
    { id: 'MODULE_TINDAKAN_F54CF4D8', description: 'Modul Tindakan KEWPA: sheet TINDAKAN & lajur', up: function () { return SheetManager.ensure('TINDAKAN'); } },
    { id: 'MODULE_PERGERAKAN_19797A07', description: 'Modul Pergerakan Aset: sheet PERGERAKAN & lajur', up: function () { return SheetManager.ensure('PERGERAKAN'); } },
    { id: 'MODULE_KIT_FE147DB4', description: 'Modul Kit Peralatan: sheet KIT & lajur', up: function () { return SheetManager.ensure('KIT'); } },
    { id: 'MODULE_PINJAMAN_10D73C9F', description: 'Modul Pinjaman Aset: sheet PINJAMAN & lajur', up: function () { return SheetManager.ensure('PINJAMAN'); } },
    { id: 'MODULE_ADUANASET_D48BFBB3', description: 'Modul Aduan Kerosakan Aset: sheet ADUANASET & lajur', up: function () { return SheetManager.ensure('ADUANASET'); } },
    { id: 'MODULE_SELENGGARA_4FE5B3B2', description: 'Modul Penyelenggaraan Aset: sheet SELENGGARA & lajur', up: function () { return SheetManager.ensure('SELENGGARA'); } },
    { id: 'MODULE_PEMERIKSAAN_B3C6EA21', description: 'Modul Pemeriksaan Aset: sheet PEMERIKSAAN & lajur', up: function () { return SheetManager.ensure('PEMERIKSAAN'); } },
    { id: 'MODULE_STOKTAKE_E41EDD08', description: 'Modul Sesi Stock-take: sheet STOKTAKE & lajur', up: function () { return SheetManager.ensure('STOKTAKE'); } },
    { id: 'MODULE_PENILAIAN_897D24D1', description: 'Modul Penilaian Aset: sheet PENILAIAN & lajur', up: function () { return SheetManager.ensure('PENILAIAN'); } },
    { id: 'MODULE_PELUPUSAN_EFC5D954', description: 'Modul Pelupusan Aset: sheet PELUPUSAN & lajur', up: function () { return SheetManager.ensure('PELUPUSAN'); } },
    { id: 'MODULE_KEHILANGAN_EDA99332', description: 'Modul Kehilangan Aset: sheet KEHILANGAN & lajur', up: function () { return SheetManager.ensure('KEHILANGAN'); } },
    { id: 'MODULE_KEPERLUAN_522932E2', description: 'Modul Keperluan Komputer Makmal: sheet KEPERLUAN & lajur', up: function () { return SheetManager.ensure('KEPERLUAN'); } },
    { id: 'MODULE_MAKMAL_6C756663', description: 'Modul Makmal: sheet MAKMAL & lajur', up: function () { return SheetManager.ensure('MAKMAL'); } },
    { id: 'MODULE_PERISIAN_89847E0B', description: 'Modul Perisian & Lesen: sheet PERISIAN & lajur', up: function () { return SheetManager.ensure('PERISIAN'); } },
    { id: 'MODULE_STAF_E03295A9', description: 'Modul Staf Makmal: sheet STAF & lajur', up: function () { return SheetManager.ensure('STAF'); } },
    { id: 'MODULE_PEGAWAI_80FC51F6', description: 'Modul Pegawai IT: sheet PEGAWAI & lajur', up: function () { return SheetManager.ensure('PEGAWAI'); } },
    // @generator:migrations:end
    // Migrasi tulisan tangan (data) — tambah di bawah dengan ID MIGRATION_00N.
    {
      id: 'MIGRATION_004',
      description: 'Keperluan makmal: isi nama_makmal bagi rekod sedia ada (tajuk senarai)',
      up: function () {
        const repo = CrudEngine.repo(CrudEngine.get('keperluan'));
        const labs = {};
        CrudEngine.repo(CrudEngine.get('makmal')).all().forEach(function (l) { labs[l.id] = l.kod ? l.kod + ' · ' + l.nama : l.nama; });
        const patch = {};
        repo.all().forEach(function (r) { if (!r.nama_makmal && r.makmal && labs[r.makmal]) patch[r.id] = { nama_makmal: labs[r.makmal] }; });
        return { updated: Object.keys(patch).length ? repo.updateMany(patch) : 0 };
      }
    },
    {
      id: 'MIGRATION_005',
      description: 'Tutup pendaftaran sendiri — akaun dicipta oleh pentadbir (Pengguna → Tambah pengguna)',
      up: function () {
        const patch = { ALLOW_REGISTRATION: 'FALSE' };
        if (String(SettingsService.get('LANDING_MESSAGE') || '').indexOf('Log masuk atau daftar') === 0) patch.LANDING_MESSAGE = 'Log masuk untuk mula menggunakan sistem.';
        SettingsRepository.setMany(patch, 'Migrasi');
        return { allowRegistration: false };
      }
    },
    {
      id: 'MIGRATION_006',
      description: 'Keperluan makmal: jenis permohonan & kos penggantian/penambahan berasingan bagi rekod sedia ada',
      up: function () {
        const repo = CrudEngine.repo(CrudEngine.get('keperluan'));
        const patch = {};
        repo.all().forEach(function (r) {
          if (r.state !== 'ACTIVE' || (r.jenis_permohonan && r.anggaran_kos_ganti !== '')) return;
          const p = {};
          KeperluanHooks.beforeSave(p, { mode: 'update', current: r });
          patch[r.id] = { jenis_permohonan: p.jenis_permohonan || r.jenis_permohonan, bilangan_ganti: p.bilangan_ganti, bilangan_tambahan: p.bilangan_tambahan,
            anggaran_kos_ganti: p.anggaran_kos_ganti, anggaran_kos_tambahan: p.anggaran_kos_tambahan, anggaran_kos: p.anggaran_kos };
        });
        return { updated: Object.keys(patch).length ? repo.updateMany(patch) : 0 };
      }
    },
    {
      id: 'MIGRATION_007',
      description: 'Aset: betulkan jenis yang tersilap dikesan daripada deskripsi tender (cth. desktop dikira komputer riba)',
      up: function () {
        const repo = CrudEngine.repo(CrudEngine.get('aset'));
        const patch = {};
        repo.all().forEach(function (r) {
          if (r.state !== 'ACTIVE') return;
          const item = r.model || r.nama_alat;
          const byItem = AsetHooks.jenisOf(item, null);
          const derivedOld = AsetHooks.jenisOf(String(item || '') + ' ' + String(r.deskripsi_perolehan || ''), null);
          /* Hanya rekod yang jenisnya sama dengan pengesanan lama (bukan diisi tangan) dan nama item jelas berbeza */
          if (byItem && derivedOld && r.jenis === derivedOld && byItem !== r.jenis) patch[r.id] = { jenis: byItem, updated_at: DateUtils.nowIso() };
        });
        return { updated: Object.keys(patch).length ? repo.updateMany(patch) : 0 };
      }
    },
  ],

  applied: function () {
    const ss = Database.open();
    if (!ss.getSheetByName(SCHEMA.MIGRATIONS.sheet)) return {};
    const out = {};
    Repo.of('MIGRATIONS').all().forEach(function (m) { out[m.migration_id] = m; });
    return out;
  },

  status: function () {
    try {
      const applied = Migration.applied();
      return Migration.LIST.map(function (m) {
        return { id: m.id, description: m.description, appliedAt: applied[m.id] ? applied[m.id].applied_at : '' };
      });
    } catch (e) {
      return [];
    }
  },

  /**
   * @param {{dryRun?:boolean}} options
   * @return {{applied:string[], pending:string[], log:Object[]}}
   */
  run: function (options) {
    const dryRun = !!(options && options.dryRun);
    // MIGRATIONS sheet sendiri mesti wujud dahulu
    if (!dryRun) SheetManager.ensure('MIGRATIONS');
    const done = Migration.applied();
    const pending = Migration.LIST.filter(function (m) { return !done[m.id]; });
    const log = [];
    if (dryRun) {
      return { applied: [], pending: pending.map(function (m) { return m.id; }), log: log, dryRun: true };
    }
    const actor = Migration.actor();
    const appliedIds = [];
    pending.forEach(function (m) {
      const started = Date.now();
      const result = Database.withLock(function () {
        Database.resetRequestCache(); // header mungkin berubah
        return m.up();
      });
      Repo.of('MIGRATIONS').insert({ migration_id: m.id, description: m.description, applied_at: DateUtils.nowIso(), applied_by: actor });
      log.push({ id: m.id, ms: Date.now() - started, result: result });
      AppLogger.info('Migrasi digunakan', { id: m.id, ms: Date.now() - started });
      AuditService.log({ role: 'SYSTEM' }, AUDIT_ACTIONS.MIGRATION_APPLIED, 'DATABASE', m.id, m.description);
      appliedIds.push(m.id);
    });
    // Sentiasa pastikan skema terkini (lajur baharu) walaupun tiada migrasi tertunda
    if (!pending.length) Object.keys(SCHEMA).forEach(function (k) { SheetManager.ensure(k); });
    Database.resetRequestCache();
    return { applied: appliedIds, pending: [], log: log };
  },

  /**
   * Migrasi automatik selepas deploy (CI): dipanggil pada setiap permintaan API, tetapi kos hampir sifar —
   * hanya membandingkan tandatangan senarai migrasi dengan Script Property MIGRATED_FOR (dicache).
   * Jika berbeza, migrasi tertunda dijalankan SEKALI di bawah kunci. Tiada langkah manual selepas `clasp push`.
   * Dilangkau jika pangkalan data belum disediakan (setupDatabase belum dijalankan).
   */
  autoRun: function () {
    const sig = CONFIG.VERSION + ':' + Migration.LIST.map(function (m) { return m.id; }).join(',');
    const hash = SecurityUtils.shortHash(sig);
    if (Env.get('MIGRATED_FOR') === hash || !Env.get('SPREADSHEET_ID')) return null;
    return Database.withLock(function () {
      Env.reset();
      if (Env.get('MIGRATED_FOR') === hash) return null; // proses lain telah menjalankannya
      const r = Migration.run({});
      Env.set('MIGRATED_FOR', hash);
      try { MaintenanceService.ensureTriggers(); } catch (e) { AppLogger.warn('Pencetus tidak dapat dipasang automatik', { error: String(e) }); }
      if (r.applied.length) AppLogger.info('Migrasi automatik selepas deploy', { applied: r.applied });
      return r;
    });
  },

  actor: function () {
    try { return Session.getEffectiveUser().getEmail() || 'SYSTEM'; } catch (e) { return 'SYSTEM'; }
  }
};
