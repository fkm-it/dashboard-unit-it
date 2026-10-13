/**
 * DIJANA oleh tools/gen.js daripada modules/perisian.json — JANGAN sunting dengan tangan.
 * Ubah fail JSON, kemudian jalankan: npm run gen
 */
const PerisianModule = Object.freeze(Object.assign(
  {
    "key": "perisian",
    "label": "Perisian & Lesen",
    "labelPlural": "Perisian & Lesen",
    "icon": "grid",
    "prefix": "PS",
    "refFormat": "PRS-{SEQ5}",
    "description": "Perisian yang dipasang di setiap makmal: versi, sumber lesen dan bilangan lesen.",
    "access": {
      "create": "ADMIN",
      "list": "OWN",
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
        "label": "Tidak digunakan lagi",
        "tone": "muted"
      }
    ],
    "notify": {
      "adminsOnCreate": false,
      "ownerOnStatus": false
    },
    "titleField": "nama",
    "subtitleField": "sumberLesen",
    "nav": {
      "user": false,
      "admin": true,
      "order": 42
    },
    "fields": [
      {
        "key": "makmal",
        "label": "Makmal",
        "type": "ref",
        "ref": "makmal",
        "required": true,
        "list": true,
        "filter": true,
        "column": "makmal"
      },
      {
        "key": "nama",
        "label": "Perisian",
        "type": "string",
        "required": true,
        "max": 120,
        "list": true,
        "search": true,
        "placeholder": "cth. Solidworks 2024",
        "column": "nama"
      },
      {
        "key": "kategori",
        "label": "Kategori",
        "type": "enum",
        "filter": true,
        "list": true,
        "default": "KEJURUTERAAN",
        "options": [
          {
            "value": "KEJURUTERAAN",
            "label": "Kejuruteraan / CAD / simulasi"
          },
          {
            "value": "PENGATURCARAAN",
            "label": "Pengaturcaraan"
          },
          {
            "value": "PEJABAT",
            "label": "Pejabat / produktiviti"
          },
          {
            "value": "UTILITI",
            "label": "Utiliti / sistem"
          },
          {
            "value": "LAIN",
            "label": "Lain-lain"
          }
        ],
        "column": "kategori"
      },
      {
        "key": "jenisLesen",
        "label": "Jenis lesen",
        "type": "enum",
        "required": true,
        "default": "BERLESEN",
        "list": true,
        "filter": true,
        "options": [
          {
            "value": "BERLESEN",
            "label": "Berlesen"
          },
          {
            "value": "SUMBER_TERBUKA",
            "label": "Sumber terbuka / percuma"
          }
        ],
        "column": "jenis_lesen"
      },
      {
        "key": "sumberLesen",
        "label": "Sumber lesen",
        "type": "string",
        "max": 80,
        "search": true,
        "placeholder": "cth. FKM Server, UTM Server, UTM",
        "column": "sumber_lesen"
      },
      {
        "key": "bilLesen",
        "label": "Bilangan lesen",
        "type": "int",
        "min": 0,
        "max": 100000,
        "column": "bil_lesen"
      },
      {
        "key": "sistemOperasi",
        "label": "Sistem operasi",
        "type": "string",
        "max": 80,
        "placeholder": "cth. Windows 11",
        "column": "sistem_operasi"
      },
      {
        "key": "tahun",
        "label": "Tahun data",
        "type": "int",
        "min": 2000,
        "max": 2100,
        "column": "tahun"
      },
      {
        "key": "tamatLesen",
        "label": "Tarikh tamat lesen",
        "type": "date",
        "column": "tamat_lesen"
      },
      {
        "key": "catatan",
        "label": "Catatan",
        "type": "text",
        "max": 1000,
        "column": "catatan"
      }
    ],
    "name": "Perisian",
    "path": "/perisian",
    "sheet": "PERISIAN",
    "defaultStatus": "AKTIF",
    "statusRole": "ADMIN"
  },
  { hooks: function () { return typeof PerisianHooks !== 'undefined' ? PerisianHooks : {}; } }
));
