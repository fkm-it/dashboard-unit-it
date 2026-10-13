/**
 * DIJANA oleh tools/gen.js daripada modules/tindakan.json — JANGAN sunting dengan tangan.
 * Ubah fail JSON, kemudian jalankan: npm run gen
 */
const TindakanModule = Object.freeze(Object.assign(
  {
    "key": "tindakan",
    "label": "Tindakan KEWPA",
    "labelPlural": "Tindakan KEWPA",
    "icon": "shield",
    "prefix": "TD",
    "refFormat": "TND-{SEQ5}",
    "description": "Penjejak tindakan rekod aset (KEWPA/UTMFin): lokasi berbeza, penjaga bertukar, aset belum disahkan, pelupusan. Dijana automatik daripada daftar aset setiap hari dan selepas import.",
    "access": {
      "create": "ADMIN",
      "list": "OWN",
      "edit": "ADMIN",
      "delete": "ADMIN",
      "ownerEditStatuses": []
    },
    "statuses": [
      {
        "value": "BARU",
        "label": "Baharu",
        "tone": "brand"
      },
      {
        "value": "DALAM_TINDAKAN",
        "label": "Dalam tindakan",
        "tone": "warn"
      },
      {
        "value": "SELESAI",
        "label": "Selesai",
        "tone": "success"
      },
      {
        "value": "DIBATALKAN",
        "label": "Dibatalkan",
        "tone": "muted"
      }
    ],
    "notify": {
      "adminsOnCreate": false,
      "ownerOnStatus": false
    },
    "titleField": "noAset",
    "subtitleField": "butiran",
    "nav": {
      "user": false,
      "admin": true,
      "order": 22
    },
    "fields": [
      {
        "key": "jenis",
        "label": "Jenis",
        "type": "enum",
        "required": true,
        "list": true,
        "filter": true,
        "default": "LAIN",
        "options": [
          {
            "value": "LOKASI",
            "label": "Kemas kini lokasi / pergerakan aset"
          },
          {
            "value": "PENJAGA",
            "label": "Kemas kini penjaga aset"
          },
          {
            "value": "PENGESAHAN",
            "label": "Sahkan status aset dengan penjaga"
          },
          {
            "value": "PELUPUSAN",
            "label": "Susulan tindakan pelupusan"
          },
          {
            "value": "REKOD_LUPUS",
            "label": "Kemas kini rekod lupus di UTMFin"
          },
          {
            "value": "LAIN",
            "label": "Lain-lain"
          }
        ],
        "column": "jenis"
      },
      {
        "key": "aset",
        "label": "Aset",
        "type": "ref",
        "ref": "aset",
        "hint": "Pilih aset berkaitan (jika ada).",
        "column": "aset"
      },
      {
        "key": "noAset",
        "label": "No. aset / bar code",
        "type": "string",
        "max": 40,
        "list": true,
        "search": true,
        "column": "no_aset"
      },
      {
        "key": "butiran",
        "label": "Butiran",
        "type": "text",
        "max": 500,
        "search": true,
        "column": "butiran"
      },
      {
        "key": "makmal",
        "label": "Makmal",
        "type": "ref",
        "ref": "makmal",
        "filter": true,
        "column": "makmal"
      },
      {
        "key": "pegawai",
        "label": "Pegawai",
        "type": "ref",
        "ref": "pegawai",
        "filter": true,
        "list": true,
        "column": "pegawai"
      },
      {
        "key": "tarikhSasaran",
        "label": "Tarikh sasaran",
        "type": "date",
        "list": true,
        "column": "tarikh_sasaran"
      },
      {
        "key": "borang",
        "label": "Borang / rujukan",
        "type": "string",
        "max": 60,
        "placeholder": "cth. no. borang KEW.PA atau no. rujukan UTMFin",
        "column": "borang"
      },
      {
        "key": "catatan",
        "label": "Catatan tindakan",
        "type": "text",
        "max": 2000,
        "column": "catatan"
      },
      {
        "key": "automatik",
        "label": "Dijana automatik",
        "type": "bool",
        "readonly": true,
        "filter": true,
        "column": "automatik"
      },
      {
        "key": "selesaiPada",
        "label": "Tarikh selesai",
        "type": "date",
        "readonly": true,
        "column": "selesai_pada"
      }
    ],
    "name": "Tindakan",
    "path": "/tindakan",
    "sheet": "TINDAKAN",
    "defaultStatus": "BARU",
    "statusRole": "ADMIN"
  },
  { hooks: function () { return typeof TindakanHooks !== 'undefined' ? TindakanHooks : {}; } }
));
