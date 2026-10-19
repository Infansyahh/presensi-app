import { NavLink } from 'react-router-dom';
import {
  BookMarked,
  CalendarCheck,
  GraduationCap,
  LayoutDashboard,
  Map as IkonPeta,
  MonitorSmartphone,
  ScanFace,
  Users,
  UserSquare2,
  X,
} from 'lucide-react';

export const MENU = [
  { ke: '/dashboard', label: 'Dashboard', Ikon: LayoutDashboard },
  { grup: 'Data Master' },
  { ke: '/master/siswa', label: 'Siswa', Ikon: GraduationCap },
  { ke: '/master/guru', label: 'Guru', Ikon: UserSquare2 },
  { ke: '/master/mapel', label: 'Mapel', Ikon: BookMarked },
  { grup: 'Absensi' },
  { ke: '/pendaftaran', label: 'Pendaftaran Wajah', Ikon: ScanFace },
  { ke: '/riwayat', label: 'Riwayat & Laporan', Ikon: CalendarCheck },
  { ke: '/perangkat', label: 'Perangkat Absen', Ikon: MonitorSmartphone },
];

/**
 * Sidebar dashboard. Desktop: tetap di kiri. Mobile: tersembunyi sampai menu
 * dibuka, lalu jadi lapisan penuh (overlay) supaya konten tidak tergeser.
 */
export default function Sidebar({ buka, onTutup }) {
  return (
    <>
      {/* Lapisan gelap di belakang menu mobile. */}
      {buka && (
        <button
          type="button"
          aria-label="Tutup menu"
          onClick={onTutup}
          className="fixed inset-0 z-30 bg-ink/45 lg:hidden"
        />
      )}

      <aside
        aria-label="Menu utama"
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-line bg-surface transition-transform duration-[var(--dur-mid)] ease-[var(--ease-out)] lg:translate-x-0 ${
          buka ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-4">
          <span className="flex items-center gap-2 font-semibold">
            <Users aria-hidden="true" className="size-5 text-accent" />
            Absensi Wajah
          </span>
          <button
            type="button"
            onClick={onTutup}
            aria-label="Tutup menu"
            className="fokus rounded-lg p-1.5 text-ink-muted transition-colors duration-[var(--dur-fast)] hover:bg-surface-sunken hover:text-ink lg:hidden"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-0.5">
            {MENU.map(({ ke, label, Ikon, grup }) =>
              grup ? (
                <li key={grup} className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  {grup}
                </li>
              ) : (
                <li key={ke}>
                  <NavLink
                    to={ke}
                    onClick={onTutup}
                    className={({ isActive }) =>
                      `fokus flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-[var(--dur-fast)] ${
                        isActive
                          ? 'bg-accent-soft text-accent'
                          : 'text-ink-muted hover:bg-surface-sunken hover:text-ink'
                      }`
                    }
                  >
                    <Ikon aria-hidden="true" className="size-4 shrink-0" />
                    {label}
                  </NavLink>
                </li>
              ),
            )}
          </ul>
        </nav>

        <div className="border-t border-line p-3">
          <NavLink
            to="/absen"
            onClick={onTutup}
            className="fokus flex items-center justify-center gap-2 rounded-xl bg-ink px-3 py-2.5 text-sm font-medium text-on-accent transition-[background-color,transform] duration-[var(--dur-fast)] hover:bg-ink/90 active:scale-[0.99]"
          >
            <ScanFace aria-hidden="true" className="size-4" />
            Mode Kiosk
          </NavLink>
        </div>
      </aside>
    </>
  );
}