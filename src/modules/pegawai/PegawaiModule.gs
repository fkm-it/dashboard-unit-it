/**
 * DIJANA oleh tools/gen.js daripada modules/pegawai.json — JANGAN sunting dengan tangan.
 * Ubah fail JSON, kemudian jalankan: npm run gen
 */
const PegawaiModule = Object.freeze(Object.assign(
  {
    "key": "pegawai",
    "label": "Pegawai IT",
    "labelPlural": "Pegawai IT",
    "icon": "users",
    "prefix": "PG",
    "description": "Staf Unit IT yang boleh ditugaskan tiket. Email digunakan untuk makluman penugasan.",
    "access": {
      "create": "ADMIN",
      "list": "OWN",
      "edit": "ADMIN",
      "delete": "ADMIN",
      "ownerEditStatuses": []
    },
    "notify": {
      "adminsOnCreate": false,
      "ownerOnStatus": false
    },
    "titleField": "nama",
    "subtitleField": "jawatan",
    "nav": {
      "user": false,
      "admin": true,
      "order": 50
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
        "key": "jawatan",
        "label": "Jawatan",
        "type": "string",
        "max": 80,
        "list": true,
        "column": "jawatan"
      },
      {
        "key": "email",
        "label": "Email",
        "type": "email",
        "search": true,
        "hint": "Tiket yang ditugaskan dimaklumkan ke email ini.",
        "column": "email"
      },
      {
        "key": "telefon",
        "label": "No. telefon",
        "type": "phone",
        "column": "telefon"
      },
      {
        "key": "aktif",
        "label": "Aktif",
        "type": "bool",
        "default": true,
        "filter": true,
        "list": true,
        "column": "aktif"
      }
    ],
    "name": "Pegawai",
    "path": "/pegawai",
    "sheet": "PEGAWAI",
    "refFormat": "PG-{YYYY}-{SEQ4}",
    "statuses": [],
    "defaultStatus": "",
    "statusRole": "ADMIN"
  },
  { hooks: function () { return typeof PegawaiHooks !== 'undefined' ? PegawaiHooks : {}; } }
));
