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
    "description": "Inventori aset IT FKM (selaras UTMFin/KEWPA): komputer, komputer riba, pencetak, projektor, pelayan dan peranti rangkaian.",
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
      },
      {
        "value": "HILANG",
        "label": "Hilang / dalam siasatan",
        "tone": "danger"
      },
      {
        "value": "HAPUS_KIRA",
        "label": "Hapus kira (hilang)",
        "tone": "muted"
      },
      {
        "value": "DIPINDAH_KELUAR",
        "label": "Dipindahkan keluar FKM",
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
        "label": "No. aset / bar code",
        "type": "string",
        "required": true,
        "max": 40,
        "list": true,
        "search": true,
        "placeholder": "cth. HA0028148 (BAR_CODE UTMFin)",
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
        "label": "Item aset / model",
        "type": "string",
        "max": 120,
        "list": true,
        "search": true,
        "column": "model"
      },
      {
        "key": "namaAlat",
        "label": "Nama alat (inventori makmal)",
        "type": "string",
        "max": 120,
        "search": true,
        "column": "nama_alat"
      },
      {
        "key": "monitor",
        "label": "Monitor",
        "type": "string",
        "max": 160,
        "search": true,
        "hint": "Model & no. siri monitor yang dipasangkan dengan CPU ini.",
        "column": "monitor"
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
        "label": "Lokasi (bangunan · aras · bilik)",
        "type": "string",
        "max": 120,
        "search": true,
        "column": "lokasi"
      },
      {
        "key": "kodLokasi",
        "label": "Kod lokasi (ID_LOKASI)",
        "type": "string",
        "max": 40,
        "search": true,
        "placeholder": "cth. J.C24.01.108-01",
        "column": "kod_lokasi"
      },
      {
        "key": "lokasiFizikal",
        "label": "Lokasi fizikal (semakan makmal)",
        "type": "string",
        "max": 40,
        "search": true,
        "placeholder": "cth. C24.411",
        "column": "lokasi_fizikal"
      },
      {
        "key": "lokasiBerbeza",
        "label": "Lokasi fizikal ≠ UTMFin",
        "type": "bool",
        "filter": true,
        "readonly": true,
        "hint": "Ditanda automatik semasa import; rekod pergerakan aset (KEWPA) mungkin perlu dikemas kini.",
        "column": "lokasi_berbeza"
      },
      {
        "key": "picMakmal",
        "label": "PIC makmal",
        "type": "string",
        "max": 120,
        "search": true,
        "column": "pic_makmal"
      },
      {
        "key": "pegawaiBertanggungjawab",
        "label": "Penjaga aset (KEWPA)",
        "type": "string",
        "max": 120,
        "search": true,
        "list": true,
        "column": "pegawai_bertanggungjawab"
      },
      {
        "key": "noPekerjaPenjaga",
        "label": "No. pekerja penjaga",
        "type": "string",
        "max": 20,
        "search": true,
        "column": "no_pekerja_penjaga"
      },
      {
        "key": "emailPenjaga",
        "label": "Email penjaga",
        "type": "email",
        "search": true,
        "column": "email_penjaga"
      },
      {
        "key": "penjagaTerkini",
        "label": "Penjaga terkini (jika bertukar)",
        "type": "string",
        "max": 120,
        "search": true,
        "column": "penjaga_terkini"
      },
      {
        "key": "statusPengesahan",
        "label": "Status pengesahan aset",
        "type": "enum",
        "list": true,
        "filter": true,
        "options": [
          {
            "value": "AKTIF",
            "label": "Aktif di bawah seliaan penjaga"
          },
          {
            "value": "MAKMAL",
            "label": "Penjaga - Penggunaan Makmal"
          },
          {
            "value": "GUNA_SAMA",
            "label": "Penjaga - Guna Sama"
          },
          {
            "value": "BERTUKAR_PENJAGA",
            "label": "Aset bertukar penjaga (tiada rekod pergerakan KEWPA)"
          },
          {
            "value": "TIDAK_DISAHKAN",
            "label": "Status aset tidak dapat disahkan oleh penjaga"
          },
          {
            "value": "PELUPUSAN",
            "label": "Dalam tindakan pelupusan oleh penjaga"
          },
          {
            "value": "LUPUS_REKOD_AKTIF",
            "label": "Telah lupus tetapi rekod aktif di UTMFin"
          },
          {
            "value": "BUKAN_KOMPUTER",
            "label": "Bukan aset komputer"
          }
        ],
        "column": "status_pengesahan"
      },
      {
        "key": "disemakOleh",
        "label": "Disemak / dikemas kini oleh",
        "type": "string",
        "max": 120,
        "search": true,
        "column": "disemak_oleh"
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
        "key": "tarikhAset",
        "label": "Tarikh aset",
        "type": "date",
        "column": "tarikh_aset"
      },
      {
        "key": "nilaiPerolehan",
        "label": "Nilai pembelian (RM)",
        "type": "number",
        "min": 0,
        "max": 10000000,
        "decimals": 2,
        "column": "nilai_perolehan"
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
        "key": "kategoriAset",
        "label": "Kategori aset",
        "type": "enum",
        "filter": true,
        "options": [
          {
            "value": "ASET_TETAP",
            "label": "Aset Tetap"
          },
          {
            "value": "INVENTORI",
            "label": "Inventori"
          }
        ],
        "column": "kategori_aset"
      },
      {
        "key": "borangKewpa",
        "label": "Borang KEWPA",
        "type": "string",
        "max": 20,
        "placeholder": "cth. KEW.PA-2",
        "column": "borang_kewpa"
      },
      {
        "key": "kegunaan",
        "label": "Status penggunaan",
        "type": "string",
        "max": 60,
        "placeholder": "cth. Pengajaran",
        "column": "kegunaan"
      },
      {
        "key": "sopAda",
        "label": "SOP ada",
        "type": "bool",
        "column": "sop_ada"
      },
      {
        "key": "selenggaraCutiSem",
        "label": "Penyelenggaraan berkala (cuti semester)",
        "type": "bool",
        "column": "selenggara_cuti_sem"
      },
      {
        "key": "selenggaraSukuTahun",
        "label": "Penyelenggaraan 3 bulan sekali",
        "type": "bool",
        "column": "selenggara_suku_tahun"
      },
      {
        "key": "selenggaraIkutKeadaan",
        "label": "Penyelenggaraan ikut keadaan / aduan",
        "type": "bool",
        "column": "selenggara_ikut_keadaan"
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
        "key": "perluDilengkapkan",
        "label": "Perlu dilengkapkan",
        "type": "bool",
        "filter": true,
        "hint": "Didaftarkan secara pantas (cth. semasa stock-take). Lengkapkan butiran kemudian; tanda ini hilang sendiri apabila jenama dan model diisi.",
        "column": "perlu_dilengkapkan"
      },
      {
        "key": "catatan",
        "label": "Catatan kerosakan / isu",
        "type": "text",
        "max": 2000,
        "search": true,
        "column": "catatan"
      },
      {
        "key": "deskripsiPerolehan",
        "label": "Deskripsi perolehan",
        "type": "text",
        "max": 500,
        "search": true,
        "column": "deskripsi_perolehan"
      },
      {
        "key": "kodSodo",
        "label": "Kod SODO",
        "type": "string",
        "max": 20,
        "column": "kod_sodo"
      },
      {
        "key": "ptjPerolehan",
        "label": "PTJ perolehan",
        "type": "string",
        "max": 20,
        "column": "ptj_perolehan"
      },
      {
        "key": "chargeline",
        "label": "Chargeline",
        "type": "string",
        "max": 40,
        "column": "chargeline"
      },
      {
        "key": "noRujukanPerolehan",
        "label": "No. rujukan perolehan (PD)",
        "type": "string",
        "max": 40,
        "search": true,
        "column": "no_rujukan_perolehan"
      },
      {
        "key": "noPt",
        "label": "No. PT",
        "type": "string",
        "max": 40,
        "column": "no_pt"
      },
      {
        "key": "noRequisition",
        "label": "Rujukan requisition (PM)",
        "type": "string",
        "max": 40,
        "column": "no_requisition"
      },
      {
        "key": "costCenter",
        "label": "Cost center",
        "type": "string",
        "max": 40,
        "column": "cost_center"
      },
      {
        "key": "bolehDipinjam",
        "label": "Boleh dipinjam",
        "type": "bool",
        "filter": true,
        "hint": "Aset boleh dimohon melalui modul Pinjaman Aset.",
        "column": "boleh_dipinjam"
      },
      {
        "key": "dipinjam",
        "label": "Sedang dipinjam",
        "type": "bool",
        "readonly": true,
        "column": "dipinjam"
      },
      {
        "key": "peminjamSemasa",
        "label": "Peminjam semasa",
        "type": "string",
        "readonly": true,
        "column": "peminjam_semasa"
      },
      {
        "key": "tarikhPulangJangka",
        "label": "Tarikh pulang dijangka",
        "type": "date",
        "readonly": true,
        "column": "tarikh_pulang_jangka"
      },
      {
        "key": "tarikhSelenggaraTerakhir",
        "label": "Selenggara terakhir",
        "type": "date",
        "readonly": true,
        "column": "tarikh_selenggara_terakhir"
      },
      {
        "key": "tarikhSelenggaraSeterusnya",
        "label": "Selenggara seterusnya",
        "type": "date",
        "readonly": true,
        "column": "tarikh_selenggara_seterusnya"
      },
      {
        "key": "tarikhPenilaian",
        "label": "Tarikh penilaian",
        "type": "date",
        "readonly": true,
        "column": "tarikh_penilaian"
      },
      {
        "key": "skorKeadaan",
        "label": "Skor keadaan (%)",
        "type": "int",
        "readonly": true,
        "column": "skor_keadaan"
      },
      {
        "key": "nilaiSemasa",
        "label": "Nilai semasa (RM)",
        "type": "number",
        "readonly": true,
        "column": "nilai_semasa"
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
