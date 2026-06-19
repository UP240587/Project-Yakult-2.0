CREATE DATABASE IF NOT EXISTS yakult_db;
USE yakult_db;

CREATE TABLE productos (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  nombre    VARCHAR(100)  NOT NULL,
  sku       VARCHAR(50)   NOT NULL UNIQUE,
  precio    DECIMAL(10,2) NOT NULL,
  stock     INT           NOT NULL DEFAULT 0,
  categoria VARCHAR(80)   NOT NULL DEFAULT 'General',
  creado_en TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE clientes (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  nombre    VARCHAR(100) NOT NULL,
  telefono  VARCHAR(20),
  direccion VARCHAR(200),
  activo    TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE usuarios (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  nombre     VARCHAR(100) NOT NULL,
  correo     VARCHAR(120) NOT NULL UNIQUE,
  contrasena VARCHAR(255) NOT NULL,
  rol        ENUM('Master','Promotor') NOT NULL DEFAULT 'Promotor',
  activo     TINYINT(1) NOT NULL DEFAULT 1,
  creado_en  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ordenes (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id  INT           NOT NULL,
  vendedor_id INT           NULL,
  total       DECIMAL(10,2) NOT NULL,
  estado      ENUM('Pendiente','En camino','Entregado') DEFAULT 'Pendiente',
  fecha       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

CREATE TABLE orden_items (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  orden_id    INT           NOT NULL,
  producto_id INT           NOT NULL,
  cantidad    INT           NOT NULL,
  precio_unit DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (orden_id)    REFERENCES ordenes(id),
  FOREIGN KEY (producto_id) REFERENCES productos(id)
);

CREATE TABLE reportes_ventas (
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
);

CREATE INDEX idx_ordenes_fecha ON ordenes(fecha);
CREATE INDEX idx_ordenes_cliente_fecha ON ordenes(cliente_id, fecha);
CREATE INDEX idx_ordenes_vendedor_fecha ON ordenes(vendedor_id, fecha);
CREATE INDEX idx_orden_items_orden_producto ON orden_items(orden_id, producto_id);
CREATE INDEX idx_orden_items_producto ON orden_items(producto_id);
CREATE INDEX idx_productos_categoria ON productos(categoria);
CREATE INDEX idx_reportes_usuario_fecha ON reportes_ventas(usuario_id, creado_en);

-- Datos de prueba
INSERT INTO productos (nombre, sku, precio, stock, categoria) VALUES
  ('Yakult Original 65ml',    'YK-001', 12.50, 120, 'Bebida probiotica'),
  ('Yakult Light 65ml',       'YK-002', 13.00, 85,  'Bebida light'),
  ('Yakult Fibra 65ml',       'YK-003', 14.00, 60,  'Fibra'),
  ('Yakult Original Pack x5', 'YK-004', 55.00, 40,  'Multipack');

INSERT INTO clientes (nombre, telefono, direccion) VALUES
  ('Tienda López',    '4491234567', 'Av. López Mateos 12'),
  ('Abarrotes Ruiz',  '4499876543', 'Calle Morelos 45'),
  ('Minisuper Gómez', '4495551234', 'Blvd. Zacatecas 78');
