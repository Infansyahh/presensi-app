import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Loader2, RefreshCw, ScanFace, Smile } from 'lucide-react';
import { useWebcamFace } from '../hooks/useWebcamFace';
import { potretWajah, vektorDari } from '../services/faceApi';
import { absensiApi, payloadScan } from '../services/api';
import { jamSingkat } from '../lib/statusAbsensi';
import HasilAbsen from './HasilAbsen.jsx';

const JEDA_ANTAR_SCAN_MS = 3000;

/**
 * Pemindai absensi real-time.
 *
 * Alur: kamera menyala → validasi liveness (harus berkedip) → kirim vektor
 * 128 float ke backend → tampilkan HasilAbsen. Tidak ada tombol absen; siswa
 * hanya perlu berdiri di depan kamera.
 */
export default function KameraAbsen({ onSelesai, secretPerangkat, tampilkanModal = true }) {
  const [jalan, setJalan] = useState(false);
  const [mengirim, setMengirim] = useState(false);
  const [hasil, setHasil] = useState(null);

  const terakhirScanRef = useRef(0);

  const { videoRef, canvasRef, status, galat, deteksi, kedip } = useWebcamFace({ aktif: jalan });

  const kirim = useCallback(
    async (deteksiWajah) => {
      setMengirim(true);
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

        const hasilApi = {
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
        };
        if (!respons.notifikasi?.terkirim) {
          hasilApi.pesan += ' (notifikasi WhatsApp belum terkirim)';
        }
        if (tampilkanModal) setHasil(hasilApi);
        onSelesai?.({ ...respons, sukses: true });
      } catch (galat) {
        const hasilApi = {
          sukses: false,
          judul: 'Absensi gagal',
          pesan: galat.pesan ?? 'Tidak dapat menghubungi server.',
        };
        if (tampilkanModal) setHasil(hasilApi);
        onSelesai?.({ sukses: false, pesan: hasilApi.pesan });
      } finally {
        setMengirim(false);
        terakhirScanRef.current = Date.now();
      }
    },
    [kedip, onSelesai, secretPerangkat, tampilkanModal, videoRef, canvasRef],
  );

  // Re-scan otomatis saat wajah siap (sudah berkedip) dan cooldown sudah lewat.
  // Di dalam useEffect, bukan di badan render.
  useEffect(() => {
    if (!jalan || mengirim || !deteksi || !kedip) return;
    if (Date.now() - terakhirScanRef.current < JEDA_ANTAR_SCAN_MS) return;
    terakhirScanRef.current = Date.now();
    kirim(deteksi);
  }, [jalan, mengirim, deteksi, kedip, kirim]);

  const kotak = deteksi?.detection?.box;

  return (
    <section className="w-full max-w-2xl">
      <header className="mb-4">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <ScanFace aria-hidden="true" className="size-6 text-accent" />
          Absen dengan Wajah
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Berdiri di depan kamera, lalu berkedip satu kali untuk konfirmasi.
        </p>
      </header>

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
        <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

        {/* Kotak deteksi, digeser lewat transform (bukan left/top) agar tidak reflow. */}
        {kotak && status === 'aktif' && (
          <div
            aria-hidden="true"
            className="absolute left-0 top-0 size-3/4 -translate-x-1/2 border-2 rounded-xl transition-[width,height] duration-[var(--dur-fast)]"
            style={{
              width: `${Math.min(100, kotak.width * 2.4)}%`,
              height: `${Math.min(100, kotak.height * 2.6)}%`,
              transform: `translate(calc(50% - ${kotak.x + kotak.width}px), calc(50% - ${kotak.y}px))`,
              borderColor: kedip ? 'var(--color-hadir)' : 'var(--color-terlambat)',
            }}
          />
        )}

        <div className="absolute inset-0 grid place-items-center p-6 text-center">
          {status === 'galat' && <CameraOff aria-hidden="true" className="size-10 text-ink-faint" />}
          {(status === 'idle' || status === 'meminta-izin') && <Camera aria-hidden="true" className="size-10 text-ink-faint" />}
          {mengirim && <Loader2 aria-hidden="true" className="size-10 animate-spin text-on-accent" />}
        </div>

        <div aria-live="polite" className="absolute inset-x-0 bottom-0 flex items-center justify-center">
          <p
            className={`m-3 rounded-full px-4 py-2 text-sm font-medium text-on-accent ${
              status === 'galat' ? 'bg-alpa/90' : kedip ? 'bg-hadir/90' : 'bg-ink/80'
            }`}
          >
            {status === 'galat'
              ? galat
              : mengirim
                ? 'Memproses…'
                : kedip
                  ? 'Wajah dikenali — mengirim…'
                  : jalan
                    ? 'Posisikan wajah, lalu berkedip'
                    : 'Kamera belum dinyalakan'}
          </p>
        </div>
      </div>

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
          onClick={() => setJalan(true)}
          disabled={jalan || status === 'galat'}
          className="fokus flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 font-medium transition-colors duration-[var(--dur-fast)] hover:bg-surface-sunken active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RefreshCw aria-hidden="true" className="size-4" />
          Ulangi
        </button>
      </div>

      <p className="mt-4 flex items-start gap-2 text-xs text-ink-faint">
        <Smile aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>
          Foto hanya dipakai sebagai bukti kehadiran dan disimpan pada perangkat. Vektor wajah yang
          dikirim ke server berupa 128 angka, bukan gambar.
        </span>
      </p>

      {tampilkanModal && (
        <HasilAbsen hasil={hasil} onTutup={() => setHasil(null)} autoTutupMs={4500} />
      )}
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