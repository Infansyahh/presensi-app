import { Router } from 'express';
import * as c from '../controllers/laporanController.js';

export default Router()
  .get('/harian', c.rekapHarian)
  .get('/bulanan', c.rekapBulanan)
  .get('/siswa/:siswaId', c.rekapSiswa);