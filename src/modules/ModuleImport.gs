/**
 * @file ModuleImport.gs
 * Import pukal generik (CSV dihurai di pelayar) untuk modul ringkas: makmal, staf, perisian, pegawai.
 * Upsert ikut kunci modul (opts.keyOf), medan ref diselesaikan ikut ID / kod / nama / titleField / email,
 * enum diterima sebagai nilai atau label. Hooks modul (validate, beforeSave) dipanggil seperti borang biasa.
 * Aset IT kekal menggunakan AsetHooks.importRows (logik UTMFin khusus).
 */
const ModuleImport = {
  MAX: 500,

  norm: function (s) { return String(s === undefined || s === null ? '' : s).toLowerCase().replace(/[^a-z0-9@.]+/g, ' ').trim(); },

  /** Peta carian rekod rujukan: id / kod / nama / titleField / email (huruf kecil) → id. */
  refMap_: function (refKey) {
    const def = CrudEngine.get(refKey);
    const title = def.fields.filter(function (f) { return f.key === def.titleField; })[0];
    const map = {};
    CrudEngine.repo(def).all().forEach(function (r) {
      if (r.state !== 'ACTIVE') return;
      [r.id, r.ref_no, r.kod, r.kod_lokasi, r.nama, r.email, r.no_aset, title ? r[title.column] : ''].forEach(function (k) {
        const n = ModuleImport.norm(k);
        if (n && !map[n]) map[n] = r.id;
      });
    });
    return map;
  },

  /** Nilai mentah CSV → nilai borang. Ralat dilontar untuk ref yang tidak ditemui. */
  value_: function (f, v, refs) {
    if (v === undefined || v === null) return undefined;
    const s = String(v).replace(/ /g, ' ').trim();
    if (s === '' || s === '-') return undefined;
    if (f.type === 'bool') return /^(ya|yes|true|1|y|aktif|✓|✔)$/i.test(s);
    if (f.type === 'int') { const n = Number(s.replace(/,/g, '')); return isFinite(n) ? String(Math.round(n)) : s; }
    if (f.type === 'number') return s.replace(/,/g, '');
    if (f.type === 'email') return s.toLowerCase().replace(/\s+/g, '');
    if (f.type === 'enum' && f.options) {
      const hit = f.options.filter(function (o) { return o.value.toLowerCase() === s.toLowerCase() || String(o.label).toLowerCase() === s.toLowerCase(); })[0];
      return hit ? hit.value : s;
    }
    if (f.type === 'ref') {
      const id = refs[f.ref][ModuleImport.norm(s)];
      if (!id) throw Errors.validation(f.label + ' "' + s + '" tidak ditemui.');
      return id;
    }
    if (f.type === 'date' && /^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4}$/.test(s)) {
      const p = s.split(/[\/.-]/);
      return p[2] + '-' + ('0' + p[1]).slice(-2) + '-' + ('0' + p[0]).slice(-2);
    }
    return s;
  },

  /**
   * @param {string} key modul
   * @param {{rows:Object[], dryRun?:boolean, offset?:number}} payload
   * @param {Object} ctx
   * @param {{keyOf:function(Object):string, keyOfRow:function(Object):string, label?:function(Object):string}} opts
   *   keyOf(src camelCase selepas ref diselesaikan) & keyOfRow(baris sheet) mesti menghasilkan kunci sama untuk rekod sama;
   *   fallback(src, activeRows) pilihan — padanan kedua jika kunci tidak ditemui
   */
  run: function (key, payload, ctx, opts) {
    const def = CrudEngine.get(key);
    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    if (!rows.length) throw Errors.validation('Tiada baris untuk diimport.');
    if (rows.length > ModuleImport.MAX) throw Errors.validation('Maksimum ' + ModuleImport.MAX + ' baris setiap kali import.');
    const dryRun = payload.dryRun === true;
    const repo = CrudEngine.repo(def);
    const hooks = CrudEngine.hooks(def);
    const existing = {};
    const active = repo.all().filter(function (r) { return r.state === 'ACTIVE'; });
    active.forEach(function (r) {
      if (r.state !== 'ACTIVE') return;
      const k = opts.keyOfRow(r);
      if (k && !existing[k]) existing[k] = r;
    });
    const refs = {};
    def.fields.forEach(function (f) { if (f.type === 'ref' && !refs[f.ref]) refs[f.ref] = ModuleImport.refMap_(f.ref); });
    const fields = def.fields.filter(function (f) { return f.type !== 'files' && !f.readonly; });
    const statuses = {};
    def.statuses.forEach(function (s) { statuses[s.value.toLowerCase()] = s.value; statuses[String(s.label).toLowerCase()] = s.value; });
    const now = DateUtils.nowIso();
    const errors = [], skipped = [], inserts = [], patches = {}, seen = {};
    rows.forEach(function (raw, i) {
      const line = i + (Number(payload.offset) || 0) + 2;
      try {
        const src = {};
        fields.forEach(function (f) {
          const v = ModuleImport.value_(f, raw[f.key], refs);
          if (v !== undefined) src[f.key] = v;
        });
        const k = opts.keyOf(src);
        if (!k) { skipped.push({ line: line, reason: 'Tiada kunci rekod (' + (opts.keyLabel || 'kunci') + ')' }); return; }
        if (seen[k]) { skipped.push({ line: line, reason: 'Pendua dalam fail (sama dengan baris ' + seen[k] + ')' }); return; }
        seen[k] = line;
        const cur = existing[k] || (opts.fallback ? opts.fallback(src, active) : null) || null;
        let st = '';
        if (raw.status) {
          st = statuses[String(raw.status).trim().toLowerCase()];
          if (!st) throw Errors.validation('Status "' + raw.status + '" tidak dikenali.');
        }
        const v = CrudEngine.validate(def, src, ctx, cur ? 'update' : 'create');
        if (hooks.validate) hooks.validate(v.data, { ctx: ctx, mode: cur ? 'update' : 'create', current: cur, import: true });
        if (hooks.beforeSave) hooks.beforeSave(v.row, { ctx: ctx, mode: cur ? 'update' : 'create', current: cur });
        if (cur) {
          const p = Object.assign({}, v.row, { updated_at: now });
          if (st && st !== cur.status) Object.assign(p, { status: st, status_changed_at: now, status_changed_by: 'Import' });
          patches[cur.id] = p;
        } else {
          const row = Object.assign({}, v.row, {
            id: IdUtils.generate(def.prefix), ref_no: '', owner_user_id: ctx.userId, owner_name: (ctx.user && ctx.user.full_name) || '',
            status: st || def.defaultStatus, status_note: '', status_changed_at: '', status_changed_by: '',
            state: RECORD_STATE.ACTIVE, created_at: now, updated_at: now, deleted_at: ''
          });
          def.fields.forEach(function (f) { if (row[f.column] === undefined) row[f.column] = f.type === 'bool' ? (f.default === true) : (f.default !== undefined ? f.default : ''); });
          inserts.push(row);
        }
      } catch (e) {
        errors.push({ line: line, noAset: opts.label ? opts.label(raw) : '', message: e && e.message ? e.message : String(e) });
      }
    });
    if (!dryRun && !errors.length) {
      Database.withLock(function () {
        AsetHooks.assignRefs_(def, inserts);
        if (inserts.length) repo.insertMany(inserts);
        if (Object.keys(patches).length) repo.updateMany(patches);
      });
      repo.invalidate();
      AppCache.remove('stats:admin');
      AuditService.log(ctx, AUDIT_ACTIONS.RECORD_CREATED, def.sheet, '', 'Import ' + def.label + ': ' + inserts.length + ' baharu, ' + Object.keys(patches).length + ' dikemas kini');
    }
    return {
      dryRun: dryRun || errors.length > 0, created: inserts.length, updated: Object.keys(patches).length,
      errors: errors.slice(0, 100), errorCount: errors.length, skipped: skipped.slice(0, 200), skippedCount: skipped.length
    };
  }
};
