import { query } from '../config/database.js';
import * as AbsensiLog from '../models/AbsensiLog.js';
import * as PerangkatAbsen from '../models/PerangkatAbsen.js';
import * as WajahTerdaftar from '../models/WajahTerdaftar.js';
import { ambilVektor } from '../services/faceEncoder.js';
import { periksaDeteksi } from '../services/faceDetector.js';
import { periksaLiveness } from '../services/livenessCheck.js';
import { findBestMatch } from '../services/faceMatcher.js';
import { hitungStatus } from '../services/jadwalCalculator.js';
import { kirimNotifikasiAbsensi } from '../services/whatsappService.js';

/**
 * Scan absensi. Urutan gerbang keamanan:
 *   1. format vektor       -> 400 (faceEncoder)
 *   2. deteksi wajah       -> 400 (faceDetector)
 *   3. anti-spoofing       -> 403 (livenessCheck)
 *   4. otorisasi perangkat -> 401 (PerangkatAbsen)
 *   5. pencocokan vektor   -> 404 (faceMatcher)
 *   6. status kehadiran    -> jadwalCalculator
 *   7. catat log, lalu kabari orang tua (whatsappService; gagal tidak fatal)
 */
export async function scanAbsensi(req, res) {
  const { foto_bukti, tanggal } = req.body;

  const vector = ambilVektor(req.body);
  if (!vector) {
    return res.status(400).json({ message: 'vector harus berupa array 128 float' });
  }

  const deteksi = periksaDeteksi(req.body.deteksi);
  if (!deteksi.valid) {
    return res.status(400).json({ message: deteksi.alasan });
  }

  const liveness = periksaLiveness(req.body.liveness);
  if (!liveness.hidup) {
    return res.status(403).json({ message: liveness.alasan });
  }

  const perangkat = await PerangkatAbsen.findBySecretKey(req.body.perangkat_secret_key);
  if (!perangkat) {
    return res.status(401).json({ message: 'Perangkat tidak dikenali' });
  }

  // Jam server bisa saja salah zona. Ambil satu-satu jam dari DB agar tanggal, waktu
  // masuk, dan status selalu konsisten dengan tabel absensi_log.
  const [jam] = await query('SELECT CURDATE() AS tanggal, CURTIME() AS waktu');

  // ponytail: pindai linear seluruh vektor tiap scan. Batas nyaman ~500 siswa;
  // di atas itu pakai index face-api (descriptorToFace) atau ANN.
  const cocok = findBestMatch(vector, await WajahTerdaftar.findAllVectors());
  if (!cocok) {
    return res.status(404).json({ message: 'Wajah tidak dikenali' });
  }

  const [siswa] = await query(
    `SELECT s.id, s.nisn, s.nama, s.kelas_id, s.ortu_id, o.no_whatsapp
     FROM siswa s LEFT JOIN orang_tua o ON o.id = s.ortu_id
     WHERE s.id = ?`,
    [cocok.siswa_id],
  );

  const log = await AbsensiLog.upsert({
    siswa_id: siswa.id,
    tanggal: tanggal ?? jam.tanggal,
    waktu_masuk: jam.waktu,
    status: hitungStatus(jam.waktu),
    confidence: Number(cocok.confidence.toFixed(4)),
    foto_bukti,
    perangkat_id: perangkat.id,
  });

  const notifikasi = await kirimNotifikasiAbsensi({
    nama: siswa.nama,
    nomor: siswa.no_whatsapp,
    tanggal: log.tanggal,
    waktuMasuk: log.waktu_masuk,
    status: log.status,
    perangkat: perangkat.nama_perangkat,
  });
  if (!notifikasi.terkirim) {
    console.warn(`[wa] ${siswa.nama}: ${notifikasi.alasan}`);
  }

  res.json({
    message: `Selamat datang, ${siswa.nama}`,
    siswa,
    tanggal: log.tanggal,
    waktu_masuk: log.waktu_masuk,
    status: log.status,
    distance: Number(cocok.distance.toFixed(4)),
    confidence: Number(cocok.confidence.toFixed(4)),
    perangkat: perangkat.nama_perangkat,
    notifikasi,
  });
}

export async function riwayatSiswa(req, res) {
  res.json(await AbsensiLog.findBySiswa(req.params.siswaId, { dari: req.query.dari, sampai: req.query.sampai }));
}

export async function absensiHariIni(req, res) {
  const { tanggal } = req.query;
  res.json(await AbsensiLog.rekapHarian({ tanggal, kelas_id: req.query.kelas_id }));
}

export async function listPerangkat(req, res) {
  res.json(await PerangkatAbsen.findAll());
}