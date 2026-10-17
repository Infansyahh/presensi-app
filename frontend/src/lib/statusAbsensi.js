/**
 * Pemetaan status absensi ke token warna.
 *
 * Satu-satunya tempat nama status bertemu kelas Tailwind. Jangan menulis
 * `bg-hadir` atau `text-terlambat` langsung di komponen — ambil dari sini,
 * supaya warna dan makna tidak tercecer di banyak berkas.
 */
export const STATUS_ABSENSI = {
  Hadir: { label: 'Hadir', badge: 'bg-hadir-soft text-hadir', bar: 'fill-hadir' },
  Terlambat: { label: 'Terlambat', badge: 'bg-terlambat-soft text-terlambat', bar: 'fill-terlambat' },
  Izin: { label: 'Izin', badge: 'bg-izin-soft text-izin', bar: 'fill-izin' },
  Sakit: { label: 'Sakit', badge: 'bg-sakit-soft text-sakit', bar: 'fill-sakit' },
  Alpa: { label: 'Alpa', badge: 'bg-alpa-soft text-alpa', bar: 'fill-alpa' },
};

export const SEMUA_STATUS = Object.keys(STATUS_ABSENSI);

/** Kelas badge untuk satu status. Status tak dikenal jatuh ke gaya netral. */
export function kelasBadge(status) {
  return STATUS_ABSENSI[status]?.badge ?? 'bg-surface-sunken text-ink-muted';
}

/** Nama Indonesian dari tanggal 'YYYY-MM-DD'. Dibaca via UTC agar tidak bergeser zona waktu. */
export function tanggalPanjang(tanggal) {
  const d = new Date(`${tanggal}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return tanggal;
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** 'HH:MM:SS' -> 'HH:MM' */
export function jamSingkat(waktu) {
  return String(waktu ?? '').slice(0, 5);
}