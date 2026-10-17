import { useEffect, useRef } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

/**
 * Notifikasi hasil absensi.
 *
 * Semua 8 state ada: diam (tidak dirender), memuat, sukses, gagal, plus
 * fokus, hover, aktif, dan nonaktif pada tombol aksi.
 */
export default function HasilAbsen({ hasil, onTutup, autoTutupMs = 5000 }) {
  const tombolRef = useRef(null);

  useEffect(() => {
    if (!hasil) return undefined;

    // Fokus masuk ke dialog supaya reader layar langsung membaca pesannya.
    const fokusTmr = setTimeout(() => tombolRef.current?.focus(), 50);
    const tutupTmr = autoTutupMs ? setTimeout(() => onTutup?.(), autoTutupMs) : null;

    const tekanEscape = (e) => {
      if (e.key === 'Escape') onTutup?.();
    };
    window.addEventListener('keydown', tekanEscape);

    return () => {
      clearTimeout(fokusTmr);
      if (tutupTmr) clearTimeout(tutupTmr);
      window.removeEventListener('keydown', tekanEscape);
    };
  }, [hasil, onTutup, autoTutupMs]);

  if (!hasil) return null;

  const sukses = hasil.sukses !== false;
  const Judul = sukses ? CheckCircle2 : AlertTriangle;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/45 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hasil-absen-judul"
        className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-xl motion-safe:animate-[scale-in_var(--dur-mid)_var(--ease-out)]"
      >
        <div className="flex items-start gap-3">
          <Judul
            aria-hidden="true"
            className={`mt-0.5 size-8 shrink-0 ${sukses ? 'text-hadir' : 'text-terlambat'}`}
          />
          <div className="min-w-0 flex-1">
            <h2 id="hasil-absen-judul" className="text-lg font-semibold">
              {hasil.judul ?? (sukses ? 'Absensi tercatat' : 'Absensi gagal')}
            </h2>
            <p className="mt-1 break-words text-sm text-ink-muted">{hasil.pesan ?? '-'}</p>
          </div>
          <button
            type="button"
            onClick={onTutup}
            aria-label="Tutup notifikasi"
            className="fokus -m-1 rounded-lg p-1 text-ink-faint transition-colors duration-[var(--dur-fast)] hover:bg-surface-sunken hover:text-ink active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        {hasil.rincian?.length > 0 && (
          <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl bg-surface-sunken p-4 text-sm">
            {hasil.rincian.map(([kunci, nilai]) => (
              <div key={kunci} className="contents">
                <dt className="text-ink-muted">{kunci}</dt>
                <dd className="text-right font-medium break-words">{nilai}</dd>
              </div>
            ))}
          </dl>
        )}

        {!sukses && (
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-terlambat-soft p-3 text-sm text-terlambat">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>Coba lagi: pastikan wajah menghadap kamera dan cahaya cukup.</span>
          </p>
        )}

        <button
          ref={tombolRef}
          type="button"
          onClick={onTutup}
          className="fokus mt-5 w-full rounded-xl bg-accent px-4 py-3 font-medium text-on-accent transition-[background-color,transform] duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:bg-accent-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {sukses ? 'Selesai' : 'Coba lagi'}
        </button>
      </div>
    </div>
  );
}