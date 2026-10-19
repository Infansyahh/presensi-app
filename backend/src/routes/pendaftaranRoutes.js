import { Router } from 'express';
import * as c from '../controllers/pendaftaranWajahController.js';

export default Router()
  .get('/siswa', c.listSiswa)
  .post('/siswa', c.createSiswa)
  .get('/siswa/:id', c.getSiswa)
  .put('/siswa/:id', c.updateSiswa)
  .delete('/siswa/:id', c.deleteSiswa)

  .get('/guru', c.listGuru)
  .post('/guru', c.createGuru)
  .put('/guru/:id', c.updateGuru)
  .delete('/guru/:id', c.deleteGuru)

  .get('/kelas', c.listKelas)
  .get('/ortu', c.listOrtu)
  .post('/ortu', c.createOrtu)

  .get('/mapel', c.listMapel)
  .post('/mapel', c.createMapel)

  .post('/siswa-wajah', c.simpanSiswaWajah)
  .post('/wajah', c.createWajah)
  .get('/wajah/siswa/:siswaId', c.listWajah)
  .delete('/wajah/siswa/:siswaId', c.deleteWajahSiswa)
  .delete('/wajah/:id', c.deleteWajah);