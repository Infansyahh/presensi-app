# Sistem Absensi Wajah Sekolah

Aplikasi absensi siswa berbasis pengenalan wajah (face recognition) untuk lingkungan
sekolah. Siswa cukup hadir di depan kamera di titik absen, sistem mengenali wajahnya,
mencatat kehadiran, lalu mengirim laporan ke orang tua via WhatsApp.

## Tech Stack

| Lapisan | Teknologi |
| --- | --- |
| Backend | Node.js 18+, Express.js (ES Modules) |
| Database | MySQL 8 / MariaDB (XAMPP), driver `mysql2` |
| Frontend | React (Vite), Tailwind CSS, Lucide React |
| Machine Learning | `@vladmandic/face-api` — berjalan **di browser** |
| Notifikasi | WhatsApp Gateway (Fonnte / Wablas / Baileys) |

## Prinsip Arsitektur Penting.

1. **Ekstraksi ML 100% di client-side.** Backend tidak pernah menjalankan
   `@vladmandic/face-api` dan tidak menerima gambar mentah untuk diproses ML.
   Browser mengekstrak *descriptor* wajah dan mengirim **array 128 float** ke backend.
2. **Pencocokan di backend.** Service `faceMatcher` membandingkan vektor masuk dengan
   vektor pada tabel `wajah_terdaftar` memakai Euclidean Distance; ambang batas
   kecocokan **< 0.4**.
3. **Anti-spoofing.** Service `livenessCheck` memvalidasi kedipan/gerakan sebelum
   absen dicatat agar foto/video tidak bisa dipakai meniru wajah siswa.
4. **Backend tanpa manage session.** Autentikasi perangkat absen memakai
   `perangkat_absen.secret_key`.

## Alur Absensi (Ringkas)

```
Kamera (TitikAbsen.jsx)
  -> livenessCheck        : verifikasi wajah hidup (kedip)
  -> faceEncoder          : vektor 128 float
  -> POST /api/absensi/scan  { vector, deteksi, liveness, perangkat_secret_key }
       -> faceEncoder     : vektor harus array 128 float          -> 400
       -> faceDetector    : tepat 1 wajah, skor >= 0.7            -> 400
       -> livenessCheck   : skor >= 0.6 + kedipan terdeteksi      -> 403
       -> auth perangkat  : secret_key Cocok                      -> 401
       -> faceMatcher     : cari siswa terdekat (distance < 0.4)  -> 404
       -> jadwalCalculator: Hadir / Terlambat
       -> simpan ke absensi_log
       -> whatsappService : kirim ringkasan ke orang tua (gagal tidak fatal)
  -> tampilkan HasilAbsen.jsx
```

## Service (backend/src/services/)

| File | Tanggung jawab | Sinyal yang ditolak |
| --- | --- | --- |
| `faceEncoder.js` | Kontrak vektor 128 float dari frontend (`.vector` / `.embedding` / `.descriptor`, boleh string JSON) | Panjang bukan 128, ada `NaN`/`string` |
| `faceDetector.js` | Metadata deteksi wajah pada frame | 0 wajah, >1 wajah, `detection_score` < 0.7 |
| `livenessCheck.js` | Anti-spoofing dari sinyal browser | Skor < 0.6, kedipan tidak terdeteksi (anti-foto) |
| `faceMatcher.js` | Euclidean Distance vektor input vs `wajah_terdaftar` | Tidak ada yang di bawah ambang 0.4 |
| `jadwalCalculator.js` | Status `Hadir` / `Terlambat` terhadap jam operasional | — |
| `whatsappService.js` | Kirim notifikasi lewat Fonnte / Wablas | Tidak melempar error; mengembalikan `{terkirim, alasan}` |

Ekstraksi ML tetap 100% di browser. Backend tidak memuat `face-api`; services ini
hanya memvalidasi metadata dan membandingkan angka.

## Struktur Direktori

