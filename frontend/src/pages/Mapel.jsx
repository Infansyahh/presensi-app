import { useEffect, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { pendaftaranApi } from '../services/api';

const BIDANG =
  'fokus w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm transition-colors duration-[var(--dur-fast)] hover:border-line-strong focus:border-accent disabled:cursor-not-allowed disabled:opacity-50';

export default function Mapel() {
  const [mapel, setMapel] = useState([]);
  const [form, setForm] = useState({ kode_mapel: '', nama_mapel: '' });
  const [galat, setGalat] = useState(null);
  const [memproses, setMemproses] = useState(false);

  const muat = () =>
    pendaftaranApi
      .daftarMapel()
      .then(setMapel)
      .catch((e) => setGalat(e.pesan));

  useEffect(() => {
    muat();
  }, []);

  const simpan = async (e) => {
    e.preventDefault();
    setMemproses(true);
    setGalat(null);
    try {
      await pendaftaranApi.buatMapel(form);
      setForm({ kode_mapel: '', nama_mapel: '' });
      await muat();
    } catch (err) {
      setGalat(err.pesan);
    } finally {
      setMemproses(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Plus aria-hidden="true" className="size-4 text-accent" />
          Tambah Mata Pelajaran
        </h2>

        <form onSubmit={simpan} className="mt-4 grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end">
          <div>
            <label htmlFor="m-kode" className="mb-1 block text-sm font-medium">
              Kode
            </label>
            <input
              id="m-kode"
              required
              maxLength={20}
              placeholder="MTK"
              value={form.kode_mapel}
              onChange={(e) => setForm({ ...form, kode_mapel: e.target.value })}
              className={BIDANG}
            />
          </div>
          <div>
            <label htmlFor="m-nama" className="mb-1 block text-sm font-medium">
              Nama mata pelajaran
            </label>
            <input
              id="m-nama"
              required
              value={form.nama_mapel}
              onChange={(e) => setForm({ ...form, nama_mapel: e.target.value })}
              className={BIDANG}
            />
          </div>
          <button
            type="submit"
            disabled={memproses}
            className="fokus flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-on-accent transition-[background-color,transform] duration-[var(--dur-fast)] hover:bg-accent-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {memproses ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Plus aria-hidden="true" className="size-4" />}
            Simpan
          </button>
        </form>

        {galat && (
          <p role="alert" className="mt-3 rounded-xl bg-terlambat-soft p-3 text-sm text-terlambat">
            {galat}
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="border-b border-line px-5 py-3">
          <h2 className="text-base font-semibold">Daftar Mata Pelajaran ({mapel.length})</h2>
        </div>
        {mapel.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-muted">Belum ada mata pelajaran.</p>
        ) : (
          <ul className="divide-y divide-line">
            {mapel.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-5 py-3 transition-colors duration-[var(--dur-fast)] hover:bg-surface-sunken">
                <span className="w-20 shrink-0 font-mono text-xs uppercase text-ink-muted">{m.kode_mapel}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{m.nama_mapel}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}