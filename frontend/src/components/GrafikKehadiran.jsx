import { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { SEMUA_STATUS, STATUS_ABSENSI } from '../lib/statusAbsensi';

/**
 * Grafik batang bertumpuk rekapitulasi kehadiran.
 *
 * SVG murni — tanpa Chart.js/Recharts. Bar shaped yang dibutuhkan hanya satu
 * batang per tanggal dengan 5 segmen, dan SVG memberi kontrol penuh atas
 * responsivitas tanpa menambah dependency.
 *
 * @param data Array<{ label: string, status: string, jumlah: number }>
 *   Contoh harian: { label: '2026-10-17', status: 'Hadir', jumlah: 12 }
 */
export default function GrafikKehadiran({ data = [], judul = 'Rekap Kehadiran', loadingLabel = 'Memuat rekap…' }) {
  const { batang, total, maksimum } = useMemo(() => {
    const perLabel = new Map();

    for (const d of data) {
      if (!SEMUA_STATUS.includes(d.status)) continue;
      if (!perLabel.has(d.label)) perLabel.set(d.label, {});
      perLabel.get(d.label)[d.status] = (perLabel.get(d.label)[d.status] ?? 0) + Number(d.jumlah ?? 0);
    }

    const hasil = [...perLabel.entries()].map(([label, perStatus]) => {
      const jumlah = SEMUA_STATUS.reduce((n, s) => n + (perStatus[s] ?? 0), 0);
      return { label, perStatus, jumlah };
    });

    return {
      batang: hasil,
      total: hasil.reduce((n, b) => n + b.jumlah, 0),
      maksimum: Math.max(1, ...hasil.map((b) => b.jumlah)),
    };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-10 text-center">
        <BarChart3 aria-hidden="true" className="mx-auto size-8 text-ink-faint" />
        <p className="mt-3 font-medium">Belum ada data untuk digambar</p>
        <p className="mt-1 text-sm text-ink-muted">{loadingLabel}</p>
      </div>
    );
  }

  const LEBAR = 640;
  const TINGGI = 200;
  const LEBAR_SISA = 44;
  const lebarBatang = Math.min(46, (LEBAR - 8) / batang.length - 8);

  const ringkas = batang.map((b) => `${b.label}: ${b.jumlah}`).join(', ');

  return (
    <figure className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <figcaption className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-semibold">{judul}</span>
        <span className="text-sm text-ink-muted">
          Total <span className="font-medium text-ink">{total}</span> catatan
        </span>
      </figcaption>

      {/* Legenda memakai titik + teks, jadi makna tidak hanya dari warna. */}
      <ul className="mb-4 flex flex-wrap gap-x-4 gap-y-2 text-xs">
        {SEMUA_STATUS.map((s) => (
          <li key={s} className="flex items-center gap-1.5 text-ink-muted">
            <svg aria-hidden="true" width="10" height="10" className="shrink-0">
              <rect width="10" height="10" rx="2" className={STATUS_ABSENSI[s].bar} />
            </svg>
            {STATUS_ABSENSI[s].label}
          </li>
        ))}
      </ul>

      <div className="overflow-hidden">
        <svg
          viewBox={`0 0 ${LEBAR} ${TINGGI + LEBAR_SISA}`}
          className="w-full"
          role="img"
          aria-label={`${judul}. ${ringkas}`}
          preserveAspectRatio="xMinYMid meet"
        >
          <line
            x1="0"
            y1={TINGGI}
            x2={LEBAR}
            y2={TINGGI}
            stroke="var(--color-line)"
            strokeWidth="1"
          />

          {batang.map((b, i) => {
            const x = 4 + i * (lebarBatang + 8);
            let yTumpukan = TINGGI;

            return (
              <g key={b.label}>
                {SEMUA_STATUS.map((s) => {
                  const n = b.perStatus[s] ?? 0;
                  if (n === 0) return null;
                  const tinggi = (n / maksimum) * (TINGGI - 12);
                  yTumpukan -= tinggi;
                  return (
                    <rect
                      key={s}
                      x={x}
                      y={yTumpukan}
                      width={lebarBatang}
                      height={tinggi}
                      className={STATUS_ABSENSI[s].bar}
                    >
                      <title>{`${b.label} · ${s}: ${n}`}</title>
                    </rect>
                  );
                })}
                <text
                  x={x + lebarBatang / 2}
                  y={TINGGI + 16}
                  textAnchor="middle"
                  className="fill-ink-muted text-[10px]"
                >
                  {b.label}
                </text>
                <text
                  x={x + lebarBatang / 2}
                  y={TINGGI + 30}
                  textAnchor="middle"
                  className="fill-ink text-[11px] font-medium"
                >
                  {b.jumlah}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Versi tabel untuk reader layar: grafik saja tidak cukup. */}
      <table className="sr-only">
        <caption>{judul}</caption>
        <thead>
          <tr>
            <th scope="col">Tanggal</th>
            {SEMUA_STATUS.map((s) => (
              <th key={s} scope="col">
                {STATUS_ABSENSI[s].label}
              </th>
            ))}
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          {batang.map((b) => (
            <tr key={b.label}>
              <th scope="row">{b.label}</th>
              {SEMUA_STATUS.map((s) => (
                <td key={s}>{b.perStatus[s] ?? 0}</td>
              ))}
              <td>{b.jumlah}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}