```
absensi-wajah/
├── backend/
│   ├── src/
│   │   ├── config/database.js           # koneksi DB (sudah ada)
│   │   ├── models/                      # Siswa, Guru, WajahTerdaftar, AbsensiLog, PerangkatAbsen
│   │   ├── controllers/                 # pendaftaranWajah, absensi, laporan
│   │   ├── routes/                      # pendaftaranRoutes, absensiRoutes, laporanRoutes
│   │   ├── services/                    # faceDetector, faceEncoder, faceMatcher,
│   │   │                                # livenessCheck, jadwalCalculator, whatsappService
│   │   └── app.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── KameraAbsen.jsx           # pemindai kiosk, validasi liveness, kirim vektor
│   │   │   ├── FormPendaftaranWajah.jsx # ambil 5 sampel descriptor siswa
│   │   │   ├── HasilAbsen.jsx            # dialog hasil absensi (sukses/gagal)
│   │   │   ├── TabelAbsensi.jsx          # riwayat: tabel di desktop, kartu di mobile
│   │   │   └── GrafikKehadiran.jsx      # batang bertumpuk SVG per tanggal
│   │   ├── pages/
│   │   │   ├── TitikAbsen.jsx             # kiosk: KameraAbsen + daftar hadir hari ini
│   │   │   ├── PendaftaranWajah.jsx       # form data siswa/ortu + FormPendaftaranWajah
│   │   │   ├── RiwayatAbsensi.jsx         # riwayat harian, polling 30 detik
│   │   │   └── Laporan.jsx                # rekap bulanan untuk wali kelas
│   │   ├── hooks/useWebcamFace.js         # siklus kamera + loop deteksi (dipakai 2 komponen)
│   │   ├── lib/statusAbsensi.js           # peta status -> token warna
│   │   ├── services/
│   │   │   ├── api.js                    # Axios ke backend + payloadScan()
│   │   │   └── faceApi.js                # satu-satunya pemakaian @vladmandic/face-api
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css                     # token @theme Tailwind + utilitas fokus
│   ├── public/models/                     # bobot face-api (disalin saat npm install)
│   ├── scripts/copy-models.mjs
│   ├── index.html
│   └── package.json
├── database/
│   └── schema.sql                       # 9 tabel (lihat bawah)
└── docs/README.md
```

## Basis Data

Tabel dibuat oleh `database/schema.sql`:

| Tabel | Isi | Relasi |
| --- | --- | --- |
| `kelas` | Nama kelas, tingkat, tahun ajaran | induk dari `siswa.kelas_id`, `wali_kelas.kelas_id` |
| `orang_tua` | Nama orang tua, no. WhatsApp, email | induk dari `siswa.ortu_id` |
| `mata_pelajaran` | Kode & nama mapel | induk dari `guru.mapel_id` |
| `guru` | NIP, nama, email, mapel | induk dari `wali_kelas.guru_id` |
| `siswa` | NISN, nama, kelas, orang tua | induk dari `wajah_terdaftar`, `absensi_log` |
| `wali_kelas` | Guru wali kelas per tahun ajaran | `guru` → `kelas` |
| `wajah_terdaftar` | `vector_data` JSON array 128 float, boleh banyak sampel per siswa | `siswa_id` |
| `perangkat_absen` | Nama perangkat, lokasi, `secret_key` | induk dari `absensi_log` |
| `absensi_log` | Tanggal, masuk/keluar, status, foto bukti, perangkat | `siswa_id`, `perangkat_id` |

Catatan:

- `wajah_terdaftar.vector_data` punya `CHECK (JSON_LENGTH(vector_data) = 128)`.
- `absensi_log` unik per `(siswa_id, tanggal)` — satu catatan kehadiran per hari.
- `status` adalah `ENUM('Hadir','Terlambat','Izin','Sakit','Alpa')`.
- Semua tabel memakai InnoDB + `utf8mb4` agar aman untuk transaksi foreign key.

### Tabel `kelas` (tambahan)

Spesifikasi awal hanya menyebut kolom `siswa.kelas_id` dan `wali_kelas.kelas_id` tanpa
menyediakan tabel induknya. Tabel `kelas` ditambahkan agar kedua foreign key valid dan
data kelas tidak hanya berupa angka bebas.

## Cara Menjalankan

### 0. Prasyarat

Node.js 18+ dan MySQL/MariaDB (XAMPP) yang sudah **Start**. Setelah itu satu
perintah saja cukup:

```bash
npm run setup    # sekali saja: install dependency backend + frontend
npm run dev      # menyalakan backend (port 3000) dan frontend (port 5173) bersamaan
```

