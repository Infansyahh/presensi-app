/**
 * Validasi hasil deteksi wajah dari frame kamera.
 *
 * Yang divalidasi adalah metadata deteksi (bukan gambar): berapa wajah yang
 * terdeteksi dan seberapa yakin detektornya. Modul ini yang memutuskan apakah
 * frame layak proceeded ke pencocokan vektor.
 */

export const MIN_DETECTION_SCORE = 0.7;

/**
 * @param {object} deteksi body dari frontend: { jumlah_wajah, detection_score }
 * @returns {{valid: boolean, jumlah?: number, score?: number, alasan?: string}}
 */
export function periksaDeteksi(deteksi) {
  if (!deteksi || typeof deteksi !== 'object') {
    return { valid: false, alasan: 'deteksi wajah wajib dikirim' };
  }

  const jumlah = Number(deteksi.jumlah_wajah);
  if (!Number.isInteger(jumlah) || jumlah < 1) {
    return { valid: false, alasan: 'tidak ada wajah terdeteksi pada frame' };
  }
  if (jumlah > 1) {
    return { valid: false, alasan: 'terdeteksi lebih dari satu wajah, minta siswa berdiri sendiri' };
  }

  const score = Number(deteksi.detection_score);
  if (!Number.isFinite(score) || score < MIN_DETECTION_SCORE) {
    return { valid: false, alasan: `skor deteksi ${deteksi.detection_score} di bawah ${MIN_DETECTION_SCORE}` };
  }

  return { valid: true, jumlah, score };
}