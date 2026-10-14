/**
 * @file Schema.gs
 * SATU sumber kebenaran untuk struktur setiap sheet.
 * SheetManager mencipta header daripada sini; RepositoryBase menukar jenis data berdasarkan `types`.
 *
 * Semua sel disimpan sebagai TEKS (format '@') — elak Sheets menukar ISO date/nombor telefon secara automatik.
 * Jenis: 'bool' | 'int' | (lalai) string.
 */
const SCHEMA = Object.freeze({
  USERS: {
    sheet: 'USERS', id: 'user_id', prefix: 'U',
    columns: ['user_id', 'email', 'full_name', 'phone', 'photo_url', 'role', 'status', 'auth_provider',
      'created_at', 'updated_at', 'last_login_at'],
    types: {}
  },
  /** Dipisahkan daripada USERS supaya hash tidak terdedah jika USERS dikongsi. Sheet ini disembunyi & dilindungi. */
  CREDENTIALS: {
    sheet: 'CREDENTIALS', id: 'user_id', hidden: true, protect: true,
    columns: ['user_id', 'password_hash', 'updated_at'],
    types: {}
  },
  /** session_id = SHA-256(token). Token mentah TIDAK pernah disimpan. */
  SESSIONS: {
    sheet: 'SESSIONS', id: 'session_id', hidden: true, protect: true,
    columns: ['session_id', 'user_id', 'expires_at', 'created_at', 'user_agent_hash', 'revoked_at'],
    types: {}
  },
  CATEGORIES: {
    sheet: 'CATEGORIES', id: 'category_id', prefix: 'C',
    columns: ['category_id', 'name_ms', 'name_en', 'description', 'icon', 'sort_order', 'status', 'created_at', 'updated_at'],
    types: { sort_order: 'int' }
  },
  /** Lampiran untuk SEMUA modul (module + record_id). Fail sebenar di Drive peribadi. */
  ATTACHMENTS: {
    sheet: 'ATTACHMENTS', id: 'attachment_id', prefix: 'A',
    columns: ['attachment_id', 'module', 'record_id', 'field', 'uploader_user_id', 'drive_file_id', 'filename', 'mime_type', 'size_bytes', 'status', 'created_at'],
    types: { size_bytes: 'int' }
  },
  /** Token peranti FCM untuk notifikasi telefon. Dilindungi — token ialah alamat penghantaran. */
  PUSH_TOKENS: {
    sheet: 'PUSH_TOKENS', id: 'token_id', prefix: 'K', hidden: true, protect: true,
    columns: ['token_id', 'user_id', 'token', 'platform', 'user_agent', 'status', 'created_at', 'last_seen_at'],
    types: {}
  },
  NOTIFICATIONS: {
    sheet: 'NOTIFICATIONS', id: 'notification_id', prefix: 'N',
    columns: ['notification_id', 'user_id', 'type', 'title', 'message', 'reference_id', 'is_read', 'created_at'],
    types: { is_read: 'bool' }
  },
  AUDIT_LOGS: {
    sheet: 'AUDIT_LOGS', id: 'log_id', prefix: 'L',
    columns: ['log_id', 'user_id', 'role', 'action', 'module', 'reference_id', 'description', 'ip_hash', 'user_agent', 'created_at'],
    types: {}
  },
  SETTINGS: {
    sheet: 'SETTINGS', id: 'setting_key',
    columns: ['setting_key', 'setting_value', 'description', 'updated_by', 'updated_at'],
    types: {}
  },
  SYSTEM_LOGS: {
    sheet: 'SYSTEM_LOGS', id: 'log_id', prefix: 'S',
    columns: ['log_id', 'level', 'error_id', 'action', 'message', 'context', 'created_at'],
    types: {}
  },
  FEEDBACK: {
    sheet: 'FEEDBACK', id: 'feedback_id', prefix: 'B',
    columns: ['feedback_id', 'user_id', 'name', 'email', 'message', 'status', 'created_at', 'updated_at'],
    types: {}
  },
  MIGRATIONS: {
    sheet: 'MIGRATIONS', id: 'migration_id',
    columns: ['migration_id', 'description', 'applied_at', 'applied_by'],
    types: {}
  },
  /** Link edit peribadi untuk borang awam (cth. banci makmal). Hanya hash token disimpan; dilindungi. */
  PAUTAN_EDIT: {
    sheet: 'PAUTAN_EDIT', id: 'token_hash', hidden: true, protect: true,
    columns: ['token_hash', 'modul', 'record_id', 'email', 'created_at', 'expires_at', 'revoked_at', 'used_at'],
    types: {}
  },
  /** Ringkasan aset IT setiap bulan (satu baris sebulan, dikemas kini setiap hari; baris bulan lepas = nilai akhir bulan). */
  RINGKASAN_BULANAN: {
    sheet: 'RINGKASAN_BULANAN', id: 'bulan',
    columns: ['bulan', 'aset', 'beroperasi_pct', 'nilai_kos', 'nilai_buku', 'susut_habis', 'ganti_segera', 'ganti_tahun_depan', 'kos_ganti',
      'tiket_baru', 'tiket_selesai', 'tiket_terbuka', 'tiket_lewat', 'sla_pct', 'disahkan_pct', 'lokasi_berbeza', 'makmal', 'makmal_kritikal',
      'indeks_purata', 'tindakan_terbuka', 'tindakan_lewat', 'tindakan_selesai', 'emel_dihantar_pada', 'created_at', 'updated_at'],
    types: {}
  },

  // ===================================================================== MODUL
  // Blok di bawah DIJANA oleh `npm run gen` daripada modules/*.json — jangan sunting dengan tangan.
  // @generator:schema:start
  TIKET: {
    sheet: 'TIKET', id: 'id', prefix: 'TK', module: 'tiket',
    columns: ['id', 'ref_no', 'owner_user_id', 'owner_name', 'nama', 'email', 'telefon', 'tajuk', 'kategori', 'keutamaan', 'lokasi', 'makmal', 'no_aset', 'aset', 'keterangan', 'lampiran', 'pegawai', 'tarikh_sasaran', 'diakui_pada', 'selesai_pada', 'penyelesaian', 'catatan_dalaman', 'status', 'status_note', 'status_changed_at', 'status_changed_by', 'state', 'created_at', 'updated_at', 'deleted_at'],
    types: {'lampiran': 'int'}
  },
  ASET: {
    sheet: 'ASET', id: 'id', prefix: 'AS', module: 'aset',
    columns: ['id', 'ref_no', 'owner_user_id', 'owner_name', 'no_aset', 'no_siri', 'jenis', 'jenama', 'model', 'nama_alat', 'monitor', 'makmal', 'lokasi', 'kod_lokasi', 'lokasi_fizikal', 'lokasi_berbeza', 'pic_makmal', 'pegawai_bertanggungjawab', 'no_pekerja_penjaga', 'email_penjaga', 'penjaga_terkini', 'status_pengesahan', 'disemak_oleh', 'tahun_perolehan', 'tarikh_aset', 'nilai_perolehan', 'tamat_waranti', 'cpu', 'ram_gb', 'storan', 'gpu', 'sistem_operasi', 'lesen_os', 'perisian', 'keadaan_fizikal', 'cadangan', 'kategori_aset', 'borang_kewpa', 'kegunaan', 'sop_ada', 'selenggara_cuti_sem', 'selenggara_suku_tahun', 'selenggara_ikut_keadaan', 'disahkan_fizikal', 'tarikh_semakan', 'perlu_dilengkapkan', 'catatan', 'deskripsi_perolehan', 'kod_sodo', 'ptj_perolehan', 'chargeline', 'no_rujukan_perolehan', 'no_pt', 'no_requisition', 'cost_center', 'boleh_dipinjam', 'dipinjam', 'peminjam_semasa', 'tarikh_pulang_jangka', 'tarikh_selenggara_terakhir', 'tarikh_selenggara_seterusnya', 'tarikh_penilaian', 'skor_keadaan', 'nilai_semasa', 'status', 'status_note', 'status_changed_at', 'status_changed_by', 'state', 'created_at', 'updated_at', 'deleted_at'],
    types: {'lokasi_berbeza': 'bool', 'tahun_perolehan': 'intOrNull', 'ram_gb': 'intOrNull', 'sop_ada': 'bool', 'selenggara_cuti_sem': 'bool', 'selenggara_suku_tahun': 'bool', 'selenggara_ikut_keadaan': 'bool', 'disahkan_fizikal': 'bool', 'perlu_dilengkapkan': 'bool', 'boleh_dipinjam': 'bool', 'dipinjam': 'bool', 'skor_keadaan': 'intOrNull'}
  },
  TINDAKAN: {
    sheet: 'TINDAKAN', id: 'id', prefix: 'TD', module: 'tindakan',
    columns: ['id', 'ref_no', 'owner_user_id', 'owner_name', 'jenis', 'aset', 'no_aset', 'butiran', 'makmal', 'pegawai', 'tarikh_sasaran', 'borang', 'catatan', 'automatik', 'selesai_pada', 'status', 'status_note', 'status_changed_at', 'status_changed_by', 'state', 'created_at', 'updated_at', 'deleted_at'],
    types: {'automatik': 'bool'}
  },
  PERGERAKAN: {
    sheet: 'PERGERAKAN', id: 'id', prefix: 'PR', module: 'pergerakan',
    columns: ['id', 'ref_no', 'owner_user_id', 'owner_name', 'no_aset', 'butiran_aset', 'aset', 'jenis_pergerakan', 'lokasi_asal', 'makmal_baru', 'lokasi_baru', 'penjaga_baru', 'email_penjaga_baru', 'ptj_baru', 'tarikh_pergerakan', 'sebab', 'lampiran', 'catatan_unit', 'status', 'status_note', 'status_changed_at', 'status_changed_by', 'state', 'created_at', 'updated_at', 'deleted_at'],
    types: {'lampiran': 'int'}
  },
  KIT: {
    sheet: 'KIT', id: 'id', prefix: 'KT', module: 'kit',
    columns: ['id', 'ref_no', 'owner_user_id', 'owner_name', 'nama', 'ringkasan', 'kandungan', 'senarai_aset', 'jumlah_unit', 'maks_pinjam', 'lokasi_simpanan', 'catatan', 'gambar', 'status', 'status_note', 'status_changed_at', 'status_changed_by', 'state', 'created_at', 'updated_at', 'deleted_at'],
    types: {'jumlah_unit': 'intOrNull', 'maks_pinjam': 'intOrNull', 'gambar': 'int'}
  },
  PINJAMAN: {
    sheet: 'PINJAMAN', id: 'id', prefix: 'PJ', module: 'pinjaman',
    columns: ['id', 'ref_no', 'owner_user_id', 'owner_name', 'nama', 'email', 'kategori_pemohon', 'no_pengenalan', 'telefon', 'penyelia', 'no_aset', 'butiran_aset', 'kit', 'kuantiti', 'aset', 'kod_kursus', 'nama_pensyarah', 'email_pensyarah', 'bilangan_pelajar', 'tujuan', 'lokasi_penggunaan', 'tarikh_pinjam', 'tarikh_pulang', 'lampiran', 'unit_diserahkan', 'tarikh_diserahkan', 'tarikh_dipulangkan', 'keadaan_pulang', 'unit_tidak_dipulang', 'catatan_unit', 'status', 'status_note', 'status_changed_at', 'status_changed_by', 'state', 'created_at', 'updated_at', 'deleted_at'],
    types: {'kuantiti': 'intOrNull', 'bilangan_pelajar': 'intOrNull', 'lampiran': 'int'}
  },
  ADUANASET: {
    sheet: 'ADUANASET', id: 'id', prefix: 'AD', module: 'aduanaset',
    columns: ['id', 'ref_no', 'owner_user_id', 'owner_name', 'nama', 'email', 'telefon', 'no_aset', 'butiran_aset', 'aset', 'tarikh_kerosakan', 'lokasi', 'keterangan_kerosakan', 'lampiran', 'pegawai', 'tindakan', 'kos_pembaikan', 'laporan_teknikal', 'tarikh_selesai', 'status', 'status_note', 'status_changed_at', 'status_changed_by', 'state', 'created_at', 'updated_at', 'deleted_at'],
    types: {'lampiran': 'int'}
  },
  SELENGGARA: {
    sheet: 'SELENGGARA', id: 'id', prefix: 'SL', module: 'selenggara',
    columns: ['id', 'ref_no', 'owner_user_id', 'owner_name', 'no_aset', 'butiran_aset', 'aset', 'jenis_selenggara', 'tarikh_selenggara', 'butiran_kerja', 'dilaksanakan_oleh', 'nama_syarikat', 'no_pesanan', 'kos', 'tarikh_seterusnya', 'rujukan_aduan', 'lampiran', 'status', 'status_note', 'status_changed_at', 'status_changed_by', 'state', 'created_at', 'updated_at', 'deleted_at'],
    types: {'lampiran': 'int'}
  },
  PEMERIKSAAN: {
    sheet: 'PEMERIKSAAN', id: 'id', prefix: 'PM', module: 'pemeriksaan',
    columns: ['id', 'ref_no', 'owner_user_id', 'owner_name', 'no_aset', 'butiran_aset', 'aset', 'sesi', 'tarikh_pemeriksaan', 'pemeriksa', 'keberadaan', 'keadaan', 'lokasi_sebenar', 'pengguna_sebenar', 'label_ada', 'maklumat_sepadan', 'catatan', 'lampiran', 'status', 'status_note', 'status_changed_at', 'status_changed_by', 'state', 'created_at', 'updated_at', 'deleted_at'],
    types: {'label_ada': 'bool', 'maklumat_sepadan': 'bool', 'lampiran': 'int'}
  },
  STOKTAKE: {
    sheet: 'STOKTAKE', id: 'id', prefix: 'ST', module: 'stoktake',
    columns: ['id', 'ref_no', 'owner_user_id', 'owner_name', 'nama', 'makmal', 'lokasi', 'tarikh', 'pemeriksa', 'catatan', 'dijangka', 'dijumpai', 'tidak_dijumpai', 'luar_skop', 'tidak_berdaftar', 'tarikh_selesai', 'status', 'status_note', 'status_changed_at', 'status_changed_by', 'state', 'created_at', 'updated_at', 'deleted_at'],
    types: {'dijangka': 'intOrNull', 'dijumpai': 'intOrNull', 'tidak_dijumpai': 'intOrNull', 'luar_skop': 'intOrNull'}
  },
  PENILAIAN: {
    sheet: 'PENILAIAN', id: 'id', prefix: 'PN', module: 'penilaian',
    columns: ['id', 'ref_no', 'owner_user_id', 'owner_name', 'no_aset', 'butiran_aset', 'aset', 'tarikh_penilaian', 'jenis_penilaian', 'skor_fizikal', 'skor_prestasi', 'skor_keperluan', 'skor_keseluruhan', 'keputusan', 'nilai_perolehan', 'nilai_buku', 'nilai_semasa', 'kaedah_nilai', 'penilai', 'catatan', 'lampiran', 'status', 'status_note', 'status_changed_at', 'status_changed_by', 'state', 'created_at', 'updated_at', 'deleted_at'],
    types: {'skor_fizikal': 'intOrNull', 'skor_prestasi': 'intOrNull', 'skor_keperluan': 'intOrNull', 'skor_keseluruhan': 'intOrNull', 'lampiran': 'int'}
  },
  PELUPUSAN: {
    sheet: 'PELUPUSAN', id: 'id', prefix: 'LP', module: 'pelupusan',
    columns: ['id', 'ref_no', 'owner_user_id', 'owner_name', 'no_aset', 'butiran_aset', 'aset', 'sebab', 'justifikasi', 'kaedah', 'nilai_perolehan', 'nilai_semasa', 'lembaga_pemeriksa', 'no_rujukan_kelulusan', 'tarikh_kelulusan', 'tarikh_lupus', 'hasil_pelupusan', 'status_pengesahan_asal', 'lampiran', 'status', 'status_note', 'status_changed_at', 'status_changed_by', 'state', 'created_at', 'updated_at', 'deleted_at'],
    types: {'lampiran': 'int'}
  },
  KEHILANGAN: {
    sheet: 'KEHILANGAN', id: 'id', prefix: 'HL', module: 'kehilangan',
    columns: ['id', 'ref_no', 'owner_user_id', 'owner_name', 'nama', 'email', 'kategori_pelapor', 'no_pengenalan', 'telefon', 'no_aset', 'butiran_aset', 'aset', 'tarikh_kehilangan', 'tarikh_diketahui', 'lokasi_kehilangan', 'keadaan_kehilangan', 'laporan_polis', 'no_laporan_polis', 'tarikh_laporan_polis', 'lampiran', 'status_aset_asal', 'nilai_kehilangan', 'keputusan_siasatan', 'tindakan_surcaj', 'status', 'status_note', 'status_changed_at', 'status_changed_by', 'state', 'created_at', 'updated_at', 'deleted_at'],
    types: {'laporan_polis': 'bool', 'lampiran': 'int'}
  },
  KEPERLUAN: {
    sheet: 'KEPERLUAN', id: 'id', prefix: 'KP', module: 'keperluan',
    columns: ['id', 'ref_no', 'owner_user_id', 'owner_name', 'nama_pemohon', 'no_staf', 'email_pemohon', 'peranan', 'telefon_pemohon', 'makmal', 'nama_makmal_baru', 'bangunan_makmal_baru', 'bilik_makmal_baru', 'jabatan_makmal_baru', 'nama_makmal', 'tahun', 'jumlah_sedia_ada', 'berfungsi', 'tidak_sesuai', 'rosak_boleh_baiki', 'rosak_lupus', 'jenis_permohonan', 'sasaran_jumlah', 'bilangan_ganti', 'bilangan_tambahan', 'keutamaan', 'spesifikasi', 'perisian', 'justifikasi', 'harga_seunit', 'sumber_harga', 'anggaran_kos', 'anggaran_kos_ganti', 'anggaran_kos_tambahan', 'peralatan_lain', 'bilangan_peralatan', 'anggaran_kos_peralatan', 'lampiran', 'catatan_it', 'status', 'status_note', 'status_changed_at', 'status_changed_by', 'state', 'created_at', 'updated_at', 'deleted_at'],
    types: {'tahun': 'intOrNull', 'jumlah_sedia_ada': 'intOrNull', 'berfungsi': 'intOrNull', 'tidak_sesuai': 'intOrNull', 'rosak_boleh_baiki': 'intOrNull', 'rosak_lupus': 'intOrNull', 'sasaran_jumlah': 'intOrNull', 'bilangan_ganti': 'intOrNull', 'bilangan_tambahan': 'intOrNull', 'bilangan_peralatan': 'intOrNull', 'lampiran': 'int'}
  },
  MAKMAL: {
    sheet: 'MAKMAL', id: 'id', prefix: 'MK', module: 'makmal',
    columns: ['id', 'ref_no', 'owner_user_id', 'owner_name', 'kod', 'nama', 'jenis_makmal', 'bangunan', 'bilik', 'kod_lokasi', 'jabatan', 'penyelaras', 'email_penyelaras', 'kapasiti', 'tempat_komputer', 'pengguna_sesi', 'spesifikasi_komputer', 'catatan', 'status', 'status_note', 'status_changed_at', 'status_changed_by', 'state', 'created_at', 'updated_at', 'deleted_at'],
    types: {'kapasiti': 'intOrNull', 'tempat_komputer': 'intOrNull', 'pengguna_sesi': 'intOrNull'}
  },
  PERISIAN: {
    sheet: 'PERISIAN', id: 'id', prefix: 'PS', module: 'perisian',
    columns: ['id', 'ref_no', 'owner_user_id', 'owner_name', 'makmal', 'nama', 'kategori', 'jenis_lesen', 'sumber_lesen', 'bil_lesen', 'sistem_operasi', 'tahun', 'tamat_lesen', 'catatan', 'status', 'status_note', 'status_changed_at', 'status_changed_by', 'state', 'created_at', 'updated_at', 'deleted_at'],
    types: {'bil_lesen': 'intOrNull', 'tahun': 'intOrNull'}
  },
  STAF: {
    sheet: 'STAF', id: 'id', prefix: 'SF', module: 'staf',
    columns: ['id', 'ref_no', 'owner_user_id', 'owner_name', 'nama', 'no_pekerja', 'makmal', 'unit', 'jawatan', 'gred', 'email', 'telefon', 'blok', 'terima_banci', 'status', 'status_note', 'status_changed_at', 'status_changed_by', 'state', 'created_at', 'updated_at', 'deleted_at'],
    types: {'terima_banci': 'bool'}
  },
  PEGAWAI: {
    sheet: 'PEGAWAI', id: 'id', prefix: 'PG', module: 'pegawai',
    columns: ['id', 'ref_no', 'owner_user_id', 'owner_name', 'nama', 'jawatan', 'email', 'telefon', 'aktif', 'status', 'status_note', 'status_changed_at', 'status_changed_by', 'state', 'created_at', 'updated_at', 'deleted_at'],
    types: {'aktif': 'bool'}
  },
  // @generator:schema:end
});

/**
 * Carian skema (SCHEMA + skema tambahan semasa runtime — digunakan oleh ujian untuk modul fixture).
 * Diselesaikan semasa panggilan, jadi tiada kebergantungan susunan muat.
 */
const SchemaRegistry = {
  extra: {},
  get: function (key) { return SCHEMA[key] || SchemaRegistry.extra[key]; }
};
