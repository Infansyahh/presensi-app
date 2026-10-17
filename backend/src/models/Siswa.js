import { query } from '../config/database.js';

const SELECT = `
  SELECT s.id, s.nisn, s.nama, s.kelas_id, s.ortu_id, s.aktif, s.created_at,
         k.nama_kelas, o.nama_ortu, o.no_whatsapp
  FROM siswa s
  LEFT JOIN kelas k ON k.id = s.kelas_id
  LEFT JOIN orang_tua o ON o.id = s.ortu_id`;

export const findAll = (kelasId) =>
  query(`${SELECT} ${kelasId ? 'WHERE s.kelas_id = ?' : ''} ORDER BY s.nama`, kelasId ? [kelasId] : []);

export const findById = async (id) => (await query(`${SELECT} WHERE s.id = ?`, [id]))[0] ?? null;

export const create = async ({ nisn, nama, kelas_id, ortu_id = null }) => {
  const { insertId } = await query('INSERT INTO siswa (nisn, nama, kelas_id, ortu_id) VALUES (?, ?, ?, ?)', [
    nisn,
    nama,
    kelas_id,
    ortu_id,
  ]);
  return findById(insertId);
};

// Kolom yang boleh diubah berasal dari daftar tetap di bawah, bukan dari input user.
export const update = async (id, fields) => {
  const cols = ['nisn', 'nama', 'kelas_id', 'ortu_id'].filter((c) => fields[c] !== undefined);
  if (cols.length > 0) {
    await query(`UPDATE siswa SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`, [
      ...cols.map((c) => fields[c]),
      id,
    ]);
  }
  return findById(id);
};

export const remove = async (id) => (await query('DELETE FROM siswa WHERE id = ?', [id])).affectedRows;