import { useCallback, useEffect, useRef, useState } from 'react';
import { buatPelacakKedip, deteksiWajah, muatModel } from '../services/faceApi';

/**
 * Siklus hidup webcam + loop deteksi wajah.
 *
 * Dipakai KameraAbsen dan FormPendaftaranWajah supaya Permissions handling,
 * cleanup stream, dan loop deteksi hanya ditulis sekali.
 *
 * @returns status: 'idle' | 'meminta-izin' | 'aktif' | 'galat'
 */
export function useWebcamFace({ aktif = true, jedaMs = 350 } = {}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const sibukRef = useRef(false);
  const pelacakRef = useRef(null);

  const [status, setStatus] = useState('idle');
  const [galat, setGalat] = useState(null);
  const [siapModel, setSiapModel] = useState(false);
  const [deteksi, setDeteksi] = useState(null);
  const [kedip, setKedip] = useState(false);

  const stop = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((jalur) => jalur.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
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

        timerRef.current = setInterval(async () => {
          const el = videoRef.current;
          if (batal || !el || el.readyState < 2 || sibukRef.current) return;

          sibukRef.current = true;
          try {
            const hasil = await deteksiWajah(el);
            if (batal) return;

            if (hasil.length > 0) {
              const rasio = pelacakRef.current.amati(hasil[0].landmarks);
              setKedip(pelacakRef.current.kedip_terdeteksi);
              setDeteksi({ ...hasil[0], rasioMata: rasio, banyakWajah: hasil.length });
            } else {
              setDeteksi(null);
              setKedip(false);
            }
          } catch {
            // Frame langka gagal diabaikan; loop berikutnya mencoba lagi.
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

  return { videoRef, canvasRef, status, galat, siapModel, deteksi, kedip, stop };
}