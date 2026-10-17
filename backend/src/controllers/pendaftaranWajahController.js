import { query } from '../config/database.js';
import * as Siswa from '../models/Siswa.js';
import * as Guru from '../models/Guru.js';
import * as WajahTerdaftar from '../models/WajahTerdaftar.js';
import { isValidVector } from '../services/faceEncoder.js';

const bad = (res, message) => res.status(400).json({ message });
const notFound = (res, message) => res.status(404).json({ message });

// ---------------------------------------------------------------- Siswa
export async function listSiswa(req, res) {
  res.json(await Siswa.findAll(req.query.kelas_id));
}

export async function getSiswa(req, res) {
  const siswa = await Siswa.findById(req.params.id);
  if (!siswa) return notFound(res, 'Siswa tidak ditemukan');
  res.json(siswa);
}

export async function createSiswa(req, res) {
  const { nisn, nama, kelas_id, ortu_id } = req.body;
  if (!nisn || !nama || !kelas_id) return bad(res, 'nisn, nama, dan kelas_id wajib diisi');
  res.status(201).json(await Siswa.create({ nisn, nama, kelas_id, ortu_id }));
}

export async function updateSiswa(req, res) {
  const siswa = await Siswa.update(req.params.id, req.body);
  if (!siswa) return notFound(res, 'Siswa tidak ditemukan');
  res.json(siswa);
}

export async function deleteSiswa(req, res) {
  if ((await Siswa.remove(req.params.id)) === 0) return notFound(res, 'Siswa tidak ditemukan');
  res.status(204).end();
}

// ---------------------------------------------------------------- Guru
export async function listGuru(req, res) {
  res.json(await Guru.findAll());
}

export async function createGuru(req, res) {
  const { nip, nama, email, mapel_id } = req.body;
  if (!nip || !nama || !email) return bad(res, 'nip, nama, dan email wajib diisi');
  res.status(201).json(await Guru.create({ nip, nama, email, mapel_id }));
}

export async function updateGuru(req, res) {
  const guru = await Guru.update(req.params.id, req.body);
  if (!guru) return notFound(res, 'Guru tidak ditemukan');
  res.json(guru);
}

export async function deleteGuru(req, res) {
  if ((await Guru.remove(req.params.id)) === 0) return notFound(res, 'Guru tidak ditemukan');
  res.status(204).end();
}

// ------------------------------------------- Orang Tua & Mata Pelajaran
// Tanpa file model sendiri: query-nya satu-duanya, tidak perlu lapisan abstraksi.
export async function listKelas(req, res) {
  res.json(
    await query(
      `SELECT k.id, k.nama_kelas, k.tingkat, k.tahun_ajaran, g.nama AS wali_kelas
       FROM kelas k
       LEFT JOIN wali_kelas w ON w.kelas_id = k.id
       LEFT JOIN guru g ON g.id = w.guru_id
       ORDER BY k.tingkat, k.nama_kelas`,
    ),
  );
}

export async function listOrtu(req, res) {
  res.json(await query('SELECT * FROM orang_tua ORDER BY nama_ortu'));
}

export async function createOrtu(req, res) {
  const { nama_ortu, no_whatsapp, email } = req.body;
  if (!nama_ortu || !no_whatsapp) return bad(res, 'nama_ortu dan no_whatsapp wajib diisi');
  const { insertId } = await query('INSERT INTO orang_tua (nama_ortu, no_whatsapp, email) VALUES (?, ?, ?)', [
    nama_ortu,
    no_whatsapp,
    email ?? null,
  ]);
  const [ortu] = await query('SELECT * FROM orang_tua WHERE id = ?', [insertId]);
  res.status(201).json(ortu);
}

export async function listMapel(req, res) {
  res.json(await query('SELECT * FROM mata_pelajaran ORDER BY nama_mapel'));
}

export async function createMapel(req, res) {
  const { kode_mapel, nama_mapel } = req.body;
  if (!kode_mapel || !nama_mapel) return bad(res, 'kode_mapel dan nama_mapel wajib diisi');
  const { insertId } = await query('INSERT INTO mata_pelajaran (kode_mapel, nama_mapel) VALUES (?, ?)', [
    kode_mapel,
    nama_mapel,
  ]);
  const [mapel] = await query('SELECT * FROM mata_pelajaran WHERE id = ?', [insertId]);
  res.status(201).json(mapel);
}

// ------------------------------------------------ Registrasi vektor wajah
export async function createWajah(req, res) {
  const { siswa_id, vectors } = req.body;
  if (!siswa_id) return bad(res, 'siswa_id wajib diisi');
  if (!Array.isArray(vectors) || vectors.length === 0) return bad(res, 'vectors harus array dan tidak boleh kosong');

  const salah = vectors.findIndex((v) => !isValidVector(v));
  if (salah !== -1) return bad(res, `vectors[${salah}] bukan array 128 float yang valid`);

  res.status(201).json({ siswa_id, jumlah: await WajahTerdaftar.createBatch(siswa_id, vectors) });
}

export async function listWajah(req, res) {
  res.json(await WajahTerdaftar.findBySiswa(req.params.siswaId));
}

export async function deleteWajah(req, res) {
  if ((await WajahTerdaftar.remove(req.params.id)) === 0) return notFound(res, 'Data wajah tidak ditemukan');
  res.status(204).end();
}

export async function deleteWajahSiswa(req, res) {
  res.json({ terhapus: await WajahTerdaftar.removeBySiswa(req.params.siswaId) });
}