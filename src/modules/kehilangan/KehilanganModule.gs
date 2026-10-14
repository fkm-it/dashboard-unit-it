/**
 * DIJANA oleh tools/gen.js daripada modules/kehilangan.json — JANGAN sunting dengan tangan.
 * Ubah fail JSON, kemudian jalankan: npm run gen
 */
const KehilanganModule = Object.freeze(Object.assign(
  {
    "key": "kehilangan",
    "label": "Kehilangan Aset",
    "labelPlural": "Kehilangan Aset",
    "icon": "bell",
    "prefix": "HL",
    "refFormat": "HLG-{YYYY}-{SEQ4}",
    "description": "Laporan awal kehilangan aset (KEW.PA-28) dan siasatan. Aset ditanda Hilang semasa siasatan, dipulihkan jika ditemui, atau dihapus kira.",
    "access": {
      "create": "PUBLIC",
      "list": "OWN",
      "edit": "OWNER",
      "delete": "ADMIN",
      "ownerEditStatuses": [
        "DILAPOR"
      ]
    },
    "statuses": [
      {
        "value": "DILAPOR",
        "label": "Dilaporkan",
        "tone": "danger"
      },
      {
        "value": "DALAM_SIASATAN",
        "label": "Dalam siasatan",
        "tone": "warn"
      },
      {
        "value": "DITEMUI",
        "label": "Ditemui semula",
        "tone": "success"
      },
      {
        "value": "HAPUS_KIRA",
        "label": "Disahkan hilang (hapus kira)",
        "tone": "muted"
      },
      {
        "value": "DITOLAK",
        "label": "Laporan tidak sah",
        "tone": "muted"
      }
    ],
    "titleField": "noAset",
    "subtitleField": "lokasiKehilangan",
    "nav": {
      "user": true,
      "admin": true,
      "order": 30
    },
    "publicForm": {
      "title": "Laporan Awal Kehilangan Aset (KEW.PA-28)",
      "intro": "Laporkan kehilangan aset ICT FKM dengan segera (dalam masa 24 jam). Buat laporan polis dalam tempoh 24 jam dan muat naik salinannya jika ada. Gunakan email UTM.",
      "successMessage": "Laporan kehilangan diterima. Unit IT FKM akan menghubungi anda untuk siasatan.",
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
        "key": "kategoriPelapor",
        "label": "Kategori pelapor",
        "type": "enum",
        "required": true,
        "filter": true,
        "options": [
          {
            "value": "STAF",
            "label": "Staf"
          },
          {
            "value": "PELAJAR",
            "label": "Pelajar"
          },
          {
            "value": "LAIN",
            "label": "Lain-lain"
          }
        ],
        "column": "kategori_pelapor"
      },
      {
        "key": "noPengenalan",
        "label": "No. staf / no. matrik",
        "type": "string",
        "max": 30,
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
        "key": "tarikhKehilangan",
        "label": "Tarikh kehilangan (anggaran)",
        "type": "date",
        "required": true,
        "list": true,
        "column": "tarikh_kehilangan"
      },
      {
        "key": "tarikhDiketahui",
        "label": "Tarikh kehilangan diketahui",
        "type": "date",
        "required": true,
        "column": "tarikh_diketahui"
      },
      {
        "key": "lokasiKehilangan",
        "label": "Lokasi kehilangan",
        "type": "string",
        "required": true,
        "max": 120,
        "search": true,
        "column": "lokasi_kehilangan"
      },
      {
        "key": "keadaanKehilangan",
        "label": "Keterangan (bagaimana kehilangan berlaku)",
        "type": "text",
        "required": true,
        "min": 10,
        "max": 2000,
        "column": "keadaan_kehilangan"
      },
      {
        "key": "laporanPolis",
        "label": "Laporan polis telah dibuat",
        "type": "bool",
        "column": "laporan_polis"
      },
      {
        "key": "noLaporanPolis",
        "label": "No. laporan polis",
        "type": "string",
        "max": 60,
        "column": "no_laporan_polis"
      },
      {
        "key": "tarikhLaporanPolis",
        "label": "Tarikh laporan polis",
        "type": "date",
        "column": "tarikh_laporan_polis"
      },
      {
        "key": "lampiran",
        "label": "Salinan laporan polis / gambar",
        "type": "files",
        "maxFiles": 3,
        "public": false,
        "column": "lampiran"
      },
      {
        "key": "statusAsetAsal",
        "label": "Status aset sebelum dilaporkan",
        "type": "string",
        "readonly": true,
        "adminOnly": true,
        "column": "status_aset_asal"
      },
      {
        "key": "nilaiKehilangan",
        "label": "Nilai buku semasa hilang (RM)",
        "type": "number",
        "readonly": true,
        "adminOnly": true,
        "column": "nilai_kehilangan"
      },
      {
        "key": "keputusanSiasatan",
        "label": "Keputusan siasatan",
        "type": "text",
        "max": 2000,
        "adminOnly": true,
        "visibleToOwner": true,
        "column": "keputusan_siasatan"
      },
      {
        "key": "tindakanSurcaj",
        "label": "Tindakan surcaj / tatatertib",
        "type": "enum",
        "adminOnly": true,
        "options": [
          {
            "value": "TIADA",
            "label": "Tiada"
          },
          {
            "value": "DALAM_PERTIMBANGAN",
            "label": "Dalam pertimbangan"
          },
          {
            "value": "SURCAJ",
            "label": "Surcaj"
          },
          {
            "value": "TATATERTIB",
            "label": "Tindakan tatatertib"
          }
        ],
        "column": "tindakan_surcaj"
      }
    ],
    "name": "Kehilangan",
    "path": "/kehilangan",
    "sheet": "KEHILANGAN",
    "defaultStatus": "DILAPOR",
    "statusRole": "ADMIN",
    "notify": {
      "adminsOnCreate": true,
      "ownerOnStatus": true
    }
  },
  { hooks: function () { return typeof KehilanganHooks !== 'undefined' ? KehilanganHooks : {}; } }
));