Buka `http://localhost:5173`. Output terminal nanti berlabel `[backend]` dan
`[frontend]` agar mudah dibedakan. `Ctrl+C` menghentikan keduanya.

| Perintah root | Fungsi |
| --- | --- |
| `npm run setup` | `npm install` untuk `backend/` lalu `frontend/` |
| `npm run dev` | Jalankan keduanya sekaligus |
| `npm run dev:backend` | Hanya backend (`node --watch`) |
| `npm run dev:frontend` | Hanya frontend (Vite) |
| `npm run build` | Build produksi frontend ke `frontend/dist` |
| `npm test` | 10 pemeriksaan service backend |

Kalau lebih suka dua terminal terpisah:

```bash
cd backend  && npm run dev    # API  : http://localhost:3000
cd frontend && npm run dev    # app  : http://localhost:5173
```

> `npm run dev` di folder `absensi-wajah/` gagal dengan `ENOENT package.json` kalau
> tidak ada `package.json` di root. File itu sudah disertakan.

### Kapan perlu dua proses

Keduanya wajib hidup bersamaan: Vite mem-proxy `/api` ke `localhost:3000`. Kalau
backend mati, halaman tetap terbuka tetapi semua panel akan menampilkan "Gagal memuat".

### 1. Database

```bash
# lewat XAMPP: Start MySQL, lalu jalankan sekali
mysql -u root -p < database/schema.sql
```

### 2. Backend

```bash
cd backend
npm install
```

Buat file `.env` di `backend/`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=absensi_wajah
DB_CONNECTION_LIMIT=10

# Notifikasi WhatsApp (opsional). Tanpa ini, absensi tetap berjalan normal.
WA_PROVIDER=fonnte          # fonnte | wablas
WA_TOKEN=token-dari-gateway
WA_URL=                     # opsional, ganti endpoint default
```

Jalankan:

```bash
npm run dev     # mode pengembangan (node --watch)
npm start       # mode produksi
npm test        # 10 pemeriksaan service (faceEncoder, detector, liveness, matcher, jadwal, WA)
```

`src/config/database.js` mengekspor `pool` (untuk transaksi), `query(sql, params)`
untuk query ber-parameter, dan `testConnection()` untuk mengecek koneksi saat boot.

Tabel `perangkat_absen` harus diisi sebelum `/api/absensi/scan` bisa dipakai —
`secret_key` sengaja tidak ada nilai default demi keamanan:

```sql
INSERT INTO perangkat_absen (nama_perangkat, lokasi, secret_key)
VALUES ('Kamera Gerbang Utama', 'Pintu depan sekolah', 'rahasia-123');
```

Nilai `secret_key` itu harus sama dengan `VITE_PERANGKAT_SECRET` di `frontend/.env`
supaya perangkat dikenali. Kalau berbeda, `/api/absensi/scan` menjawab `401`.

#### Data awal

Agar aplikasi langsung bisa dicoba, isi minimal ini lewat SQL (belum ada
endpoint untuk menambah kelas, guardu, dan mapel):

```sql
INSERT INTO kelas (nama_kelas, tingkat, tahun_ajaran)
VALUES ('X IPA 1', 10, '2026/2027'), ('X IPA 2', 10, '2026/2027');

INSERT INTO mata_pelajaran (kode_mapel, nama_mapel) VALUES ('MTK', 'Matematika');

INSERT INTO guru (nip, nama, email) VALUES ('198501012010011001', 'Budi Santoso, S.Pd', 'wali@sch.id');
INSERT INTO wali_kelas (guru_id, kelas_id, tahun_ajaran)
SELECT g.id, k.id, k.tahun_ajaran FROM guru g, kelas k
WHERE g.email = 'wali@sch.id' AND k.nama_kelas = 'X IPA 1';
```

#### Soal status Hadir / Terlambat

Status ditentukan dari jam database (`CURTIME()`), bukan jam browser. Kalau semua
siswa tercatat `Terlambat`, periksa dulu jam sistem:

```sql
SELECT NOW(), UTC_TIMESTAMP();   -- selisihnya harus 7 jam untuk WIB
```

Jam masuk sekolah ada di `src/services/jadwalCalculator.js` sebagai `JAM_MASUK`
(default `07:00`) dan toleransinya `BATAS_TERLAMBAT_MENIT` (default 15 menit).

### 3. Frontend (React + Vite + Tailwind)

```bash
cd frontend
npm install          # postinstall otomatis menyalin model face-api ke public/models
npm run dev          # http://localhost:5173
npm run build        # produksi -> dist/
```

Vite mem-proxy `/api` ke `http://localhost:3000`, jadi tidak ada CORS saat dev. Untuk
deploy, set `VITE_API_URL` (lihat `.env` di `frontend/`).

