import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookMarked, CalendarCheck, GraduationCap, UserSquare2 } from 'lucide-react';
import { dashboardApi, pendaftaranApi } from '../services/api';
import { SEMUA_STATUS, STATUS_ABSENSI } from '../lib/statusAbsensi';

const KARTU = [
  { kunci: 'siswa', label: 'Siswa terdaftar', Ikon: GraduationCap, ke: '/master/siswa' },
  { kunci: 'guru', label: 'Guru & staf', Ikon: UserSquare2, ke: '/master/guru' },
  { kunci: 'mapel', label: 'Mata pelajaran', Ikon: BookMarked, ke: '/master/mapel' },
  { kunci: 'hadir', label: 'Hadir hari ini', Ikon: CalendarCheck, ke: '/riwayat' },
];

export default function Dashboard() {
  const [jumlah, setJumlah] = useState(null);
  const [perStatus, setPerStatus] = useState([]);
  const [galat, setGalat] = useState(null);

  useEffect(() => {
    Promise.all([pendaftaranApi.daftarSiswa(), pendaftaranApi.daftarGuru(), pendaftaranApi.daftarMapel(), dashboardApi.harian()])
      .then(([siswa, guru, mapel, harian]) => {
        setJumlah({ siswa: siswa.length, guru: guru.length, mapel: mapel.length });
        setPerStatus(harian.total ?? []);
      })
      .catch((e) => setGalat(e.pesan));
  }, []);

  const ambil = (status) => perStatus.find((t) => t.status === status)?.jumlah ?? 0;
  const total = perStatus.reduce((n, t) => n + t.jumlah, 0);

  return (
    <div className="space-y-6">
      {galat && (
        <p role="alert" className="rounded-xl bg-terlambat-soft p-3 text-sm text-terlambat">
          {galat}
        </p>
      )}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KARTU.map(({ kunci, label, Ikon, ke }) => (
          <li key={kunci}>
            <Link
              to={ke}
              className="fokus flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition-[background-color,transform] duration-[var(--dur-fast)] hover:bg-surface-sunken active:scale-[0.99]"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                <Ikon aria-hidden="true" className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-2xl font-semibold tabular-nums">
                  {jumlah ? (jumlah[kunci] ?? 0) : '—'}
                </span>
                <span className="block text-sm text-ink-muted">{label}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <section>
        <h2 className="mb-3 text-base font-semibold">Kehadiran hari ini</h2>
        {perStatus.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line-strong bg-surface p-8 text-center text-sm text-ink-muted">
            Belum ada siswa yang absen hari ini.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {SEMUA_STATUS.map((s) => (
              <li key={s} className="rounded-2xl border border-line bg-surface p-4">
                <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_ABSENSI[s].badge}`}>
                  {STATUS_ABSENSI[s].label}
                </span>
                <p className="mt-2 text-2xl font-semibold tabular-nums">{ambil(s)}</p>
              </li>
            ))}
          </ul>
        )}
        {total > 0 && (
          <p className="mt-3 text-sm text-ink-muted">
            Total {total} catatan kehadiran tercatat hari ini.
          </p>
        )}
      </section>
    </div>
  );
}