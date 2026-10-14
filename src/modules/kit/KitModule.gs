/**
 * DIJANA oleh tools/gen.js daripada modules/kit.json — JANGAN sunting dengan tangan.
 * Ubah fail JSON, kemudian jalankan: npm run gen
 */
const KitModule = Object.freeze(Object.assign(
  {
    "key": "kit",
    "label": "Kit Peralatan",
    "labelPlural": "Kit Peralatan",
    "icon": "grid",
    "prefix": "KT",
    "refFormat": "KIT-{SEQ3}",
    "description": "Set peralatan yang dipinjam mengikut bilangan unit (cth. Raspberry Pi, Arduino, kamera). Peminjam memilih kit dan bilangan; Unit IT memilih unit sebenar semasa serahan.",
    "access": {
      "create": "ADMIN",
      "list": "ALL",
      "edit": "ADMIN",
      "delete": "ADMIN",
      "ownerEditStatuses": []
    },
    "statuses": [
      {
        "value": "AKTIF",
        "label": "Dibuka untuk pinjaman",
        "tone": "success"
      },
      {
        "value": "DITUTUP",
        "label": "Ditutup",
        "tone": "muted"
      }
    ],
    "notify": {
      "adminsOnCreate": false,
      "ownerOnStatus": false
    },
    "titleField": "nama",
    "subtitleField": "ringkasan",
    "nav": {
      "user": false,
      "admin": true,
      "order": 24
    },
    "fields": [
      {
        "key": "nama",
        "label": "Nama kit",
        "type": "string",
        "required": true,
        "max": 80,
        "list": true,
        "search": true,
        "placeholder": "cth. Kit Raspberry Pi 4 Model B",
        "column": "nama"
      },
      {
        "key": "ringkasan",
        "label": "Unit",
        "type": "string",
        "readonly": true,
        "list": true,
        "column": "ringkasan"
      },
      {
        "key": "kandungan",
        "label": "Kandungan setiap unit",
        "type": "text",
        "max": 1000,
        "placeholder": "cth. Raspberry Pi 4 (4GB), kad microSD 32GB, adaptor kuasa, kabel HDMI mikro, casing",
        "column": "kandungan"
      },
      {
        "key": "senaraiAset",
        "label": "No. aset dalam kit",
        "type": "text",
        "required": true,
        "max": 5000,
        "hint": "Satu no. aset setiap baris (atau dipisah koma). Setiap aset hanya boleh berada dalam satu kit.",
        "column": "senarai_aset"
      },
      {
        "key": "jumlahUnit",
        "label": "Jumlah unit",
        "type": "int",
        "readonly": true,
        "column": "jumlah_unit"
      },
      {
        "key": "maksPinjam",
        "label": "Maksimum unit setiap permohonan",
        "type": "int",
        "min": 1,
        "max": 200,
        "hint": "Kosongkan = tiada had (selain jumlah unit tersedia).",
        "column": "maks_pinjam"
      },
      {
        "key": "lokasiSimpanan",
        "label": "Lokasi simpanan / ambil",
        "type": "string",
        "max": 120,
        "column": "lokasi_simpanan"
      },
      {
        "key": "catatan",
        "label": "Syarat / catatan untuk peminjam",
        "type": "text",
        "max": 1000,
        "column": "catatan"
      },
      {
        "key": "gambar",
        "label": "Gambar",
        "type": "files",
        "maxFiles": 2,
        "public": false,
        "column": "gambar"
      }
    ],
    "name": "Kit",
    "path": "/kit",
    "sheet": "KIT",
    "defaultStatus": "AKTIF",
    "statusRole": "ADMIN"
  },
  { hooks: function () { return typeof KitHooks !== 'undefined' ? KitHooks : {}; } }
));