Opsi environment:

```env
VITE_API_URL=http://localhost:3000
VITE_PERANGKAT_SECRET=secret-dari-tabel-perangkat_absen
```

> `VITE_PERANGKAT_SECRET` ikut ter-bundle ke browser. Untuk produksi, pindahkan
> verifikasi perangkat ke backend-for-frontend agar secret tidak bocor.

#### Yang berjalan di browser vs di server

| Dilakukan di browser (`@vladmandic/face-api`) | Dilakukan di backend |
| --- | --- |
| Akses kamera lewat `getUserMedia` | Pencocokan vektor (threshold 0.4) |
| Deteksi wajah + landmark 68 | Pencatatan ke `absensi_log` |
| Hitung Eye Aspect Ratio untuk deteksi kedip | Status Hadir / Terlambat |
| Descriptor wajah 128 float | Notifikasi WhatsApp |

Gambar **tidak pernah** dikirim untuk diproses ML; yang dikirim hanya array 128
angka. `foto_bukti` bersifat opsional sebagai bukti kehadiran.

#### Pendaftaran terpadu

Satu form di *Pendaftaran Wajah* mengirim data siswa **dan** vektor wajahnya sekaligus
ke `POST /api/pendaftaran/siswa-wajah`. Backend membungkusnya dalam satu transaksi:
kalau vektor gagal, siswa juga tidak jadi — jadi tidak mungkin ada siswa tanpa wajah.
Orang tua dibuat ulang hanya bila nomor WhatsApp-nya belum terdaftar, sehingga anak
kedua dari orang tua yang sama tidak menduplikasi data.

Syarat: minimal **3** sampel vektor per siswa (frontend menampilkan `3/3`, maksimal 5).

#### Inisialisasi TensorFlow (penting)

face-api **tidak** memanggil `tf.ready()` sendiri. Tanpa itu, model tetap termuat
(kamera dan status "aktif" terlihat normal) tetapi setiap proses deteksi melempar
`Backend '...' has not yet been initialized` — dan tanpa penangkap error yang
menampilkan pesannya, gejalanya hanya "kamera hidup tapi wajah tidak pernah terdeteksi".

`muatModel()` di `faceApi.js` karena itu menjalankan:

```js
await tf.setBackend('webgl');   // fallback ke 'cpu' bila WebGL tidak tersedia
await tf.ready();
```

Error deteksi juga **tidak lagi ditelan** `catch {}`. `useWebcamFace` mengembalikan
`galatDeteksi` yang tampil sebagai banner merah di atas kamera, plus chip diagnostik
(backend tfjs, jumlah wajah, skor, durasi inferensi). Kalau deteksi gagal, alasannya
terlihat di halaman — bukan perlu membuka console.

#### Pengambilan sampel wajah otomatis

Halaman *Pendaftaran Wajah* mengambil sampel tanpa operator menekan apa pun:

| Tahap | Pemicu | Arahan di kamera |
| --- | --- | --- |
| Cari | belum ada wajah | "Posisikan wajah di tengah bingkai" |
| Siap | wajah terdeteksi, belum diam | "Hadap kamera, lalu diam sebentar" |
| Hitung | wajah diam ≥ 5 frame (~1 detik) | "Tahan posisi ini… 3 → 2 → 1" |
| Simpan | hitungan selesai | "✓ Sampel n/5 tersimpan" |

Syarat ambil sampel adalah **kestabilan kotak wajah** antar-frame (`geserKotak` —
pergerakan dinormalkan lebar kotak, ambang `MAKS_GESER = 0.08`), bukan sekadar
"wajah terdeteksi". Jadi siswa yang sedang geleng tidak memicu sampel.

