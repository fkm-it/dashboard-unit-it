/**
 * DIJANA oleh tools/gen.js daripada modules/selenggara.json — JANGAN sunting dengan tangan.
 * Ubah fail JSON, kemudian jalankan: npm run gen
 */
const SelenggaraModule = Object.freeze(Object.assign(
  {
    "key": "selenggara",
    "label": "Penyelenggaraan Aset",
    "labelPlural": "Penyelenggaraan",
    "icon": "settings",
    "prefix": "SL",
    "refFormat": "SLG-{YYYY}-{SEQ4}",
    "description": "Daftar penyelenggaraan aset (KEW.PA-14): penyelenggaraan berjadual, pembetulan dan naik taraf. Tarikh selenggara terakhir & seterusnya dikemas kini pada rekod aset.",
    "access": {
      "create": "ADMIN",
      "list": "OWN",
      "edit": "ADMIN",
      "delete": "ADMIN",
      "ownerEditStatuses": []
    },
    "statuses": [
      {
        "value": "DIJADUALKAN",
        "label": "Dijadualkan",
        "tone": "info"
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
    "subtitleField": "jenisSelenggara",
    "nav": {
      "user": false,
      "admin": true,
      "order": 26
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
        "key": "jenisSelenggara",
        "label": "Jenis",
        "type": "enum",
        "required": true,
        "list": true,
        "filter": true,
        "default": "PENCEGAHAN",
        "options": [
          {
            "value": "PENCEGAHAN",
            "label": "Pencegahan (berjadual)"
          },
          {
            "value": "PEMBETULAN",
            "label": "Pembetulan (kerosakan)"
          },
          {
            "value": "NAIK_TARAF",
            "label": "Naik taraf"
          }
        ],
        "column": "jenis_selenggara"
      },
      {
        "key": "tarikhSelenggara",
        "label": "Tarikh",
        "type": "date",
        "required": true,
        "list": true,
        "column": "tarikh_selenggara"
      },
      {
        "key": "butiranKerja",
        "label": "Butiran kerja",
        "type": "text",
        "required": true,
        "max": 2000,
        "search": true,
        "column": "butiran_kerja"
      },
      {
        "key": "dilaksanakanOleh",
        "label": "Dilaksanakan oleh",
        "type": "enum",
        "filter": true,
        "default": "DALAMAN",
        "options": [
          {
            "value": "DALAMAN",
            "label": "Unit IT FKM"
          },
          {
            "value": "PEMBEKAL",
            "label": "Pembekal / kontraktor"
          }
        ],
        "column": "dilaksanakan_oleh"
      },
      {
        "key": "namaSyarikat",
        "label": "Nama syarikat",
        "type": "string",
        "max": 120,
        "search": true,
        "column": "nama_syarikat"
      },
      {
        "key": "noPesanan",
        "label": "No. pesanan / LO",
        "type": "string",
        "max": 60,
        "column": "no_pesanan"
      },
      {
        "key": "kos",
        "label": "Kos (RM)",
        "type": "number",
        "min": 0,
        "decimals": 2,
        "column": "kos"
      },
      {
        "key": "tarikhSeterusnya",
        "label": "Selenggara seterusnya",
        "type": "date",
        "column": "tarikh_seterusnya"
      },
      {
        "key": "rujukanAduan",
        "label": "Rujukan aduan",
        "type": "string",
        "readonly": true,
        "column": "rujukan_aduan"
      },
      {
        "key": "lampiran",
        "label": "Laporan / invois",
        "type": "files",
        "maxFiles": 3,
        "public": false,
        "column": "lampiran"
      }
    ],
    "name": "Selenggara",
    "path": "/selenggara",
    "sheet": "SELENGGARA",
    "defaultStatus": "DIJADUALKAN",
    "statusRole": "ADMIN"
  },
  { hooks: function () { return typeof SelenggaraHooks !== 'undefined' ? SelenggaraHooks : {}; } }
));
