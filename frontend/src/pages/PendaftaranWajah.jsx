import { useCallback, useEffect, useState } from 'react';
import { Plus, Save, UserRoundPlus } from 'lucide-react';
import FormPendaftaranWajah from '../components/FormPendaftaranWajah.jsx';
import { pendaftaranApi } from '../services/api';

/**
 * Pendaftaran siswa + wajahnya, dua langkah dalam satu halaman:
 *   1. pilih siswa yang sudah ada, atau daftarkan yang baru,
 *   2. ambil sampel wajah untuk siswa terpilih.
 *
 * Ortu dibuat sekali lalu dipakai ulang bila nomornya sudah terdaftar, supaya
 * admin tidak mengetik ulang data orang tua untuk tiap anak.
 */
export default function PendaftaranWajah() {
  const [siswa, setSiswa] = useState([]);
  const [kelas, setKelas] = useState([]);
  const [ortu, setOrtu] = useState([]);
  const [terpilih, setTerpilih] = useState('');
  const [galat, setGalat] = useState(null);

  const [form, setForm] = useState({ nama: '', nisn: '', kelas_id: '', nama_ortu: '', no_whatsapp: '' });
  const [menyimpan, setMenyimpan] = useState(false);

  const muatSiswa = useCallback(async () => {
    try {
      setSiswa(await pendaftaranApi.daftarSiswa());
    } catch (e) {
      setGalat(e.pesan);
    }
  }, []);

  useEffect(() => {
    Promise.all([pendaftaranApi.daftarSiswa(), pendaftaranApi.daftarKelas(), pendaftaranApi.daftarOrtu()])
      .then(([dataSiswa, dataKelas, dataOrtu]) => {
        setSiswa(dataSiswa);
        setKelas(dataKelas);
        setOrtu(dataOrtu);
        if (dataSiswa.length > 0) setTerpilih(String(dataSiswa[0].id));
      })
      .catch((e) => setGalat(e.pesan));
  }, []);

  const simpanSiswa = async (e) => {
    e.preventDefault();
    setMenyimpan(true);
    setGalat(null);
    try {
      // Orang tua: pakai yang sudah ada kalau nomornya cocok, kalau tidak buat baru.
      let ortuId = null;
      const nomor = form.no_whatsapp.replace(/\D/g, '');
      const ada = ortu.find((o) => o.no_whatsapp.replace(/\D/g, '') === nomor);
      ortuId = ada?.id ?? (await pendaftaranApi.buatOrtu({ nama_ortu: form.nama_ortu, no_whatsapp: form.no_whatsapp })).id;

      const baru = await pendaftaranApi.buatSiswa({
        nisn: form.nisn,
        nama: form.nama,
        kelas_id: Number(form.kelas_id),
        ortu_id: ortuId,
      });

      setForm({ nama: '', nisn: '', kelas_id: '', nama_ortu: '', no_whatsapp: '' });
      await muatSiswa();
      setTerpilih(String(baru.id));
    } catch (err) {
      setGalat(err.pesan);
    } finally {
      setMenyimpan(false);
    }
  };

  const kelasLabel = (id) => kelas.find((k) => String(k.id) === String(id))?.nama_kelas ?? '-';
  const bidang = 'fokus w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm transition-colors duration-[var(--dur-fast)] hover:border-line-strong focus:border-accent disabled:cursor-not-allowed disabled:opacity-50';
  const label = 'mb-1 block text-sm font-medium';

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <UserRoundPlus aria-hidden="true" className="size-5 text-accent" />
          Data Siswa
        </h2>

        <label htmlFor="pilih-siswa-kelas" className={`${label} mt-4`}>
          Siswa terdaftar
        </label>
        <select
          id="pilih-siswa-kelas"
          value={terpilih}
          onChange={(e) => setTerpilih(e.target.value)}
          className={bidang}
        >
          {siswa.length === 0 && <option value="">— belum ada siswa —</option>}
          {siswa.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nama} — {kelasLabel(s.kelas_id)}
            </option>
          ))}
        </select>

        <form onSubmit={simpanSiswa} className="mt-6 border-t border-line pt-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Plus aria-hidden="true" className="size-4 text-accent" />
            Tambah siswa baru
          </h3>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="f-nama" className={label}>
                Nama siswa
              </label>
              <input
                id="f-nama"
                required
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                className={bidang}
              />
            </div>
            <div>
              <label htmlFor="f-nisn" className={label}>
                NISN
              </label>
              <input
                id="f-nisn"
                required
                inputMode="numeric"
                pattern="\d{10}"
                maxLength={10}
                value={form.nisn}
                onChange={(e) => setForm({ ...form, nisn: e.target.value })}
                className={bidang}
              />
            </div>
            <div>
              <label htmlFor="f-kelas" className={label}>
                Kelas
              </label>
              <select
                id="f-kelas"
                required
                value={form.kelas_id}
                onChange={(e) => setForm({ ...form, kelas_id: e.target.value })}
                className={bidang}
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
              <label htmlFor="f-ortu" className={label}>
                Nama orang tua
              </label>
              <input
                id="f-ortu"
                required
                value={form.nama_ortu}
                onChange={(e) => setForm({ ...form, nama_ortu: e.target.value })}
                className={bidang}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="f-wa" className={label}>
                WhatsApp orang tua
              </label>
              <input
                id="f-wa"
                required
                inputMode="tel"
                placeholder="08xxxxxxxxxx"
                value={form.no_whatsapp}
                onChange={(e) => setForm({ ...form, no_whatsapp: e.target.value })}
                className={bidang}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={menyimpan || kelas.length === 0}
            className="fokus mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 font-medium text-on-accent transition-[background-color,transform] duration-[var(--dur-fast)] hover:bg-accent-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Save aria-hidden="true" className="size-4" />
            {menyimpan ? 'Menyimpan…' : 'Simpan Siswa'}
          </button>

          {kelas.length === 0 && (
            <p className="mt-3 rounded-xl bg-terlambat-soft p-3 text-sm text-terlambat">
              Belum ada data kelas. Isi tabel <code>kelas</code> dulu di dashboard admin.
            </p>
          )}
        </form>

        {galat && (
          <p role="alert" className="mt-4 rounded-xl bg-terlambat-soft p-3 text-sm text-terlambat">
            {galat}
          </p>
        )}
      </section>

      <section>
        <FormPendaftaranWajah siswaId={terpilih || undefined} onSelesai={muatSiswa} />
      </section>
    </div>
  );
}