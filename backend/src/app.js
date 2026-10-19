import express from 'express';
import cors from 'cors';
import { testConnection } from './config/database.js';
import { wajibLogin } from './services/authService.js';
import authRoutes from './routes/authRoutes.js';
import pendaftaranRoutes from './routes/pendaftaranRoutes.js';
import absensiRoutes from './routes/absensiRoutes.js';
import laporanRoutes from './routes/laporanRoutes.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/health', async (req, res) => {
  res.json({ status: 'ok', database: (await testConnection()) ? 'terhubung' : 'gagal' });
});

// /api/absensi sengaja TANPA wajibLogin: kiosk memindai dengan secret perangkat,
// bukan dengan akun dashboard.
app.use('/api/auth', authRoutes);
app.use('/api/pendaftaran', wajibLogin, pendaftaranRoutes);
app.use('/api/absensi', absensiRoutes);
app.use('/api/laporan', wajibLogin, laporanRoutes);

app.use((req, res) => res.status(404).json({ message: 'Endpoint tidak ditemukan' }));

// Pesan 4xx yang bisa dipetakan dari error bawaan MySQL.
const PETA_ERROR = {
  ER_DUP_ENTRY: [409, 'Data sudah ada (duplikat)'],
  ER_NO_REFERENCED_ROW_2: [400, 'Relasi tidak ditemukan: kelas/ortu/mapel/perangkat tidak valid'],
  ER_ROW_IS_REFERENCED_2: [409, 'Data masih dipakai tabel lain, hapus dependensinya lebih dulu'],
};

// Express 5 meneruskan rejection dari handler async ke sini secara otomatis.
app.use((err, req, res, next) => {
  console.error(err);
  const [status, message] = PETA_ERROR[err.code] ?? [500, 'Terjadi kesalahan pada server'];
  res.status(status).json({ message });
});

const PORT = Number(process.env.PORT ?? 3000);

app.listen(PORT, async () => {
  const db = await testConnection();
  console.log(`API  : http://localhost:${PORT}`);
  console.log(`DB   : ${db ? 'terhubung' : 'GAGAL terhubung'}`);
});

export default app;