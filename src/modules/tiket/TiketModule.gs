/**
 * DIJANA oleh tools/gen.js daripada modules/tiket.json — JANGAN sunting dengan tangan.
 * Ubah fail JSON, kemudian jalankan: npm run gen
 */
const TiketModule = Object.freeze(Object.assign(
  {
    "key": "tiket",
    "label": "Tiket",
    "labelPlural": "Helpdesk",
    "icon": "inbox",
    "prefix": "TK",
    "refFormat": "IT-{YYYY}-{SEQ4}",
    "description": "Aduan dan permintaan sokongan IT FKM — dari diterima hingga selesai.",
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
        "value": "DITUGASKAN",
        "label": "Ditugaskan",
        "tone": "brand"
      },
      {
        "value": "DALAM_TINDAKAN",
        "label": "Dalam tindakan",
        "tone": "warn"
      },
      {
        "value": "MENUNGGU_PENGGUNA",
        "label": "Menunggu pengguna",
        "tone": "muted"
      },
      {
        "value": "SELESAI",
        "label": "Selesai",
        "tone": "success"
      },
      {
        "value": "DITUTUP",
        "label": "Ditutup",
        "tone": "muted"
      },
      {
        "value": "DITOLAK",
        "label": "Ditolak",
        "tone": "danger"
      }
    ],
    "notify": {
      "adminsOnCreate": true,
      "ownerOnStatus": true
    },
    "titleField": "tajuk",
    "subtitleField": "kategori",
    "nav": {
      "user": true,
      "admin": true,
      "order": 10
    },
    "publicForm": {
      "title": "Aduan / Permintaan IT",
      "intro": "Staf dan pelajar FKM boleh menghantar aduan IT di sini tanpa akaun. Simpan nombor rujukan untuk semakan status.",
      "successMessage": "Aduan anda telah diterima oleh Unit IT FKM. Status akan dimaklumkan melalui email.",
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
        "label": "Email",
        "type": "email",
        "required": true,
        "publicOnly": true,
        "hint": "Status aduan dimaklumkan ke email ini.",
        "column": "email"
      },
      {
        "key": "telefon",
        "label": "No. telefon / sambungan",
        "type": "phone",
        "column": "telefon"
      },
      {
        "key": "tajuk",
        "label": "Tajuk masalah",
        "type": "string",
        "required": true,
        "max": 120,
        "list": true,
        "search": true,
        "column": "tajuk"
      },
      {
        "key": "kategori",
        "label": "Kategori",
        "type": "category",
        "required": true,
        "list": true,
        "filter": true,
        "column": "kategori"
      },
      {
        "key": "keutamaan",
        "label": "Keutamaan",
        "type": "enum",
        "default": "SEDERHANA",
        "list": true,
        "filter": true,
        "options": [
          {
            "value": "KRITIKAL",
            "label": "Kritikal — kelas/operasi terhenti"
          },
          {
            "value": "TINGGI",
            "label": "Tinggi"
          },
          {
            "value": "SEDERHANA",
            "label": "Sederhana"
          },
          {
            "value": "RENDAH",
            "label": "Rendah"
          }
        ],
        "column": "keutamaan"
      },
      {
        "key": "lokasi",
        "label": "Lokasi",
        "type": "string",
        "required": true,
        "max": 120,
        "search": true,
        "placeholder": "cth. Blok C23, Bilik 112",
        "column": "lokasi"
      },
      {
        "key": "makmal",
        "label": "Makmal (jika berkaitan)",
        "type": "ref",
        "ref": "makmal",
        "filter": true,
        "column": "makmal"
      },
      {
        "key": "noAset",
        "label": "No. aset / no. PC (jika tahu)",
        "type": "string",
        "max": 40,
        "search": true,
        "column": "no_aset"
      },
      {
        "key": "keterangan",
        "label": "Keterangan masalah",
        "type": "text",
        "required": true,
        "min": 10,
        "max": 2000,
        "search": true,
        "column": "keterangan"
      },
      {
        "key": "lampiran",
        "label": "Gambar / tangkapan skrin",
        "type": "files",
        "maxFiles": 3,
        "public": false,
        "column": "lampiran"
      },
      {
        "key": "pegawai",
        "label": "Pegawai ditugaskan",
        "type": "ref",
        "ref": "pegawai",
        "adminOnly": true,
        "visibleToOwner": true,
        "filter": true,
        "list": true,
        "column": "pegawai"
      },
      {
        "key": "tarikhSasaran",
        "label": "Sasaran selesai (SLA)",
        "type": "string",
        "readonly": true,
        "adminOnly": true,
        "visibleToOwner": true,
        "column": "tarikh_sasaran"
      },
      {
        "key": "diakuiPada",
        "label": "Diakui pada",
        "type": "string",
        "readonly": true,
        "adminOnly": true,
        "column": "diakui_pada"
      },
      {
        "key": "selesaiPada",
        "label": "Selesai pada",
        "type": "string",
        "readonly": true,
        "adminOnly": true,
        "visibleToOwner": true,
        "column": "selesai_pada"
      },
      {
        "key": "penyelesaian",
        "label": "Tindakan / penyelesaian",
        "type": "text",
        "max": 2000,
        "adminOnly": true,
        "visibleToOwner": true,
        "column": "penyelesaian"
      },
      {
        "key": "catatanDalaman",
        "label": "Catatan dalaman",
        "type": "text",
        "max": 1000,
        "adminOnly": true,
        "hint": "Hanya dilihat Unit IT.",
        "column": "catatan_dalaman"
      }
    ],
    "name": "Tiket",
    "path": "/tiket",
    "sheet": "TIKET",
    "defaultStatus": "BARU",
    "statusRole": "ADMIN"
  },
  { hooks: function () { return typeof TiketHooks !== 'undefined' ? TiketHooks : {}; } }
));
