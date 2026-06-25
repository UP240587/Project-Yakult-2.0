const mysql = require('mysql2/promise');

// ── Cambia usuario y contraseña por los tuyos de MySQL Workbench ──
const pool = mysql.createPool({
  host: '127.0.0.1',   // ← 127.0.0.1 evita que Windows use IPv6 (::1) y cause ETIMEDOUT
  port: 3306,
  user: 'root',
  password: '',        // ← vacío en XAMPP
  database: 'yakult_db',
  waitForConnections: true,
  connectTimeout: 10000,
});

module.exports = pool;