-- ============================================================================
-- FitnesGym Studio — Script de creación de la base de datos
-- ----------------------------------------------------------------------------
-- Crea la base "fitnessgym" y todas las tablas del sistema, tal como las usa
-- el backend (backend/src/config/db.js lee estos datos desde backend/.env).
--
-- Requisitos: PostgreSQL 12 o superior.
--
-- Cómo usarlo en la PC del cliente (desde la carpeta del proyecto):
--   1) Instalar PostgreSQL (por ej. https://www.postgresql.org/download/).
--   2) Abrir una terminal / Símbolo del sistema y ejecutar:
--         psql -U postgres -h localhost -f database/fitnessgym_db.sql
--      (te pedirá la contraseña del usuario "postgres" que definiste al instalar).
--   3) En el archivo backend/.env, verificar que coincida:
--         DB_HOST=localhost
--         DB_PORT=5432
--         DB_NAME=fitnessgym
--         DB_USER=postgres
--         DB_PASSWORD=<la contraseña del paso 2>
--   4) Iniciar la API:  cd backend  &&  npm install  &&  node server.js
--      (debe responder: "Servidor corriendo en http://localhost:3000")
--   5) Abrir la app en el navegador (frontend/public/index.html).
--
-- El script es reutilizable: si ya existe la base, podes volver a correrlo
-- (borra y recrea las tablas, perdiendo los datos).
-- ============================================================================

-- 1) Crear la base de datos si aún no existe
SELECT 'CREATE DATABASE fitnessgym'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'fitnessgym')\gexec

-- 2) Conectarse a la base
\connect fitnessgym

-- 3) Eliminar tablas existentes (para poder re-ejecutar el script)
DROP TABLE IF EXISTS detalle_ventas CASCADE;
DROP TABLE IF EXISTS ventas CASCADE;
DROP TABLE IF EXISTS membresias CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS planes CASCADE;
DROP TABLE IF EXISTS socios CASCADE;

-- 4) Crear tablas ------------------------------------------------------------

-- Socios
CREATE TABLE socios (
    id_socio       SERIAL PRIMARY KEY,
    nombre         VARCHAR(80)  NOT NULL,
    apellido       VARCHAR(80)  NOT NULL,
    telefono       VARCHAR(20),
    email          VARCHAR(120),
    fecha_registro DATE         NOT NULL DEFAULT CURRENT_DATE,
    activo         BOOLEAN      NOT NULL DEFAULT TRUE
);

-- Planes de membresía
CREATE TABLE planes (
    id_plan       SERIAL PRIMARY KEY,
    nombre_plan   VARCHAR(60) NOT NULL,
    duracion_dias INTEGER     NOT NULL,
    precio        NUMERIC     NOT NULL,
    activo        BOOLEAN     NOT NULL DEFAULT TRUE
);

-- Productos del gimnasio (para el POS / Ventas)
CREATE TABLE productos (
    id_producto     SERIAL PRIMARY KEY,
    nombre_producto VARCHAR(100) NOT NULL,
    descripcion     VARCHAR(255),
    precio          NUMERIC      NOT NULL,
    stock           INTEGER      NOT NULL DEFAULT 0,
    activo          BOOLEAN      NOT NULL DEFAULT TRUE
);

-- Pagos / membresías de socios
CREATE TABLE membresias (
    id_membresia SERIAL PRIMARY KEY,
    id_socio     INTEGER      NOT NULL REFERENCES socios(id_socio),
    id_plan      INTEGER      NOT NULL REFERENCES planes(id_plan),
    fecha_inicio DATE         NOT NULL,
    fecha_fin    DATE         NOT NULL,
    monto_pagado NUMERIC      NOT NULL,
    fecha_pago   DATE         NOT NULL DEFAULT CURRENT_DATE,
    metodo_pago  VARCHAR(30)  NOT NULL DEFAULT 'Efectivo'
);

-- Ventas (contado por el POS)
CREATE TABLE ventas (
    id_venta               SERIAL PRIMARY KEY,
    id_socio               INTEGER     REFERENCES socios(id_socio),
    cliente_casual_nombre  VARCHAR(120),
    fecha_venta            TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total                  NUMERIC     NOT NULL DEFAULT 0
);

-- Detalle por línea de cada venta
CREATE TABLE detalle_ventas (
    id_detalle     SERIAL PRIMARY KEY,
    id_venta       INTEGER NOT NULL REFERENCES ventas(id_venta) ON DELETE CASCADE,
    id_producto    INTEGER NOT NULL REFERENCES productos(id_producto),
    cantidad       INTEGER NOT NULL,
    precio_unitario NUMERIC NOT NULL,
    subtotal       NUMERIC
);

-- 5) Datos de ejemplo (OPCIONAL) --------------------------------------------
-- Si querés arrancar con planes cargados, descomentá estas líneas:
--
-- INSERT INTO planes (nombre_plan, duracion_dias, precio) VALUES
--   ('Mensual',   30, 200000),
--   ('Quincenal', 15, 120000),
--   ('Semanal',    7,  60000);