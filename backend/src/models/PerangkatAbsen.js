import { query } from '../config/database.js';

export const findAll = () => query('SELECT * FROM perangkat_absen ORDER BY nama_perangkat');

export const findById = async (id) => (await query('SELECT * FROM perangkat_absen WHERE id = ?', [id]))[0] ?? null;

/** Autentikasi perangkat absen pada endpoint scan. */
export const findBySecretKey = async (secretKey) =>
  secretKey ? (await query('SELECT * FROM perangkat_absen WHERE secret_key = ? AND aktif = 1', [secretKey]))[0] ?? null : null;

export const create = async ({ nama_perangkat, lokasi, secret_key }) => {
  const { insertId } = await query('INSERT INTO perangkat_absen (nama_perangkat, lokasi, secret_key) VALUES (?, ?, ?)', [
    nama_perangkat,
    lokasi,
    secret_key,
  ]);
  return findById(insertId);
};

export const remove = async (id) => (await query('DELETE FROM perangkat_absen WHERE id = ?', [id])).affectedRows;