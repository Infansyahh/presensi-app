import { useCallback, useEffect, useRef, useState } from 'react';
import { buatPelacakKedip, deteksiWajah, geserKotak, muatModel, probeDeteksi, MAKS_GESER, backendAktif } from '../services/faceApi';

/**
 * Siklus hidup webcam + loop deteksi wajah.
 *
 * Dipakai KameraAbsen dan FormPendaftaranWajah supaya Permissions handling,
 * cleanup stream, dan loop deteksi hanya ditulis sekali.
 *
 * `jedaMs` (default 200 ms) membatasi frekuensi deteksi. Lebih cepat dari itu
 * membuat tab berat dan CPU jadi panas, tanpa hasil yang lebih baik. Frame yang
 * belum selesai dihitung dilewati lewat `sibukRef`.
 *
 * Yang dikembalikan juga menyertakan `galatDeteksi` dan `diagnostik` — kalau
 * deteksi gagal, alasannya HARUS tampil di layar. Versi sebelumnya menelan
 * error dengan `catch {}` sehingga masalahnya tidak pernah terlihat.
 *
 * @returns status: 'idle' | 'meminta-izin' | 'aktif' | 'galat'
 */
export function useWebcamFace({ aktif = true, jedaMs = 200 } = {}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const sibukRef = useRef(false);
  const pelacakRef = useRef(null);

  // Kotak sebelumnya dipakai menghitung kestabilan wajah antar-frame.
  const kotakRef = useRef(null);
  const diamRef = useRef(0);

  const [status, setStatus] = useState('idle');
  const [galat, setGalat] = useState(null);
  const [galatDeteksi, setGalatDeteksi] = useState(null);
  const [diagnostik, setDiagnostik] = useState(null);
  const [siapModel, setSiapModel] = useState(false);
  const [deteksi, setDeteksi] = useState(null);
  const [kedip, setKedip] = useState(false);

  const stop = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((jalur) => jalur.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    kotakRef.current = null;
    diamRef.current = 0;
    setDeteksi(null);
    setKedip(false);
  }, []);

  useEffect(() => {
    if (!aktif) {
      stop();
      setStatus('idle');
      return undefined;
    }

    let batal = false;

    async function mulai() {
      setStatus('meminta-izin');
      setGalat(null);
      setGalatDeteksi(null);
      setSiapModel(false);
      pelacakRef.current = buatPelacakKedip();

      try {
        await muatModel();
        if (batal) return;
        setSiapModel(true);

        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Browser ini tidak mendukung akses kamera.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (batal) {
          stream.getTracks().forEach((jalur) => jalur.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
        if (batal) return;
        setStatus('aktif');

        // Satu probe saat kamera menyala: memastikan inferensi benar-benar jalan
        // dan memberi angka yang bisa dilihat kalau nanti gagal.
        probeDeteksi(videoRef.current)
          .then((hasil) => !batal && setDiagnostik(hasil))
          .catch((galat) => !batal && setGalatDeteksi(`Deteksi gagal: ${galat.message}`));

        timerRef.current = setInterval(async () => {
          const el = videoRef.current;
          if (batal || !el || el.readyState < 2 || sibukRef.current) return;

          sibukRef.current = true;
          const mulai = performance.now();
          try {
            const hasil = await deteksiWajah(el);
            if (batal) return;

            if (hasil.length > 0) {
              const wajah = hasil[0];
              const kotakBaru = wajah.detection?.box;

              // Wajah "diam" beberapa frame berturut-turut = layak diambil sampel.
              diamRef.current =
                geserKotak(kotakRef.current, kotakBaru) < MAKS_GESER ? diamRef.current + 1 : 0;
              kotakRef.current = kotakBaru;

              const rasio = pelacakRef.current.amati(wajah.landmarks);
              setKedip(pelacakRef.current.kedip_terdeteksi);
              setDeteksi({ ...wajah, rasioMata: rasio, banyakWajah: hasil.length });
            } else {
              kotakRef.current = null;
              diamRef.current = 0;
              setDeteksi(null);
              setKedip(false);
            }

            setGalatDeteksi(null);
            setDiagnostik({
              jumlah: hasil.length,
              skor: hasil.map((d) => Number((d.detection.score ?? 0).toFixed(3))),
              durasi: Math.round(performance.now() - mulai),
              backend: backendAktif(),
            });
          } catch (galatDeteksi) {
            // TIDAK ditelan: tanpa ini, kegagalan diam-diam dan kotak tidak pernah muncul.
            diamRef.current = 0;
            kotakRef.current = null;
            setDeteksi(null);
            const pesan = galatDeteksi?.message ?? String(galatDeteksi);
            setGalatDeteksi(pesan);
            console.error('[face-api] deteksi gagal:', galatDeteksi);
          } finally {
            sibukRef.current = false;
          }
        }, jedaMs);
      } catch (galatAsli) {
        if (batal) return;
        const nama = galatAsli.name ?? '';
        const pesan =
          nama === 'NotAllowedError'
            ? 'Izin kamera ditolak. Aktifkan izin kamera untuk situs ini lalu muat ulang.'
            : nama === 'NotFoundError'
              ? 'Tidak ada kamera yang terdeteksi pada perangkat ini.'
              : nama === 'NotReadableError'
                ? 'Kamera sedang dipakai aplikasi lain.'
                : (galatAsli.message ?? 'Kamera gagal dinyalakan.');
        setGalat(pesan);
        setStatus('galat');
      }
    }

    mulai();

    return () => {
      batal = true;
      stop();
    };
  }, [aktif, jedaMs, stop]);

  // Dibaca saat render, jadi nilainya selalu yang terbaru dari loop terakhir.
  const frameDiam = diamRef.current;

  return { videoRef, canvasRef, status, galat, galatDeteksi, diagnostik, siapModel, deteksi, kedip, frameDiam, stop };
}