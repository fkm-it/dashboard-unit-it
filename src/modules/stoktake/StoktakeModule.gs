/**
 * DIJANA oleh tools/gen.js daripada modules/stoktake.json — JANGAN sunting dengan tangan.
 * Ubah fail JSON, kemudian jalankan: npm run gen
 */
const StoktakeModule = Object.freeze(Object.assign(
  {
    "key": "stoktake",
    "label": "Sesi Stock-take",
    "labelPlural": "Stock-take",
    "icon": "list",
    "prefix": "ST",
    "refFormat": "STK-{YYYY}-{SEQ3}",
    "description": "Sesi semakan stok (verifikasi fizikal): imbas label QR / barcode aset dengan kamera telefon atau pengimbas. Setiap imbasan direkod sebagai pemeriksaan aset; aset yang tidak dijumpai disenaraikan apabila sesi ditutup.",
    "access": {
      "create": "ADMIN",
      "list": "OWN",
      "edit": "ADMIN",
      "delete": "ADMIN",
      "ownerEditStatuses": []
    },
    "statuses": [
      {
        "value": "BERJALAN",
        "label": "Sedang berjalan",
        "tone": "warn"
      },
      {
        "value": "SELESAI",
        "label": "Selesai",
        "tone": "success"
      }
    ],
    "notify": {
      "adminsOnCreate": false,
      "ownerOnStatus": false
    },
    "titleField": "nama",
    "subtitleField": "tarikh",
    "nav": {
      "user": false,
      "admin": true,
      "order": 27
    },
    "fields": [
      {
        "key": "nama",
        "label": "Nama sesi",
        "type": "string",
        "required": true,
        "max": 100,
        "list": true,
        "search": true,
        "placeholder": "cth. Stock-take Makmal CAD 2026",
        "column": "nama"
      },
      {
        "key": "makmal",
        "label": "Skop: makmal",
        "type": "ref",
        "ref": "makmal",
        "filter": true,
        "list": true,
        "hint": "Aset yang didaftarkan di makmal ini dijangka dijumpai.",
        "column": "makmal"
      },
      {
        "key": "lokasi",
        "label": "Skop: lokasi fizikal",
        "type": "string",
        "max": 60,
        "placeholder": "cth. C24-410",
        "hint": "Pilihan. Jika diisi, lokasi fizikal aset yang diimbas dikemas kini kepada lokasi ini. Kosongkan makmal & lokasi untuk semakan semua aset.",
        "column": "lokasi"
      },
      {
        "key": "tarikh",
        "label": "Tarikh",
        "type": "date",
        "required": true,
        "list": true,
        "column": "tarikh"
      },
      {
        "key": "pemeriksa",
        "label": "Pegawai pemeriksa",
        "type": "string",
        "required": true,
        "max": 120,
        "column": "pemeriksa"
      },
      {
        "key": "catatan",
        "label": "Catatan",
        "type": "text",
        "max": 1000,
        "column": "catatan"
      },
      {
        "key": "dijangka",
        "label": "Aset dijangka",
        "type": "int",
        "readonly": true,
        "list": true,
        "column": "dijangka"
      },
      {
        "key": "dijumpai",
        "label": "Dijumpai",
        "type": "int",
        "readonly": true,
        "list": true,
        "column": "dijumpai"
      },
      {
        "key": "tidakDijumpai",
        "label": "Tidak dijumpai",
        "type": "int",
        "readonly": true,
        "column": "tidak_dijumpai"
      },
      {
        "key": "luarSkop",
        "label": "Dijumpai tetapi didaftarkan di lokasi lain",
        "type": "int",
        "readonly": true,
        "column": "luar_skop"
      },
      {
        "key": "tidakBerdaftar",
        "label": "No. aset diimbas tetapi tiada dalam daftar",
        "type": "text",
        "readonly": true,
        "column": "tidak_berdaftar"
      },
      {
        "key": "tarikhSelesai",
        "label": "Ditutup pada",
        "type": "string",
        "readonly": true,
        "column": "tarikh_selesai"
      }
    ],
    "name": "Stoktake",
    "path": "/stoktake",
    "sheet": "STOKTAKE",
    "defaultStatus": "BERJALAN",
    "statusRole": "ADMIN"
  },
  { hooks: function () { return typeof StoktakeHooks !== 'undefined' ? StoktakeHooks : {}; } }
));
