/**
 * Pencocokan vektor wajah: vektor 128 float dari client dibandingkan dengan
 * seluruh vektor terdaftar memakai Euclidean Distance. Ambang batas < 0.4.
 */

import { isValidVector } from './faceEncoder.js';

export const MATCH_THRESHOLD = 0.4;

export function euclideanDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/**
 * @param {number[]} vector        vektor 128 float dari kamera
 * @param {Array<{siswa_id:number, vector:number[]}>} rows semua vektor terdaftar
 * @returns {{siswa_id:number, distance:number, confidence:number}|null}
 */
export function findBestMatch(vector, rows, threshold = MATCH_THRESHOLD) {
  let best = null;
  for (const row of rows) {
    if (!isValidVector(row.vector)) continue;
    const distance = euclideanDistance(vector, row.vector);
    if (distance < threshold && (best === null || distance < best.distance)) {
      best = { siswa_id: row.siswa_id, distance, confidence: Math.max(0, 1 - distance) };
    }
  }
  return best;
}