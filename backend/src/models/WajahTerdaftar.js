import { query } from '../config/database.js';
import { vektorDariJson } from '../services/faceEncoder.js';

// MariaDB menyimpan JSON sebagai LONGTEXT, jadi kolom bisa balik sebagai string
// (MySQL 8 sudah otomatis jadi array). vektorDariJson menutup keduanya.
const bentuk = (r) => ({ ...r, vector: vektorDariJson(r.vector_data) });

export const findBySiswa = async (siswaId) =>
  (await query('SELECT * FROM wajah_terdaftar WHERE siswa_id = ? ORDER BY id', [siswaId])).map(bentuk);

/** Semua vektor untuk pencocokan absensi. */
export const findAllVectors = async () =>
  (await query('SELECT siswa_id, vector_data FROM wajah_terdaftar')).map((r) => ({
    siswa_id: r.siswa_id,
    vector: vektorDariJson(r.vector_data),
  }));

/** Simpan beberapa sampel wajah siswa dalam satu INSERT. */
export const createBatch = async (siswaId, vectors) => {
  const rows = vectors.map(() => '(?, ?, ?)').join(', ');
  const params = vectors.flatMap((v, i) => [siswaId, JSON.stringify(v), `sampel-${i + 1}`]);
  await query(`INSERT INTO wajah_terdaftar (siswa_id, vector_data, label) VALUES ${rows}`, params);
  return vectors.length;
};

export const remove = async (id) =>
  (await query('DELETE FROM wajah_terdaftar WHERE id = ?', [id])).affectedRows;

export const removeBySiswa = async (siswaId) =>
  (await query('DELETE FROM wajah_terdaftar WHERE siswa_id = ?', [siswaId])).affectedRows;