Tombol **Ambil Manual** tetap ada sebagai jaring pengaman. Ada jeda 1,4 detik
setiap sampel supaya siswa sempat bergeser posisi, dan untuk sampel ke-4/5 layar
menampilkan instruksi variasi sudut ("geser sedikit ke kiri", dst.) — vektor yang
beragam membuat pencocokan lebih akurat.

#### Overlay kamera (canvas)

Kotak wajah digambar di `<canvas>` yang menumpuk di atas video
(`absolute top-0 left-0 w-full h-full pointer-events-none`). Alurnya:

1. `faceapi.matchDimensions(canvas, displaySize)` menyamakan ukuran canvas dengan
   ukuran **tampilan** (video di-`scale` + dicerminkan).
2. `faceapi.resizeResults(detections, displaySize)` memetakan koordinat piksel video
   asli ke piksel tampilan.
3. `gambarOverlay()` menggambar bingkai tipis + empat sudut HUD + label skor.

Karena video dicerminkan, koordinat X dibalik sebelum digambar supaya kotak muncul di
sisi yang sama dengan wajah.

> Warna HUD ada di token `--hud-*` dan sengaja ditulis **hex**, bukan OKLCH:
> `ctx.strokeStyle` tidak bisa membaca fungsi warna OKLCH dan akan diam-diam memakai
> warna sebelumnya.

#### Kecepatan pemindaian

| Setelan | Nilai | Alasan |
| --- | --- | --- |
| `UKURAN_INPUT` | `224` | Deteksi 2,4× lebih cepat dari 320, cukup untuk kiosk |
| `SKOR_DETEKSI_MIN` | `0.5` | Wajah lebih mudah ditemukan walau kurang ideal |
| `SKOR_SIAP_KIRIM` | `0.7` | Backend menolak < 0.7, jadi yang di bawah itu tidak dikirim |
| `jedaMs` | `200` | Batas frekuensi; lebih cepat bikin tab berat tanpa hasil lebih baik |

Efek: `inputSize` turun ke 224 membuat deteksi ~2,4× lebih cepat dibanding 320, dan
throttle 200 ms menjaga tab tetap mulus. Kotak yang kurang dari 0,7 tidak dikirim,
jadi tidak ada request yang pasti ditolak backend.

#### Komponen

| Komponen | Peran |
| --- | --- |
| `components/KameraAbsen.jsx` | Pemindai kiosk. Validasi liveness, kirim vektor, tampilkan hasil. |
| `components/FormPendaftaranWajah.jsx` | Ambil 5 sampel descriptor dari sudut wajah berbeda. |
| `components/HasilAbsen.jsx` | Dialog hasil absensi (sukses/gagal), fokus di dalam, Escape menutup. |
| `components/TabelAbsensi.jsx` | Riwayat kehadiran. Tabel di desktop, kartu di mobile. |
| `components/GrafikKehadiran.jsx` | Batang bertumpuk SVG per tanggal, tanpa library chart. |

#### Halaman & routing

| Rute | Halaman | Isi |
| --- | --- | --- |
| `#/absen` | `pages/TitikAbsen.jsx` | Kiosk pemindaian. Daftar hadir hari ini di samping kamera, muat ulang setelah tiap scan. |
| `#/pendaftaran` | `pages/PendaftaranWajah.jsx` | Dua langkah: pilih/daftarkan siswa, lalu ambil sampel wajahnya. Orang tua dipakai ulang bila nomor WhatsApp sama. |
| `#/riwayat` | `pages/RiwayatAbsensi.jsx` | Tabel kehadiran per tanggal & kelas, polling otomatis tiap 30 detik. |
| `#/laporan` | `pages/Laporan.jsx` | Rekap bulanan per tanggal, ringkasan per status, dan nama wali kelas. |

Routing memakai **HashRouter**. Alasannya: frontend disajikan sebagai berkas statis
oleh Apache/XAMPP tanpa rewrite, jadi `/#/laporan` tetap bisa di-refresh tanpa 404.
Kalau nanti backend juga melayani SPA-nya, ganti ke `BrowserRouter` di `App.jsx`.

Filter tanggal dan periode memakai `<input type="date">` / `<input type="month">`
bawaan browser — tidak ada pustaka kalender.

Ringkasan status di `Laporan.jsx` memakai kelas warna dari `lib/statusAbsensi.js`,
supaya tabel dan grafik tidak berbeda warna untuk status yang sama.

