import { useCallback, useEffect, useState } from 'react';
import { Camera, LogOut, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import KameraAbsen from '../components/KameraAbsen.jsx';
import { absensiApi } from '../services/api';
import { jamSingkat, kelasBadge } from '../lib/statusAbsensi';

const SELA_REFRESH_MS = 20_000;

/**
 * Kiosk titik masuk — mode layar penuh tanpa sidebar.
 *
 * Kartu scanner memakai HUD yang sama dengan kamera: target frame, garis
 * pemindai, dan kartu profil muncul realtime di dalam frame kamera.
 */
export default function TitikAbsen() {
  const [daftar, setDaftar] = useState([]);
  const [terakhir, setTerakhir] = useState(null);
  const [memuat, setMemuat] = useState(true);

  const muat = useCallback(async () => {
    try {
      const hasil = await absensiApi.hariIni();
      setDaftar(hasil.rincian ?? []);
    } catch {
      setDaftar([]);
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    muat();
    const tmr = setInterval(muat, SELA_REFRESH_MS);
    return () => clearInterval(tmr);
  }, [muat]);

  return (
    <div className="min-h-dvh bg-paper">
      {/* Bar atas kiosk: keluar dari mode ini tanpa sidebar. */}
      <header className="flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3 sm:px-6">
        <div>
          <h1 className="text-base font-semibold sm:text-lg">Titik Absen</h1>
          <p className="text-xs text-ink-muted">Absen hanya dengan wajah — tidak ada kartu.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={muat}
            aria-label="Muat ulang daftar hadir"
            className="fokus rounded-lg p-2 text-ink-muted transition-colors duration-[var(--dur-fast)] hover:bg-surface-sunken hover:text-ink active:scale-[0.97]"
          >
            <RefreshCw aria-hidden="true" className={`size-4 ${memuat ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/dashboard"
            className="fokus flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-sm font-medium transition-colors duration-[var(--dur-fast)] hover:bg-surface-sunken"
          >
            <LogOut aria-hidden="true" className="size-4" />
            <span className="hidden sm:inline">Keluar kiosk</span>
          </Link>
        </div>
      </header>

      <main className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <KameraAbsen
          mode="kiosk"
          tampilkanModal={false}
          onSelesai={(hasil) => {
            if (hasil.sukses) setTerakhir(hasil);
            muat();
          }}
        />

        {/* Kolom daftar hadir: di layar kecil pindah ke bawah scanner. */}
        <aside className="rounded-2xl border border-line bg-surface p-4 lg:h-fit">
          <h2 className="mb-3 text-sm font-semibold">Hadir hari ini</h2>

          {terakhir && (
            <p className="mb-3 rounded-xl bg-hadir-soft p-3 text-sm text-hadir">
              Terbaru: <span className="font-medium">{terakhir.siswa?.nama}</span> · {terakhir.status} ·{' '}
              {jamSingkat(terakhir.waktu_masuk)}
            </p>
          )}

          {memuat ? (
            <p className="text-sm text-ink-muted">Memuat…</p>
          ) : daftar.length === 0 ? (
            <p className="flex items-start gap-2 text-sm text-ink-muted">
              <Camera aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ink-faint" />
              Belum ada siswa yang absen hari ini.
            </p>
          ) : (
            <ul className="max-h-[26rem] space-y-2 overflow-y-auto">
              {daftar.map((b) => (
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
      </main>
    </div>
  );
}