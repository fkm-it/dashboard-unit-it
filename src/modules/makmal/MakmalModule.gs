/**
 * DIJANA oleh tools/gen.js daripada modules/makmal.json — JANGAN sunting dengan tangan.
 * Ubah fail JSON, kemudian jalankan: npm run gen
 */
const MakmalModule = Object.freeze(Object.assign(
  {
    "key": "makmal",
    "label": "Makmal",
    "labelPlural": "Makmal",
    "icon": "home",
    "prefix": "MK",
    "refFormat": "MK-{SEQ3}",
    "description": "Senarai induk makmal FKM: lokasi, kapasiti dan penyelaras.",
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
    "subtitleField": "kod",
    "nav": {
      "user": false,
      "admin": true,
      "order": 40
    },
    "fields": [
      {
        "key": "kod",
        "label": "Kod makmal",
        "type": "string",
        "required": true,
        "max": 20,
        "list": true,
        "search": true,
        "placeholder": "cth. ME-01",
        "column": "kod"
      },
      {
        "key": "nama",
        "label": "Nama makmal",
        "type": "string",
        "required": true,
        "max": 120,
        "list": true,
        "search": true,
        "placeholder": "cth. Makmal CAD",
        "column": "nama"
      },
      {
        "key": "bangunan",
        "label": "Bangunan / blok",
        "type": "string",
        "max": 60,
        "list": true,
        "search": true,
        "placeholder": "cth. C23",
        "column": "bangunan"
      },
      {
        "key": "bilik",
        "label": "Bilik",
        "type": "string",
        "max": 40,
        "search": true,
        "column": "bilik"
      },
      {
        "key": "kodLokasi",
        "label": "Kod lokasi UTMFin",
        "type": "string",
        "max": 40,
        "search": true,
        "placeholder": "cth. J.C24.01.108",
        "hint": "Aset dengan ID_LOKASI bermula kod ini dipautkan ke makmal ini semasa import.",
        "column": "kod_lokasi"
      },
      {
        "key": "jabatan",
        "label": "Jabatan / program",
        "type": "string",
        "max": 120,
        "search": true,
        "column": "jabatan"
      },
      {
        "key": "penyelaras",
        "label": "Penyelaras makmal",
        "type": "string",
        "max": 120,
        "search": true,
        "column": "penyelaras"
      },
      {
        "key": "emailPenyelaras",
        "label": "Email penyelaras",
        "type": "email",
        "column": "email_penyelaras"
      },
      {
        "key": "kapasiti",
        "label": "Kapasiti pengguna",
        "type": "int",
        "min": 0,
        "max": 1000,
        "column": "kapasiti"
      },
      {
        "key": "tempatKomputer",
        "label": "Tempat komputer",
        "type": "int",
        "min": 0,
        "max": 1000,
        "hint": "Bilangan meja/tempat yang boleh menempatkan komputer.",
        "column": "tempat_komputer"
      },
      {
        "key": "penggunaSesi",
        "label": "Anggaran pengguna setiap sesi",
        "type": "int",
        "min": 0,
        "max": 1000,
        "column": "pengguna_sesi"
      },
      {
        "key": "catatan",
        "label": "Catatan",
        "type": "text",
        "max": 1000,
        "column": "catatan"
      }
    ],
    "name": "Makmal",
    "path": "/makmal",
    "sheet": "MAKMAL",
    "defaultStatus": "AKTIF",
    "statusRole": "ADMIN"
  },
  { hooks: function () { return typeof MakmalHooks !== 'undefined' ? MakmalHooks : {}; } }
));
