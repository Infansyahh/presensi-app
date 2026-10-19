/**
 * Autentikasi dashboard: hash password (scrypt) + token bertanda tangan (HMAC).
 *
 * Tanpa dependency baru — semuanya dari node:crypto. Token bersifat stateless:
 * tidak ada tabel sesi, jadi tidak perlu membersihkannya.
 *
 * ponytail: AUTH_SECRET dari .env. Kalau tidak diisi, kunci acak dibuat saat boot
 * (semua sesi jadi tidak berlaku setelah restart) — gagal dengan aman, bukan diam.
 */
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import 'dotenv/config';

const dariEnv = process.env.AUTH_SECRET;
const KUNCI = dariEnv || randomBytes(32).toString('hex');
const JAM_VALID = Number(process.env.AUTH_JAM_VALID ?? 8);

if (!dariEnv) {
  console.warn('[auth] AUTH_SECRET belum di .env — memakai kunci acak. Sesi tidak bertahan setelah restart.');
}

const b64 = (isi) => Buffer.from(isi).toString('base64url');
const tandaTangan = (muatan) => createHmac('sha256', KUNCI).update(muatan).digest('base64url');

/** "salt:hash" — disimpan apa adanya di tabel pengguna. */
export function hashPassword(plain) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(plain, salt, 64).toString('hex')}`;
}

export function verifyPassword(plain, tersimpan) {
  const [salt, hash] = String(tersimpan).split(':');
  if (!salt || !hash) return false;
  const dihitung = scryptSync(plain, salt, 64);
  const asli = Buffer.from(hash, 'hex');
  return asli.length === dihitung.length && timingSafeEqual(asli, dihitung);
}

export function buatToken(pengguna) {
  const muatan = b64(
    JSON.stringify({
      id: pengguna.id,
      username: pengguna.username,
      peran: pengguna.peran,
      exp: Date.now() + JAM_VALID * 3_600_000,
    }),
  );
  return `${muatan}.${tandaTangan(muatan)}`;
}

/** @returns {{id:number,username:string,peran:string}|null} null kalau token rusak/kedaluwarsa. */
export function bacaToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;

  const [muatan, tanda] = token.split('.');
  const diharapkan = tandaTangan(muatan);
  if (tanda.length !== diharapkan.length || !timingSafeEqual(Buffer.from(tanda), Buffer.from(diharapkan))) return null;

  try {
    const isi = JSON.parse(Buffer.from(muatan, 'base64url').toString());
    return isi.exp && isi.exp > Date.now() ? isi : null;
  } catch {
    return null;
  }
}

/** Middleware Express: lanjutkan hanya bila header Authorization valid. */
export function wajibLogin(req, res, next) {
  const header = req.headers.authorization ?? '';
  const sesi = bacaToken(header.startsWith('Bearer ') ? header.slice(7) : null);
  if (!sesi) return res.status(401).json({ message: 'Sesi tidak valid atau sudah berakhir. Silakan masuk lagi.' });
  req.pengguna = sesi;
  next();
}