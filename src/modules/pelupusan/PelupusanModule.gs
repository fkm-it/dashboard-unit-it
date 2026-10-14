/**
 * DIJANA oleh tools/gen.js daripada modules/pelupusan.json — JANGAN sunting dengan tangan.
 * Ubah fail JSON, kemudian jalankan: npm run gen
 */
const PelupusanModule = Object.freeze(Object.assign(
  {
    "key": "pelupusan",
    "label": "Pelupusan Aset",
    "labelPlural": "Pelupusan Aset",
    "icon": "archive",
    "prefix": "LP",
    "refFormat": "LPS-{YYYY}-{SEQ4}",
    "description": "Permohonan dan rekod pelupusan aset alih (KEW.PA-16/17): cadangan, pemeriksaan Lembaga Pemeriksa, kelulusan dan pelaksanaan. Aset ditanda Dilupus apabila selesai.",
    "access": {
      "create": "ADMIN",
      "list": "OWN",
      "edit": "ADMIN",
      "delete": "ADMIN",
      "ownerEditStatuses": []
    },
    "statuses": [
      {
        "value": "DICADANGKAN",
        "label": "Dicadangkan",
        "tone": "info"
      },
      {
        "value": "DIPERIKSA",
        "label": "Diperiksa Lembaga Pemeriksa",
        "tone": "brand"
      },
      {
        "value": "DILULUSKAN",
        "label": "Diluluskan",
        "tone": "warn"
      },
      {
        "value": "DILUPUSKAN",
        "label": "Dilupuskan",
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
    "notify": {
      "adminsOnCreate": false,
      "ownerOnStatus": false
    },
    "titleField": "noAset",
    "subtitleField": "sebab",
    "nav": {
      "user": false,
      "admin": true,
      "order": 29
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
        "key": "sebab",
        "label": "Sebab pelupusan",
        "type": "enum",
        "required": true,
        "list": true,
        "filter": true,
        "options": [
          {
            "value": "ROSAK_TIDAK_EKONOMI",
            "label": "Rosak & tidak ekonomi dibaiki"
          },
          {
            "value": "USANG",
            "label": "Usang"
          },
          {
            "value": "LUPUT_TEKNOLOGI",
            "label": "Luput teknologi / tidak disokong"
          },
          {
            "value": "TIDAK_DIPERLUKAN",
            "label": "Tidak diperlukan / berlebihan"
          },
          {
            "value": "LAIN",
            "label": "Lain-lain"
          }
        ],
        "column": "sebab"
      },
      {
        "key": "justifikasi",
        "label": "Justifikasi",
        "type": "text",
        "required": true,
        "max": 2000,
        "search": true,
        "column": "justifikasi"
      },
      {
        "key": "kaedah",
        "label": "Kaedah pelupusan",
        "type": "enum",
        "list": true,
        "filter": true,
        "options": [
          {
            "value": "JUALAN_TENDER",
            "label": "Jualan secara tender"
          },
          {
            "value": "JUALAN_SEBUT_HARGA",
            "label": "Jualan secara sebut harga"
          },
          {
            "value": "JUALAN_LELONG",
            "label": "Jualan secara lelong"
          },
          {
            "value": "SERAHAN",
            "label": "Serahan / hadiah"
          },
          {
            "value": "TUKAR_BARANG",
            "label": "Tukar barang / tukar beli"
          },
          {
            "value": "KITAR_SEMULA",
            "label": "Kitar semula (e-waste)"
          },
          {
            "value": "MUSNAH",
            "label": "Musnah"
          },
          {
            "value": "LAIN",
            "label": "Lain-lain"
          }
        ],
        "column": "kaedah"
      },
      {
        "key": "nilaiPerolehan",
        "label": "Nilai perolehan (RM)",
        "type": "number",
        "readonly": true,
        "column": "nilai_perolehan"
      },
      {
        "key": "nilaiSemasa",
        "label": "Nilai semasa (RM)",
        "type": "number",
        "min": 0,
        "decimals": 2,
        "hint": "Kosongkan untuk guna penilaian terakhir yang disahkan atau nilai buku.",
        "column": "nilai_semasa"
      },
      {
        "key": "lembagaPemeriksa",
        "label": "Lembaga Pemeriksa",
        "type": "text",
        "max": 500,
        "column": "lembaga_pemeriksa"
      },
      {
        "key": "noRujukanKelulusan",
        "label": "No. rujukan kelulusan",
        "type": "string",
        "max": 80,
        "column": "no_rujukan_kelulusan"
      },
      {
        "key": "tarikhKelulusan",
        "label": "Tarikh kelulusan",
        "type": "date",
        "column": "tarikh_kelulusan"
      },
      {
        "key": "tarikhLupus",
        "label": "Tarikh dilupuskan",
        "type": "date",
        "list": true,
        "column": "tarikh_lupus"
      },
      {
        "key": "hasilPelupusan",
        "label": "Hasil pelupusan (RM)",
        "type": "number",
        "min": 0,
        "decimals": 2,
        "column": "hasil_pelupusan"
      },
      {
        "key": "statusPengesahanAsal",
        "label": "Status pengesahan asal aset",
        "type": "string",
        "readonly": true,
        "adminOnly": true,
        "column": "status_pengesahan_asal"
      },
      {
        "key": "lampiran",
        "label": "Dokumen (KEW.PA-16/17, sijil pelupusan)",
        "type": "files",
        "maxFiles": 5,
        "public": false,
        "column": "lampiran"
      }
    ],
    "name": "Pelupusan",
    "path": "/pelupusan",
    "sheet": "PELUPUSAN",
    "defaultStatus": "DICADANGKAN",
    "statusRole": "ADMIN"
  },
  { hooks: function () { return typeof PelupusanHooks !== 'undefined' ? PelupusanHooks : {}; } }
));