| Berkas | Alasan |
| --- | --- |
| `services/faceApi.js` | Satu-satunya tempat yang memuat `@vladmandic/face-api` (deteksi, landmark, EAR, descriptor). |
| `hooks/useWebcamFace.js` | Siklus hidup kamera + loop deteksi, dipakai KameraAbsen dan FormPendaftaranWajah agar tidak ditulis dua kali. |
| `lib/statusAbsensi.js` | Peta status absensi ke token warna, dipakai tabel dan grafik. |

#### Model face-api

`npm install` menyalin model dari `node_modules/@vladmandic/face-api/model` ke
`public/models`. Hanya tiga yang dipakai:

| Model | Ukuran | Untuk |
| --- | --- | --- |
| `tiny_face_detector` | 190 KB | Deteksi wajah |
| `face_landmark_68` | 349 KB | Landmark untuk Eye Aspect Ratio |
| `face_recognition` | 6,1 MB | Descriptor 128 float |

Hapus model yang tidak dipakai (`ssd_mobilenetv1`, `age_gender`, `face_expression`)
untuk menghemat ~6,4 MB di `dist/`.

> Kamera hanya jalan di `localhost` atau **HTTPS**. Di LAN biasa (`http://192.168.x.x`)
> `getUserMedia` ditolak browser. Pakai HTTPS saat deployment.

## Konvensi API

Semua prefix `/api`. Respons error selalu `{ "message": "..." }`.

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| GET | `/health` | Cek status API + koneksi DB |
| GET | `/api/pendaftaran/siswa?kelas_id=` | Daftar siswa (+ nama kelas & orang tua) |
| POST | `/api/pendaftaran/siswa` | Tambah siswa |
| GET/PUT/DELETE | `/api/pendaftaran/siswa/:id` | Detail / ubah / hapus siswa |
| GET | `/api/pendaftaran/guru` | Daftar guru (+ mapel & kelas yang diwali) |
| POST | `/api/pendaftaran/guru` | Tambah guru |
| PUT/DELETE | `/api/pendaftaran/guru/:id` | Ubah / hapus guru |
| GET/POST | `/api/pendaftaran/ortu` | Daftar / tambah orang tua |
| GET/POST | `/api/pendaftaran/mapel` | Daftar / tambah mata pelajaran |
| GET | `/api/pendaftaran/kelas` | Daftar kelas + nama wali kelas |
| POST | `/api/auth/login` | Masuk dashboard. Body `{username, password}` → `{token, pengguna}` |
| GET | `/api/auth/saya` | Validasi token yang tersimpan di browser |

### Keamanan: mana yang perlu login

| Endpoint | Akses |
| --- | --- |
| `/api/auth/*` | Login terbuka; `/saya` butuh token |
| `/api/pendaftaran/*`, `/api/laporan/*` | Wajib login (Bearer token) |
| `/api/absensi/perangkat` (GET/POST/DELETE) | Wajib login |
| `/api/absensi/scan`, `/hari-ini`, `/siswa/:id` | Terbuka — kiosk memindai dengan `secret_key` perangkat, bukan akun |
| `/health` | Terbuka |

Password disimpan sebagai scrypt (`salt:hash`), token stateless bertanda tangan HMAC
(`node:crypto`, tanpa dependency tambahan). Set `AUTH_SECRET` di `backend/.env`;
kalau kosong, kunci acak dibuat tiap boot dan semua sesi gugur saat restart.

Akun awal:

| Username | Password | Peran |
| --- | --- | --- |
| `admin` | `admin123` | admin |
| `guru` | `guru123` | guru |

> Ganti password kedua akun ini sebelum dipakai di sekolah sungguhan.

### Layout aplikasi

Dua layout terpisah di `App.jsx`:

| Layout | Rute | Tampilan |
| --- | --- | --- |
| **Kiosk** | `/absen` | Layar penuh, tanpa sidebar, tanpa login. Scanner HUD dengan target frame, garis pemindai, dan kartu profil realtime. |
| **Admin** | `/dashboard`, `/master/*`, `/pendaftaran`, `/riwayat`, `/laporan`, `/perangkat` | Sidebar + header, dibungkus `ProtectedRoute` |

