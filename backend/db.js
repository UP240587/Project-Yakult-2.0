const mysql = require('mysql2/promise');

// ── Cambia usuario y contraseña por los tuyos de MySQL Workbench ──
const pool = mysql.createPool({
  host:     'localhost',
  user:     'root',
  password: '',
  database: 'yakult_db',
  waitForConnections: true,
});

module.exports = pool;