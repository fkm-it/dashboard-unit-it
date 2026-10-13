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
    "description": "Banci komputer makmal dan permohonan penggantian/tambahan. Satu rekod bagi setiap makmal bagi setiap tahun.",
    "access": {
      "create": "USER",
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
    "titleField": "makmal",
    "subtitleField": "tahun",
    "nav": {
      "user": true,
      "admin": true,
      "order": 30
    },
    "fields": [
      {
        "key": "makmal",
        "label": "Makmal",
        "type": "ref",
        "ref": "makmal",
        "required": true,
        "list": true,
        "filter": true,
        "lockAfterCreate": true,
        "column": "makmal"
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
    "name": "Keperluan",
    "path": "/keperluan",
    "sheet": "KEPERLUAN",
    "defaultStatus": "DIHANTAR",
    "statusRole": "ADMIN"
  },
  { hooks: function () { return typeof KeperluanHooks !== 'undefined' ? KeperluanHooks : {}; } }
));
