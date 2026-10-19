/**
 * Satu-satunya berkas yang bicara dengan `@vladmandic/face-api`.
 *
 * Semua perhitungan berat (deteksi, landmark, descriptor, kedip) terjadi di
 * browser — backend hanya menerima array 128 float. Model diambil dari
 * /public/models (disalin otomatis oleh scripts/copy-models.mjs).
 */
import * as faceapi from '@vladmandic/face-api';

export const UKURAN_INPUT = 224;

/**
 * Ambang deteksi di sisi client. Sengaja 0.5 supaya wajah lebih mudah ditemukan,
 * termasuk saat kondisinya kurang ideal.
 */
export const SKOR_DETEKSI_MIN = 0.5;

/**
 * Ambang sebelum request dikirim. Backend (faceDetector) menolak skor di bawah
 * 0.7, jadi tidak ada gunanya mengirim yang pasti ditolak.
 */
export const SKOR_SIAP_KIRIM = 0.7;

/** Ear Aspect Ratio di bawah ini dianggap mata tertutup, artinya berkedip. */
export const RASIO_MATA_TUTUP = 0.22;

/** Kedip dianggap sah bila mata tertutup dalam 4 detik terakhir. */
export const JEDA_KEDIP_MS = 4000;

const OPSI = new faceapi.TinyFaceDetectorOptions({
  inputSize: UKURAN_INPUT,
  scoreThreshold: SKOR_DETEKSI_MIN,
});

let muatan = null;

/** Backend tfjs yang aktif — berguna untuk diagnosing di halaman. */
export const backendAktif = () => faceapi.tf?.backendName ?? '(belum siap)';

/**
 * Siapkan backend TensorFlow.
 *
 * WAJIB: face-api tidak memanggil tf.ready() sendiri. Tanpa ini, loadFromUri
 * tetap berhasil (kamera & model terlihat normal) tapi setiap proses deteksi
 * melempar "Backend ... has not yet been initialized". WebGL dicoba lebih dulu
 * karena jauh lebih cepat; CPU adalah jaring pengaman.
 */
async function siapkanBackend() {
  const tf = faceapi.tf;
  try {
    await tf.setBackend('webgl');
  } catch {
    await tf.setBackend('cpu');
  }
  await tf.ready();
}

/** Muat model sekali saja, lalu pakai hasil yang sama untuk seluruh aplikasi. */
export function muatModel() {
  if (muatan) return muatan;

  muatan = (async () => {
    await siapkanBackend();
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
      faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
    ]);
    await faceapi.tf.ready(); // pastikan semua graph terdaftar di backend aktif
    return true;
  })().catch((galat) => {
    muatan = null; // biar percobaan berikutnya bisa mengulang
    throw new Error(`Gagal menyiapkan deteksi wajah: ${galat.message}`);
  });

  return muatan;
}

/**
 * Deteksi wajah pada elemen video, lengkap dengan landmark dan descriptor.
 *
 * Pakai API chaining resmi face-api — versi ini tidak mengekspor fungsi
 * gabungan seperti `detectAllFacesLandmarksAndDescriptors`.
 */
export async function deteksiWajah(video) {
  return faceapi
    .detectAllFaces(video, OPSI)
    .withFaceLandmarks()
    .withFaceDescriptors();
}

const jarak = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Eye Aspect Ratio dari 6 landmark mata (p1..p6).
 * EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|). Makin kecil, makin tertutup.
 */
function rasioMata(landmark) {
  const penyebut = 2 * jarak(landmark[0], landmark[3]);
  if (penyebut === 0) return 1;
  return (jarak(landmark[1], landmark[5]) + jarak(landmark[2], landmark[4])) / penyebut;
}

/** Landmark 68: mata kanan indeks 36-41, mata kiri 42-47. Ambil yang paling tertutup. */
export function rasioMataDuaMata(landmark) {
  if (!landmark || landmark.length < 48) return 1;
  return Math.min(rasioMata(landmark.slice(36, 42)), rasioMata(landmark.slice(42, 48)));
}

/** Descriptor 128 float milik face-api, dalam bentuk array biasa. */
export function vektorDari(deteksi) {
  return Array.from(deteksi.descriptor);
}

/** Perpindahan kotak antar-frame, dinormalkan lebar kotak (1 = jauh, 0 = diam). */
export function geserKotak(sebelum, sesudah) {
  if (!sebelum || !sesudah) return Number.POSITIVE_INFINITY;
  const cx = (k) => k.x + k.width / 2;
  const cy = (k) => k.y + k.height / 2;
  const lebar = Math.max(1, (sebelum.width + sesudah.width) / 2);
  return Math.hypot(cx(sebelum) - cx(sesudah), cy(sebelum) - cy(sesudah)) / lebar;
}

/** Di bawah ambang ini wajah dianggap diam dan layak diambil sampelnya. */
export const MAKS_GESER = 0.08;

/**
 * Hasilnya ditampilkan di layar supaya masalah tidak lagi tak terlihat.
 * Hasilnya ditampilkan di layar supaya masalah tidak lagi tak terlihat.
 */
export async function probeDeteksi(video) {
  const mulai = performance.now();
  const hasil = await deteksiWajah(video);
  return {
    jumlah: hasil.length,
    skor: hasil.map((d) => Number((d.detection.score ?? 0).toFixed(3))),
    durasi: Math.round(performance.now() - mulai),
    backend: backendAktif(),
  };
}

