import mysql from 'mysql2/promise';
import 'dotenv/config';

/**
 * Connection pool ke MySQL/MariaDB.
 * Konfigurasi dibaca dari .env (lihat docs/README.md).
 */
export const pool = mysql.createPool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'absensi_wajah',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT ?? 10),
  charset: 'utf8mb4_unicode_ci',
  timezone: '+07:00', // WIB
  // Kembalikan DATE/DATETIME/TIMESTAMP sebagai string apa adanya. Tanpa ini mysql2
  // membuat objek Date lalu JSON.stringify menggesernya ke UTC (tanggal meleset sehari).
  dateStrings: ['DATE', 'DATETIME', 'TIMESTAMP'],
});

/**
 * Jalankan query ber-parameter (prepared statement).
 * @param {string} sql
 * @param {Array<any>} params
 * @returns {Promise<any[]>} baris hasil query
 */
export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

/** Cek konektivitas, dipakai saat boot aplikasi. */
export async function testConnection() {
  const rows = await query('SELECT 1 AS ok');
  return rows[0]?.ok === 1;
}

export default pool;