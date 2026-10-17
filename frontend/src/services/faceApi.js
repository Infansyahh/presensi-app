/**
 * Satu-satunya berkas yang bicara dengan `@vladmandic/face-api`.
 *
 * Semua perhitungan berat (deteksi, landmark, descriptor, kedip) terjadi di
 * browser — backend hanya menerima array 128 float. Model diambil dari
 * /public/models (disalin otomatis oleh scripts/copy-models.mjs).
 */
import * as faceapi from '@vladmandic/face-api';

export const UKURAN_INPUT = 320;

/** Ambang di sisi client. Backend menolak di bawah 0.7, jadi jangan kurang dari itu. */
export const SKOR_DETEKSI_MIN = 0.7;

/** Eye Aspect Ratio di bawah ini dianggap mata tertutup, artinya berkedip. */
export const RASIO_MATA_TUTUP = 0.22;

/** Kedip dianggap sah bila mata tertutup dalam 4 detik terakhir. */
export const JEDA_KEDIP_MS = 4000;

// scoreThreshold adalah filter confidensi face-api. Disamakan dengan ambang
// backend (0.7) supaya tidak pernah mengirim skor yang pasti ditolak.
const OPSI = new faceapi.TinyFaceDetectorOptions({
  inputSize: UKURAN_INPUT,
  scoreThreshold: SKOR_DETEKSI_MIN,
});

let muatan = null;

/** Muat model sekali saja, lalu pakai hasil yang sama untuk seluruh aplikasi. */
export function muatModel() {
  if (muatan) return muatan;

  muatan = Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
  ])
    .then(() => true)
    .catch((galat) => {
      muatan = null; // biar percobaan berikutnya bisa mengulang
      throw new Error(`Gagal memuat model wajah: ${galat.message}`);
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