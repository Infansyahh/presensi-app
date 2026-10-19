import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, CheckCircle2, Loader2, RefreshCw, ScanFace, ShieldCheck } from 'lucide-react';
import { useWebcamFace } from '../hooks/useWebcamFace';
import { potretWajah, vektorDari, gambarOverlay, SKOR_SIAP_KIRIM } from '../services/faceApi';
import { absensiApi, payloadScan } from '../services/api';
import { jamSingkat } from '../lib/statusAbsensi';
import HasilAbsen from './HasilAbsen.jsx';

const JEDA_ANTAR_SCAN_MS = 3000;

/**
 * Empat tahap tampilan kiosk, dictates what the HUD says:
 *   'Mencari Wajah...' → 'Menganalisis...' → 'Terverifikasi'
 */
function tentukanFase({ status, galat, mengirim, deteksi, kedip, terverifikasi, gagal, cukupSkor }) {
  if (status === 'galat') return { teks: 'Kamera Bermasalah', nada: 'galat' };
  if (status === 'idle') return { teks: 'Kamera Siap Nyalakan', nada: 'netral' };
  if (status === 'meminta-izin') return { teks: 'Menyiapkan Kamera…', nada: 'netral' };
  if (gagal) return { teks: 'Wajah Tidak Dikenali', nada: 'galat' };
  if (terverifikasi) return { teks: 'Terverifikasi', nada: 'sukses' };
  if (mengirim) return { teks: 'Menganalisis…', nada: 'netral' };
  if (deteksi && !cukupSkor) return { teks: 'Wajah Terlalu Jauh / Gelap', nada: 'galat' };
  if (deteksi && kedip) return { teks: 'Menganalisis…', nada: 'netral' };
  if (deteksi) return { teks: 'Berkedip untuk Verifikasi', nada: 'netral' };
  return { teks: 'Mencari Wajah…', nada: 'netral' };
}

const WARNA = {
  netral: 'border-on-accent/70 text-on-accent',
  sukses: 'border-hadir bg-hadir text-on-accent',
  galat: 'border-terlambat bg-terlambat text-on-accent',
};

/**
 * Pemindai wajah kiosk.
 *
 * Alur: kamera menyala → validasi liveness (harus berkedip) → kirim vektor 128
 * float ke backend → kartu profil siswa muncul di dalam frame.
 * Tombol scan tidak ada; siswa cukup berdiri di depan kamera.
 */
