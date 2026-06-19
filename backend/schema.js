const db = require('./db');

async function tableExists(table) {
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table]
  );
  return Number(row.total) > 0;
}

async function columnExists(table, column) {
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return Number(row.total) > 0;
}

async function addColumnIfMissing(table, column, definition) {
  if (!(await columnExists(table, column))) {
    await db.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

async function indexExists(table, indexName) {
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [table, indexName]
  );
  return Number(row.total) > 0;
}

async function createIndexIfMissing(table, indexName, columns) {
  if (!(await indexExists(table, indexName))) {
    await db.query(`CREATE INDEX ${indexName} ON ${table} (${columns})`);
  }
}

let schemaReady = null;

function ensureSchema() {
  if (!schemaReady) schemaReady = ensureSchemaInternal();
  return schemaReady;
}

async function ensureSchemaInternal() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS productos (
      id        INT AUTO_INCREMENT PRIMARY KEY,
      nombre    VARCHAR(100)  NOT NULL,
      sku       VARCHAR(50)   NOT NULL UNIQUE,
      precio    DECIMAL(10,2) NOT NULL,
      stock     INT           NOT NULL DEFAULT 0,
      categoria VARCHAR(80)   NOT NULL DEFAULT 'General',
      creado_en TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS clientes (
      id        INT AUTO_INCREMENT PRIMARY KEY,
      nombre    VARCHAR(100) NOT NULL,
      telefono  VARCHAR(20),
      direccion VARCHAR(200),
      activo    TINYINT(1) NOT NULL DEFAULT 1,
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      nombre     VARCHAR(100) NOT NULL,
      correo     VARCHAR(120) NOT NULL UNIQUE,
      contrasena VARCHAR(255) NOT NULL,
      rol        ENUM('Master','Promotor') NOT NULL DEFAULT 'Promotor',
      activo     TINYINT(1) NOT NULL DEFAULT 1,
      creado_en  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS ordenes (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      cliente_id  INT           NOT NULL,
      vendedor_id INT           NULL,
      total       DECIMAL(10,2) NOT NULL,
      estado      ENUM('Pendiente','En camino','Entregado') DEFAULT 'Pendiente',
      fecha       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS orden_items (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      orden_id    INT           NOT NULL,
      producto_id INT           NOT NULL,
      cantidad    INT           NOT NULL,
      precio_unit DECIMAL(10,2) NOT NULL,
      FOREIGN KEY (orden_id)    REFERENCES ordenes(id),
      FOREIGN KEY (producto_id) REFERENCES productos(id)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS reportes_ventas (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      usuario_id      INT NOT NULL,
      nombre          VARCHAR(140) NOT NULL,
      fecha_inicio    DATE NOT NULL,
      fecha_fin       DATE NOT NULL,
      cliente_id      INT NULL,
      producto_id     INT NULL,
      categoria       VARCHAR(80) NULL,
      vendedor_id     INT NULL,
      agrupacion      ENUM('dia','semana','mes','anio') NOT NULL DEFAULT 'dia',
      total_ventas    INT NOT NULL DEFAULT 0,
      total_ingresos  DECIMAL(12,2) NOT NULL DEFAULT 0,
      filtros_json    LONGTEXT NOT NULL,
      resultado_json  LONGTEXT NOT NULL,
      creado_en       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  if (await tableExists('productos')) {
    await addColumnIfMissing('productos', 'categoria', "VARCHAR(80) NOT NULL DEFAULT 'General'");
  }
  if (await tableExists('clientes')) {
    await addColumnIfMissing('clientes', 'activo', 'TINYINT(1) NOT NULL DEFAULT 1');
  }
  if (await tableExists('usuarios')) {
    await addColumnIfMissing('usuarios', 'rol', "ENUM('Master','Promotor') NOT NULL DEFAULT 'Promotor'");
    await addColumnIfMissing('usuarios', 'activo', 'TINYINT(1) NOT NULL DEFAULT 1');
    await addColumnIfMissing('usuarios', 'creado_en', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
  }
  if (await tableExists('ordenes')) {
    await addColumnIfMissing('ordenes', 'vendedor_id', 'INT NULL');
  }

  await createIndexIfMissing('ordenes', 'idx_ordenes_fecha', 'fecha');
  await createIndexIfMissing('ordenes', 'idx_ordenes_cliente_fecha', 'cliente_id, fecha');
  await createIndexIfMissing('ordenes', 'idx_ordenes_vendedor_fecha', 'vendedor_id, fecha');
  await createIndexIfMissing('orden_items', 'idx_orden_items_orden_producto', 'orden_id, producto_id');
  await createIndexIfMissing('orden_items', 'idx_orden_items_producto', 'producto_id');
  await createIndexIfMissing('productos', 'idx_productos_categoria', 'categoria');
  await createIndexIfMissing('reportes_ventas', 'idx_reportes_usuario_fecha', 'usuario_id, creado_en');
}

module.exports = { ensureSchema };
