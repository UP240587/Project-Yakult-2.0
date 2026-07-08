require('dotenv').config();
const mysql = require('mysql2/promise');

// ── Credenciales desde backend/.env (con los mismos defaults de siempre) ──
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',   // ← 127.0.0.1 evita que Windows use IPv6 (::1) y cause ETIMEDOUT
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',    // ← vacío en XAMPP
  database: process.env.DB_NAME || 'yakult_db',
  waitForConnections: true,
  connectTimeout: 10000,
});

module.exports = pool;
