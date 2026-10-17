/**
 * Pengiriman notifikasi WhatsApp ke orang tua.
 *
 * Dua provider yang didukung (isi lewat .env):
 *   WA_PROVIDER=fonnte | wablas
 *   WA_TOKEN=<token gateway>
 *   WA_URL=<opsional, ganti endpoint>
 *
 * Fungsi di sini SENGAJA tidak melempar error: absensi siswa tetap dicatat
 * walau WhatsApp down. Pemanggil cukup membaca `terkirim`.
 */

import { menitKeterlambatan } from './jadwalCalculator.js';

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const PROVIDER = {
  fonnte: {
    url: () => process.env.WA_URL ?? 'https://api.fonnte.com/send',
    headers: (token) => ({ 'Content-Type': 'application/json', token }),
    body: (nomor, pesan) => ({ target: nomor, message: pesan }),
  },
  wablas: {
    url: () => process.env.WA_URL ?? 'https://console.wablas.com/api/send-message',
    headers: (token) => ({ 'Content-Type': 'application/json', Authorization: token }),
    body: (nomor, pesan) => ({ phone: nomor, message: pesan }),
  },
};

/** 08xx / +62xx -> 62xx (format yang diharapkan gateway). */
export function normalisasiNomor(nomor) {
  return String(nomor ?? '').replace(/\D/g, '').replace(/^0/, '62');
}

/** '2026-10-17' -> 'Jumat, 17 Oktober 2026'. Dibaca via UTC agar tidak bergeser zona waktu. */
export function formatTanggal(tanggal) {
  const d = new Date(`${tanggal}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return tanggal;
  return `${HARI[d.getUTCDay()]}, ${d.getUTCDate()} ${BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * Kirim pesan lewat gateway. Tidak pernah melempar error.
 * @returns {Promise<{terkirim: boolean, alasan?: string, provider?: string}>}
 */
export async function kirimPesan(nomor, pesan) {
  const nama = String(process.env.WA_PROVIDER ?? '').toLowerCase();
  const p = PROVIDER[nama];

  if (!p || !process.env.WA_TOKEN) {
    return { terkirim: false, alasan: `gateway WhatsApp belum dikonfigurasi (WA_PROVIDER=${process.env.WA_PROVIDER ?? '-'})` };
  }
  if (!normalisasiNomor(nomor)) {
    return { terkirim: false, alasan: 'nomor WhatsApp orang tua kosong' };
  }

  try {
    const res = await fetch(p.url(), {
      method: 'POST',
      headers: p.headers(process.env.WA_TOKEN),
      body: JSON.stringify(p.body(normalisasiNomor(nomor), pesan)),
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { terkirim: false, alasan: `gateway menolak (HTTP ${res.status}): ${data?.reason ?? data?.message ?? 'tanpa detail'}` };
    }
    return { terkirim: true, provider: nama, respons: data };
  } catch (err) {
    return { terkirim: false, alasan: `gagal menghubungi gateway: ${err.message}` };
  }
}

/** Notifikasi kehadiran untuk orang tua siswa. */
export async function kirimNotifikasiAbsensi({ nama, nomor, tanggal, waktuMasuk, status, perangkat }) {
  const telat = status === 'Terlambat' ? ` (terlambat ${menitKeterlambatan(waktuMasuk)} menit)` : '';

  const pesan = [
    `Assalamualaikum, Bapak/Ibu dari ${nama}.`,
    '',
    'NOTIFIKASI KETAHADIRAN',
    `Tanggal   : ${formatTanggal(tanggal)}`,
    `Status    : ${status}${telat}`,
    `Waktu     : ${String(waktuMasuk).slice(0, 5)} WIB`,
    perangkat ? `Perangkat : ${perangkat}` : null,
    '',
    'Terima kasih.',
  ]
    .filter((b) => b !== null)
    .join('\n');

  return kirimPesan(nomor, pesan);
}