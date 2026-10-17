/**
 * Menentukan status kehadiran dari waktu masuk siswa terhadap jam operasional sekolah.
 */

export const JAM_MASUK = '07:00';
export const BATAS_TERLAMBAT_MENIT = 15;

const keMenit = (hhmm) => {
  const [jam, menit] = hhmm.split(':').map(Number);
  return jam * 60 + menit;
};

/**
 * @returns {'Hadir'|'Terlambat'}
 * ponytail: hanya dua status. Aturan "Alpa karena datang terlanjur lewat" belum
 * ada, tambahkan saat Izin/Sakit/Alpa mulai diinput dari admin.
 */
export function hitungStatus(waktuMasuk, { jamMasuk = JAM_MASUK, batasMenit = BATAS_TERLAMBAT_MENIT } = {}) {
  return keMenit(waktuMasuk) - keMenit(jamMasuk) > batasMenit ? 'Terlambat' : 'Hadir';
}

/** Menit keterlambatan (0 atau lebih). Dipakai di pesan WhatsApp. */
export function menitKeterlambatan(waktuMasuk, jamMasuk = JAM_MASUK) {
  return Math.max(0, keMenit(waktuMasuk) - keMenit(jamMasuk));
}