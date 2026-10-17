# Context & Development Guidelines: Sistem Absensi Wajah Sekolah

## Tech Stack & Core Libraries
- **Backend**: Node.js (v18+), Express.js (ES Modules `import`/`export`), MySQL/PostgreSQL driver.
- **Frontend**: React (Vite), Tailwind CSS, Lucide React (Icons).
- **Machine Learning (Client-Side)**: `@vladmandic/face-api` (mendeteksi landmark & mengekstrak 128-d vector embedding di browser).
- **Integrasi**: WhatsApp Gateway API (Fonnte / Wablas / Baileys).

## Project Directory Structure
Sistem ini WAJIB menggunakan struktur direktori berikut secara ketat:

absensi-wajah/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js          # Koneksi DB
│   │   ├── models/
│   │   │   ├── Siswa.js             # Data siswa, NISN, kelas, ortu
│   │   │   ├── Guru.js              # Data guru, NIP, mapel, wali kelas
│   │   │   ├── WajahTerdaftar.js    # Face embedding/vector per siswa
│   │   │   ├── AbsensiLog.js        # Waktu masuk/keluar, status, lokasi, foto
│   │   │   └── PerangkatAbsen.js    # Data kamera/perangkat titik absen
│   │   ├── controllers/
│   │   │   ├── pendaftaranWajahController.js # Registrasi & kelola data siswa/guru/wajah
│   │   │   ├── absensiController.js          # Handler scan absensi & pencatatan
│   │   │   └── laporanController.js          # Rekapitulasi & statistik kehadiran
│   │   ├── routes/
│   │   │   ├── pendaftaranRoutes.js          # Route registrasi data & wajah
│   │   │   ├── absensiRoutes.js              # Route scan absensi
│   │   │   └── laporanRoutes.js              # Route laporan & rekapitulasi
│   │   ├── services/
│   │   │   ├── faceDetector.js      # Utility penanganan frame/landmarking
│   │   │   ├── faceEncoder.js       # Utility ekstraksi vector embedding
│   │   │   ├── faceMatcher.js       # Cocokkan embedding vs DB (Euclidean Distance < 0.4)
│   │   │   ├── livenessCheck.js     # Validasi kedipan/gerak (cegah spoofing foto)
│   │   │   ├── jadwalCalculator.js  # Tentukan keterlambatan/tepat waktu
│   │   │   └── whatsappService.js   # Pengiriman laporan kehadiran ke WhatsApp Ortu
│   │   └── app.js
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── KameraAbsen.jsx           # Akses webcam, capture frame real-time
│   │   │   ├── FormPendaftaranWajah.jsx # Ambil beberapa sampel vektor wajah siswa
│   │   │   ├── HasilAbsen.jsx            # Modal/notifikasi berhasil/gagal + nama siswa
│   │   │   ├── TabelAbsensi.jsx          # Tabel riwayat absensi
│   │   │   └── GrafikKehadiran.jsx       # Chart statistik kehadiran
│   │   ├── pages/
│   │   │   ├── TitikAbsen.jsx            # Halaman kiosk/tablet di pintu masuk
│   │   │   ├── PendaftaranWajah.jsx      # Admin/Guru mendaftarkan siswa & wajah
│   │   │   ├── RiwayatAbsensi.jsx        # Halaman pemantauan riwayat harian
│   │   │   └── Laporan.jsx               # Halaman rekapitulasi laporan untuk wali kelas
│   │   ├── services/
│   │   │   └── api.js                    # Axios client instance
│   │   └── App.jsx
│   └── package.json
│
├── database/
│   └── schema.sql                   # Tabel: siswa, guru, wali_kelas, mata_pelajaran, orang_tua, wajah_terdaftar, absensi_log, perangkat_absen
│
└── docs/
    └── README.md

## Coding Standards
- Gunakan ES Modules di Backend (`"type": "module"` pada `package.json`).
- Pengolahan ML extraction WAJIB dilakukan di client-side (frontend); backend HANYA menerima dan memproses data numerik vektor (array 128 float).
- Ikuti penamaan file dan folder sesuai struktur di atas tanpa mengubah nama file.