const mysql = require('mysql2/promise');

// ── Cambia usuario y contraseña por los tuyos de MySQL Workbench ──
const pool = mysql.createPool({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',        // ← vacío en XAMPP
  database: 'yakult_db',
  waitForConnections: true,
});

module.exports = pool;