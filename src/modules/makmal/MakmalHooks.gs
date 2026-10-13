/**
 * @file MakmalHooks.gs
 * Makmal: import pukal (upsert ikut kod makmal) dan ringkasan staf / perisian dalam butiran makmal.
 */
const MakmalHooks = {
  routes: {
    'makmal.import': {
      role: 'ADMIN', fn: function (payload, ctx) {
        return ModuleImport.run('makmal', payload || {}, ctx, {
          keyLabel: 'kod makmal',
          keyOf: function (s) { return ModuleImport.norm(s.kod); },
          keyOfRow: function (r) { return ModuleImport.norm(r.kod); },
          /* Kod berbeza tetapi kod lokasi UTMFin sama (cth. makmal jana automatik) → kemas kini, bukan pendua */
          fallback: function (s, rows) {
            const kl = ModuleImport.norm(s.kodLokasi);
            return kl ? rows.filter(function (r) { return ModuleImport.norm(r.kod_lokasi) === kl; })[0] : null;
          },
          label: function (raw) { return raw.kod || raw.nama || ''; }
        });
      }
    }
  },

  /** Butiran: staf makmal (admin sahaja) & perisian dipasang. */
  toDTO: function (dto, row, ctx) {
    const admin = !!(ctx && ctx.role && SecurityService.hasRole(ctx.role, ROLES.ADMIN));
    try {
      dto.perisian = CrudEngine.repo(CrudEngine.get('perisian')).all().filter(function (p) { return p.state === 'ACTIVE' && p.makmal === row.id && p.status !== 'TIDAK_AKTIF'; })
        .map(function (p) { return { id: p.id, nama: p.nama, jenisLesen: p.jenis_lesen, sumberLesen: p.sumber_lesen, bilLesen: p.bil_lesen === '' ? null : Number(p.bil_lesen) }; });
    } catch (e) { dto.perisian = []; }
    if (admin) {
      try {
        dto.staf = CrudEngine.repo(CrudEngine.get('staf')).all().filter(function (s) { return s.state === 'ACTIVE' && s.makmal === row.id && s.status !== 'TIDAK_AKTIF'; })
          .map(function (s) { return { id: s.id, nama: s.nama, jawatan: s.jawatan, email: s.email, telefon: s.telefon }; });
      } catch (e) { dto.staf = []; }
    }
    return dto;
  }
};
