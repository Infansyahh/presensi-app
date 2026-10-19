import { query } from '../config/database.js';
import { buatToken, verifyPassword } from '../services/authService.js';

const bad = (res, message) => res.status(400).json({ message });

export async function login(req, res) {
  const { username, password } = req.body;
  if (!username || !password) return bad(res, 'username dan password wajib diisi');

  // Query tanpa model: satu baris saja, tidak perlu lapisan akses data.
  const [pengguna] = await query('SELECT * FROM pengguna WHERE username = ? AND aktif = 1', [username]);

  // Pesan sengaja sama untuk "user tidak ada" dan "password salah" supaya tidak
  // bisa dipakai menebak username mana yang terdaftar.
  if (!pengguna || !verifyPassword(password, pengguna.password_hash)) {
    return res.status(401).json({ message: 'Username atau password salah' });
  }

  res.json({
    token: buatToken(pengguna),
    pengguna: { id: pengguna.id, username: pengguna.username, nama: pengguna.nama, peran: pengguna.peran },
  });
}

/** Dipanggil frontend saat start untuk memastikan token tersimpan masih hidup. */
export async function sesiSaya(req, res) {
  const { username } = req.pengguna;
  const [pengguna] = await query('SELECT id, username, nama, peran FROM pengguna WHERE username = ?', [username]);
  if (!pengguna) return res.status(401).json({ message: 'Akun tidak ditemukan' });
  res.json({ pengguna });
}