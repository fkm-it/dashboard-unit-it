/**
 * DIJANA oleh tools/gen.js daripada modules/staf.json — JANGAN sunting dengan tangan.
 * Ubah fail JSON, kemudian jalankan: npm run gen
 */
const StafModule = Object.freeze(Object.assign(
  {
    "key": "staf",
    "label": "Staf Makmal",
    "labelPlural": "Staf Makmal",
    "icon": "users",
    "prefix": "SF",
    "refFormat": "STF-{SEQ4}",
    "description": "Staf makmal FKM (pemilik, pengurus dan juruteknik makmal). Digunakan untuk menghantar link borang banci makmal.",
    "access": {
      "create": "ADMIN",
      "list": "OWN",
      "edit": "ADMIN",
      "delete": "ADMIN",
      "ownerEditStatuses": []
    },
    "statuses": [
      {
        "value": "AKTIF",
        "label": "Aktif",
        "tone": "success"
      },
      {
        "value": "TIDAK_AKTIF",
        "label": "Tidak aktif",
        "tone": "muted"
      }
    ],
    "notify": {
      "adminsOnCreate": false,
      "ownerOnStatus": false
    },
    "titleField": "nama",
    "subtitleField": "unit",
    "nav": {
      "user": false,
      "admin": true,
      "order": 44
    },
    "fields": [
      {
        "key": "nama",
        "label": "Nama",
        "type": "string",
        "required": true,
        "max": 120,
        "list": true,
        "search": true,
        "column": "nama"
      },
      {
        "key": "noPekerja",
        "label": "No. pekerja",
        "type": "string",
        "max": 20,
        "search": true,
        "column": "no_pekerja"
      },
      {
        "key": "makmal",
        "label": "Makmal",
        "type": "ref",
        "ref": "makmal",
        "filter": true,
        "list": true,
        "column": "makmal"
      },
      {
        "key": "unit",
        "label": "Makmal / unit (seperti senarai staf)",
        "type": "string",
        "max": 120,
        "search": true,
        "column": "unit"
      },
      {
        "key": "jawatan",
        "label": "Jawatan",
        "type": "string",
        "max": 120,
        "search": true,
        "column": "jawatan"
      },
      {
        "key": "gred",
        "label": "Gred",
        "type": "string",
        "max": 20,
        "column": "gred"
      },
      {
        "key": "email",
        "label": "Email",
        "type": "email",
        "search": true,
        "column": "email"
      },
      {
        "key": "telefon",
        "label": "No. telefon",
        "type": "phone",
        "column": "telefon"
      },
      {
        "key": "blok",
        "label": "Blok",
        "type": "string",
        "max": 20,
        "column": "blok"
      },
      {
        "key": "terimaBanci",
        "label": "Terima link borang banci",
        "type": "bool",
        "default": true,
        "filter": true,
        "hint": "Staf ini menerima email link borang banci & keperluan komputer makmal.",
        "column": "terima_banci"
      }
    ],
    "name": "Staf",
    "path": "/staf",
    "sheet": "STAF",
    "defaultStatus": "AKTIF",
    "statusRole": "ADMIN"
  },
  { hooks: function () { return typeof StafHooks !== 'undefined' ? StafHooks : {}; } }
));
