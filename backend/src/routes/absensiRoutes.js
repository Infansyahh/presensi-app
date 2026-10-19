import { Router } from 'express';
import * as c from '../controllers/absensiController.js';
import { wajibLogin } from '../services/authService.js';

export default Router()
  // Kiosk: memakai secret perangkat, bukan akun dashboard.
  .post('/scan', c.scanAbsensi)
  .get('/hari-ini', c.absensiHariIni)
  .get('/siswa/:siswaId', c.riwayatSiswa)
  // recognising perangkat = urusan dashboard, jadi butuh sesi login.
  .get('/perangkat', wajibLogin, c.listPerangkat)
  .post('/perangkat', wajibLogin, c.buatPerangkat)
  .delete('/perangkat/:id', wajibLogin, c.hapusPerangkat);