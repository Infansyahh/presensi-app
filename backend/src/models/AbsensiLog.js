import { query } from '../config/database.js';

const SELECT = `
  SELECT a.id, a.siswa_id, a.tanggal, a.waktu_masuk, a.waktu_keluar, a.status,
         a.confidence, a.foto_bukti, a.perangkat_id,
         s.nama AS siswa_nama, s.nisn, s.kelas_id, p.nama_perangkat
  FROM absensi_log a
  JOIN siswa s ON s.id = a.siswa_id
  LEFT JOIN perangkat_absen p ON p.id = a.perangkat_id`;

// Filter kelas opsional. SQL dan params HARUS tumbuh bersamaan: mysql2 tidak
// melempar error kalau ada param tanpa placeholder, tapi hasilnya diam-diam kosong.
// ponytail: kalau nanti butuh filter berjoins (mis. per tahun ajaran), kembangkan di sini.
const filterKelas = (kelasId) =>
  kelasId ? { sql: 'AND s.kelas_id = ?', params: [kelasId] } : { sql: '', params: [] };

// mysql2 menolak `undefined` sebagai bind param, jadi optional filter dinormalkan ke null.
export const findBySiswaTanggal = async (siswaId, tanggal) =>
  (await query(`${SELECT} WHERE a.siswa_id = ? AND a.tanggal = COALESCE(?, CURDATE())`, [siswaId, tanggal ?? null]))[0] ?? null;

export const findBySiswa = async (siswaId, { dari, sampai } = {}) =>
  query(
    `${SELECT} WHERE a.siswa_id = ? AND a.tanggal BETWEEN COALESCE(?, '1900-01-01') AND COALESCE(?, '2999-12-31')
     ORDER BY a.tanggal DESC, a.waktu_masuk DESC`,
    [siswaId, dari ?? null, sampai ?? null],
  );

/** Rekap harian: total per status + daftar hadir per siswa. */
export const rekapHarian = async ({ tanggal, kelas_id }) => {
  const t = tanggal ?? null;
  const k = filterKelas(kelas_id);
  const [total, rincian] = await Promise.all([
    query(
      `SELECT a.status, COUNT(*) AS jumlah FROM absensi_log a
       JOIN siswa s ON s.id = a.siswa_id
       WHERE a.tanggal = COALESCE(?, CURDATE()) ${k.sql}
       GROUP BY a.status`,
      [t, ...k.params],
    ),
    query(
      `${SELECT} WHERE a.tanggal = COALESCE(?, CURDATE()) ${k.sql} ORDER BY s.nama`,
      [t, ...k.params],
    ),
  ]);
  return { tanggal: t ?? '(hari ini)', total, rincian };
};

/** Rekap bulanan: total per tanggal + per status. */
export const rekapBulanan = async ({ tahun, bulan, kelas_id }) => {
  const k = filterKelas(kelas_id);
  const [total, harian] = await Promise.all([
    query(
      `SELECT a.status, COUNT(*) AS jumlah FROM absensi_log a
       JOIN siswa s ON s.id = a.siswa_id
       WHERE YEAR(a.tanggal) = ? AND MONTH(a.tanggal) = ? ${k.sql}
       GROUP BY a.status`,
      [tahun, bulan, ...k.params],
    ),
    query(
      `SELECT a.tanggal, a.status, COUNT(*) AS jumlah FROM absensi_log a
       JOIN siswa s ON s.id = a.siswa_id
       WHERE YEAR(a.tanggal) = ? AND MONTH(a.tanggal) = ? ${k.sql}
       GROUP BY a.tanggal, a.status ORDER BY a.tanggal`,
      [tahun, bulan, ...k.params],
    ),
  ]);
  return { periode: `${tahun}-${String(bulan).padStart(2, '0')}`, total, harian };
};

/**
 * Catat kehadiran. Scan ulang di hari yang sama memperbarui baris yang sudah ada
 * (UNIQUE siswa_id+tanggal) alih-alih gagal.
 */
export const upsert = async ({ siswa_id, tanggal, waktu_masuk, status, confidence, foto_bukti, perangkat_id }) => {
  await query(
    `INSERT INTO absensi_log (siswa_id, tanggal, waktu_masuk, status, confidence, foto_bukti, perangkat_id)
     VALUES (?, COALESCE(?, CURDATE()), ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       waktu_masuk = VALUES(waktu_masuk), status = VALUES(status),
       confidence = VALUES(confidence), foto_bukti = VALUES(foto_bukti),
       perangkat_id = VALUES(perangkat_id)`,
    [siswa_id, tanggal ?? null, waktu_masuk, status, confidence, foto_bukti ?? null, perangkat_id ?? null],
  );
  return findBySiswaTanggal(siswa_id, tanggal);
};