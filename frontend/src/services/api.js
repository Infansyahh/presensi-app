import axios from 'axios';

/**
 * Klien API untuk backend Sistem Absensi Wajah.
 *
 * Base URL kosong di mode dev karena Vite mem-proxy /api ke localhost:3000
 * (lihat vite.config.js). Untuk deploy, set VITE_API_URL.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  timeout: 20_000,
});

/** Backend selalu menjawab error dengan { message }. Normalisasi ke `error.pesan`. */
api.interceptors.response.use(
  (respons) => respons,
  (error) => {
    error.pesan =
      error.response?.data?.message ??
      (error.code === 'ECONNABORTED' ? 'Server tidak merespons (timeout)' : error.message) ??
      'Permintaan gagal';
    return Promise.reject(error);
  },
);

const data = (respons) => respons.data;

/** Secret perangkat. Di produksi jangan taruh di VITE_* — pakai backend-for-frontend. */
export const SECRET_PERANGKAT = import.meta.env.VITE_PERANGKAT_SECRET ?? '';

/**
 * Susun payload /api/absensi/scan sesuai kontrak backend:
 * faceEncoder 400 · faceDetector 400 · livenessCheck 403 · perangkat 401.
 */
export function payloadScan({ vector, deteksi, liveness, fotoBukti, perangkatSecret = SECRET_PERANGKAT }) {
  return {
    vector,
    deteksi: {
      jumlah_wajah: deteksi.jumlah_wajah,
      detection_score: Number(deteksi.score?.toFixed(3)),
    },
    liveness: {
      liveness_score: Number(liveness.liveness_score?.toFixed(3)),
      kedip_terdeteksi: liveness.kedip_terdeteksi,
    },
    perangkat_secret_key: perangkatSecret,
    foto_bukti: fotoBukti ?? null,
  };
}

export const absensiApi = {
  scan: (payload) => api.post('/api/absensi/scan', payload).then(data),
  hariIni: (params) => api.get('/api/absensi/hari-ini', { params }).then(data),
  perangkat: () => api.get('/api/absensi/perangkat').then(data),
  riwayatSiswa: (id, params) => api.get(`/api/absensi/siswa/${id}`, { params }).then(data),
};

export const pendaftaranApi = {
  daftarSiswa: () => api.get('/api/pendaftaran/siswa').then(data),
  buatSiswa: (payload) => api.post('/api/pendaftaran/siswa', payload).then(data),
  daftarGuru: () => api.get('/api/pendaftaran/guru').then(data),
  daftarKelas: () => api.get('/api/pendaftaran/kelas').then(data),
  daftarOrtu: () => api.get('/api/pendaftaran/ortu').then(data),
  buatOrtu: (payload) => api.post('/api/pendaftaran/ortu', payload).then(data),
  daftarMapel: () => api.get('/api/pendaftaran/mapel').then(data),
  simpanWajah: (siswaId, vectors) => api.post('/api/pendaftaran/wajah', { siswa_id: siswaId, vectors }).then(data),
  wajahSiswa: (siswaId) => api.get(`/api/pendaftaran/wajah/siswa/${siswaId}`).then(data),
  hapusWajahSiswa: (siswaId) => api.delete(`/api/pendaftaran/wajah/siswa/${siswaId}`).then(data),
};

export const laporanApi = {
  harian: (params) => api.get('/api/laporan/harian', { params }).then(data),
  bulanan: (params) => api.get('/api/laporan/bulanan', { params }).then(data),
  siswa: (id, params) => api.get(`/api/laporan/siswa/${id}`, { params }).then(data),
};

export default api;