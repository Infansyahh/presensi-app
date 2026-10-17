import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import TabelAbsensi from '../components/TabelAbsensi.jsx';
import { absensiApi, pendaftaranApi } from '../services/api';

const SELA_POLL_MS = 30_000;

/**
 * Pemantauan riwayat absensi. Muat ulang otomatis supaya layar terlihat
 * "realtime" tanpa perlu operator menekan tombol, tapi tetap bisa dipaksa
 * secara manual lewat tombol muat ulang.
 *
 * Gunakan <input type="date"> bawaan browser — tidak perlu pustaka kalender.
 */
export default function RiwayatAbsensi() {
  const [kelas, setKelas] = useState([]);
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [kelasId, setKelasId] = useState('');
  const [data, setData] = useState({ baris: [], memuat: true, galat: null });

  useEffect(() => {
    pendaftaranApi.daftarKelas().then(setKelas).catch(() => setKelas([]));
  }, []);

  const muat = useCallback(async () => {
    setData((d) => ({ ...d, memuat: true, galat: null }));
    try {
      const hasil = await absensiApi.hariIni({
        tanggal,
        ...(kelasId ? { kelas_id: kelasId } : {}),
      });
      setData({ baris: hasil.rincian, memuat: false, galat: null });
    } catch (e) {
      setData({ baris: [], memuat: false, galat: e.pesan });
    }
  }, [tanggal, kelasId]);

  useEffect(() => {
    muat();
  }, [muat]);

  useEffect(() => {
    const tmr = setInterval(muat, SELA_POLL_MS);
    return () => clearInterval(tmr);
  }, [muat]);

  const bidang =
    'fokus rounded-xl border border-line bg-surface px-3 py-2 text-sm transition-colors duration-[var(--dur-fast)] hover:border-line-strong focus:border-accent';

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Riwayat Absensi</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Diperbarui otomatis setiap {SELA_POLL_MS / 1000} detik.
          </p>
        </div>
        <button
          type="button"
          onClick={muat}
          disabled={data.memuat}
          className="fokus flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-sm font-medium transition-colors duration-[var(--dur-fast)] hover:bg-surface-sunken active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RefreshCw aria-hidden="true" className={`size-4 ${data.memuat ? 'animate-spin' : ''}`} />
          Muat ulang
        </button>
      </header>

      <div className="mb-4 flex flex-wrap gap-3">
        <div>
          <label htmlFor="r-tanggal" className="mb-1 block text-xs font-medium text-ink-muted">
            Tanggal
          </label>
          <input
            id="r-tanggal"
            type="date"
            value={tanggal}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setTanggal(e.target.value)}
            className={bidang}
          />
        </div>
        <div>
          <label htmlFor="r-kelas" className="mb-1 block text-xs font-medium text-ink-muted">
            Kelas
          </label>
          <select id="r-kelas" value={kelasId} onChange={(e) => setKelasId(e.target.value)} className={bidang}>
            <option value="">Semua kelas</option>
            {kelas.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama_kelas}
              </option>
            ))}
          </select>
        </div>
      </div>

      <TabelAbsensi baris={data.baris} memuat={data.memuat} galat={data.galat} onMuatUlang={muat} />
    </div>
  );
}