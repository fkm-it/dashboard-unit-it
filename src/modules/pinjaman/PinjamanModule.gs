/**
 * DIJANA oleh tools/gen.js daripada modules/pinjaman.json — JANGAN sunting dengan tangan.
 * Ubah fail JSON, kemudian jalankan: npm run gen
 */
const PinjamanModule = Object.freeze(Object.assign(
  {
    "key": "pinjaman",
    "label": "Pinjaman Aset",
    "labelPlural": "Pinjaman Aset",
    "icon": "briefcase",
    "prefix": "PJ",
    "refFormat": "PJM-{YYYY}-{SEQ4}",
    "description": "Permohonan pinjaman aset ICT oleh staf dan pelajar (KEW.PA-6). Aset ditanda dipinjam semasa diserahkan dan dibebaskan apabila dipulangkan.",
    "access": {
      "create": "PUBLIC",
      "list": "OWN",
      "edit": "OWNER",
      "delete": "OWNER",
      "ownerEditStatuses": [
        "DIMOHON"
      ]
    },
    "statuses": [
      {
        "value": "DIMOHON",
        "label": "Dimohon",
        "tone": "info"
      },
      {
        "value": "DILULUSKAN",
        "label": "Diluluskan (sedia diambil)",
        "tone": "brand"
      },
      {
        "value": "DIPINJAM",
        "label": "Sedang dipinjam",
        "tone": "warn"
      },
      {
        "value": "DIPULANGKAN",
        "label": "Dipulangkan",
        "tone": "success"
      },
      {
        "value": "DITOLAK",
        "label": "Ditolak",
        "tone": "danger"
      },
      {
        "value": "DIBATALKAN",
        "label": "Dibatalkan",
        "tone": "muted"
      }
    ],
    "titleField": "noAset",
    "subtitleField": "tarikhPinjam",
    "nav": {
      "user": true,
      "admin": true,
      "order": 24
    },
    "publicForm": {
      "title": "Permohonan Pinjaman Aset ICT",
      "intro": "Untuk staf dan pelajar FKM. Gunakan email UTM anda. Keputusan dan peringatan tarikh pulang dihantar ke email ini.",
      "successMessage": "Permohonan pinjaman diterima. Unit IT FKM akan memaklumkan keputusan melalui email.",
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
        "key": "kategoriPemohon",
        "label": "Kategori pemohon",
        "type": "enum",
        "required": true,
        "list": true,
        "filter": true,
        "options": [
          {
            "value": "STAF",
            "label": "Staf"
          },
          {
            "value": "PRASISWAZAH",
            "label": "Pelajar prasiswazah"
          },
          {
            "value": "PASCASISWAZAH",
            "label": "Pelajar pascasiswazah"
          },
          {
            "value": "LAIN",
            "label": "Lain-lain"
          }
        ],
        "column": "kategori_pemohon"
      },
      {
        "key": "noPengenalan",
        "label": "No. staf / no. matrik",
        "type": "string",
        "required": true,
        "max": 30,
        "search": true,
        "column": "no_pengenalan"
      },
      {
        "key": "telefon",
        "label": "No. telefon",
        "type": "phone",
        "required": true,
        "column": "telefon"
      },
      {
        "key": "penyelia",
        "label": "Penyelia / pensyarah (pelajar)",
        "type": "string",
        "max": 80,
        "hint": "Wajib bagi pelajar.",
        "column": "penyelia"
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
        "key": "tujuan",
        "label": "Tujuan pinjaman",
        "type": "text",
        "required": true,
        "max": 1000,
        "search": true,
        "column": "tujuan"
      },
      {
        "key": "lokasiPenggunaan",
        "label": "Lokasi penggunaan",
        "type": "string",
        "required": true,
        "max": 120,
        "column": "lokasi_penggunaan"
      },
      {
        "key": "tarikhPinjam",
        "label": "Tarikh pinjam",
        "type": "date",
        "required": true,
        "list": true,
        "column": "tarikh_pinjam"
      },
      {
        "key": "tarikhPulang",
        "label": "Tarikh pulang",
        "type": "date",
        "required": true,
        "list": true,
        "column": "tarikh_pulang"
      },
      {
        "key": "lampiran",
        "label": "Surat sokongan (jika ada)",
        "type": "files",
        "maxFiles": 2,
        "public": false,
        "column": "lampiran"
      },
      {
        "key": "tarikhDiserahkan",
        "label": "Tarikh diserahkan",
        "type": "date",
        "readonly": true,
        "column": "tarikh_diserahkan"
      },
      {
        "key": "tarikhDipulangkan",
        "label": "Tarikh dipulangkan",
        "type": "date",
        "readonly": true,
        "column": "tarikh_dipulangkan"
      },
      {
        "key": "keadaanPulang",
        "label": "Keadaan semasa dipulangkan",
        "type": "enum",
        "adminOnly": true,
        "visibleToOwner": true,
        "options": [
          {
            "value": "BAIK",
            "label": "Baik / lengkap"
          },
          {
            "value": "TIDAK_LENGKAP",
            "label": "Tidak lengkap (aksesori hilang)"
          },
          {
            "value": "ROSAK",
            "label": "Rosak"
          }
        ],
        "column": "keadaan_pulang"
      },
      {
        "key": "catatanUnit",
        "label": "Catatan Unit IT",
        "type": "text",
        "max": 1000,
        "adminOnly": true,
        "visibleToOwner": true,
        "column": "catatan_unit"
      }
    ],
    "name": "Pinjaman",
    "path": "/pinjaman",
    "sheet": "PINJAMAN",
    "defaultStatus": "DIMOHON",
    "statusRole": "ADMIN",
    "notify": {
      "adminsOnCreate": true,
      "ownerOnStatus": true
    }
  },
  { hooks: function () { return typeof PinjamanHooks !== 'undefined' ? PinjamanHooks : {}; } }
));
