import { useCallback, useEffect, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import GrafikKehadiran from '../components/GrafikKehadiran.jsx';
import { dashboardApi, pendaftaranApi } from '../services/api';
import { SEMUA_STATUS, STATUS_ABSENSI } from '../lib/statusAbsensi';

/**
 * Laporan kehadiran untuk wali kelas.
 *
 * Wali kelas ditentukan dari kelas yang dipilih (dari tabel wali_kelas), jadi
 * halaman ini langsung menampilkan nama wali yang bertanggung jawab.
 */
export default function Laporan() {
  const [kelas, setKelas] = useState([]);
  const [kelasId, setKelasId] = useState('');
  const [periode, setPeriode] = useState(() => new Date().toISOString().slice(0, 7));
  const [data, setData] = useState({ total: [], harian: [], memuat: true, galat: null });

  useEffect(() => {
    pendaftaranApi.daftarKelas().then(setKelas).catch(() => setKelas([]));
  }, []);

  const muat = useCallback(async () => {
    setData((d) => ({ ...d, memuat: true, galat: null }));
    const [tahun, bulan] = periode.split('-').map(Number);
    try {
      const hasil = await dashboardApi.bulanan({ tahun, bulan, ...(kelasId ? { kelas_id: kelasId } : {}) });
      setData({ total: hasil.total, harian: hasil.harian, memuat: false, galat: null });
    } catch (e) {
      setData({ total: [], harian: [], memuat: false, galat: e.pesan });
    }
  }, [periode, kelasId]);

  useEffect(() => {
    muat();
  }, [muat]);

  const kelasTerpilih = kelas.find((k) => String(k.id) === kelasId);
  const jumlah = (status) => data.total.find((t) => t.status === status)?.jumlah ?? 0;
  const total = data.total.reduce((n, t) => n + t.jumlah, 0);
  const persenHadir = total > 0 ? Math.round(((jumlah('Hadir') + jumlah('Terlambat')) / total) * 100) : 0;

  const bidang =
    'fokus rounded-xl border border-line bg-surface px-3 py-2 text-sm transition-colors duration-[var(--dur-fast)] hover:border-line-strong focus:border-accent';

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-xl font-semibold">Laporan Kehadiran</h1>
        <p className="mt-1 text-sm text-ink-muted">Rekapitulasi bulanan untuk wali kelas.</p>
      </header>

      <div className="mb-5 flex flex-wrap gap-3">
        <div>
          <label htmlFor="l-periode" className="mb-1 block text-xs font-medium text-ink-muted">
            Periode
          </label>
          <input
            id="l-periode"
            type="month"
            value={periode}
            onChange={(e) => setPeriode(e.target.value)}
            className={bidang}
          />
        </div>
        <div>
          <label htmlFor="l-kelas" className="mb-1 block text-xs font-medium text-ink-muted">
            Kelas
          </label>
          <select id="l-kelas" value={kelasId} onChange={(e) => setKelasId(e.target.value)} className={bidang}>
            <option value="">Semua kelas</option>
            {kelas.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama_kelas}
              </option>
            ))}
          </select>
        </div>
      </div>

      {kelasTerpilih?.wali_kelas && (
        <p className="mb-4 flex items-center gap-2 rounded-xl bg-accent-soft p-3 text-sm text-accent">
          <GraduationCap aria-hidden="true" className="size-4 shrink-0" />
          Wali kelas {kelasTerpilih.nama_kelas}: <span className="font-medium">{kelasTerpilih.wali_kelas}</span>
        </p>
      )}

      {data.galat && (
        <p role="alert" className="mb-4 rounded-xl bg-terlambat-soft p-3 text-sm text-terlambat">
          {data.galat}
        </p>
      )}

      {/* Ringkasan per status, angka ikut tertulis supaya tidak hanya warna. */}
      <ul className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {SEMUA_STATUS.map((s) => (
          <li key={s} className="rounded-2xl border border-line bg-surface p-3">
            <p className="text-xs text-ink-muted">{STATUS_ABSENSI[s].label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{jumlah(s)}</p>
          </li>
        ))}
        <li className="rounded-2xl border border-accent bg-accent-soft p-3">
          <p className="text-xs text-accent">Tingkat hadir</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-accent">{persenHadir}%</p>
        </li>
      </ul>

      <GrafikKehadiran
        data={data.harian}
        judul="Kehadiran per tanggal"
        loadingLabel="Belum ada data pada periode ini."
      />
    </div>
  );
}