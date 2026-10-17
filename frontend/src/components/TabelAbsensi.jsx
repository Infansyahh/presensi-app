import { AlertTriangle, CalendarDays, Inbox, Loader2, RefreshCw, UserRound } from 'lucide-react';
import { jamSingkat, kelasBadge, tanggalPanjang } from '../lib/statusAbsensi';

const KOLOM = [
  { kunci: 'nama', label: 'Siswa' },
  { kunci: 'tanggal', label: 'Tanggal' },
  { kunci: 'waktu_masuk', label: 'Masuk' },
  { kunci: 'status', label: 'Status' },
  { kunci: 'nama_perangkat', label: 'Perangkat' },
];

/**
 * Tabel riwayat kehadiran. Data diambil dari props, bukan fetch sendiri,
 * supaya komponen ini bisa dipakai di halaman mana pun tanpa efek samping.
 */
export default function TabelAbsensi({ baris = [], memuat = false, galat = null, onMuatUlang }) {
  if (memuat) {
    return (
      <div className="flex items-center justify-center gap-3 rounded-2xl border border-line bg-surface p-10 text-ink-muted">
        <Loader2 aria-hidden="true" className="size-5 animate-spin" />
        <span>Memuat data kehadiran…</span>
      </div>
    );
  }

  if (galat) {
    return (
      <div role="alert" className="rounded-2xl border border-terlambat bg-terlambat-soft p-6 text-terlambat">
        <p className="flex items-center gap-2 font-medium">
          <AlertTriangle aria-hidden="true" className="size-5" />
          Gagal memuat data
        </p>
        <p className="mt-1 text-sm">{galat}</p>
        {onMuatUlang && (
          <button
            type="button"
            onClick={onMuatUlang}
            className="fokus mt-4 inline-flex items-center gap-2 rounded-xl bg-terlambat px-3 py-2 text-sm font-medium text-on-accent transition-[filter,transform] duration-[var(--dur-fast)] hover:brightness-95 active:scale-[0.99]"
          >
            <RefreshCw aria-hidden="true" className="size-4" />
            Coba lagi
          </button>
        )}
      </div>
    );
  }

  if (baris.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line-strong bg-surface p-10 text-center">
        <Inbox aria-hidden="true" className="mx-auto size-8 text-ink-faint" />
        <p className="mt-3 font-medium">Belum ada data kehadiran</p>
        <p className="mt-1 text-sm text-ink-muted">
          Data muncul setelah siswa absen pada tanggal yang dipilih.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop: tabel. Mobile: kartu, supaya tidak ada gulir horizontal. */}
      <div className="hidden overflow-hidden rounded-2xl border border-line bg-surface md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Riwayat kehadiran siswa</caption>
          <thead className="bg-surface-sunken text-ink-muted">
            <tr>
              {KOLOM.map((k) => (
                <th key={k.kunci} scope="col" className="px-4 py-3 font-medium">
                  {k.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {baris.map((b) => (
              <tr key={b.id} className="transition-colors duration-[var(--dur-fast)] hover:bg-surface-sunken">
                <td className="px-4 py-3">
                  <span className="block font-medium">{b.siswa_nama ?? b.nama_siswa ?? '-'}</span>
                  <span className="block text-xs text-ink-faint">{b.nisn ?? ''}</span>
                </td>
                <td className="px-4 py-3 text-ink-muted">{b.tanggal ?? '-'}</td>
                <td className="px-4 py-3 tabular-nums text-ink-muted">{jamSingkat(b.waktu_masuk) || '-'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${kelasBadge(b.status)}`}>
                    {b.status ?? '-'}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-muted">{b.nama_perangkat ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {baris.map((b) => (
          <li key={b.id} className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-medium">
                  <UserRound aria-hidden="true" className="size-4 shrink-0 text-ink-faint" />
                  <span className="truncate">{b.siswa_nama ?? b.nama_siswa ?? '-'}</span>
                </p>
                {b.nisn && <p className="mt-0.5 pl-6 text-xs text-ink-faint">{b.nisn}</p>}
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${kelasBadge(b.status)}`}>
                {b.status ?? '-'}
              </span>
            </div>
            <p className="mt-3 flex items-center gap-2 text-sm text-ink-muted">
              <CalendarDays aria-hidden="true" className="size-4 shrink-0" />
              <span>
                {tanggalPanjang(b.tanggal)} · {jamSingkat(b.waktu_masuk) || '-'} WIB
              </span>
            </p>
            {b.nama_perangkat && <p className="mt-1 text-xs text-ink-faint">{b.nama_perangkat}</p>}
          </li>
        ))}
      </ul>
    </>
  );
}