export default function KameraAbsen({
  onSelesai,
  secretPerangkat,
  tampilkanModal = true,
  /** mode kiosk menampilkan HUD penuh; form biasa lebih ringkas. */
  mode = 'kiosk',
}) {
  const [jalan, setJalan] = useState(mode === 'kiosk');
  const [mengirim, setMengirim] = useState(false);
  const [hasil, setHasil] = useState(null);
  const [terverifikasi, setTerverifikasi] = useState(null);
  const [gagal, setGagal] = useState(null);

  const terakhirScanRef = useRef(0);
  const objectUrlRef = useRef(null);

  const { videoRef, canvasRef, status, galat, galatDeteksi, diagnostik, deteksi, kedip } = useWebcamFace({ aktif: jalan });

  const skor = deteksi?.detection?.score ?? 0;
  const cukupSkor = skor >= SKOR_SIAP_KIRIM;

  // Kotak HUD digambar ulang setiap deteksi/status berubah. gambarOverlay()
  // yang menyesuaikan ukuran canvas dan menskalakan koordinat video -> tampilan.
  useEffect(() => {
    const mode = terverifikasi ? 'sukses' : cukupSkor ? 'mencari' : 'netral';
    const label = terverifikasi ? 'TERVERIFIKASI' : `${Math.round(skor * 100)}%`;
    gambarOverlay(canvasRef.current, deteksi ? [deteksi] : [], { status: mode, label, cermin: true });
  }, [deteksi, terverifikasi, cukupSkor, skor, canvasRef]);

  // Object URL untuk foto profil harus dicabut agar tidak membocorkan memori.
  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  const kirim = useCallback(
    async (deteksiWajah) => {
      setMengirim(true);
      setGagal(null);
      try {
        const potret = potretWajah(videoRef.current, deteksiWajah, canvasRef.current);
        const dataBukti = potret ? await potretToDataUrl(potret) : null;

        const respons = await absensiApi.scan(
          payloadScan({
            vector: vektorDari(deteksiWajah),
            deteksi: { jumlah_wajah: 1, score: deteksiWajah.detection.score },
            liveness: { liveness_score: 0.9, kedip_terdeteksi: kedip },
            fotoBukti: dataBukti,
            perangkatSecret: secretPerangkat,
          }),
        );

        // Pakai potret yang sama untuk kartu profil, supaya tidak_crop dua kali.
        if (potret && objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = potret ? URL.createObjectURL(potret) : null;

        setTerverifikasi(respons);
        if (tampilkanModal) {
          setHasil({
            sukses: true,
            judul: 'Absensi tercatat',
            pesan: respons.message,
            rincian: [
              ['Tanggal', respons.tanggal],
              ['Status', respons.status],
              ['Waktu', `${jamSingkat(respons.waktu_masuk)} WIB`],
              ['Keyakinan', `${Math.round(respons.confidence * 100)}%`],
              ['Perangkat', respons.perangkat],
            ],
          });
        }
        onSelesai?.({ ...respons, sukses: true });
      } catch (galatScan) {
        setTerverifikasi(null);
        setGagal(galatScan.pesan ?? 'Tidak dapat menghubungi server.');
        if (tampilkanModal) {
          setHasil({ sukses: false, judul: 'Absensi gagal', pesan: galatScan.pesan ?? 'Tidak dapat menghubungi server.' });
        }
        onSelesai?.({ sukses: false, pesan: galatScan.pesan });
      } finally {
        setMengirim(false);
        terakhirScanRef.current = Date.now();
      }
    },
    [kedip, onSelesai, secretPerangkat, tampilkanModal, videoRef, canvasRef],
  );

  // Re-scan otomatis saat wajah siap (sudah berkedip) dan cooldown sudah lewat.
  useEffect(() => {
    if (!jalan || mengirim || !deteksi || !kedip) return;
    if (Date.now() - terakhirScanRef.current < JEDA_ANTAR_SCAN_MS) return;
    terakhirScanRef.current = Date.now();
    kirim(deteksi);
  }, [jalan, mengirim, deteksi, kedip, cukupSkor, kirim]);

  // Kartu profil menutup sendiri supaya kiosk kembali ke mode mencari.
  useEffect(() => {
    if (!terverifikasi && !gagal) return undefined;
    const tmr = setTimeout(() => {
      setTerverifikasi(null);
      setGagal(null);
    }, 4500);
    return () => clearTimeout(tmr);
  }, [terverifikasi, gagal]);

  const fase = tentukanFase({ status, galat, mengirim, deteksi, kedip, terverifikasi, gagal, cukupSkor });

  return (
    <section className="w-full">
      {/* ------------------------------- panggung kamera + HUD ------------------------------- */}
      <div
        className={`relative overflow-hidden bg-ink ${mode === 'kiosk' ? 'min-h-dvh rounded-none lg:aspect-4/3 lg:min-h-0' : 'aspect-4/3 rounded-2xl border border-line'}`}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          aria-label="Pratinjau kamera"
          className={`absolute inset-0 h-full w-full scale-x-[-1] object-cover transition-opacity duration-[var(--dur-mid)] ${
            status === 'aktif' ? 'opacity-100' : 'opacity-0'
          }`}
        />
        {/* Overlay canvas: kotak deteksi HUD digambar realtime lewat
            faceapi.resizeResults, jadi posisinya persis di atas wajah. */}
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute top-0 left-0 h-full w-full pointer-events-none"
        />

        {/* Vignette supaya HUD terbaca di atas video terang. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,rgba(0,0,0,0.55)_100%)]" />

        {/* Target frame di tengah layar — sudut statis + garis pemindai.
            Kotak wajah yang bergerak digambar canvas di atasnya. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="relative aspect-3/4 w-[54%] max-w-72">
            {/* Sudut */}
            {[
              'left-0 top-0 border-l-4 border-t-4 rounded-tl-2xl',
              'right-0 top-0 border-r-4 border-t-4 rounded-tr-2xl',
              'left-0 bottom-0 border-l-4 border-b-4 rounded-bl-2xl',
              'right-0 bottom-0 border-r-4 border-b-4 rounded-br-2xl',
            ].map((pos) => (
              <span
                key={pos}
                className={`absolute size-9 ${
                  terverifikasi ? 'border-hadir' : deteksi ? 'border-hadir' : 'border-on-accent/70'
                } ${pos} motion-safe:animate-[denyut-cincin_2.6s_ease-in-out_infinite]`}
              />
            ))}

            {/* Garis pemindai bergerak. */}
            <span
              className={`absolute inset-x-2 top-0 h-px bg-linear-to-r from-transparent to-transparent ${
                terverifikasi ? 'via-hadir' : deteksi ? 'via-hadir' : 'via-on-accent'
              } motion-safe:animate-[geser-garis_2.4s_ease-in-out_infinite]`}
            />

            </div>
        </div>

        {/* Barisan status HUD. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4 text-on-accent sm:p-6">
          <p className="flex items-center gap-2 rounded-full bg-ink/60 px-3 py-1.5 text-xs font-medium">
            <ScanFace aria-hidden="true" className="size-4" />
            {mode === 'kiosk' ? 'Kiosk Absen' : 'Scanner'}
          </p>
          <p
            aria-live="polite"
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${WARNA[fase.nada]} ${
              fase.nada === 'netral' ? 'bg-ink/60' : ''
            }`}
          >
            {fase.nada === 'sukses' && <CheckCircle2 aria-hidden="true" className="mr-1 inline size-3.5" />}
            {mengirim && <Loader2 aria-hidden="true" className="mr-1 inline size-3.5 animate-spin" />}
            {fase.teks}
          </p>
        </div>

        {/* Galat deteksi. Sebelumnya ditelan `catch {}` sehingga masalah
            tidak pernah terlihat dan kotak tidak pernah muncul. */}
        {galatDeteksi && (
          <p role="alert" className="absolute inset-x-3 top-14 rounded-xl bg-alpa/90 p-3 text-xs text-on-accent sm:top-16">
            <span className="font-semibold">Deteksi gagal: </span>
            {galatDeteksi}
          </p>
        )}

        {/* Angka diagnostik: backend tfjs, jumlah wajah, skor, durasi inferensi. */}
        {diagnostik && (
          <p className="absolute inset-x-3 top-14 flex flex-wrap gap-x-3 font-mono text-[10px] text-on-accent/80 sm:top-16">
            <span>backend {diagnostik.backend}</span>
            <span>wajah {diagnostik.jumlah}</span>
            {diagnostik.skor?.length > 0 && <span>skor {diagnostik.skor.join(',')}</span>}
            <span>{diagnostik.durasi}ms</span>
          </p>
        )}

        {/* Indikator bawah: kamera / berkedip / liveness. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center p-4">
          <ul className="flex flex-wrap items-center justify-center gap-2 text-xs text-on-accent">
            <li className="flex items-center gap-1.5 rounded-full bg-ink/60 px-2.5 py-1">
              <ShieldCheck aria-hidden="true" className={`size-3.5 ${status === 'aktif' ? 'text-hadir' : 'text-ink-faint'}`} />
              Kamera {status === 'aktif' ? 'aktif' : 'mati'}
            </li>
            <li className="flex items-center gap-1.5 rounded-full bg-ink/60 px-2.5 py-1">
              <span className={`size-2 rounded-full ${deteksi ? 'bg-hadir' : 'bg-ink-faint'}`} />
              Wajah {deteksi ? 'terdeteksi' : 'belum ada'}
            </li>
            <li className="flex items-center gap-1.5 rounded-full bg-ink/60 px-2.5 py-1">
              <span className={`size-2 rounded-full ${kedip ? 'bg-hadir' : 'bg-terlambat'}`} />
              Kedip {kedip ? 'terkonfirmasi' : 'menunggu'}
            </li>
          </ul>
        </div>

        {/* ------------------------------- kartu profil siswa ------------------------------- */}
        {terverifikasi && (
          <div className="absolute inset-x-0 bottom-16 mx-auto w-full max-w-sm px-4 sm:inset-x-auto sm:right-6 sm:top-1/2 sm:-translate-y-1/2 sm:px-0">
            <div className="flex items-center gap-3 rounded-2xl border border-hadir bg-surface p-4 text-ink shadow-2xl motion-safe:animate-[scale-in_var(--dur-mid)_var(--ease-out)]">
              {objectUrlRef.current ? (
                <img
                  src={objectUrlRef.current}
                  alt={`Foto ${terverifikasi.siswa.nama}`}
                  className="size-16 shrink-0 rounded-xl object-cover"
                />
              ) : (
                <span className="grid size-16 shrink-0 place-items-center rounded-xl bg-hadir-soft text-lg font-semibold text-hadir">
                  {terverifikasi.siswa.nama.charAt(0)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-hadir">
                  <CheckCircle2 aria-hidden="true" className="size-3.5" />
                  Terverifikasi
                </p>
                <p className="truncate text-lg font-semibold">{terverifikasi.siswa.nama}</p>
                <p className="truncate text-xs text-ink-muted">
                  NISN {terverifikasi.siswa.nisn} · {terverifikasi.status} ·{' '}
                  {jamSingkat(terverifikasi.waktu_masuk)}
                </p>
              </div>
            </div>
          </div>
        )}

        {gagal && (
          <div className="absolute inset-x-0 bottom-16 mx-auto w-full max-w-sm px-4 sm:inset-x-auto sm:right-6 sm:top-1/2 sm:-translate-y-1/2 sm:px-0">
            <div className="rounded-2xl border border-terlambat bg-surface p-4 text-ink shadow-2xl motion-safe:animate-[scale-in_var(--dur-mid)_var(--ease-out)]">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-terlambat">
                <CameraOff aria-hidden="true" className="size-3.5" />
                Gagal
              </p>
              <p className="mt-1 text-sm">{gagal}</p>
            </div>
          </div>
        )}

        {status === 'galat' && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center text-on-accent">
            <div>
              <CameraOff aria-hidden="true" className="mx-auto size-10 opacity-70" />
              <p className="mt-3 max-w-xs text-sm">{galat}</p>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------- kendali ------------------------------- */}
      <div className="mt-4 flex gap-2">
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
          onClick={() => {
            setGagal(null);
            setTerverifikasi(null);
            setJalan(true);
          }}
          disabled={jalan || status === 'galat'}
          className="fokus flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 font-medium transition-colors duration-[var(--dur-fast)] hover:bg-surface-sunken active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RefreshCw aria-hidden="true" className="size-4" />
          Ulangi
        </button>
      </div>

      {tampilkanModal && <HasilAbsen hasil={hasil} onTutup={() => setHasil(null)} autoTutupMs={4500} />}
    </section>
  );
}

/** Blob -> data URL supaya bisa dikirim sebagai string pada field foto_bukti. */
function potretToDataUrl(blob) {
  return new Promise((selesai) => {
    const pembaca = new FileReader();
    pembaca.onload = () => selesai(String(pembaca.result));
    pembaca.readAsDataURL(blob);
  });
}