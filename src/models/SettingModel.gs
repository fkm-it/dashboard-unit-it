/**
 * @file SettingModel.gs
 * Definisi tetapan runtime. `minRole` = peranan minimum untuk MENGUBAH tetapan.
 * Tetapan kritikal keselamatan hanya boleh diubah SUPER_ADMIN.
 * `public: true` → didedahkan kepada frontend (tiada rahsia di sini).
 */
const SETTINGS_DEFS = Object.freeze({
  SYSTEM_NAME: { type: 'string', max: 60, minRole: 'ADMIN', public: true, description: 'Nama sistem', default: 'Dashboard Unit IT FKM' }, // @init:appName
  SYSTEM_TAGLINE: { type: 'string', max: 120, minRole: 'ADMIN', public: true, description: 'Slogan', default: 'Aset, makmal dan aduan IT FKM dalam satu paparan' }, // @init:tagline
  LANDING_MESSAGE: { type: 'text', default: 'Log masuk untuk mula menggunakan sistem.', max: 400, minRole: 'ADMIN', public: true, description: 'Mesej halaman utama' },
  ORG_NAME: { type: 'string', default: '', max: 120, minRole: 'ADMIN', public: true, description: 'Nama organisasi (footer)' },
  ALLOW_REGISTRATION: { type: 'bool', default: false, minRole: 'SUPER_ADMIN', public: true, description: 'Benarkan pendaftaran sendiri (butang Daftar). Jika ditutup, akaun dicipta oleh pentadbir di Pengguna → Tambah pengguna' },
  LANDING_SHOW_FORMS: { type: 'bool', default: false, minRole: 'ADMIN', public: true, description: 'Papar kad borang awam (aduan, penilaian ICT makmal) di halaman utama. Link borang tetap berfungsi walaupun disembunyikan' },
  LANDING_SHOW_FEEDBACK: { type: 'bool', default: false, minRole: 'ADMIN', public: true, description: 'Papar borang maklum balas di halaman utama' },
  ALLOW_PUBLIC_SUBMISSION: { type: 'bool', default: true, minRole: 'SUPER_ADMIN', public: true, description: 'Benarkan orang awam menghantar borang awam (modul yang membenarkannya)' },
  MAINTENANCE_MODE: { type: 'bool', default: false, minRole: 'SUPER_ADMIN', public: true, description: 'Mod penyelenggaraan (hanya admin boleh akses)' },
  MAX_ATTACHMENT_MB: { type: 'int', default: 5, min: 1, max: 20, minRole: 'SUPER_ADMIN', public: true, description: 'Saiz maksimum setiap lampiran (MB)' },
  ALLOWED_MIME_TYPES: {
    type: 'string', default: 'image/jpeg,image/png,image/webp,application/pdf',
    max: 400, minRole: 'SUPER_ADMIN', public: true, description: 'Jenis fail dibenarkan (dipisah koma)'
  },
  DEFAULT_PAGE_SIZE: { type: 'int', default: 20, min: 5, max: 100, minRole: 'ADMIN', public: true, description: 'Saiz halaman senarai' },
  NOTIFY_EMAIL_ENABLED: { type: 'bool', default: false, minRole: 'ADMIN', public: false, description: 'Hantar email untuk notifikasi rekod (rekod baharu kepada admin, perubahan status kepada pemilik)' },
  ADMIN_EMAIL: { type: 'string', default: '', max: 254, minRole: 'SUPER_ADMIN', public: false, description: 'Email pentadbir untuk maklum balas & amaran' },
  SLA_JAM_KRITIKAL: { type: 'int', default: 4, min: 1, max: 720, minRole: 'ADMIN', public: false, description: 'SLA tiket Kritikal (jam kalendar)' },
  SLA_JAM_TINGGI: { type: 'int', default: 24, min: 1, max: 720, minRole: 'ADMIN', public: false, description: 'SLA tiket Tinggi (jam kalendar)' },
  SLA_JAM_SEDERHANA: { type: 'int', default: 72, min: 1, max: 1440, minRole: 'ADMIN', public: false, description: 'SLA tiket Sederhana (jam kalendar)' },
  SLA_JAM_RENDAH: { type: 'int', default: 168, min: 1, max: 2880, minRole: 'ADMIN', public: false, description: 'SLA tiket Rendah (jam kalendar)' },
  SUSUT_HAYAT_TAHUN: { type: 'int', default: 5, min: 1, max: 50, minRole: 'ADMIN', public: false, description: 'Susut nilai: jangka hayat aset (tahun, garis lurus). Sahkan dengan Pejabat Bendahari.' },
  SUSUT_NILAI_SISA: { type: 'int', default: 0, min: 0, max: 100000, minRole: 'ADMIN', public: false, description: 'Susut nilai: nilai sisa setiap aset (RM)' },
  GANTI_UMUR_TAHUN: { type: 'int', default: 7, min: 1, max: 30, minRole: 'ADMIN', public: false, description: 'Cadangan penggantian: umur aset dianggap tua (tahun)' },
  GANTI_RAM_MIN_GB: { type: 'int', default: 8, min: 1, max: 1024, minRole: 'ADMIN', public: false, description: 'Cadangan penggantian: RAM minimum komputer (GB)' },
  GANTI_ADUAN_MIN: { type: 'int', default: 3, min: 1, max: 100, minRole: 'ADMIN', public: false, description: 'Cadangan penggantian: bilangan aduan dalam 12 bulan dianggap kerap' },
  GANTI_HARGA_LALAI: { type: 'int', default: 4500, min: 0, max: 1000000, minRole: 'ADMIN', public: false, description: 'Anggaran harga pengganti (RM) jika nilai perolehan asal tiada' },
  TINDAKAN_SASARAN_HARI: { type: 'int', default: 30, min: 1, max: 365, minRole: 'ADMIN', public: false, description: 'Tindakan KEWPA: tempoh sasaran penyelesaian (hari) bagi tindakan baharu' },
  EMAIL_RINGKASAN_BULANAN: { type: 'bool', default: true, minRole: 'ADMIN', public: false, description: 'Hantar email ringkasan aset IT setiap awal bulan kepada pengguna Pengurusan & Admin' },
  KEPERLUAN_DOMAIN_EMAIL: { type: 'string', default: 'utm.my', max: 200, minRole: 'ADMIN', public: true, description: 'Borang banci makmal: domain email dibenarkan (dipisah koma; subdomain diterima, cth. utm.my). * = semua domain' },
  ASET_DOMAIN_EMAIL: { type: 'string', default: 'utm.my', max: 200, minRole: 'ADMIN', public: true, description: 'Borang awam pinjaman / aduan kerosakan / kehilangan aset: domain email dibenarkan (dipisah koma; subdomain diterima, cth. utm.my merangkumi graduate.utm.my). * = semua domain' },
  PINJAMAN_MAX_HARI: { type: 'int', default: 30, min: 1, max: 365, minRole: 'ADMIN', public: true, description: 'Pinjaman aset: tempoh maksimum (hari)' },
  AI_AKTIF: { type: 'bool', default: true, minRole: 'ADMIN', public: false, description: 'AI Advisor (Gemini): hidupkan untuk Pengurusan & Unit IT (kunci API ditetapkan di Perancangan → AI Advisor)' },
  AI_MODEL: { type: 'string', default: 'gemini-flash-latest', max: 60, minRole: 'ADMIN', public: false, description: 'AI Advisor: nama model Gemini (cth. gemini-flash-latest, gemini-flash-lite-latest)' },
  AI_HAD_SEHARI: { type: 'int', default: 200, min: 1, max: 5000, minRole: 'ADMIN', public: false, description: 'AI Advisor: had soalan sehari untuk seluruh sistem (kekal dalam kuota percuma)' },
  UNJURAN_PELAJAR: { type: 'text', default: '', max: 6000, minRole: 'ADMIN', public: false, hidden: true, description: 'Andaian unjuran pelajar → keperluan PC (JSON; disunting melalui Perancangan → Unjuran pelajar)' },
  EMAIL_RINGKASAN_TAMBAHAN: { type: 'string', default: '', max: 400, minRole: 'ADMIN', public: false, description: 'Penerima tambahan email ringkasan bulanan (dipisah koma), cth. pejabat Dekan' }
});

const SettingModel = {
  /** Tukar nilai string sheet kepada jenis sebenar. */
  parse: function (def, raw) {
    if (raw === undefined || raw === null || raw === '') return def.default;
    if (def.type === 'bool') return String(raw).toUpperCase() === 'TRUE';
    if (def.type === 'int') {
      const n = parseInt(raw, 10);
      return isFinite(n) ? n : def.default;
    }
    return String(raw);
  },

  serialize: function (def, value) {
    if (def.type === 'bool') return value ? 'TRUE' : 'FALSE';
    return String(value);
  },

  /** Peraturan Validator untuk satu tetapan. */
  rule: function (key, def) {
    if (def.type === 'bool') return { type: 'boolean', label: key };
    if (def.type === 'int') return { type: 'int', min: def.min, max: def.max, label: key };
    return { type: def.type === 'text' ? 'text' : 'string', max: def.max, label: key };
  }
};
