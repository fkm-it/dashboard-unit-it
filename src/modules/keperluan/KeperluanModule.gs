/**
 * DIJANA oleh tools/gen.js daripada modules/keperluan.json — JANGAN sunting dengan tangan.
 * Ubah fail JSON, kemudian jalankan: npm run gen
 */
const KeperluanModule = Object.freeze(Object.assign(
  {
    "key": "keperluan",
    "label": "Keperluan Komputer Makmal",
    "labelPlural": "Keperluan Makmal",
    "icon": "briefcase",
    "prefix": "KP",
    "refFormat": "KPM-{YYYY}-{SEQ3}",
    "description": "Banci komputer makmal dan permohonan penggantian/tambahan (makmal sedia ada atau baharu). Satu rekod bagi setiap makmal bagi setiap tahun. Termasuk keperluan peralatan ICT lain (cth. projektor LCD, TV / paparan interaktif, sistem audio).",
    "access": {
      "create": "PUBLIC",
      "list": "OWN",
      "edit": "OWNER",
      "delete": "OWNER",
      "ownerEditStatuses": [
        "DIHANTAR",
        "DIKEMBALIKAN"
      ]
    },
    "statuses": [
      {
        "value": "DIHANTAR",
        "label": "Dihantar",
        "tone": "info"
      },
      {
        "value": "DIKEMBALIKAN",
        "label": "Dikembalikan untuk pembetulan",
        "tone": "warn"
      },
      {
        "value": "DISAHKAN",
        "label": "Disahkan Unit IT",
        "tone": "success"
      },
      {
        "value": "DITOLAK",
        "label": "Ditolak",
        "tone": "danger"
      }
    ],
    "notify": {
      "adminsOnCreate": true,
      "ownerOnStatus": true
    },
    "titleField": "namaMakmal",
    "subtitleField": "tahun",
    "nav": {
      "user": true,
      "admin": true,
      "order": 30
    },
    "fields": [
      {
        "key": "namaPemohon",
        "label": "Nama pemohon",
        "type": "string",
        "max": 120,
        "publicOnly": true,
        "search": true,
        "hint": "Wajib dalam borang awam.",
        "column": "nama_pemohon"
      },
      {
        "key": "noStaf",
        "label": "No. staf",
        "type": "string",
        "max": 20,
        "publicOnly": true,
        "search": true,
        "hint": "Wajib dalam borang awam.",
        "column": "no_staf"
      },
      {
        "key": "emailPemohon",
        "label": "Email rasmi UTM",
        "type": "email",
        "publicOnly": true,
        "search": true,
        "hint": "Link untuk mengemas kini borang dihantar ke email ini. Wajib dalam borang awam.",
        "column": "email_pemohon"
      },
      {
        "key": "peranan",
        "label": "Peranan terhadap makmal",
        "type": "enum",
        "publicOnly": true,
        "options": [
          {
            "value": "PEMILIK",
            "label": "Pemilik / ketua makmal"
          },
          {
            "value": "PENGURUS",
            "label": "Pengurus / penyelaras makmal"
          },
          {
            "value": "KAKITANGAN",
            "label": "Jurutera / penolong jurutera makmal"
          },
          {
            "value": "LAIN",
            "label": "Lain-lain"
          }
        ],
        "hint": "Wajib dalam borang awam.",
        "column": "peranan"
      },
      {
        "key": "telefonPemohon",
        "label": "No. telefon / sambungan",
        "type": "phone",
        "publicOnly": true,
        "column": "telefon_pemohon"
      },
      {
        "key": "makmal",
        "label": "Makmal",
        "type": "ref",
        "ref": "makmal",
        "required": false,
        "list": false,
        "filter": true,
        "lockAfterCreate": true,
        "hint": "Pilih makmal sedia ada. Jika makmal baharu atau tiada dalam senarai, kosongkan dan isi maklumat makmal baharu.",
        "column": "makmal"
      },
      {
        "key": "namaMakmalBaru",
        "label": "Nama makmal baharu",
        "type": "string",
        "max": 120,
        "search": true,
        "lockAfterCreate": true,
        "column": "nama_makmal_baru"
      },
      {
        "key": "bangunanMakmalBaru",
        "label": "Bangunan (makmal baharu)",
        "type": "string",
        "max": 40,
        "placeholder": "cth. C24",
        "column": "bangunan_makmal_baru"
      },
      {
        "key": "bilikMakmalBaru",
        "label": "No. bilik (makmal baharu)",
        "type": "string",
        "max": 40,
        "placeholder": "cth. 04.411",
        "column": "bilik_makmal_baru"
      },
      {
        "key": "jabatanMakmalBaru",
        "label": "Jabatan / kumpulan (makmal baharu)",
        "type": "string",
        "max": 120,
        "column": "jabatan_makmal_baru"
      },
      {
        "key": "namaMakmal",
        "label": "Makmal",
        "type": "string",
        "max": 200,
        "readonly": true,
        "list": true,
        "search": true,
        "column": "nama_makmal"
      },
      {
        "key": "tahun",
        "label": "Tahun penilaian",
        "type": "int",
        "required": true,
        "min": 2024,
        "max": 2100,
        "default": 2026,
        "list": true,
        "lockAfterCreate": true,
        "column": "tahun"
      },
      {
        "key": "jumlahSediaAda",
        "label": "Jumlah komputer sedia ada",
        "type": "int",
        "required": true,
        "min": 0,
        "max": 1000,
        "column": "jumlah_sedia_ada"
      },
      {
        "key": "berfungsi",
        "label": "Berfungsi",
        "type": "int",
        "required": true,
        "min": 0,
        "max": 1000,
        "hint": "Termasuk yang berfungsi tetapi tidak lagi sesuai.",
        "column": "berfungsi"
      },
      {
        "key": "tidakSesuai",
        "label": "Berfungsi tetapi tidak lagi sesuai",
        "type": "int",
        "default": 0,
        "min": 0,
        "max": 1000,
        "hint": "Contoh: tidak mampu menjalankan perisian kursus. Dicadang untuk diganti.",
        "column": "tidak_sesuai"
      },
      {
        "key": "rosakBolehBaiki",
        "label": "Rosak — boleh dibaiki",
        "type": "int",
        "default": 0,
        "min": 0,
        "max": 1000,
        "column": "rosak_boleh_baiki"
      },
      {
        "key": "rosakLupus",
        "label": "Rosak — tidak ekonomi dibaiki",
        "type": "int",
        "default": 0,
        "min": 0,
        "max": 1000,
        "hint": "Dicadang untuk diganti.",
        "column": "rosak_lupus"
      },
      {
        "key": "jenisPermohonan",
        "label": "Jenis permohonan",
        "type": "enum",
        "list": true,
        "filter": true,
        "options": [
          {
            "value": "GANTI",
            "label": "Penggantian sahaja"
          },
          {
            "value": "TAMBAH",
            "label": "Penambahan sahaja"
          },
          {
            "value": "GANTI_TAMBAH",
            "label": "Penggantian dan penambahan"
          },
          {
            "value": "TIADA",
            "label": "Tiada permohonan (banci sahaja)"
          }
        ],
        "hint": "Penggantian = ganti komputer tidak sesuai / rosak tidak ekonomi. Penambahan = komputer baharu untuk menambah kapasiti.",
        "column": "jenis_permohonan"
      },
      {
        "key": "sasaranJumlah",
        "label": "Jumlah komputer diperlukan",
        "type": "int",
        "required": false,
        "min": 0,
        "max": 1000,
        "hint": "Jumlah komputer sesuai yang perlu ada di makmal ini. Wajib untuk permohonan penambahan.",
        "column": "sasaran_jumlah"
      },
      {
        "key": "bilanganGanti",
        "label": "Penggantian (dikira)",
        "type": "int",
        "readonly": true,
        "list": true,
        "column": "bilangan_ganti"
      },
      {
        "key": "bilanganTambahan",
        "label": "Tambahan (dikira)",
        "type": "int",
        "readonly": true,
        "list": true,
        "column": "bilangan_tambahan"
      },
      {
        "key": "keutamaan",
        "label": "Keutamaan",
        "type": "enum",
        "required": true,
        "default": "SEDERHANA",
        "list": true,
        "filter": true,
        "options": [
          {
            "value": "KRITIKAL",
            "label": "Kritikal"
          },
          {
            "value": "TINGGI",
            "label": "Tinggi"
          },
          {
            "value": "SEDERHANA",
            "label": "Sederhana"
          },
          {
            "value": "RENDAH",
            "label": "Rendah"
          }
        ],
        "column": "keutamaan"
      },
      {
        "key": "spesifikasi",
        "label": "Spesifikasi minimum dicadangkan",
        "type": "text",
        "max": 1000,
        "column": "spesifikasi"
      },
      {
        "key": "perisian",
        "label": "Perisian khusus",
        "type": "text",
        "max": 1000,
        "column": "perisian"
      },
      {
        "key": "justifikasi",
        "label": "Justifikasi & kesan kepada P&P / penyelidikan",
        "type": "text",
        "required": true,
        "min": 10,
        "max": 3000,
        "search": true,
        "column": "justifikasi"
      },
      {
        "key": "hargaSeunit",
        "label": "Anggaran harga seunit (RM)",
        "type": "number",
        "min": 0,
        "max": 1000000,
        "decimals": 2,
        "column": "harga_seunit"
      },
      {
        "key": "sumberHarga",
        "label": "Sumber anggaran harga",
        "type": "string",
        "max": 200,
        "placeholder": "cth. Sebut harga vendor / harga kontrak pusat",
        "column": "sumber_harga"
      },
      {
        "key": "anggaranKos",
        "label": "Jumlah anggaran kos (komputer + peralatan, RM, dikira)",
        "type": "number",
        "readonly": true,
        "column": "anggaran_kos"
      },
      {
        "key": "anggaranKosGanti",
        "label": "Anggaran kos penggantian (RM, dikira)",
        "type": "number",
        "decimals": 2,
        "readonly": true,
        "column": "anggaran_kos_ganti"
      },
      {
        "key": "anggaranKosTambahan",
        "label": "Anggaran kos penambahan (RM, dikira)",
        "type": "number",
        "decimals": 2,
        "readonly": true,
        "column": "anggaran_kos_tambahan"
      },
      {
        "key": "peralatanLain",
        "label": "Peralatan ICT lain",
        "type": "text",
        "max": 4000,
        "search": true,
        "hint": "Satu peralatan setiap baris: Peralatan | Sedia ada | Dipohon | Ganti/Tambah | Harga seunit (RM) | Catatan. Cth: Projektor LCD | 1 | 2 | Tambah | 3500 | Untuk kuliah serentak.",
        "column": "peralatan_lain"
      },
      {
        "key": "bilanganPeralatan",
        "label": "Peralatan lain dipohon (unit, dikira)",
        "type": "int",
        "readonly": true,
        "column": "bilangan_peralatan"
      },
      {
        "key": "anggaranKosPeralatan",
        "label": "Anggaran kos peralatan lain (RM, dikira)",
        "type": "number",
        "decimals": 2,
        "readonly": true,
        "column": "anggaran_kos_peralatan"
      },
      {
        "key": "lampiran",
        "label": "Dokumen sokongan",
        "type": "files",
        "maxFiles": 3,
        "public": false,
        "column": "lampiran"
      },
      {
        "key": "catatanIt",
        "label": "Catatan Unit IT",
        "type": "text",
        "max": 1000,
        "adminOnly": true,
        "visibleToOwner": true,
        "column": "catatan_it"
      }
    ],
    "publicForm": {
      "title": "Penilaian Keperluan ICT Makmal",
      "intro": "Untuk pemilik, ketua atau pengurus makmal FKM. Sila isi satu borang bagi setiap makmal untuk tahun semasa. Maklumat ini digunakan bagi menilai status dan keperluan ICT makmal. Pautan peribadi untuk mengemas kini borang akan dihantar ke e-mel anda selepas penghantaran.",
      "successMessage": "Borang diterima oleh Unit IT FKM. Link untuk mengemas kini borang telah dihantar ke email anda.",
      "nameField": "namaPemohon",
      "rateKeyField": "emailPemohon"
    },
    "name": "Keperluan",
    "path": "/keperluan",
    "sheet": "KEPERLUAN",
    "defaultStatus": "DIHANTAR",
    "statusRole": "ADMIN"
  },
  { hooks: function () { return typeof KeperluanHooks !== 'undefined' ? KeperluanHooks : {}; } }
));
