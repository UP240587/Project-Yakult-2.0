CREATE DATABASE IF NOT EXISTS yakult_db;
USE yakult_db;

CREATE TABLE productos (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  nombre    VARCHAR(100)  NOT NULL,
  sku       VARCHAR(50)   NOT NULL UNIQUE,
  precio    DECIMAL(10,2) NOT NULL,
  stock     INT           NOT NULL DEFAULT 0,
  creado_en TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE clientes (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  nombre    VARCHAR(100) NOT NULL,
  telefono  VARCHAR(20),
  direccion VARCHAR(200),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ordenes (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT           NOT NULL,
  total      DECIMAL(10,2) NOT NULL,
  estado     ENUM('Pendiente','En camino','Entregado') DEFAULT 'Pendiente',
  fecha      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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

-- Datos de prueba
INSERT INTO productos (nombre, sku, precio, stock) VALUES
  ('Yakult Original 65ml',    'YK-001', 12.50, 120),
  ('Yakult Light 65ml',       'YK-002', 13.00, 85),
  ('Yakult Fibra 65ml',       'YK-003', 14.00, 60),
  ('Yakult Original Pack x5', 'YK-004', 55.00, 40);

INSERT INTO clientes (nombre, telefono, direccion) VALUES
  ('Tienda López',    '4491234567', 'Av. López Mateos 12'),
  ('Abarrotes Ruiz',  '4499876543', 'Calle Morelos 45'),
  ('Minisuper Gómez', '4495551234', 'Blvd. Zacatecas 78');