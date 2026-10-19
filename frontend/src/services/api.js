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

const KUNCI_TOKEN = 'absensi.token';

/** Token sesi dashboard. Disimpan di localStorage supaya tidak hilang saat refresh. */
export const ambilToken = () => localStorage.getItem(KUNCI_TOKEN) ?? '';
export const simpanToken = (token) => localStorage.setItem(KUNCI_TOKEN, token);
export const buangToken = () => localStorage.removeItem(KUNCI_TOKEN);

// Setiap request ke /api/* otomatis membawa "Authorization: Bearer <token>".
api.interceptors.request.use((konfigurasi) => {
  const token = ambilToken();
  if (token) konfigurasi.headers.Authorization = `Bearer ${token}`;
  return konfigurasi;
});

api.interceptors.response.use(
  (respons) => respons,
  (error) => {
    error.pesan =
      error.response?.data?.message ??
      (error.code === 'ECONNABORTED' ? 'Server tidak merespons (timeout)' : error.message) ??
      'Permintaan gagal';

    // Sesi gugur (401) -> paksa keluar supaya ProtectedRoute ikut menavigasi.
    if (error.response?.status === 401 && location.pathname !== '/login') {
      buangToken();
      window.dispatchEvent(new Event('absensi:keluar'));
    }
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

export const authApi = {
  masuk: async (username, password) => {
    const hasil = await api.post('/api/auth/login', { username, password }).then(data);
    simpanToken(hasil.token);
    return hasil.pengguna;
  },
  sesi: () => api.get('/api/auth/saya').then(data).then((r) => r.pengguna),
  keluar: () => {
    buangToken();
    window.dispatchEvent(new Event('absensi:keluar'));
  },
};

export const dashboardApi = {
  harian: (params) => api.get('/api/laporan/harian', { params }).then(data),
  bulanan: (params) => api.get('/api/laporan/bulanan', { params }).then(data),
  siswa: (id, params) => api.get(`/api/laporan/siswa/${id}`, { params }).then(data),
};

export const absensiApi = {
  scan: (payload) => api.post('/api/absensi/scan', payload).then(data),
  hariIni: (params) => api.get('/api/absensi/hari-ini', { params }).then(data),
  riwayatSiswa: (id, params) => api.get(`/api/absensi/siswa/${id}`, { params }).then(data),
};

export const perangkatApi = {
  daftar: () => api.get('/api/absensi/perangkat').then(data),
  buat: (payload) => api.post('/api/absensi/perangkat', payload).then(data),
  hapus: (id) => api.delete(`/api/absensi/perangkat/${id}`).then(data),
};

export const pendaftaranApi = {
  daftarSiswa: (params) => api.get('/api/pendaftaran/siswa', { params }).then(data),
  buatSiswa: (payload) => api.post('/api/pendaftaran/siswa', payload).then(data),
  ubahSiswa: (id, payload) => api.put(`/api/pendaftaran/siswa/${id}`, payload).then(data),
  hapusSiswa: (id) => api.delete(`/api/pendaftaran/siswa/${id}`).then(data),

  daftarGuru: () => api.get('/api/pendaftaran/guru').then(data),
  buatGuru: (payload) => api.post('/api/pendaftaran/guru', payload).then(data),
  ubahGuru: (id, payload) => api.put(`/api/pendaftaran/guru/${id}`, payload).then(data),
  hapusGuru: (id) => api.delete(`/api/pendaftaran/guru/${id}`).then(data),

  daftarKelas: () => api.get('/api/pendaftaran/kelas').then(data),
  daftarOrtu: () => api.get('/api/pendaftaran/ortu').then(data),
  buatOrtu: (payload) => api.post('/api/pendaftaran/ortu', payload).then(data),
  daftarMapel: () => api.get('/api/pendaftaran/mapel').then(data),
  buatMapel: (payload) => api.post('/api/pendaftaran/mapel', payload).then(data),

  /** Form terpadu: data siswa + vektor wajah, satu transaksi di backend. */
  simpanSiswaWajah: (payload) => api.post('/api/pendaftaran/siswa-wajah', payload).then(data),
  simpanWajah: (siswaId, vectors) => api.post('/api/pendaftaran/wajah', { siswa_id: siswaId, vectors }).then(data),
  wajahSiswa: (siswaId) => api.get(`/api/pendaftaran/wajah/siswa/${siswaId}`).then(data),
  hapusWajahSiswa: (siswaId) => api.delete(`/api/pendaftaran/wajah/siswa/${siswaId}`).then(data),
};

export default api;