/**
 * @file PegawaiHooks.gs
 * Pegawai IT. Import upsert ikut email (jika tiada: nama).
 */
const PegawaiHooks = {
  routes: {
    'pegawai.import': {
      role: 'ADMIN', fn: function (payload, ctx) {
        return ModuleImport.run('pegawai', payload || {}, ctx, {
          keyLabel: 'email / nama',
          keyOf: function (s) { return s.email ? 'e:' + ModuleImport.norm(s.email) : s.nama ? 'm:' + ModuleImport.norm(s.nama) : ''; },
          keyOfRow: function (r) { return r.email ? 'e:' + ModuleImport.norm(r.email) : 'm:' + ModuleImport.norm(r.nama); },
          label: function (raw) { return raw.nama || ''; }
        });
      }
    }
  }
};
