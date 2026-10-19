import { useCallback, useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2, MonitorSmartphone, Plus, Trash2 } from 'lucide-react';
import { perangkatApi } from '../services/api';

const BIDANG =
  'fokus w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm transition-colors duration-[var(--dur-fast)] hover:border-line-strong focus:border-accent disabled:cursor-not-allowed disabled:opacity-50';

const acakSecret = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

export default function Perangkat() {
  const [perangkat, setPerangkat] = useState([]);
  const [form, setForm] = useState({ nama_perangkat: '', lokasi: '', secret_key: '' });
  const [lihat, setLihat] = useState(false);
  const [galat, setGalat] = useState(null);
  const [sukses, setSukses] = useState(null);
  const [memproses, setMemproses] = useState(false);

  const muat = useCallback(async () => {
    try {
      setPerangkat(await perangkatApi.daftar());
    } catch (e) {
      setGalat(e.pesan);
    }
  }, []);

  useEffect(() => {
    muat();
  }, [muat]);

  const simpan = async (e) => {
    e.preventDefault();
    setMemproses(true);
    setGalat(null);
    setSukses(null);
    try {
      const baru = await perangkatApi.buat(form);
      setSukses(`Perangkat "${baru.nama_perangkat}" ditambahkan. Salin secret-nya ke VITE_PERANGKAT_SECRET di frontend.`);
      setForm({ nama_perangkat: '', lokasi: '', secret_key: acakSecret() });
      await muat();
    } catch (err) {
      setGalat(err.pesan);
    } finally {
      setMemproses(false);
    }
  };

  const hapus = async (id) => {
    setGalat(null);
    try {
      await perangkatApi.hapus(id);
      await muat();
    } catch (e) {
      setGalat(e.pesan);
    }
  };

  return (
    <div className="space-y-6">
      <p className="rounded-xl bg-accent-soft p-3 text-sm text-accent">
        Tiap kamera absen punya secret sendiri. Isi <code>VITE_PERANGKAT_SECRET</code> di{' '}
        <code>frontend/.env</code> dengan nilai secret perangkat yang dipakai, kalau tidak
        pemindaian akan dijawab <code>401</code>.
      </p>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Plus aria-hidden="true" className="size-4 text-accent" />
          Tambah Perangkat Absen
        </h2>

        <form onSubmit={simpan} className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="p-nama" className="mb-1 block text-sm font-medium">
              Nama perangkat
            </label>
            <input
              id="p-nama"
              required
              placeholder="Kamera Gerbang Utama"
              value={form.nama_perangkat}
              onChange={(e) => setForm({ ...form, nama_perangkat: e.target.value })}
              className={BIDANG}
            />
          </div>
          <div>
            <label htmlFor="p-lokasi" className="mb-1 block text-sm font-medium">
              Lokasi
            </label>
            <input
              id="p-lokasi"
              required
              placeholder="Pintu depan sekolah"
              value={form.lokasi}
              onChange={(e) => setForm({ ...form, lokasi: e.target.value })}
              className={BIDANG}
            />
          </div>
          <div>
            <label htmlFor="p-secret" className="mb-1 block text-sm font-medium">
              Secret key
            </label>
            <div className="relative">
              <input
                id="p-secret"
                required
                value={form.secret_key}
                onChange={(e) => setForm({ ...form, secret_key: e.target.value })}
                className={`${BIDANG} pr-11 font-mono text-xs`}
              />
              <button
                type="button"
                onClick={() => setLihat((v) => !v)}
                aria-label={lihat ? 'Sembunyikan secret' : 'Tampilkan secret'}
                aria-pressed={lihat}
                className="fokus absolute right-1 top-1/2 -translate-y-1/2 rounded-lg p-2 text-ink-muted transition-colors duration-[var(--dur-fast)] hover:bg-surface-sunken hover:text-ink"
              >
                {lihat ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, secret_key: acakSecret() })}
              className="fokus mt-1 rounded-lg text-xs text-accent underline underline-offset-4 hover:no-underline"
            >
              buat secret acak
            </button>
          </div>

          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={memproses}
              className="fokus flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-on-accent transition-[background-color,transform] duration-[var(--dur-fast)] hover:bg-accent-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {memproses ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Plus aria-hidden="true" className="size-4" />}
              Simpan Perangkat
            </button>
          </div>
        </form>

        {galat && (
          <p role="alert" className="mt-3 rounded-xl bg-terlambat-soft p-3 text-sm text-terlambat">
            {galat}
          </p>
        )}
        {sukses && (
          <p role="status" className="mt-3 rounded-xl bg-hadir-soft p-3 text-sm text-hadir">
            {sukses}
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="border-b border-line px-5 py-3">
          <h2 className="text-base font-semibold">Daftar Perangkat ({perangkat.length})</h2>
        </div>

        {perangkat.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-muted">
            <MonitorSmartphone aria-hidden="true" className="mx-auto mb-2 size-8 text-ink-faint" />
            Belum ada perangkat. Tambahkan minimal satu sebelum memakai titik absen.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {perangkat.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3 transition-colors duration-[var(--dur-fast)] hover:bg-surface-sunken">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.nama_perangkat}</p>
                  <p className="text-xs text-ink-muted">
                    {p.lokasi} · secret <code className="font-mono">{p.secret_key.slice(0, 8)}…</code>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => hapus(p.id)}
                  aria-label={`Hapus ${p.nama_perangkat}`}
                  className="fokus rounded-lg p-2 text-ink-muted transition-colors duration-[var(--dur-fast)] hover:bg-terlambat-soft hover:text-terlambat active:scale-[0.97]"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}