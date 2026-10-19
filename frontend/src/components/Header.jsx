import { Link, useLocation } from 'react-router-dom';
import { LogOut, Menu, MonitorSmartphone } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { MENU } from './Sidebar';

/** Cari label menu yang cocok dengan rute aktif, termasuk sub-menu Data Master. */
function judulAktif(pathname) {
  const cocok = MENU.find((m) => m.ke && pathname.startsWith(m.ke));
  return cocok?.label ?? 'Dashboard';
}

export default function Header({ onBukaMenu }) {
  const { pengguna, keluar } = useAuth();
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/85 backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={onBukaMenu}
          aria-label="Buka menu"
          className="fokus rounded-lg p-2 text-ink-muted transition-colors duration-[var(--dur-fast)] hover:bg-surface-sunken hover:text-ink lg:hidden"
        >
          <Menu aria-hidden="true" className="size-5" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold">{judulAktif(pathname)}</h1>
        </div>

        <Link
          to="/absen"
          className="fokus hidden items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-sm font-medium transition-colors duration-[var(--dur-fast)] hover:bg-surface-sunken sm:flex"
        >
          <MonitorSmartphone aria-hidden="true" className="size-4" />
          Kiosk
        </Link>

        <div className="flex items-center gap-3 border-l border-line pl-3">
          <div className="text-right">
            <p className="text-sm font-medium leading-tight">{pengguna?.nama ?? '-'}</p>
            <p className="text-xs capitalize text-ink-muted">{pengguna?.peran ?? ''}</p>
          </div>
          <button
            type="button"
            onClick={keluar}
            title="Keluar"
            aria-label="Keluar dari dashboard"
            className="fokus rounded-lg p-2 text-ink-muted transition-colors duration-[var(--dur-fast)] hover:bg-terlambat-soft hover:text-terlambat active:scale-[0.97]"
          >
            <LogOut aria-hidden="true" className="size-5" />
          </button>
        </div>
      </div>
    </header>
  );
}