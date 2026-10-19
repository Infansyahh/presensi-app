import { useState } from 'react';
import { HashRouter, Outlet, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import { AuthProvider, ProtectedRoute } from './lib/auth.jsx';
import LoginPage from './pages/LoginPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Siswa from './pages/Siswa.jsx';
import Guru from './pages/Guru.jsx';
import Mapel from './pages/Mapel.jsx';
import Perangkat from './pages/Perangkat.jsx';
import PendaftaranWajah from './pages/PendaftaranWajah.jsx';
import RiwayatAbsensi from './pages/RiwayatAbsensi.jsx';
import Laporan from './pages/Laporan.jsx';
import TitikAbsen from './pages/TitikAbsen.jsx';

/** Layout dashboard: sidebar + header, konten di kanan. Butuh sesi login. */
function AdminLayout() {
  const [menuBuka, setMenuBuka] = useState(false);

  return (
    <ProtectedRoute>
      <div className="min-h-dvh bg-paper">
        <Sidebar buka={menuBuka} onTutup={() => setMenuBuka(false)} />

        {/* margin kiri menyisakan ruang untuk sidebar fixed di desktop. */}
        <div className="lg:pl-72">
          <Header onBukaMenu={() => setMenuBuka(true)} />
          <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
            <Outlet />
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

/**
 * HashRouter dipakai karena frontend disajikan sebagai berkas statis di
 * Apache/XAMPP tanpa rewrite — URL seperti #/laporan tetap aman saat di-refresh.
 */
export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          {/* Kiosk: layar penuh, tanpa sidebar, tanpa perlu login. */}
          <Route path="/absen" element={<TitikAbsen />} />

          <Route path="/login" element={<LoginPage />} />

          {/* Dashboard: semua di dalam layout admin. */}
          <Route element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/master/siswa" element={<Siswa />} />
            <Route path="/master/guru" element={<Guru />} />
            <Route path="/master/mapel" element={<Mapel />} />
            <Route path="/pendaftaran" element={<PendaftaranWajah />} />
            <Route path="/riwayat" element={<RiwayatAbsensi />} />
            <Route path="/laporan" element={<Laporan />} />
            <Route path="/perangkat" element={<Perangkat />} />
            <Route path="*" element={<Dashboard />} />
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}