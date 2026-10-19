import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, LogIn, ScanFace } from 'lucide-react';
import { useAuth } from '../lib/auth';

const BIDANG =
  'fokus w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm transition-colors duration-[var(--dur-fast)] hover:border-line-strong focus:border-accent disabled:cursor-not-allowed disabled:opacity-50';

export default function LoginPage() {
  const { pengguna, masuk } = useAuth();
  const navigasi = useNavigate();
  const lokasi = useLocation();

  const [form, setForm] = useState({ username: '', password: '' });
  const [lihat, setLihat] = useState(false);
  const [galat, setGalat] = useState(null);
  const [memproses, setMemproses] = useState(false);

  if (pengguna) return <Navigate to={lokasi.state?.dari ?? '/dashboard'} replace />;

  const kirim = async (e) => {
    e.preventDefault();
    setMemproses(true);
    setGalat(null);
    try {
      await masuk(form.username, form.password);
      navigasi(lokasi.state?.dari ?? '/dashboard', { replace: true });
    } catch (err) {
      setGalat(err.pesan);
    } finally {
      setMemproses(false);
    }
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_28rem]">
      {/* Panel kiri: identitas. Di layar kecil disembunyikan agar form dapat fokus penuh. */}
      <section className="hidden flex-col justify-between bg-ink p-10 text-on-accent lg:flex">
        <div className="flex items-center gap-3">
          <ScanFace aria-hidden="true" className="size-7" />
          <span className="text-lg font-semibold">Absensi Wajah Sekolah</span>
        </div>
        <div className="max-w-md">
          <h1 className="text-4xl font-semibold leading-tight">
            Kenali siswa hanya dengan melihat wajahnya.
          </h1>
          <p className="mt-4 text-sm opacity-80">
            Deteksi wajah berjalan di dalam browser. Server hanya menerima vektor 128
            angka — foto siswa tidak pernah dikirim untuk dianalisis.
          </p>
        </div>
        <p className="text-xs opacity-60">Butuh akses perangkat? Hubungi administrator sekolah.</p>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-semibold">Masuk ke Dashboard</h2>
          <p className="mt-1 text-sm text-ink-muted">Gunakan akun admin atau guru.</p>

          <form onSubmit={kirim} className="mt-6 space-y-4">
            <div>
              <label htmlFor="username" className="mb-1 block text-sm font-medium">
                Username
              </label>
              <input
                id="username"
                autoComplete="username"
                required
                autoFocus
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className={BIDANG}
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={lihat ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={`${BIDANG} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setLihat((v) => !v)}
                  aria-label={lihat ? 'Sembunyikan password' : 'Tampilkan password'}
                  aria-pressed={lihat}
                  className="fokus absolute right-1 top-1/2 -translate-y-1/2 rounded-lg p-2 text-ink-muted transition-colors duration-[var(--dur-fast)] hover:bg-surface-sunken hover:text-ink active:scale-[0.97]"
                >
                  {lihat ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
                </button>
              </div>
            </div>

            {galat && (
              <p role="alert" className="rounded-xl bg-terlambat-soft p-3 text-sm text-terlambat">
                {galat}
              </p>
            )}

            <button
              type="submit"
              disabled={memproses}
              className="fokus flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 font-medium text-on-accent transition-[background-color,transform] duration-[var(--dur-fast)] hover:bg-accent-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {memproses ? (
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <LogIn aria-hidden="true" className="size-4" />
              )}
              {memproses ? 'Memeriksa…' : 'Masuk'}
            </button>
          </form>

          <p className="mt-6 rounded-xl bg-surface-sunken p-3 text-xs text-ink-muted">
            Akun uji: <code>admin</code> / <code>admin123</code> · <code>guru</code> /{' '}
            <code>guru123</code>. Ganti sebelum dipakai di sekolah sungguhan.
          </p>

          <a
            href="#/absen"
            className="fokus mt-4 inline-block rounded-lg text-sm text-accent underline underline-offset-4 hover:no-underline"
          >
            Buka titik absen (tanpa login)
          </a>
        </div>
      </section>
    </div>
  );
}