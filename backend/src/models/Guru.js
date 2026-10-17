import { query } from '../config/database.js';

const SELECT = `
  SELECT g.id, g.nip, g.nama, g.email, g.mapel_id, g.created_at,
         m.kode_mapel, m.nama_mapel,
         w.kelas_id AS wali_kelas_id, k.nama_kelas AS wali_kelas
  FROM guru g
  LEFT JOIN mata_pelajaran m ON m.id = g.mapel_id
  LEFT JOIN wali_kelas w ON w.guru_id = g.id
  LEFT JOIN kelas k ON k.id = w.kelas_id`;

export const findAll = () => query(`${SELECT} ORDER BY g.nama`);

export const findById = async (id) => (await query(`${SELECT} WHERE g.id = ?`, [id]))[0] ?? null;

export const create = async ({ nip, nama, email, mapel_id = null }) => {
  const { insertId } = await query('INSERT INTO guru (nip, nama, email, mapel_id) VALUES (?, ?, ?, ?)', [
    nip,
    nama,
    email,
    mapel_id,
  ]);
  return findById(insertId);
};

export const update = async (id, fields) => {
  const cols = ['nip', 'nama', 'email', 'mapel_id'].filter((c) => fields[c] !== undefined);
  if (cols.length > 0) {
    await query(`UPDATE guru SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`, [
      ...cols.map((c) => fields[c]),
      id,
    ]);
  }
  return findById(id);
};

export const remove = async (id) => (await query('DELETE FROM guru WHERE id = ?', [id])).affectedRows;