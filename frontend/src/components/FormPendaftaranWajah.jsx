import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, CheckCircle2, Loader2, Save, Trash2 } from 'lucide-react';
import { useWebcamFace } from '../hooks/useWebcamFace';
import { vektorDari, gambarOverlay } from '../services/faceApi';
import { pendaftaranApi } from '../services/api';

const MIN_SAMPEL = 3;
const MAKS_SAMPEL = 5;

/** Berapa frame wajah harus diam sebelum sampel dianggap sah (~1 detik). */
const FRAME_DIAM = 5;
const DETIK_HITUNG = 3;
const JEDA_SETELAH_AMBIL_MS = 1400;

/** Backend mewajibkan 128 float — dicek di sini agar umpan balik instan. */
const valid = (v) => Array.isArray(v) && v.length === 128 && v.every((n) => typeof n === 'number' && Number.isFinite(n));

const BIDANG =
  'fokus w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm transition-colors duration-[var(--dur-fast)] hover:border-line-strong focus:border-accent disabled:cursor-not-allowed disabled:opacity-50';

const FORM_KOSONG = { nisn: '', nama: '', kelas_id: '', nama_ortu: '', no_whatsapp: '' };

/**
 * Arahan di kamera, dipilih menurut tahap dan nomor sampel.
 * Sampel 4-5 sengaja meminta sudut berbeda supaya vektor lebih beragam.
 */
const ARAHAN = {
  cari: { judul: 'Posisikan wajah di tengah bingkai', detail: 'Pastikan wajah terlihat penuh dari dahi sampai dagu.' },
  siap: { judul: 'Hadap kamera, lalu diam sebentar', detail: 'Lepas masker dan kacamata agar titik wajah terbaca.' },
};

const VARIASI = [
  'Angka sedikit ke kiri, lalu diam.',
  'Angka sedikit ke kanan, lalu diam.',
  'Palingkan dagu sedikit ke atas.',
  'Miringkan kepala sedikit ke bawah.',
  'Putar kepala sedikit ke samping, lalu kembali netral.',
];

/**
 * Form terpadu: data siswa + sampel wajah disimpan sekali jalan.
 *
 * Pengambilan sampel berjalan OTOMATIS — operator cukup menyuruh siswa bergantian
 * posisi sesuai arahan di kamera. Tombol "Ambil Sampel" tetap ada sebagai
 * jaring pengaman kalau ada sampel yang perlu diambil ulang.
 */
