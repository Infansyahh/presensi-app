import * as AbsensiLog from '../models/AbsensiLog.js';

export async function rekapHarian(req, res) {
  res.json(await AbsensiLog.rekapHarian({ tanggal: req.query.tanggal, kelas_id: req.query.kelas_id }));
}

export async function rekapBulanan(req, res) {
  const tahun = Number(req.query.tahun);
  const bulan = Number(req.query.bulan);
  if (!tahun || !bulan || bulan < 1 || bulan > 12) {
    return res.status(400).json({ message: 'tahun dan bulan (1-12) wajib diisi' });
  }
  res.json(await AbsensiLog.rekapBulanan({ tahun, bulan, kelas_id: req.query.kelas_id }));
}

/** Rekap satu siswa untuk bulan tertentu (dipakai wali kelas / laporan per individu). */
export async function rekapSiswa(req, res) {
  const tahun = Number(req.query.tahun);
  const bulan = Number(req.query.bulan);
  if (req.query.bulan !== undefined && (!tahun || !bulan || bulan < 1 || bulan > 12)) {
    return res.status(400).json({ message: 'bulan (1-12) wajib diisi dan tahun harus berupa angka' });
  }

  // Hari terakhir bulan dihitung lewat UTC supaya tidak bergeser zona waktu.
  const dari = bulan ? `${tahun}-${String(bulan).padStart(2, '0')}-01` : undefined;
  const sampai = bulan ? `${tahun}-${String(bulan).padStart(2, '0')}-${new Date(Date.UTC(tahun, bulan, 0)).getUTCDate()}` : undefined;
  const riwayat = await AbsensiLog.findBySiswa(req.params.siswaId, { dari, sampai });

  const perStatus = {};
  for (const r of riwayat) perStatus[r.status] = (perStatus[r.status] ?? 0) + 1;

  res.json({ siswa_id: req.params.siswaId, periode: bulan ? `${tahun}-${bulan}` : 'semua', perStatus, riwayat });
}