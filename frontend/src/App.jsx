import { HashRouter, NavLink, Outlet, Route, Routes } from 'react-router-dom';
import { BarChart3, ClipboardList, ScanFace, UserPlus } from 'lucide-react';
import TitikAbsen from './pages/TitikAbsen.jsx';
import PendaftaranWajah from './pages/PendaftaranWajah.jsx';
import RiwayatAbsensi from './pages/RiwayatAbsensi.jsx';
import Laporan from './pages/Laporan.jsx';

const MENU = [
  { to: '/absen', label: 'Titik Absen', Ikon: ScanFace },
  { to: '/pendaftaran', label: 'Pendaftaran', Ikon: UserPlus },
  { to: '/riwayat', label: 'Riwayat', Ikon: ClipboardList },
  { to: '/laporan', label: 'Laporan', Ikon: BarChart3 },
];

/**
 * HashRouter dipakai karena frontend disajikan sebagai berkas statis di Apache/XAMPP
 * tanpa rewrite: setiap URL masuk dari address bar tidak akan 404 saat dimuat ulang.
 * Kalau someday backend juga melayani SPA-nya, ganti ke BrowserRouter.
 */
function Rakit() {
  return (
    <div className="mx-auto min-h-dvh max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6 border-b border-line pb-4">
        <h1 className="text-2xl font-semibold">Absensi Wajah Sekolah</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Pengenalan wajah di browser, pencatatan kehadiran di server.
        </p>
      </header>

      <nav aria-label="Bagian aplikasi" className="mb-6">
        <ul className="flex flex-wrap gap-1">
          {MENU.map(({ to, label, Ikon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `fokus flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-[var(--dur-fast)] ${
                    isActive
                      ? 'bg-accent-soft text-accent'
                      : 'text-ink-muted hover:bg-surface-sunken hover:text-ink'
                  }`
                }
              >
                <Ikon aria-hidden="true" className="size-4" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Rakit />}>
          <Route index element={<TitikAbsen />} />
          <Route path="absen" element={<TitikAbsen />} />
          <Route path="pendaftaran" element={<PendaftaranWajah />} />
          <Route path="riwayat" element={<RiwayatAbsensi />} />
          <Route path="laporan" element={<Laporan />} />
          <Route path="*" element={<TitikAbsen />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}