Menambah data siswa ada di **Data Master → Siswa**; halaman *Pendaftaran Wajah* khusus
menempelkan sampel wajah pada siswa yang sudah ada, supaya tidak ada dua form siswa
yang harus dirawat dua kali.
| POST | `/api/pendaftaran/siswa-wajah` | **Form terpadu**: `{ nisn, nama, kelas_id, nama_ortu, no_whatsapp, vectors }` — siswa + semua sampel wajah dalam satu transaksi |
| POST | `/api/pendaftaran/wajah` | Tambah sampel wajah ke siswa yang sudah ada |
| GET | `/api/pendaftaran/wajah/siswa/:siswaId` | Sampel wajah seorang siswa |
| DELETE | `/api/pendaftaran/wajah/siswa/:siswaId` | Hapus semua sampel wajah siswa |
| DELETE | `/api/pendaftaran/wajah/:id` | Hapus satu sampel |
| POST | `/api/absensi/scan` | `{ vector: [128 float], perangkat_secret_key }` |
| GET | `/api/absensi/hari-ini?kelas_id=` | Rekap kehadiran hari ini |
| GET | `/api/absensi/perangkat` | Daftar perangkat absen |
| GET | `/api/absensi/siswa/:siswaId?dari=&sampai=` | Riwayat kehadiran siswa |
| GET | `/api/laporan/harian?tanggal=&kelas_id=` | Rekap harian |
| GET | `/api/laporan/bulanan?tahun=&bulan=&kelas_id=` | Rekap bulanan |
| GET | `/api/laporan/siswa/:siswaId?tahun=&bulan=` | Rekap per siswa |

Contoh scan absensi (deteksi + liveness **wajib** diisi, hasil analisis face-api di browser):

```bash
curl -X POST http://localhost:3000/api/absensi/scan \
  -H 'Content-Type: application/json' \
  -d '{
    "vector": [0.012, 0.987, "... total 128 float ..."],
    "deteksi":     { "jumlah_wajah": 1, "detection_score": 0.92 },
    "liveness":    { "liveness_score": 0.81, "kedip_terdeteksi": true },
    "perangkat_secret_key": "SECRET",
    "foto_bukti": "uploads/2026-10-17/andi.jpg"
  }'
```

### Kode error yang mungkin

| HTTP | Arti |
| --- | --- |
| 400 | Format vektor salah, atau metadata deteksi wajah tidak memenuhi syarat |
| 401 | `perangkat_secret_key` tidak dikenal / perangkat nonaktif |
| 403 | Gagal anti-spoofing: skor liveness rendah atau kedipan tidak terdeteksi |
| 404 | Wajah tidak dikenali (tidak ada vektor di bawah ambang 0.4) atau data tidak ada |
| 409 | Duplikat (NISN/NIP/email/WhatsApp) atau masih direferensikan tabel lain |
| 500 | Kesalahan lain (lihat log server) |

## Catatan Penting untuk Backend

- **`vector` divalidasi ketat** di setiap endpoint: harus array berisi tepat 128
  angka finite.
- **Jam dan tanggal selalu diambil dari database** (`CURDATE()` / `CURTIME()`), bukan
  jam lokal server. Pastikan jam server MariaDB disetel ke zona WIB — kalau tidak,
  semua catatan absensi akan salah jam.
- Kolom `DATE` / `DATETIME` dikembalikan sebagai **string** lewat opsi `dateStrings`
  di `database.js`. Jangan diubah menjadi objek `Date` tanpa memperhitungkan konversi
  zona waktu, karena tanggal akan bergeser sehari.
- **Autentikasi perangkat wajib** di `/api/absensi/scan` lewat `secret_key`. Isi
  tabel `perangkat_absen` dari dashboard admin; jangan pakai secret default.
- Pencocokan wajah memindai **seluruh vektor secara linear** di tiap scan — masih
  nyaman untuk ratusan siswa. Di atas ~500 siswa, ganti dengan index descriptor
  face-api atau approximate nearest neighbour.

## Catatan Keamanan

- `secret_key` perangkat tidak pernah dikirim ke frontend; hanya header token.
- Vektor wajah bersifat data biometrik — simpan di database privat, lakukan backup
  terenkripsi, dan jangan bagikan repo ini secara publik.
- Endpoint pembaruan data siswa/ortu perlu pembatasan akses (JWT) pada tahap
  berikutnya.
