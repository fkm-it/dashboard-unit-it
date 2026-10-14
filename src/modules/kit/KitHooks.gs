/**
 * @file KitHooks.gs
 * Kit peralatan untuk pinjaman berkumpulan (cth. 20 unit Raspberry Pi).
 *   - senarai no. aset disahkan & dinormalkan; setiap aset hanya dalam satu kit aktif
 *   - unit "boleh guna" = aset dalam kit yang berfungsi (tidak rosak / hilang / dilupus)
 *   - baki tersedia bagi julat tarikh = unit boleh guna − unit ditempah oleh pinjaman lain yang bertindih
 */
const KitHooks = {
  USABLE: ['BERFUNGSI', 'PERLAHAN'],

  /** Teks senarai → no. aset (huruf asal, tanpa pendua). */
  parseList: function (text) {
    const seen = {};
    return String(text || '').split(/[\n,;]+/).map(function (s) { return s.trim(); }).filter(function (s) {
      const n = AsetLink.norm(s);
      if (!n || seen[n]) return false;
      seen[n] = true;
      return true;
    });
  },

  repo_: function () { return CrudEngine.repo(CrudEngine.get('kit')); },

  byId: function (id) {
    const k = id ? KitHooks.repo_().findById(id) : null;
    return k && k.state === 'ACTIVE' ? k : null;
  },

  /** Baris aset bagi kit (yang masih wujud dalam daftar). */
  assets: function (kit) {
    return KitHooks.parseList(kit && kit.senarai_aset).map(AsetLink.find).filter(function (a) { return !!a; });
  },

  usable: function (kit) {
    return KitHooks.assets(kit).filter(function (a) { return KitHooks.USABLE.indexOf(a.status) >= 0; });
  },

  validate: function (data, info) {
    const cur = info.current || {};
    const list = KitHooks.parseList(data.senaraiAset !== undefined ? data.senaraiAset : cur.senarai_aset);
    if (!list.length) throw Errors.validation('Senaraikan sekurang-kurangnya satu no. aset.', { senaraiAset: 'Diperlukan.' });
    if (list.length > 500) throw Errors.validation('Maksimum 500 aset setiap kit.', { senaraiAset: 'Terlalu banyak.' });
    const missing = list.filter(function (no) { const a = AsetLink.find(no); return !a || AsetLink.isGone(a); });
    if (missing.length) throw Errors.validation('No. aset tidak ditemui atau telah dilupus: ' + missing.slice(0, 10).join(', ') + (missing.length > 10 ? ' …' : ''), { senaraiAset: missing.length + ' no. aset tidak sah.' });
    const mine = {};
    list.forEach(function (no) { mine[AsetLink.norm(no)] = true; });
    const clash = [];
    KitHooks.repo_().all().forEach(function (k) {
      if (k.state !== 'ACTIVE' || k.id === cur.id) return;
      KitHooks.parseList(k.senarai_aset).forEach(function (no) { if (mine[AsetLink.norm(no)]) clash.push(no + ' (' + k.nama + ')'); });
    });
    if (clash.length) throw Errors.conflict('Aset sudah berada dalam kit lain: ' + clash.slice(0, 5).join(', ') + (clash.length > 5 ? ' …' : ''));
  },

  beforeSave: function (row, info) {
    const m = Object.assign({}, info.current || {}, row);
    if (row.senarai_aset !== undefined) {
      row.senarai_aset = KitHooks.parseList(row.senarai_aset).map(function (no) { const a = AsetLink.find(no); return a ? a.no_aset : no; }).join('\n');
      m.senarai_aset = row.senarai_aset;
    }
    const n = KitHooks.parseList(m.senarai_aset).length;
    row.jumlah_unit = n;
    row.ringkasan = n + ' unit' + (m.maks_pinjam ? ' · maks ' + m.maks_pinjam + ' setiap permohonan' : '');
  },

  selectable: function (row) { return row.status === 'AKTIF'; },

  /**
   * Unit ditempah oleh pinjaman lain yang bertindih dengan [mula, tamat].
   * @param {string} exceptId pinjaman yang dikecualikan
   */
  reserved: function (kit, mula, tamat, exceptId, statuses) {
    const inKit = {};
    KitHooks.parseList(kit.senarai_aset).forEach(function (no) { inKit[AsetLink.norm(no)] = true; });
    let n = 0;
    CrudEngine.repo(CrudEngine.get('pinjaman')).all().forEach(function (r) {
      if (r.state !== 'ACTIVE' || r.id === exceptId || (statuses || PinjamanHooks.HELD).indexOf(r.status) < 0) return;
      if (!(String(r.tarikh_pinjam) <= tamat && mula <= String(r.tarikh_pulang))) return;
      if (r.kit === kit.id) n += Number(r.kuantiti) || 1;
      else if (r.aset && inKit[AsetLink.norm(r.no_aset)]) n += 1;
    });
    return n;
  },

  /** Baki unit tersedia bagi julat tarikh. */
  available: function (kit, mula, tamat, exceptId) {
    return Math.max(0, KitHooks.usable(kit).length - KitHooks.reserved(kit, mula, tamat, exceptId));
  },

  toDTO: function (dto, row) {
    const usable = KitHooks.usable(row);
    const dipinjam = usable.filter(function (a) { return AsetLink.isTrue(a.dipinjam); }).length;
    dto.unitBolehGuna = usable.length;
    dto.unitDipinjam = dipinjam;
    dto.unitTersedia = usable.length - dipinjam;
    return dto;
  }
};
