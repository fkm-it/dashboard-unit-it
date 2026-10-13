/**
 * @file PerisianHooks.gs
 * Perisian & lesen makmal. Satu rekod bagi setiap (makmal, nama perisian); import upsert ikut pasangan itu.
 */
const PerisianHooks = {
  routes: {
    'perisian.import': {
      role: 'ADMIN', fn: function (payload, ctx) {
        return ModuleImport.run('perisian', payload || {}, ctx, {
          keyLabel: 'makmal + perisian',
          keyOf: function (s) { return s.makmal && s.nama ? s.makmal + '|' + ModuleImport.norm(s.nama) : ''; },
          keyOfRow: function (r) { return r.makmal + '|' + ModuleImport.norm(r.nama); },
          label: function (raw) { return (raw.makmal || '') + ' · ' + (raw.nama || ''); }
        });
      }
    }
  },

  validate: function (data, info) {
    if (info.import) return; /* import: pendua diurus sebagai upsert */
    const cur = info.current || {};
    const makmal = data.makmal || cur.makmal;
    const nama = ModuleImport.norm(data.nama || cur.nama);
    if (!makmal || !nama) return;
    const dup = CrudEngine.repo(CrudEngine.get('perisian')).all().some(function (r) {
      return r.state === 'ACTIVE' && r.id !== cur.id && r.makmal === makmal && ModuleImport.norm(r.nama) === nama;
    });
    if (dup) throw Errors.conflict('Perisian ini telah direkod untuk makmal tersebut.');
  },

  /** Sumber terbuka → bilangan lesen tidak relevan. */
  beforeSave: function (row, info) {
    const cur = info.current || {};
    const jenis = row.jenis_lesen !== undefined ? row.jenis_lesen : cur.jenis_lesen;
    if (jenis === 'SUMBER_TERBUKA') row.bil_lesen = '';
  }
};
