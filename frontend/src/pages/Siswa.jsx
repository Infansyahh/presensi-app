import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { pendaftaranApi } from '../services/api';

const BIDANG =
  'fokus w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm transition-colors duration-[var(--dur-fast)] hover:border-line-strong focus:border-accent disabled:cursor-not-allowed disabled:opacity-50';

export default function Siswa() {
  const [siswa, setSiswa] = useState([]);
  const [kelas, setKelas] = useState([]);
  const [ortu, setOrtu] = useState([]);
  const [form, setForm] = useState({ nama: '', nisn: '', kelas_id: '', nama_ortu: '', no_whatsapp: '' });
  const [galat, setGalat] = useState(null);
  const [sukses, setSukses] = useState(null);
  const [memproses, setMemproses] = useState(false);

  const muat = useCallback(async () => {
    try {
      setSiswa(await pendaftaranApi.daftarSiswa());
    } catch (e) {
      setGalat(e.pesan);
    }
  }, []);

  useEffect(() => {
    muat();
    Promise.all([pendaftaranApi.daftarKelas(), pendaftaranApi.daftarOrtu()])
      .then(([k, o]) => {
        setKelas(k);
        setOrtu(o);
      })
      .catch((e) => setGalat(e.pesan));
  }, [muat]);

  const simpan = async (e) => {
    e.preventDefault();
    setMemproses(true);
    setGalat(null);
    setSukses(null);
    try {
      // Orang tua dipakai ulang bila nomor WhatsApp-nya sama — tidak perlu
      // mengetik ulang untuk anak kedua dari orang tua yang sama.
      const nomor = form.no_whatsapp.replace(/\D/g, '');
      const ada = ortu.find((o) => o.no_whatsapp.replace(/\D/g, '') === nomor);
      const ortuId = ada?.id ?? (await pendaftaranApi.buatOrtu({ nama_ortu: form.nama_ortu, no_whatsapp: form.no_whatsapp })).id;

      const baru = await pendaftaranApi.buatSiswa({
        nisn: form.nisn,
        nama: form.nama,
        kelas_id: Number(form.kelas_id),
        ortu_id: ortuId,
      });

      setSukses(`${baru.nama} didaftarkan. Langkah berikutnya: Pendaftaran Wajah.`);
      setForm({ nama: '', nisn: '', kelas_id: '', nama_ortu: '', no_whatsapp: '' });
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
      await pendaftaranApi.hapusSiswa(id);
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
          Tambah Siswa
        </h2>

        <form onSubmit={simpan} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="s-nama" className="mb-1 block text-sm font-medium">
              Nama
            </label>
            <input
              id="s-nama"
              required
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              className={BIDANG}
            />
          </div>
          <div>
            <label htmlFor="s-nisn" className="mb-1 block text-sm font-medium">
              NISN
            </label>
            <input
              id="s-nisn"
              required
              inputMode="numeric"
              maxLength={10}
              value={form.nisn}
              onChange={(e) => setForm({ ...form, nisn: e.target.value })}
              className={BIDANG}
            />
          </div>
          <div>
            <label htmlFor="s-kelas" className="mb-1 block text-sm font-medium">
              Kelas
            </label>
            <select
              id="s-kelas"
              required
              value={form.kelas_id}
              onChange={(e) => setForm({ ...form, kelas_id: e.target.value })}
              className={BIDANG}
            >
              <option value="">— pilih —</option>
              {kelas.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama_kelas}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="s-ortu" className="mb-1 block text-sm font-medium">
              Nama orang tua
            </label>
            <input
              id="s-ortu"
              required
              value={form.nama_ortu}
              onChange={(e) => setForm({ ...form, nama_ortu: e.target.value })}
              className={BIDANG}
            />
          </div>
          <div>
            <label htmlFor="s-wa" className="mb-1 block text-sm font-medium">
              WhatsApp orang tua
            </label>
            <input
              id="s-wa"
              required
              inputMode="tel"
              placeholder="08xxxxxxxxxx"
              value={form.no_whatsapp}
              onChange={(e) => setForm({ ...form, no_whatsapp: e.target.value })}
              className={BIDANG}
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={memproses || kelas.length === 0}
              className="fokus flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-on-accent transition-[background-color,transform] duration-[var(--dur-fast)] hover:bg-accent-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {memproses ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Plus aria-hidden="true" className="size-4" />}
              Simpan
            </button>
          </div>
        </form>

        {kelas.length === 0 && (
          <p className="mt-3 rounded-xl bg-terlambat-soft p-3 text-sm text-terlambat">
            Tabel <code>kelas</code> masih kosong. Isi dulu lewat SQL sebelum menambah siswa.
          </p>
        )}
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
          <h2 className="text-base font-semibold">Daftar Siswa ({siswa.length})</h2>
        </div>

        {siswa.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-muted">Belum ada siswa.</p>
        ) : (
          <ul className="divide-y divide-line">
            {siswa.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3 transition-colors duration-[var(--dur-fast)] hover:bg-surface-sunken">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{s.nama}</p>
                  <p className="text-xs text-ink-muted">
                    NISN {s.nisn} · {s.nama_kelas ?? '-'}
                    {s.nama_ortu ? ` · ortu ${s.nama_ortu}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => hapus(s.id)}
                  aria-label={`Hapus ${s.nama}`}
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