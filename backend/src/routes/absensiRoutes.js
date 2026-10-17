import { Router } from 'express';
import * as c from '../controllers/absensiController.js';

export default Router()
  .post('/scan', c.scanAbsensi)
  .get('/hari-ini', c.absensiHariIni)
  .get('/perangkat', c.listPerangkat)
  .get('/siswa/:siswaId', c.riwayatSiswa);