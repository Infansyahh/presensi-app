import test from 'node:test';
import assert from 'node:assert/strict';

import { ambilVektor, isValidVector, vektorDariJson, DIMENSI } from '../src/services/faceEncoder.js';
import { periksaDeteksi } from '../src/services/faceDetector.js';
import { periksaLiveness } from '../src/services/livenessCheck.js';
import { euclideanDistance, findBestMatch } from '../src/services/faceMatcher.js';
import { hitungStatus, menitKeterlambatan } from '../src/services/jadwalCalculator.js';
import { formatTanggal, normalisasiNomor } from '../src/services/whatsappService.js';

const vec = (seed) => Array.from({ length: DIMENSI }, (_, i) => (i + seed) / 1000);
const deteksiok = { jumlah_wajah: 1, detection_score: 0.92 };
const hidup = { liveness_score: 0.81, kedip_terdeteksi: true };

// ------------------------------------------------------------- faceEncoder
test('faceEncoder: hanya array 128 float yang diterima', () => {
  assert.equal(isValidVector(vec(1)), true);
  assert.equal(isValidVector(new Array(127).fill(0)), false);
  assert.equal(isValidVector([...vec(1).slice(0, 127), 'x']), false);
  assert.equal(isValidVector([...vec(1).slice(0, 127), NaN]), false);
  assert.equal(isValidVector(null), false);
});

test('faceEncoder: ambilVektor menerima array maupun string JSON', () => {
  assert.equal(ambilVektor({ vector: vec(1) }).length, DIMENSI);
  assert.equal(ambilVektor({ vector: JSON.stringify(vec(1)) }).length, DIMENSI);
  assert.equal(ambilVektor({ embedding: vec(1) }).length, DIMENSI);
  assert.equal(ambilVektor({ vector: '[1,2,3]' }), null);
  assert.equal(ambilVektor({}), null);
  assert.equal(ambilVektor({ vector: '{rusak' }), null);
});

test('faceEncoder: vektor rusak di DB jadi null, bukan exception', () => {
  assert.equal(vektorDariJson('{bukan json'), null);
  assert.equal(vektorDariJson('[1,2,3]'), null);
  assert.equal(vektorDariJson(vec(1)).length, DIMENSI);
});

// ------------------------------------------------------------ faceDetector
test('faceDetector: menolak 0 wajah, >1 wajah, dan skor rendah', () => {
  assert.equal(periksaDeteksi(deteksiok).valid, true);
  assert.match(periksaDeteksi(undefined).alasan, /wajib dikirim/);
  assert.match(periksaDeteksi({ jumlah_wajah: 0, detection_score: 0.9 }).alasan, /tidak ada wajah/);
  assert.match(periksaDeteksi({ jumlah_wajah: 2, detection_score: 0.9 }).alasan, /lebih dari satu/);
  assert.match(periksaDeteksi({ jumlah_wajah: 1, detection_score: 0.2 }).alasan, /skor deteksi/);
});

// ----------------------------------------------------------- livenessCheck
test('livenessCheck: menolak tanpa kedip dan skor rendah', () => {
  assert.equal(periksaLiveness(hidup).hidup, true);
  assert.match(periksaLiveness(undefined).alasan, /wajib dijalankan/);
  assert.match(periksaLiveness({ ...hidup, liveness_score: 0.1 }).alasan, /skor liveness/);
  assert.match(periksaLiveness({ ...hidup, kedip_terdeteksi: false }).alasan, /kedipan/);
});

// ------------------------------------------------------------- faceMatcher
test('faceMatcher: jarak 0 untuk vektor identik', () => {
  assert.equal(euclideanDistance(vec(1), vec(1)), 0);
  assert.ok(euclideanDistance(vec(1), vec(2)) > 0);
});

test('faceMatcher: pilih siswa terdekat di bawah ambang, lewati baris rusak', () => {
  const db = [
    { siswa_id: 1, vector: vec(500) },
    { siswa_id: 2, vector: vec(1) },
    { siswa_id: 3, vector: [0, 1] }, // rusak, harus dilewati tanpa melempar error
  ];
  const hasil = findBestMatch(vec(1), db);
  assert.equal(hasil.siswa_id, 2);
  assert.ok(hasil.distance < 0.4);
  assert.equal(findBestMatch(vec(1), [{ siswa_id: 1, vector: vec(9000) }]), null);
});

// --------------------------------------------------------- jadwalCalculator
test('jadwalCalculator: tepat waktu sampai batas, lewat = terlambat', () => {
  assert.equal(hitungStatus('07:00'), 'Hadir');
  assert.equal(hitungStatus('07:15'), 'Hadir');
  assert.equal(hitungStatus('07:16'), 'Terlambat');
  assert.equal(hitungStatus('06:30'), 'Hadir');
  assert.equal(menitKeterlambatan('07:30'), 30);
  assert.equal(menitKeterlambatan('06:30'), 0);
});

// ---------------------------------------------------------- whatsappService
test('whatsappService: normalisasi nomor ke format 62', () => {
  assert.equal(normalisasiNomor('0812-3456-7890'), '6281234567890');
  assert.equal(normalisasiNomor('+628123456789'), '628123456789');
  assert.equal(normalisasiNomor(''), '');
});

test('whatsappService: tanggal Indonesia tanpa bergeser zona waktu', () => {
  assert.equal(formatTanggal('2026-10-17'), 'Sabtu, 17 Oktober 2026');
  assert.equal(formatTanggal('2026-01-01'), 'Kamis, 1 Januari 2026');
  assert.equal(formatTanggal('bukan tanggal'), 'bukan tanggal');
});