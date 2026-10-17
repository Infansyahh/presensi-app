/**
 * Validasi format vektor wajah 128 float yang dikirim frontend.
 *
 * Ekstraksi ML (face-api) terjadi di browser; backend hanya menerima array angka.
 * File ini penjaga kontrak itu: tidak ada gambar, tidak ada model, hanya angka.
 */

export const DIMENSI = 128;

/** Vektor valid = array berisi tepat 128 float finite. */
export function isValidVector(v) {
  return Array.isArray(v) && v.length === DIMENSI && v.every((n) => typeof n === 'number' && Number.isFinite(n));
}

/** Ubah nilai dari database (MariaDB: JSON jadi string) menjadi array float. */
export function vektorDariJson(json) {
  if (Array.isArray(json)) return json;
  if (typeof json !== 'string') return null;
  try {
    return isValidVector(JSON.parse(json)) ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

/**
 * Ambil vektor dari body request. Menerima array biasa atau string JSON
 * (beberapa client mengirim descriptor sebagai string).
 * @returns {number[]|null} null bila tidak valid.
 */
export function ambilVektor(body) {
  const mentah = body?.vector ?? body?.embedding ?? body?.descriptor;
  if (Array.isArray(mentah)) return isValidVector(mentah) ? mentah : null;
  return vektorDariJson(mentah);
}