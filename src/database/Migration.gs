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
    { id: 'MODULE_TIKET_75AFC152', description: 'Modul Tiket: sheet TIKET & lajur', up: function () { return SheetManager.ensure('TIKET'); } },
    { id: 'MODULE_ASET_2BA317E8', description: 'Modul Aset IT: sheet ASET & lajur', up: function () { return SheetManager.ensure('ASET'); } },
    { id: 'MODULE_KEPERLUAN_4E2231D7', description: 'Modul Keperluan Komputer Makmal: sheet KEPERLUAN & lajur', up: function () { return SheetManager.ensure('KEPERLUAN'); } },
    { id: 'MODULE_MAKMAL_A3D5230B', description: 'Modul Makmal: sheet MAKMAL & lajur', up: function () { return SheetManager.ensure('MAKMAL'); } },
    { id: 'MODULE_PEGAWAI_80FC51F6', description: 'Modul Pegawai IT: sheet PEGAWAI & lajur', up: function () { return SheetManager.ensure('PEGAWAI'); } },
    // @generator:migrations:end
    // Migrasi tulisan tangan (data) — tambah di bawah dengan ID MIGRATION_00N.
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