export default function FormPendaftaranWajah({ onSelesai }) {
  const [form, setForm] = useState(FORM_KOSONG);
  const [kelas, setKelas] = useState([]);
  const [sampel, setSampel] = useState([]);
  // Kamera menyala sendiri: seluruh halaman ini memang untuk menangkap wajah.
  const [jalan, setJalan] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);
  const [pesan, setPesan] = useState(null);

  const [hitung, setHitung] = useState(null);
  const [terakhirAmbil, setTerakhirAmbil] = useState(null);
  const [jeda, setJeda] = useState(false);

  const { videoRef, canvasRef, status, galat, galatDeteksi, diagnostik, deteksi, frameDiam } = useWebcamFace({ aktif: jalan });

  useEffect(() => {
    pendaftaranApi.daftarKelas().then(setKelas).catch((e) => setPesan({ galat: true, teks: e.pesan }));
  }, []);

  // Ref supaya effect hitung-mundur tidak ter-reset tiap render.
  const deteksiRef = useRef(null);
  deteksiRef.current = deteksi;
  const ambilRef = useRef(null);

  const ambilSampel = (sumber) => {
    const vektor = sumber ? vektorDari(sumber) : null;
    if (!valid(vektor)) {
      setPesan({ galat: true, teks: 'Descriptor wajah tidak valid (harus 128 angka).' });
      return;
    }
    setSampel((s) => [...s, vektor].slice(0, MAKS_SAMPEL));
    setPesan(null);
    setTerakhirAmbil(Date.now());
    setJeda(true);
  };
  ambilRef.current = ambilSampel;

  // Jeda sesaat setelah ambil, supaya siswa sempat mengubah posisi.
  useEffect(() => {
    if (!jeda) return undefined;
    const tmr = setTimeout(() => setJeda(false), JEDA_SETELAH_AMBIL_MS);
    return () => clearTimeout(tmr);
  }, [jeda]);

  // Syarat auto-capture. Sengaja primitif/bool supaya effect di bawah tidak
  // terus ter-reset saat nilai deteksi berubah tiap frame.
  const penuh = sampel.length >= MAKS_SAMPEL;
  const diamCukup = frameDiam >= FRAME_DIAM;
  const siapOtomatis = Boolean(jalan && deteksi && diamCukup && !penuh && !jeda);

  useEffect(() => {
    if (!siapOtomatis) return undefined;

    let sisa = DETIK_HITUNG;
    setHitung(sisa);

    const timer = setInterval(() => {
      sisa -= 1;
      if (sisa > 0) {
        setHitung(sisa);
        return;
      }
      clearInterval(timer);
      setHitung(null);
      ambilRef.current(deteksiRef.current);
    }, 700);

    return () => clearInterval(timer);
  }, [siapOtomatis]);

  // Hilangkan hitung-mundur begitu wajah bergerak atau kamera dimatikan.
  useEffect(() => {
    if (!diamCukup || !jalan || penuh || jeda) setHitung(null);
  }, [diamCukup, jalan, penuh, jeda]);

  // Kotak wajah digambar realtime di canvas overlay.
  useEffect(() => {
    const skor = deteksi?.detection?.score ?? 0;
    gambarOverlay(canvasRef.current, deteksi ? [deteksi] : [], {
      status: diamCukup ? 'sukses' : 'mencari',
      label: deteksi ? `${Math.round(skor * 100)}%` : '',
      cermin: true,
    });
  }, [deteksi, diamCukup, canvasRef]);

  const fieldTerisi = form.nisn && form.nama && form.kelas_id && form.nama_ortu && form.no_whatsapp;
  const siapSimpan = Boolean(fieldTerisi) && sampel.length >= MIN_SAMPEL && !menyimpan;
  const baruSaja = terakhirAmbil && Date.now() - terakhirAmbil < JEDA_SETELAH_AMBIL_MS;

  // Arahan yang tampil: langsung di dalam kamera, bukan hanya di bawah.
  let arahan = ARAHAN.cari;
  if (status === 'galat') arahan = { judul: galat, detail: '' };
  else if (!jalan) arahan = { judul: 'Kamera belum dinyalakan', detail: 'Tekan Nyalakan Kamera untuk mulai.' };
  else if (status === 'meminta-izin') arahan = { judul: 'Menyiapkan kamera…', detail: 'Izinkan akses kamera bila diminta.' };
  else if (baruSaja)
    arahan = {
      judul: `Sampel ${sampel.length}/${MAKS_SAMPEL} tersimpan`,
      detail: sampel.length >= MIN_SAMPEL ? 'Lanjut ke sampel berikutnya atau langsung simpan.' : `Butuh ${MIN_SAMPEL - sampel.length} sampel lagi.`,
    };
  else if (hitung !== null)
    arahan = { judul: `Tahan posisi ini… ${hitung}`, detail: 'Jangan bergerak sampai hitungan selesai.' };
  else if (!deteksi) arahan = ARAHAN.cari;
  else if (!diamCukup) arahan = ARAHAN.siap;
  else arahan = { judul: 'Bersiap mengambil sampel…', detail: '' };

  const kirim = async (e) => {
    e.preventDefault();
    setMenyimpan(true);
    setPesan(null);
    try {
      const hasil = await pendaftaranApi.simpanSiswaWajah({ ...form, kelas_id: Number(form.kelas_id), vectors: sampel });
      setPesan({ galat: false, teks: `${hasil.siswa.nama} tersimpan bersama ${hasil.jumlah} sampel wajah.` });
      setForm(FORM_KOSONG);
      setSampel([]);
      setJalan(false);
      setTerakhirAmbil(null);
      onSelesai?.(hasil);
    } catch (err) {
      setPesan({ galat: true, teks: err.pesan });
    } finally {
      setMenyimpan(false);
    }
  };

  return (
    <form onSubmit={kirim} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      {/* ----------------------------- kolom kiri: kamera ----------------------------- */}
      <section>
        <div className="relative aspect-4/3 overflow-hidden rounded-2xl border border-line bg-ink">
          <video
            ref={videoRef}
            playsInline
            muted
            aria-label="Pratinjau kamera pendaftaran"
            className={`absolute inset-0 h-full w-full scale-x-[-1] object-cover transition-opacity duration-[var(--dur-mid)] ${
              status === 'aktif' ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <canvas ref={canvasRef} aria-hidden="true" className="absolute top-0 left-0 h-full w-full pointer-events-none" />

          {/* Bingkai target statis, memberi siswa titik Bidik yang jelas. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="relative aspect-3/4 w-[52%] max-w-64">
              {[
                'left-0 top-0 border-l-4 border-t-4 rounded-tl-2xl',
                'right-0 top-0 border-r-4 border-t-4 rounded-tr-2xl',
                'left-0 bottom-0 border-l-4 border-b-4 rounded-bl-2xl',
                'right-0 bottom-0 border-r-4 border-b-4 rounded-br-2xl',
              ].map((pos) => (
                <span
                  key={pos}
                  className={`absolute size-7 ${
                    diamCukup ? 'border-hadir' : deteksi ? 'border-hud-cari' : 'border-on-accent/50'
                  } ${pos} motion-safe:animate-[denyut-cincin_2.6s_ease-in-out_infinite]`}
                />
              ))}
            </div>
          </div>

          {/* Hitung mundur besar di tengah bingkai. */}
          {hitung !== null && (
            <div aria-hidden="true" className="absolute inset-0 grid place-items-center">
              <span
                key={hitung}
                className="text-7xl font-bold tabular-nums text-hadir drop-shadow-lg motion-safe:animate-[scale-in_var(--dur-fast)_var(--ease-out)]"
              >
                {hitung}
              </span>
            </div>
          )}

          {/* Arahan: judul besar + detail kecil. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3">
            <p
              aria-live="polite"
              className={`mx-auto max-w-md rounded-xl px-4 py-2.5 text-center text-sm font-medium text-on-accent ${
                baruSaja ? 'bg-hadir/90' : hitung !== null ? 'bg-hadir/80' : 'bg-ink/80'
              }`}
            >
              {baruSaja && <CheckCircle2 aria-hidden="true" className="mr-1.5 inline size-4" />}
              {arahan.judul}
            </p>
            {arahan.detail && <p className="mt-1.5 text-center text-xs text-on-accent/90">{arahan.detail}</p>}
          </div>

          {/* Galat deteksi harus terlihat — bukan ditelan diam-diam. */}
          {galatDeteksi && (
            <p role="alert" className="absolute inset-x-3 top-3 rounded-xl bg-alpa/90 p-3 text-xs text-on-accent">
              <span className="font-semibold">Deteksi gagal: </span>
              {galatDeteksi}
            </p>
          )}

          {/* Angka diagnostik: backend tfjs, jumlah wajah, skor, durasi. */}
          {diagnostik && (
            <p className="absolute inset-x-3 top-3 flex flex-wrap gap-x-3 font-mono text-[10px] text-on-accent/80">
              <span>backend {diagnostik.backend}</span>
              <span>wajah {diagnostik.jumlah}</span>
              {diagnostik.skor?.length > 0 && <span>skor {diagnostik.skor.join(',')}</span>}
              <span>{diagnostik.durasi}ms</span>
            </p>
          )}
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setJalan((v) => !v)}
            disabled={status === 'meminta-izin'}
            className="fokus flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 font-medium text-on-accent transition-[background-color,transform] duration-[var(--dur-fast)] hover:bg-accent-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {jalan ? <CameraOff aria-hidden="true" className="size-4" /> : <Camera aria-hidden="true" className="size-4" />}
            {jalan ? 'Matikan Kamera' : 'Nyalakan Kamera'}
          </button>
          <button
            type="button"
            onClick={() => ambilSampel(deteksi)}
            disabled={!deteksi || penuh}
            className="fokus flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 font-medium transition-colors duration-[var(--dur-fast)] hover:bg-surface-sunken active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Camera aria-hidden="true" className="size-4" />
            Ambil Manual
          </button>
        </div>
        <p className="mt-2 text-xs text-ink-muted">
          Pengambilan otomatis aktif selama wajah diam. Tombol Ambil Manual untuk pengambilan ulang.
        </p>
      </section>

      {/* ----------------------------- kolom kanan: form ----------------------------- */}
      <section className="space-y-4">
        <div>
          <label htmlFor="u-nisn" className="mb-1 block text-sm font-medium">
            NISN <span className="text-terlambat">*</span>
          </label>
          <input
            id="u-nisn"
            required
            inputMode="numeric"
            maxLength={10}
            value={form.nisn}
            onChange={(e) => setForm({ ...form, nisn: e.target.value.replace(/\D/g, '') })}
            className={BIDANG}
          />
        </div>

        <div>
          <label htmlFor="u-nama" className="mb-1 block text-sm font-medium">
            Nama Lengkap <span className="text-terlambat">*</span>
          </label>
          <input id="u-nama" required value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className={BIDANG} />
        </div>

        <div>
          <label htmlFor="u-kelas" className="mb-1 block text-sm font-medium">
            Kelas <span className="text-terlambat">*</span>
          </label>
          <select id="u-kelas" required value={form.kelas_id} onChange={(e) => setForm({ ...form, kelas_id: e.target.value })} className={BIDANG}>
            <option value="">— pilih kelas —</option>
            {kelas.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama_kelas}
              </option>
            ))}
          </select>
          {kelas.length === 0 && <p className="mt-1 text-xs text-terlambat">Tabel kelas kosong — isi lewat SQL lebih dulu.</p>}
        </div>

        <div>
          <label htmlFor="u-ortu" className="mb-1 block text-sm font-medium">
            Nama Orang Tua <span className="text-terlambat">*</span>
          </label>
          <input id="u-ortu" required value={form.nama_ortu} onChange={(e) => setForm({ ...form, nama_ortu: e.target.value })} className={BIDANG} />
        </div>

        <div>
          <label htmlFor="u-wa" className="mb-1 block text-sm font-medium">
            No. WhatsApp Orang Tua <span className="text-terlambat">*</span>
          </label>
          <input
            id="u-wa"
            required
            inputMode="tel"
            placeholder="08xxxxxxxxxx"
            value={form.no_whatsapp}
            onChange={(e) => setForm({ ...form, no_whatsapp: e.target.value })}
            className={BIDANG}
          />
        </div>

        {/* Progres sampel + arahan sampel berikutnya. */}
        <div className="rounded-xl bg-surface-sunken p-3">
          <p className="text-sm font-medium">
            Sampel Wajah Terkumpul:{' '}
            <span className="tabular-nums">
              {sampel.length}/{MAKS_SAMPEL}
            </span>
          </p>
          <ul className="mt-2 flex gap-1.5">
            {Array.from({ length: MAKS_SAMPEL }, (_, i) => {
              const ada = i < sampel.length;
              const wajib = i < MIN_SAMPEL;
              return (
                <li
                  key={i}
                  aria-label={`Sampel ${i + 1}: ${ada ? 'terkumpul' : wajib ? 'wajib diisi' : 'opsional'}`}
                  className={`h-1.5 flex-1 rounded-full ${ada ? 'bg-hadir' : wajib ? 'bg-terlambat/40' : 'bg-line'}`}
                />
              );
            })}
          </ul>

          {sampel.length >= MIN_SAMPEL && !penuh ? (
            <p className="mt-2 rounded-lg bg-accent-soft p-2 text-xs text-accent">
              <span className="font-semibold">Sudah cukup. </span>
              Untuk lebih akurat, lanjutkan: {VARIASI[sampel.length - MIN_SAMPEL]}
            </p>
          ) : (
            <p className="mt-2 text-xs text-ink-muted">
              Minimal {MIN_SAMPEL} sampel wajib. Yang ke-4 dan ke-5 opsional.
            </p>
          )}
        </div>

        {pesan && (
          <p
            role={pesan.galat ? 'alert' : 'status'}
            className={`rounded-xl p-3 text-sm ${pesan.galat ? 'bg-terlambat-soft text-terlambat' : 'bg-hadir-soft text-hadir'}`}
          >
            {pesan.teks}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!siapSimpan}
            className="fokus flex flex-1 items-center justify-center gap-2 rounded-xl bg-hadir px-4 py-3 font-medium text-on-accent transition-[background-color,transform] duration-[var(--dur-fast)] hover:brightness-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {menyimpan ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Save aria-hidden="true" className="size-4" />}
            {menyimpan ? 'Menyimpan…' : 'Simpan Data Siswa & Wajah'}
          </button>
          <button
            type="button"
            onClick={() => {
              setSampel([]);
              setPesan(null);
              setTerakhirAmbil(null);
            }}
            disabled={sampel.length === 0 || menyimpan}
            title="Buang sampel yang sudah diambil"
            aria-label="Reset sampel wajah"
            className="fokus rounded-xl border border-line bg-surface px-3 py-3 font-medium transition-colors duration-[var(--dur-fast)] hover:bg-surface-sunken active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
        </div>
      </section>
    </form>
  );
}