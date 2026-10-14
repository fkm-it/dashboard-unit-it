/**
 * DIJANA oleh tools/gen.js daripada modules/penilaian.json — JANGAN sunting dengan tangan.
 * Ubah fail JSON, kemudian jalankan: npm run gen
 */
const PenilaianModule = Object.freeze(Object.assign(
  {
    "key": "penilaian",
    "label": "Penilaian Aset",
    "labelPlural": "Penilaian Aset",
    "icon": "chart",
    "prefix": "PN",
    "refFormat": "PNL-{YYYY}-{SEQ4}",
    "description": "Penilaian keadaan aset (skor fizikal, prestasi & keperluan) dan nilai semasa. Keputusan disahkan dikemas kini sebagai cadangan pada rekod aset.",
    "access": {
      "create": "ADMIN",
      "list": "OWN",
      "edit": "ADMIN",
      "delete": "ADMIN",
      "ownerEditStatuses": []
    },
    "statuses": [
      {
        "value": "DRAF",
        "label": "Draf",
        "tone": "muted"
      },
      {
        "value": "DISAHKAN",
        "label": "Disahkan",
        "tone": "success"
      }
    ],
    "notify": {
      "adminsOnCreate": false,
      "ownerOnStatus": false
    },
    "titleField": "noAset",
    "subtitleField": "keputusan",
    "nav": {
      "user": false,
      "admin": true,
      "order": 28
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
        "key": "tarikhPenilaian",
        "label": "Tarikh penilaian",
        "type": "date",
        "required": true,
        "list": true,
        "column": "tarikh_penilaian"
      },
      {
        "key": "jenisPenilaian",
        "label": "Jenis penilaian",
        "type": "enum",
        "required": true,
        "filter": true,
        "default": "KEDUA",
        "options": [
          {
            "value": "KEADAAN",
            "label": "Keadaan aset"
          },
          {
            "value": "NILAI",
            "label": "Nilai semasa"
          },
          {
            "value": "KEDUA",
            "label": "Keadaan & nilai semasa"
          }
        ],
        "column": "jenis_penilaian"
      },
      {
        "key": "skorFizikal",
        "label": "Keadaan fizikal (1–5)",
        "type": "int",
        "min": 1,
        "max": 5,
        "hint": "1 = sangat buruk, 5 = sangat baik",
        "column": "skor_fizikal"
      },
      {
        "key": "skorPrestasi",
        "label": "Prestasi / fungsi (1–5)",
        "type": "int",
        "min": 1,
        "max": 5,
        "column": "skor_prestasi"
      },
      {
        "key": "skorKeperluan",
        "label": "Memenuhi keperluan pengguna (1–5)",
        "type": "int",
        "min": 1,
        "max": 5,
        "column": "skor_keperluan"
      },
      {
        "key": "skorKeseluruhan",
        "label": "Skor keseluruhan (%)",
        "type": "int",
        "readonly": true,
        "list": true,
        "column": "skor_keseluruhan"
      },
      {
        "key": "keputusan",
        "label": "Keputusan / cadangan",
        "type": "enum",
        "list": true,
        "filter": true,
        "hint": "Kosongkan untuk cadangan automatik daripada skor.",
        "options": [
          {
            "value": "KEKAL",
            "label": "Kekal guna"
          },
          {
            "value": "BAIKI",
            "label": "Baiki"
          },
          {
            "value": "NAIK_TARAF",
            "label": "Naik taraf"
          },
          {
            "value": "GANTI",
            "label": "Ganti"
          },
          {
            "value": "LUPUS",
            "label": "Lupus"
          }
        ],
        "column": "keputusan"
      },
      {
        "key": "nilaiPerolehan",
        "label": "Nilai perolehan (RM)",
        "type": "number",
        "readonly": true,
        "column": "nilai_perolehan"
      },
      {
        "key": "nilaiBuku",
        "label": "Nilai buku semasa (RM)",
        "type": "number",
        "readonly": true,
        "column": "nilai_buku"
      },
      {
        "key": "nilaiSemasa",
        "label": "Anggaran nilai semasa (RM)",
        "type": "number",
        "min": 0,
        "decimals": 2,
        "list": true,
        "hint": "Kosongkan untuk guna nilai buku (susut nilai garis lurus).",
        "column": "nilai_semasa"
      },
      {
        "key": "kaedahNilai",
        "label": "Kaedah penilaian nilai",
        "type": "enum",
        "default": "SUSUT_NILAI",
        "options": [
          {
            "value": "SUSUT_NILAI",
            "label": "Susut nilai garis lurus"
          },
          {
            "value": "PASARAN",
            "label": "Harga pasaran / sebut harga"
          },
          {
            "value": "PENILAI",
            "label": "Penilai bertauliah"
          }
        ],
        "column": "kaedah_nilai"
      },
      {
        "key": "penilai",
        "label": "Pegawai penilai",
        "type": "string",
        "required": true,
        "max": 120,
        "column": "penilai"
      },
      {
        "key": "catatan",
        "label": "Ulasan",
        "type": "text",
        "max": 1500,
        "column": "catatan"
      },
      {
        "key": "lampiran",
        "label": "Dokumen sokongan",
        "type": "files",
        "maxFiles": 3,
        "public": false,
        "column": "lampiran"
      }
    ],
    "name": "Penilaian",
    "path": "/penilaian",
    "sheet": "PENILAIAN",
    "defaultStatus": "DRAF",
    "statusRole": "ADMIN"
  },
  { hooks: function () { return typeof PenilaianHooks !== 'undefined' ? PenilaianHooks : {}; } }
));
