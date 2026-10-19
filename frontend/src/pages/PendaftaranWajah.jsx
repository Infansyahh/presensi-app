import { useCallback, useEffect, useState } from 'react';
import { ScanFace, Trash2 } from 'lucide-react';
import FormPendaftaranWajah from '../components/FormPendaftaranWajah.jsx';
import { pendaftaranApi } from '../services/api';

/**
 * Halaman pendaftaran: form terpadu data siswa + wajah, dengan daftar siswa
 * yang sudah punya sampel di bawahnya sebagai rujukan.
 */
export default function PendaftaranWajah() {
  const [daftar, setDaftar] = useState([]);
  const [kelas, setKelas] = useState([]);
  const [galat, setGalat] = useState(null);

  const muat = useCallback(async () => {
    try {
      setDaftar(await pendaftaranApi.daftarSiswa());
    } catch (e) {
      setGalat(e.pesan);
    }
  }, []);

  useEffect(() => {
    muat();
    pendaftaranApi.daftarKelas().then(setKelas).catch(() => setKelas([]));
  }, [muat]);

  const jumlahSampel = async (siswaId) => {
    try {
      return (await pendaftaranApi.wajahSiswa(siswaId)).length;
    } catch {
      return 0;
    }
  };

  const [sampel, setSampel] = useState({});

  useEffect(() => {
    // Ambil jumlah sampel lazily; daftar bisa panjang jadi jangan dibanjiri request.
    const ids = daftar.slice(0, 20).map((s) => s.id);
    if (ids.length === 0) return undefined;
    let batal = false;
    Promise.all(ids.map(jumlahSampel)).then((jumlah) => {
      if (batal) return;
      setSampel(Object.fromEntries(ids.map((id, i) => [id, jumlah[i]])));
    });
    return () => {
      batal = true;
    };
  }, [daftar]);

  const kelasLabel = (id) => kelas.find((k) => String(k.id) === String(id))?.nama_kelas ?? '-';

  const hapusSampel = async (id) => {
    setGalat(null);
    try {
      await pendaftaranApi.hapusWajahSiswa(id);
      setSampel((s) => ({ ...s, [id]: 0 }));
    } catch (e) {
      setGalat(e.pesan);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <ScanFace aria-hidden="true" className="size-6 text-accent" />
          Pendaftaran Siswa & Wajah
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Isi data siswa, ambil 3-5 sampel wajah, lalu simpan sekali jalan.
        </p>
      </header>

      <FormPendaftaranWajah onSelesai={muat} />

      {galat && (
        <p role="alert" className="rounded-xl bg-terlambat-soft p-3 text-sm text-terlambat">
          {galat}
        </p>
      )}

      <section className="rounded-2xl border border-line bg-surface">
        <div className="border-b border-line px-5 py-3">
          <h2 className="text-base font-semibold">Siswa Terdaftar ({daftar.length})</h2>
        </div>

        {daftar.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-muted">Belum ada siswa terdaftar.</p>
        ) : (
          <ul className="divide-y divide-line">
            {daftar.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3 transition-colors duration-[var(--dur-fast)] hover:bg-surface-sunken">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{s.nama}</p>
                  <p className="text-xs text-ink-muted">
                    NISN {s.nisn} · {kelasLabel(s.kelas_id)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    (sampel[s.id] ?? 0) >= 3 ? 'bg-hadir-soft text-hadir' : 'bg-terlambat-soft text-terlambat'
                  }`}
                >
                  {sampel[s.id] === undefined ? '…' : `${sampel[s.id]} sampel`}
                </span>
                <button
                  type="button"
                  onClick={() => hapusSampel(s.id)}
                  disabled={!sampel[s.id]}
                  aria-label={`Hapus sampel wajah ${s.nama}`}
                  className="fokus rounded-lg p-2 text-ink-muted transition-colors duration-[var(--dur-fast)] hover:bg-terlambat-soft hover:text-terlambat active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}