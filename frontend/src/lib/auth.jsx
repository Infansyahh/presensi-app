import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authApi } from '../services/api';

/**
 * Status sesi dashboard.
 *
 * `memuat` dipakai supaya ProtectedRoute tidak sempat melempar keluar sebelum
 * token tersimpan diperiksa — tanpa itu, refresh halaman selalu ke /login.
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [pengguna, setPengguna] = useState(null);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    let batal = false;

    authApi
      .sesi()
      .then((akun) => !batal && setPengguna(akun))
      .catch(() => !batal && setPengguna(null))
      .finally(() => !batal && setMemuat(false));

    // Dipicu interceptor axios saat token ditolak server.
    const keluar = () => setPengguna(null);
    window.addEventListener('absensi:keluar', keluar);

    return () => {
      batal = true;
      window.removeEventListener('absensi:keluar', keluar);
    };
  }, []);

  const masuk = useCallback(async (username, password) => {
    const akun = await authApi.masuk(username, password);
    setPengguna(akun);
    return akun;
  }, []);

  const keluar = useCallback(() => {
    authApi.keluar();
    setPengguna(null);
  }, []);

  const nilai = useMemo(() => ({ pengguna, memuat, masuk, keluar }), [pengguna, memuat, masuk, keluar]);
  return <AuthContext.Provider value={nilai}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const konteks = useContext(AuthContext);
  if (!konteks) throw new Error('useAuth harus dipakai di dalam <AuthProvider>');
  return konteks;
}

/** Halaman yang butuh sesi login. Kiosk (/absen) tidak memakai ini. */
export function ProtectedRoute({ children }) {
  const { pengguna, memuat } = useAuth();
  const lokasi = useLocation();

  if (memuat) {
    return (
      <div className="grid min-h-dvh place-items-center text-ink-muted">
        <p className="text-sm">Memeriksa sesi…</p>
      </div>
    );
  }

  if (!pengguna) return <Navigate to="/login" replace state={{ dari: lokasi.pathname }} />;
  return children;
}