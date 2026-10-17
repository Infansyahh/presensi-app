/**
 * Pengecekan liveness / anti-spoofing.
 *
 * Sinyal dikirim frontend setelah frame dianalisis di browser (mis. blink dari
 * face-api). Backend hanya memutuskan layak-tidaknya sinyal tersebut — tidak
 * ada analisis biometri di sini.
 */

export const MIN_LIVENESS_SCORE = 0.6;

/**
 * @param {object} liveness body: { liveness_score, kedip_terdeteksi, cek? }
 * @returns {{hidup: boolean, score?: number, cek?: object, alasan?: string}}
 */
export function periksaLiveness(liveness) {
  if (!liveness || typeof liveness !== 'object') {
    return { hidup: false, alasan: 'liveness check wajib dijalankan sebelum absen' };
  }

  const score = Number(liveness.liveness_score);
  if (!Number.isFinite(score) || score < MIN_LIVENESS_SCORE) {
    return { hidup: false, alasan: `skor liveness ${liveness.liveness_score} di bawah ${MIN_LIVENESS_SCORE}` };
  }

  // Kedipan adalah sinyal anti-foto paling murah; tanpa ini media cetak bisa lolos.
  if (liveness.kedip_terdeteksi !== true) {
    return { hidup: false, alasan: 'kedipan tidak terdeteksi, kemungkinan foto atau video' };
  }

  return { hidup: true, score, cek: liveness.cek ?? null };
}