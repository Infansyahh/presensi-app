import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { pendaftaranApi } from '../services/api';

const BIDANG =
  'fokus w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm transition-colors duration-[var(--dur-fast)] hover:border-line-strong focus:border-accent disabled:cursor-not-allowed disabled:opacity-50';

export default function Guru() {
  const [guru, setGuru] = useState([]);
  const [mapel, setMapel] = useState([]);
  const [form, setForm] = useState({ nip: '', nama: '', email: '', mapel_id: '' });
  const [galat, setGalat] = useState(null);
  const [memproses, setMemproses] = useState(false);

  const muat = useCallback(async () => {
    try {
      setGuru(await pendaftaranApi.daftarGuru());
    } catch (e) {
      setGalat(e.pesan);
    }
  }, []);

  useEffect(() => {
    muat();
    pendaftaranApi.daftarMapel().then(setMapel).catch((e) => setGalat(e.pesan));
  }, [muat]);

  const simpan = async (e) => {
    e.preventDefault();
    setMemproses(true);
    setGalat(null);
    try {
      await pendaftaranApi.buatGuru({ ...form, mapel_id: form.mapel_id ? Number(form.mapel_id) : null });
      setForm({ nip: '', nama: '', email: '', mapel_id: '' });
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
      await pendaftaranApi.hapusGuru(id);
      await muat();
    } catch (e) {
      setGalat(e.pesan);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Plus aria-hidden="true" className="size-4 text-accent" />
          Tambah Guru
        </h2>

        <form onSubmit={simpan} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="g-nip" className="mb-1 block text-sm font-medium">
              NIP
            </label>
            <input
              id="g-nip"
              required
              value={form.nip}
              onChange={(e) => setForm({ ...form, nip: e.target.value })}
              className={BIDANG}
            />
          </div>
          <div>
            <label htmlFor="g-nama" className="mb-1 block text-sm font-medium">
              Nama
            </label>
            <input
              id="g-nama"
              required
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              className={BIDANG}
            />
          </div>
          <div>
            <label htmlFor="g-email" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <input
              id="g-email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={BIDANG}
            />
          </div>
          <div>
            <label htmlFor="g-mapel" className="mb-1 block text-sm font-medium">
              Mata pelajaran
            </label>
            <select
              id="g-mapel"
              value={form.mapel_id}
              onChange={(e) => setForm({ ...form, mapel_id: e.target.value })}
              className={BIDANG}
            >
              <option value="">— belum ada —</option>
              {mapel.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nama_mapel}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              disabled={memproses}
              className="fokus flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-on-accent transition-[background-color,transform] duration-[var(--dur-fast)] hover:bg-accent-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {memproses ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Plus aria-hidden="true" className="size-4" />}
              Simpan Guru
            </button>
          </div>
        </form>

        {galat && (
          <p role="alert" className="mt-3 rounded-xl bg-terlambat-soft p-3 text-sm text-terlambat">
            {galat}
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="border-b border-line px-5 py-3">
          <h2 className="text-base font-semibold">Daftar Guru ({guru.length})</h2>
        </div>

        {guru.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-muted">Belum ada guru.</p>
        ) : (
          <ul className="divide-y divide-line">
            {guru.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center gap-3 px-5 py-3 transition-colors duration-[var(--dur-fast)] hover:bg-surface-sunken">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{g.nama}</p>
                  <p className="text-xs text-ink-muted">
                    NIP {g.nip} · {g.email}
                    {g.nama_mapel ? ` · ${g.nama_mapel}` : ''}
                    {g.wali_kelas ? ` · wali ${g.wali_kelas}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => hapus(g.id)}
                  aria-label={`Hapus ${g.nama}`}
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