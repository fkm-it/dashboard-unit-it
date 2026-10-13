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
    "description": "Banci komputer makmal dan permohonan penggantian/tambahan (makmal sedia ada atau baharu). Satu rekod bagi setiap makmal bagi setiap tahun.",
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
        "key": "sasaranJumlah",
        "label": "Jumlah komputer diperlukan",
        "type": "int",
        "required": true,
        "min": 0,
        "max": 1000,
        "hint": "Jumlah komputer sesuai yang perlu ada di makmal ini.",
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
        "label": "Anggaran kos (RM, dikira)",
        "type": "number",
        "readonly": true,
        "column": "anggaran_kos"
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
      "title": "Banci & Keperluan Komputer Makmal",
      "intro": "Untuk pemilik, ketua atau pengurus makmal FKM. Isi satu borang bagi setiap makmal bagi setiap tahun. Selepas dihantar, link peribadi untuk mengemas kini borang akan dihantar ke email anda.",
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
