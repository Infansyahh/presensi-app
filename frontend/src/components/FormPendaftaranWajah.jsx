import { useEffect, useMemo, useState } from 'react';
import { Camera, Check, Loader2, Save, Trash2, UserRound } from 'lucide-react';
import { useWebcamFace } from '../hooks/useWebcamFace';
import { vektorDari } from '../services/faceApi';
import { pendaftaranApi } from '../services/api';

/** Backend mewajibkan 128 float. Validasi di sini supaya umpan balik instan. */
const valid = (v) => Array.isArray(v) && v.length === 128 && v.every((n) => typeof n === 'number' && Number.isFinite(n));

/**
 * Pendaftaran wajah siswa: ambil beberapa sampel vektor, lalu kirim sekaligus.
 *
 * Sampel diambil manual (bukan otomatis) supaya siswa bisa mengubah posisi
 * wajah di antara sampel — variasi sudut membuat pencocokan lebih kuat.
 */
export default function FormPendaftaranWajah({ siswaId, jumlahSampel = 5, onSelesai }) {
  const [daftarSiswa, setDaftarSiswa] = useState([]);
  const [terpilih, setTerpilih] = useState(siswaId ?? '');
  const [sampel, setSampel] = useState([]);
  const [jalan, setJalan] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const [pesan, setPesan] = useState(null);

  const { videoRef, status, galat, deteksi } = useWebcamFace({ aktif: jalan });

  useEffect(() => {
    if (siswaId) return;
    let batal = false;
    pendaftaranApi
      .daftarSiswa()
      .then((data) => !batal && setDaftarSiswa(data))
      .catch((e) => !batal && setPesan({ galat: true, teks: e.pesan }));
    return () => {
      batal = true;
    };
  }, [siswaId]);

  const siap = useMemo(
    () => (terpilih ? sampel.length >= jumlahSampel : false),
    [terpilih, sampel.length, jumlahSampel],
  );

  const tambahSampel = () => {
    if (!deteksi) return;
    const vektor = vektorDari(deteksi);
    if (!valid(vektor)) {
      setPesan({ galat: true, teks: 'Descriptor wajah tidak valid (harus 128 angka).' });
      return;
    }
    setSampel((s) => [...s, vektor].slice(0, jumlahSampel));
    setPesan(null);
  };

  const kirim = async () => {
    setMenyimpan(true);
    setPesan(null);
    try {
      const hasil = await pendaftaranApi.simpanWajah(Number(terpilih), sampel);
      setPesan({ galat: false, teks: `${hasil.jumlah} sampel wajah tersimpan.` });
      setSampel([]);
      onSelesai?.(hasil);
    } catch (e) {
      setPesan({ galat: true, teks: e.pesan });
    } finally {
      setMenyimpan(false);
    }
  };

  return (
    <section className="w-full max-w-2xl">
      <header className="mb-4">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <UserRound aria-hidden="true" className="size-6 text-accent" />
          Pendaftaran Wajah Siswa
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Ambil {jumlahSampel} sampel dari sudut wajah yang berbeda. Semakin beragam, semakin akurat
          pencocokannya.
        </p>
      </header>

      {!siswaId && (
        <div className="mb-4">
          <label htmlFor="pilih-siswa" className="mb-1 block text-sm font-medium">
            Siswa
          </label>
          <select
            id="pilih-siswa"
            value={terpilih}
            onChange={(e) => setTerpilih(e.target.value)}
            className="fokus w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm transition-colors duration-[var(--dur-fast)] hover:border-line-strong focus:border-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">— Pilih siswa —</option>
            {daftarSiswa.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nama} ({s.nisn})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="relative aspect-4/3 overflow-hidden rounded-2xl border border-line bg-ink">
        <video
          ref={videoRef}
          playsInline
          muted
          aria-label="Pratinjau kamera"
          className={`h-full w-full scale-x-[-1] object-cover transition-opacity duration-[var(--dur-mid)] ${
            status === 'aktif' ? 'opacity-100' : 'opacity-0'
          }`}
        />

        <div aria-live="polite" className="absolute inset-x-0 bottom-0 flex items-center justify-center">
          <p className="m-3 rounded-full bg-ink/80 px-4 py-2 text-sm font-medium text-on-accent">
            {status === 'galat' ? galat : status === 'aktif' ? (deteksi ? 'Wajah terdeteksi' : 'Posisikan wajah di kamera') : 'Kamera mati'}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setJalan((v) => !v)}
          disabled={status === 'meminta-izin'}
          className="fokus flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 font-medium text-on-accent transition-[background-color,transform] duration-[var(--dur-fast)] hover:bg-accent-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Camera aria-hidden="true" className="size-4" />
          {jalan ? 'Matikan Kamera' : 'Nyalakan Kamera'}
        </button>
        <button
          type="button"
          onClick={tambahSampel}
          disabled={!deteksi || sampel.length >= jumlahSampel}
          className="fokus flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 font-medium transition-colors duration-[var(--dur-fast)] hover:bg-surface-sunken active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Camera aria-hidden="true" className="size-4" />
          Ambil Sampel
        </button>
      </div>

      {/* Progres sampel — angka ikut tertulis, tidak hanya warna. */}
      <div className="mt-4">
        <p className="text-sm font-medium">
          Sampel terkumpul {sampel.length}/{jumlahSampel}
        </p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {Array.from({ length: jumlahSampel }, (_, i) => {
            const ada = i < sampel.length;
            return (
              <li
                key={i}
                aria-label={`Sampel ${i + 1} ${ada ? 'terkumpul' : 'belum'}`}
                className={`grid size-9 place-items-center rounded-lg border text-sm font-medium transition-colors duration-[var(--dur-fast)] ${
                  ada ? 'border-hadir bg-hadir-soft text-hadir' : 'border-line bg-surface text-ink-faint'
                }`}
              >
                {ada ? <Check aria-hidden="true" className="size-4" /> : i + 1}
              </li>
            );
          })}
        </ul>
      </div>

      {pesan && (
        <p
          role={pesan.galat ? 'alert' : 'status'}
          className={`mt-4 rounded-xl p-3 text-sm ${
            pesan.galat ? 'bg-terlambat-soft text-terlambat' : 'bg-hadir-soft text-hadir'
          }`}
        >
          {pesan.teks}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={kirim}
          disabled={!siap || menyimpan}
          className="fokus flex flex-1 items-center justify-center gap-2 rounded-xl bg-hadir px-4 py-3 font-medium text-on-accent transition-[background-color,transform] duration-[var(--dur-fast)] hover:brightness-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {menyimpan ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Save aria-hidden="true" className="size-4" />}
          {menyimpan ? 'Menyimpan…' : 'Simpan Wajah'}
        </button>
        <button
          type="button"
          onClick={() => setSampel([])}
          disabled={sampel.length === 0 || menyimpan}
          className="fokus flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 font-medium transition-colors duration-[var(--dur-fast)] hover:bg-surface-sunken active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 aria-hidden="true" className="size-4" />
          Reset
        </button>
      </div>
    </section>
  );
}