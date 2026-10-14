/**
 * DIJANA oleh tools/gen.js daripada modules/pemeriksaan.json — JANGAN sunting dengan tangan.
 * Ubah fail JSON, kemudian jalankan: npm run gen
 */
const PemeriksaanModule = Object.freeze(Object.assign(
  {
    "key": "pemeriksaan",
    "label": "Pemeriksaan Aset",
    "labelPlural": "Pemeriksaan Aset",
    "icon": "shield",
    "prefix": "PM",
    "refFormat": "PMR-{YYYY}-{SEQ4}",
    "description": "Laporan pemeriksaan aset alih (KEW.PA-10/11): keberadaan, keadaan, lokasi dan pengguna sebenar. Rekod aset dikemas kini serta-merta.",
    "access": {
      "create": "ADMIN",
      "list": "OWN",
      "edit": "ADMIN",
      "delete": "ADMIN",
      "ownerEditStatuses": []
    },
    "statuses": [
      {
        "value": "DIREKOD",
        "label": "Direkod",
        "tone": "brand"
      },
      {
        "value": "DISAHKAN",
        "label": "Disahkan",
        "tone": "success"
      }
    ],
    "notify": {
      "adminsOnCreate": false,
      "ownerOnStatus": false
    },
    "titleField": "noAset",
    "subtitleField": "keadaan",
    "nav": {
      "user": false,
      "admin": true,
      "order": 27
    },
    "fields": [
      {
        "key": "noAset",
        "label": "No. aset",
        "type": "string",
        "required": true,
        "max": 60,
        "list": true,
        "search": true,
        "hint": "Seperti pada label / tag aset (cth. UTM/FKM/H/2019/00123).",
        "lockAfterCreate": true,
        "column": "no_aset"
      },
      {
        "key": "butiranAset",
        "label": "Aset",
        "type": "string",
        "readonly": true,
        "list": true,
        "search": true,
        "column": "butiran_aset"
      },
      {
        "key": "aset",
        "label": "Rekod aset",
        "type": "ref",
        "ref": "aset",
        "readonly": true,
        "adminOnly": true,
        "column": "aset"
      },
      {
        "key": "tarikhPemeriksaan",
        "label": "Tarikh pemeriksaan",
        "type": "date",
        "required": true,
        "list": true,
        "column": "tarikh_pemeriksaan"
      },
      {
        "key": "pemeriksa",
        "label": "Pegawai pemeriksa",
        "type": "string",
        "required": true,
        "max": 120,
        "search": true,
        "column": "pemeriksa"
      },
      {
        "key": "keberadaan",
        "label": "Keberadaan",
        "type": "enum",
        "required": true,
        "list": true,
        "filter": true,
        "default": "ADA",
        "options": [
          {
            "value": "ADA",
            "label": "Ada / dijumpai"
          },
          {
            "value": "TIADA",
            "label": "Tidak dijumpai"
          }
        ],
        "column": "keberadaan"
      },
      {
        "key": "keadaan",
        "label": "Keadaan",
        "type": "enum",
        "required": true,
        "list": true,
        "filter": true,
        "default": "BAIK",
        "options": [
          {
            "value": "BAIK",
            "label": "Baik"
          },
          {
            "value": "ROSAK",
            "label": "Rosak"
          },
          {
            "value": "USANG",
            "label": "Usang"
          },
          {
            "value": "TIDAK_DIGUNAKAN",
            "label": "Tidak digunakan / berlebihan"
          }
        ],
        "column": "keadaan"
      },
      {
        "key": "lokasiSebenar",
        "label": "Lokasi sebenar",
        "type": "string",
        "max": 80,
        "column": "lokasi_sebenar"
      },
      {
        "key": "penggunaSebenar",
        "label": "Pengguna / penjaga sebenar",
        "type": "string",
        "max": 80,
        "column": "pengguna_sebenar"
      },
      {
        "key": "labelAda",
        "label": "Label / tag aset ada",
        "type": "bool",
        "default": true,
        "column": "label_ada"
      },
      {
        "key": "maklumatSepadan",
        "label": "Maklumat sepadan dengan daftar",
        "type": "bool",
        "default": true,
        "column": "maklumat_sepadan"
      },
      {
        "key": "catatan",
        "label": "Catatan",
        "type": "text",
        "max": 1000,
        "column": "catatan"
      },
      {
        "key": "lampiran",
        "label": "Gambar",
        "type": "files",
        "maxFiles": 3,
        "public": false,
        "column": "lampiran"
      }
    ],
    "name": "Pemeriksaan",
    "path": "/pemeriksaan",
    "sheet": "PEMERIKSAAN",
    "defaultStatus": "DIREKOD",
    "statusRole": "ADMIN"
  },
  { hooks: function () { return typeof PemeriksaanHooks !== 'undefined' ? PemeriksaanHooks : {}; } }
));
