import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw } from 'lucide-react';
import KameraAbsen from '../components/KameraAbsen.jsx';
import { absensiApi } from '../services/api';
import { jamSingkat, kelasBadge } from '../lib/statusAbsensi';

/**
 * Kiosk titik masuk.
 *
 * Fungsinya satu: recognizing kehadiran lewat KameraAbsen. Daftar hadir hari ini
 * di bawah supaya operator bisa melihat hasil scan tanpa pindah halaman.
 */
export default function TitikAbsen() {
  const [rekap, setRekap] = useState({ baris: [], memuat: true, galat: null });
  const [terakhir, setTerakhir] = useState(null);

  const muat = useCallback(async () => {
    setRekap((r) => ({ ...r, memuat: true, galat: null }));
    try {
      const data = await absensiApi.hariIni();
      setRekap({ baris: data.rincian, memuat: false, galat: null });
    } catch (e) {
      setRekap({ baris: [], memuat: false, galat: e.pesan });
    }
  }, []);

  useEffect(() => {
    muat();
  }, [muat]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <KameraAbsen
        onSelesai={(hasil) => {
          if (hasil.sukses) setTerakhir(hasil);
          muat();
        }}
      />

      <aside className="rounded-2xl border border-line bg-surface p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Hadir hari ini</h2>
          <button
            type="button"
            onClick={muat}
            disabled={rekap.memuat}
            aria-label="Muat ulang daftar hadir"
            className="fokus rounded-lg p-1.5 text-ink-muted transition-colors duration-[var(--dur-fast)] hover:bg-surface-sunken hover:text-ink active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RefreshCw aria-hidden="true" className={`size-4 ${rekap.memuat ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {terakhir && (
          <p className="mb-3 rounded-xl bg-hadir-soft p-3 text-sm text-hadir">
            Terbaru: <span className="font-medium">{terakhir.siswa?.nama}</span> · {terakhir.status} ·{' '}
            {jamSingkat(terakhir.waktu_masuk)}
          </p>
        )}

        {rekap.galat ? (
          <p role="alert" className="rounded-xl bg-terlambat-soft p-3 text-sm text-terlambat">
            {rekap.galat}
          </p>
        ) : rekap.memuat ? (
          <p className="text-sm text-ink-muted">Memuat…</p>
        ) : rekap.baris.length === 0 ? (
          <p className="flex items-start gap-2 text-sm text-ink-muted">
            <Camera aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ink-faint" />
            Belum ada siswa yang absen hari ini.
          </p>
        ) : (
          <ul className="max-h-96 space-y-2 overflow-y-auto">
            {rekap.baris.map((b) => (
              <li key={b.id} className="rounded-xl border border-line p-3">
                <p className="truncate text-sm font-medium">{b.siswa_nama}</p>
                <p className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
                  <span className="tabular-nums">{jamSingkat(b.waktu_masuk)}</span>
                  <span className={`rounded-full px-2 py-0.5 font-medium ${kelasBadge(b.status)}`}>{b.status}</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}