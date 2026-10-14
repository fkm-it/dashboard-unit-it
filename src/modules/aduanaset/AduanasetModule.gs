/**
 * DIJANA oleh tools/gen.js daripada modules/aduanaset.json — JANGAN sunting dengan tangan.
 * Ubah fail JSON, kemudian jalankan: npm run gen
 */
const AduanasetModule = Object.freeze(Object.assign(
  {
    "key": "aduanaset",
    "label": "Aduan Kerosakan Aset",
    "labelPlural": "Aduan Kerosakan",
    "icon": "activity",
    "prefix": "AD",
    "refFormat": "ADK-{YYYY}-{SEQ4}",
    "description": "Aduan kerosakan aset alih (KEW.PA-9) daripada staf dan pelajar. Status aset dikemas kini sepanjang pembaikan; kerja selesai direkod dalam daftar penyelenggaraan.",
    "access": {
      "create": "PUBLIC",
      "list": "OWN",
      "edit": "OWNER",
      "delete": "ADMIN",
      "ownerEditStatuses": [
        "BARU"
      ]
    },
    "statuses": [
      {
        "value": "BARU",
        "label": "Baharu",
        "tone": "info"
      },
      {
        "value": "DISEMAK",
        "label": "Disemak",
        "tone": "brand"
      },
      {
        "value": "DALAM_PEMBAIKAN",
        "label": "Dalam pembaikan",
        "tone": "warn"
      },
      {
        "value": "SELESAI",
        "label": "Selesai dibaiki",
        "tone": "success"
      },
      {
        "value": "TIDAK_EKONOMI",
        "label": "Tidak ekonomi dibaiki (cadang lupus)",
        "tone": "danger"
      },
      {
        "value": "DITOLAK",
        "label": "Ditolak",
        "tone": "muted"
      }
    ],
    "titleField": "noAset",
    "subtitleField": "keteranganKerosakan",
    "nav": {
      "user": true,
      "admin": true,
      "order": 25
    },
    "publicForm": {
      "title": "Aduan Kerosakan Aset (KEW.PA-9)",
      "intro": "Laporkan kerosakan aset ICT FKM (komputer, pencetak, projektor dan lain-lain). Nyatakan no. aset seperti pada label. Gunakan email UTM.",
      "successMessage": "Aduan kerosakan diterima. Unit IT FKM akan menyemak dan memaklumkan status melalui email.",
      "contactEmailField": "email",
      "nameField": "nama"
    },
    "fields": [
      {
        "key": "nama",
        "label": "Nama penuh",
        "type": "string",
        "required": true,
        "max": 80,
        "publicOnly": true,
        "search": true,
        "column": "nama"
      },
      {
        "key": "email",
        "label": "Email UTM",
        "type": "email",
        "required": true,
        "publicOnly": true,
        "hint": "Gunakan email UTM (staf @utm.my, pelajar @graduate.utm.my). Status dimaklumkan ke email ini.",
        "column": "email"
      },
      {
        "key": "telefon",
        "label": "No. telefon / sambungan",
        "type": "phone",
        "column": "telefon"
      },
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
        "key": "tarikhKerosakan",
        "label": "Tarikh kerosakan",
        "type": "date",
        "required": true,
        "list": true,
        "column": "tarikh_kerosakan"
      },
      {
        "key": "lokasi",
        "label": "Lokasi aset",
        "type": "string",
        "required": true,
        "max": 120,
        "placeholder": "cth. C24-410, PC no. 12",
        "column": "lokasi"
      },
      {
        "key": "keteranganKerosakan",
        "label": "Keterangan kerosakan",
        "type": "text",
        "required": true,
        "min": 10,
        "max": 2000,
        "search": true,
        "column": "keterangan_kerosakan"
      },
      {
        "key": "lampiran",
        "label": "Gambar kerosakan",
        "type": "files",
        "maxFiles": 3,
        "public": false,
        "column": "lampiran"
      },
      {
        "key": "pegawai",
        "label": "Pegawai bertanggungjawab",
        "type": "ref",
        "ref": "pegawai",
        "adminOnly": true,
        "visibleToOwner": true,
        "list": true,
        "filter": true,
        "column": "pegawai"
      },
      {
        "key": "tindakan",
        "label": "Tindakan",
        "type": "enum",
        "adminOnly": true,
        "visibleToOwner": true,
        "filter": true,
        "options": [
          {
            "value": "BAIKI_DALAMAN",
            "label": "Dibaiki Unit IT"
          },
          {
            "value": "WARANTI",
            "label": "Tuntutan waranti"
          },
          {
            "value": "PEMBEKAL",
            "label": "Dihantar ke pembekal / vendor"
          },
          {
            "value": "ALAT_GANTI",
            "label": "Ganti alat ganti"
          },
          {
            "value": "CADANG_LUPUS",
            "label": "Cadangan pelupusan"
          }
        ],
        "column": "tindakan"
      },
      {
        "key": "kosPembaikan",
        "label": "Kos pembaikan (RM)",
        "type": "number",
        "min": 0,
        "decimals": 2,
        "adminOnly": true,
        "visibleToOwner": true,
        "column": "kos_pembaikan"
      },
      {
        "key": "laporanTeknikal",
        "label": "Laporan teknikal / kerja dibuat",
        "type": "text",
        "max": 2000,
        "adminOnly": true,
        "visibleToOwner": true,
        "column": "laporan_teknikal"
      },
      {
        "key": "tarikhSelesai",
        "label": "Tarikh selesai",
        "type": "date",
        "readonly": true,
        "column": "tarikh_selesai"
      }
    ],
    "name": "Aduanaset",
    "path": "/aduanaset",
    "sheet": "ADUANASET",
    "defaultStatus": "BARU",
    "statusRole": "ADMIN",
    "notify": {
      "adminsOnCreate": true,
      "ownerOnStatus": true
    }
  },
  { hooks: function () { return typeof AduanasetHooks !== 'undefined' ? AduanasetHooks : {}; } }
));
