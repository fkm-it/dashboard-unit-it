/**
 * DIJANA oleh tools/gen.js daripada modules/aset.json — JANGAN sunting dengan tangan.
 * Ubah fail JSON, kemudian jalankan: npm run gen
 */
const AsetModule = Object.freeze(Object.assign(
  {
    "key": "aset",
    "label": "Aset IT",
    "labelPlural": "Aset IT",
    "icon": "database",
    "prefix": "AS",
    "refFormat": "AST-{SEQ5}",
    "description": "Inventori aset IT FKM: komputer, komputer riba, pencetak, projektor, pelayan dan peranti rangkaian.",
    "access": {
      "create": "ADMIN",
      "list": "OWN",
      "edit": "ADMIN",
      "delete": "ADMIN",
      "ownerEditStatuses": []
    },
    "statuses": [
      {
        "value": "BERFUNGSI",
        "label": "Berfungsi",
        "tone": "success"
      },
      {
        "value": "PERLAHAN",
        "label": "Berfungsi tetapi tidak memenuhi keperluan",
        "tone": "brand"
      },
      {
        "value": "PERLU_BAIKI",
        "label": "Bermasalah / perlu dibaiki",
        "tone": "warn"
      },
      {
        "value": "MENUNGGU_ALAT_GANTI",
        "label": "Menunggu alat ganti",
        "tone": "warn"
      },
      {
        "value": "TIDAK_BOLEH_GUNA",
        "label": "Tidak boleh digunakan",
        "tone": "danger"
      },
      {
        "value": "DILUPUS",
        "label": "Dilupus",
        "tone": "muted"
      }
    ],
    "notify": {
      "adminsOnCreate": false,
      "ownerOnStatus": false
    },
    "titleField": "noAset",
    "subtitleField": "model",
    "nav": {
      "user": false,
      "admin": true,
      "order": 20
    },
    "fields": [
      {
        "key": "noAset",
        "label": "No. aset",
        "type": "string",
        "required": true,
        "max": 40,
        "list": true,
        "search": true,
        "placeholder": "cth. UTM/FKM/H/2021/0012",
        "column": "no_aset"
      },
      {
        "key": "noSiri",
        "label": "No. siri",
        "type": "string",
        "max": 60,
        "search": true,
        "column": "no_siri"
      },
      {
        "key": "jenis",
        "label": "Jenis",
        "type": "enum",
        "required": true,
        "default": "DESKTOP",
        "list": true,
        "filter": true,
        "options": [
          {
            "value": "DESKTOP",
            "label": "Komputer meja"
          },
          {
            "value": "LAPTOP",
            "label": "Komputer riba"
          },
          {
            "value": "WORKSTATION",
            "label": "Workstation"
          },
          {
            "value": "PENCETAK",
            "label": "Pencetak / pengimbas"
          },
          {
            "value": "PROJEKTOR",
            "label": "Projektor / AV"
          },
          {
            "value": "PELAYAN",
            "label": "Pelayan (server)"
          },
          {
            "value": "SWITCH",
            "label": "Switch / router"
          },
          {
            "value": "AP",
            "label": "Access point"
          },
          {
            "value": "LAIN",
            "label": "Lain-lain"
          }
        ],
        "column": "jenis"
      },
      {
        "key": "jenama",
        "label": "Jenama",
        "type": "string",
        "max": 60,
        "search": true,
        "column": "jenama"
      },
      {
        "key": "model",
        "label": "Model",
        "type": "string",
        "max": 80,
        "list": true,
        "search": true,
        "column": "model"
      },
      {
        "key": "makmal",
        "label": "Makmal",
        "type": "ref",
        "ref": "makmal",
        "list": true,
        "filter": true,
        "hint": "Kosongkan jika bukan aset makmal.",
        "column": "makmal"
      },
      {
        "key": "lokasi",
        "label": "Lokasi / bilik",
        "type": "string",
        "max": 120,
        "search": true,
        "column": "lokasi"
      },
      {
        "key": "pegawaiBertanggungjawab",
        "label": "Pegawai bertanggungjawab",
        "type": "string",
        "max": 120,
        "search": true,
        "column": "pegawai_bertanggungjawab"
      },
      {
        "key": "tahunPerolehan",
        "label": "Tahun perolehan",
        "type": "int",
        "min": 1990,
        "max": 2100,
        "column": "tahun_perolehan"
      },
      {
        "key": "tamatWaranti",
        "label": "Tarikh tamat waranti",
        "type": "date",
        "column": "tamat_waranti"
      },
      {
        "key": "cpu",
        "label": "Pemproses (CPU)",
        "type": "string",
        "max": 80,
        "column": "cpu"
      },
      {
        "key": "ramGb",
        "label": "RAM (GB)",
        "type": "int",
        "min": 0,
        "max": 4096,
        "column": "ram_gb"
      },
      {
        "key": "storan",
        "label": "Storan",
        "type": "string",
        "max": 80,
        "placeholder": "cth. SSD 512GB",
        "column": "storan"
      },
      {
        "key": "gpu",
        "label": "Kad grafik (GPU)",
        "type": "string",
        "max": 80,
        "column": "gpu"
      },
      {
        "key": "sistemOperasi",
        "label": "Sistem operasi",
        "type": "string",
        "max": 60,
        "placeholder": "cth. Windows 11 Pro",
        "column": "sistem_operasi"
      },
      {
        "key": "lesenOs",
        "label": "Status lesen OS",
        "type": "enum",
        "default": "SAH",
        "options": [
          {
            "value": "SAH",
            "label": "Sah / berlesen"
          },
          {
            "value": "TAMAT",
            "label": "Tamat / tidak berlesen"
          },
          {
            "value": "TIDAK_PASTI",
            "label": "Tidak pasti"
          }
        ],
        "column": "lesen_os"
      },
      {
        "key": "perisian",
        "label": "Perisian utama",
        "type": "text",
        "max": 1000,
        "search": true,
        "column": "perisian"
      },
      {
        "key": "keadaanFizikal",
        "label": "Keadaan fizikal",
        "type": "enum",
        "default": "BAIK",
        "filter": true,
        "options": [
          {
            "value": "BAIK",
            "label": "Baik"
          },
          {
            "value": "SEDERHANA",
            "label": "Sederhana"
          },
          {
            "value": "USANG",
            "label": "Usang"
          }
        ],
        "column": "keadaan_fizikal"
      },
      {
        "key": "cadangan",
        "label": "Cadangan tindakan",
        "type": "enum",
        "default": "KEKAL",
        "list": true,
        "filter": true,
        "options": [
          {
            "value": "KEKAL",
            "label": "Kekal"
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
        "column": "cadangan"
      },
      {
        "key": "disahkanFizikal",
        "label": "Disahkan secara fizikal",
        "type": "bool",
        "filter": true,
        "column": "disahkan_fizikal"
      },
      {
        "key": "tarikhSemakan",
        "label": "Tarikh semakan terakhir",
        "type": "date",
        "column": "tarikh_semakan"
      },
      {
        "key": "catatan",
        "label": "Catatan kerosakan / isu",
        "type": "text",
        "max": 2000,
        "search": true,
        "column": "catatan"
      }
    ],
    "name": "Aset",
    "path": "/aset",
    "sheet": "ASET",
    "defaultStatus": "BERFUNGSI",
    "statusRole": "ADMIN"
  },
  { hooks: function () { return typeof AsetHooks !== 'undefined' ? AsetHooks : {}; } }
));