/** Potret wajah sebagai blob untuk foto bukti. Mengembalikan null bila gagal. */
export function potretWajah(video, deteksi, canvas) {
  const kotak = deteksi?.detection?.box;
  if (!canvas || !kotak) return null;

  const pad = 0.15;
  const lebar = kotak.width * (1 + pad * 2);
  const tinggi = kotak.height * (1 + pad * 2);

  canvas.width = Math.max(1, Math.round(lebar));
  canvas.height = Math.max(1, Math.round(tinggi));
  canvas
    .getContext('2d')
    .drawImage(video, kotak.x - lebar * pad, kotak.y - tinggi * pad, lebar, tinggi, 0, 0, lebar, tinggi);

  return new Promise((selesai) => canvas.toBlob(selesai, 'image/jpeg', 0.8));
}

/**
 * Pelacak kedip. Menyimpan kapan mata terakhir tertutup supaya pengguna tidak
 * perlu menahan kedipan tepat pada saat tombol ditekan.
 */
export function buatPelacakKedip() {
  let terakhirTutup = 0;

  return {
    /** Dipanggil tiap frame. Mengembalikan EAR terkini. */
    amati(landmark) {
      const rasio = rasioMataDuaMata(landmark);
      if (rasio < RASIO_MATA_TUTUP) terakhirTutup = Date.now();
      return rasio;
    },
    get kedip_terdeteksi() {
      return Date.now() - terakhirTutup <= JEDA_KEDIP_MS;
    },
    get liveness_score() {
      return Date.now() - terakhirTutup <= JEDA_KEDIP_MS ? 0.9 : 0.1;
    },
  };
}

// ---------------------------------------------------------------- overlay HUD

/** Baca token hex dari :root; ctx tidak bisa dipakai untuk nilai OKLCH. */
function token(nama, cadangan) {
  if (typeof getComputedStyle !== 'function') return cadangan;
  const nilai = getComputedStyle(document.documentElement).getPropertyValue(nama).trim();
  return nilai || cadangan;
}

function warnaStatus(status) {
  if (status === 'sukses') return token('--color-hud-aktif', '#22c55e');
  if (status === 'mencari') return token('--color-hud-cari', '#38bdf8');
  if (status === 'galat') return token('--color-hud-kgagal', '#f59e0b');
  return token('--color-hud-dasar', '#64748b');
}

/** Empat sudut siku — bentuk "HUD", bukan kotak buram. */
function sikuSudut(ctx, x, y, w, h, panjang, tebal) {
  ctx.lineWidth = tebal;
  ctx.beginPath();
  ctx.moveTo(x, y + panjang);
  ctx.lineTo(x, y);
  ctx.lineTo(x + panjang, y);
  ctx.moveTo(x + w - panjang, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + panjang);
  ctx.moveTo(x + w, y + h - panjang);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w - panjang, y + h);
  ctx.moveTo(x + panjang, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + h - panjang);
  ctx.stroke();
}

/**
 * Gambar kotak deteksi HUD langsung ke canvas.
 *
 * Koordinat face-api dalam piksel video asli, sedangkan canvas berukuran tampilan
 * (video di-scale + dicerminkan). Jadi dicerminkan dulu, lalu diskalakan lewat
 * faceapi.resizeResults supaya kotak pas dengan yang dilihat pengguna.
 *
 * @param detections hasil faceapi (belum diskalakan)
 * @param opsi { status, label, cermin }
 */
export function gambarOverlay(canvas, detections, { status = 'netral', label = '', cermin = true } = {}) {
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const displaySize = { width: canvas.clientWidth, height: canvas.clientHeight };

  // Elemen belum ter-layout (mis. masih disembunyikan) — jangan menggambar apa pun.
  if (!displaySize.width || !displaySize.height) return;

  faceapi.matchDimensions(canvas, displaySize);
  const skala = faceapi.resizeResults(detections, displaySize);

  ctx.clearRect(0, 0, displaySize.width, displaySize.height);

  for (const d of skala) {
    const kotak = d.detection?.box;
    if (!kotak) continue;

    // Video dicerminkan (scale-x-[-1]); balik koordinat X agar kotak muncul
    // di sisi yang sama dengan wajah pada layar.
    const x = cermin ? displaySize.width - (kotak.x + kotak.width) : kotak.x;
    const y = kotak.y;
    const w = kotak.width;
    const h = kotak.height;
    const warna = warnaStatus(status);

    // Bingkai tipis.
    ctx.strokeStyle = warna;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    // Sudut tebal.
    ctx.globalAlpha = 1;
    ctx.strokeStyle = warna;
    sikuSudut(ctx, x, y, w, h, Math.min(w, h) * 0.24, 3);

    // Label skor.
    const skor = Math.round((d.detection.score ?? 0) * 100);
    const teks = label || `${skor}%`;
    ctx.font = '600 12px ui-monospace, monospace';
    const lebarTeks = ctx.measureText(teks).width + 12;
    const tinggiTeks = 18;
    const ty = Math.max(0, y - tinggiTeks);

    ctx.fillStyle = warna;
    ctx.fillRect(x, ty, lebarTeks, tinggiTeks);
    ctx.fillStyle = '#0f172a';
    ctx.textBaseline = 'middle';
    ctx.fillText(teks, x + 6, ty + tinggiTeks / 2);
  }

  ctx.globalAlpha = 1;
}