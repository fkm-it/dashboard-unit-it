/**
 * @file StafHooks.gs
 * Staf makmal. Import upsert ikut no. pekerja (jika tiada: email, kemudian nama).
 */
const StafHooks = {
  key_: function (noPekerja, email, nama) {
    const n = ModuleImport.norm(noPekerja);
    return n ? 'n:' + n : email ? 'e:' + ModuleImport.norm(email) : nama ? 'm:' + ModuleImport.norm(nama) : '';
  },

  routes: {
    'staf.import': {
      role: 'ADMIN', fn: function (payload, ctx) {
        return ModuleImport.run('staf', payload || {}, ctx, {
          keyLabel: 'no. pekerja / email / nama',
          keyOf: function (s) { return StafHooks.key_(s.noPekerja, s.email, s.nama); },
          keyOfRow: function (r) { return StafHooks.key_(r.no_pekerja, r.email, r.nama); },
          label: function (raw) { return raw.nama || ''; }
        });
      }
    }
  },

  validate: function (data, info) {
    if (info.import || !data.noPekerja) return;
    const cur = info.current || {};
    const n = ModuleImport.norm(data.noPekerja);
    const dup = CrudEngine.repo(CrudEngine.get('staf')).all().some(function (r) { return r.state === 'ACTIVE' && r.id !== cur.id && ModuleImport.norm(r.no_pekerja) === n; });
    if (dup) throw Errors.conflict('No. pekerja ' + data.noPekerja + ' telah wujud.');
  }
};
