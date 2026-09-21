const pool = require('../config/db');

// GET /api/ventas -> historial de ventas (cabecera + nombre del cliente)
const getVentas = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        v.id_venta,
        v.fecha_venta,
        v.total,
        v.id_socio,
        COALESCE(s.nombre || ' ' || s.apellido, v.cliente_casual_nombre) AS cliente,
        (SELECT COUNT(*) FROM detalle_ventas dv WHERE dv.id_venta = v.id_venta) AS cantidad_items
      FROM ventas v
      LEFT JOIN socios s ON s.id_socio = v.id_socio
      ORDER BY v.fecha_venta DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    res.status(500).json({ error: 'Error al consultar las ventas' });
  }
};

// GET /api/ventas/:id -> detalle de una venta puntual (para el "ticket")
const getVentaDetalle = async (req, res) => {
  const { id } = req.params;
  try {
    const cabecera = await pool.query(`
      SELECT v.id_venta, v.fecha_venta, v.total, v.id_socio,
             COALESCE(s.nombre || ' ' || s.apellido, v.cliente_casual_nombre) AS cliente
      FROM ventas v
      LEFT JOIN socios s ON s.id_socio = v.id_socio
      WHERE v.id_venta = $1
    `, [id]);

    if (cabecera.rows.length === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    const detalle = await pool.query(`
      SELECT dv.id_producto, p.nombre_producto, dv.cantidad, dv.precio_unitario, dv.subtotal
      FROM detalle_ventas dv
      JOIN productos p ON p.id_producto = dv.id_producto
      WHERE dv.id_venta = $1
    `, [id]);

    res.json({ ...cabecera.rows[0], items: detalle.rows });
  } catch (error) {
    console.error('Error al obtener detalle de venta:', error);
    res.status(500).json({ error: 'Error al consultar el detalle de la venta' });
  }
};

// POST /api/ventas -> crea la venta completa (cabecera + detalle) en una transacción
// body esperado:
// {
//   id_socio: 3 (o null),
//   cliente_casual_nombre: "Juan Pérez" (opcional; se usa "Cliente Ocasional" si falta y no hay socio),
//   items: [ { id_producto: 1, cantidad: 2 }, { id_producto: 3, cantidad: 1 } ]
// }
const crearVenta = async (req, res) => {
  const { id_socio, cliente_casual_nombre, items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'La venta debe tener al menos un producto' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Traer precios y stock actuales de la base (nunca confiar en el precio que mande el frontend)
    let total = 0;
    const lineasValidadas = [];

    for (const item of items) {
      const { id_producto, cantidad } = item;

      if (!id_producto || !cantidad || cantidad <= 0) {
        throw { status: 400, mensaje: 'Cada ítem debe tener producto y cantidad válida' };
      }

      const productoResult = await client.query(
        'SELECT id_producto, nombre_producto, precio, stock, activo FROM productos WHERE id_producto = $1 FOR UPDATE',
        [id_producto]
      );

      if (productoResult.rows.length === 0) {
        throw { status: 404, mensaje: `Producto #${id_producto} no encontrado` };
      }

      const producto = productoResult.rows[0];

      if (!producto.activo) {
        throw { status: 400, mensaje: `El producto "${producto.nombre_producto}" está dado de baja` };
      }
      if (producto.stock < cantidad) {
        throw { status: 400, mensaje: `Stock insuficiente de "${producto.nombre_producto}" (disponible: ${producto.stock})` };
      }

      const subtotal = Number(producto.precio) * cantidad;
      total += subtotal;

      lineasValidadas.push({
        id_producto,
        cantidad,
        precio_unitario: producto.precio,
      });
    }

    // 2. Crear cabecera de venta
    const nombreCasual = id_socio
      ? null
      : (cliente_casual_nombre && String(cliente_casual_nombre).trim()) || 'Cliente Ocasional';
    const ventaResult = await client.query(
      `INSERT INTO ventas (id_socio, cliente_casual_nombre, total)
       VALUES ($1, $2, $3) RETURNING *`,
      [id_socio || null, nombreCasual, total]
    );
    const idVenta = ventaResult.rows[0].id_venta;

    // 3. Insertar detalle y descontar stock, línea por línea
    for (const linea of lineasValidadas) {
      await client.query(
        `INSERT INTO detalle_ventas (id_venta, id_producto, cantidad, precio_unitario)
         VALUES ($1, $2, $3, $4)`,
        [idVenta, linea.id_producto, linea.cantidad, linea.precio_unitario]
      );

      await client.query(
        `UPDATE productos SET stock = stock - $1 WHERE id_producto = $2`,
        [linea.cantidad, linea.id_producto]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      mensaje: 'Venta registrada correctamente',
      venta: ventaResult.rows[0],
    });

  } catch (error) {
    await client.query('ROLLBACK');
    const status = error.status || 500;
    const mensaje = error.mensaje || 'Error al registrar la venta';
    if (status === 500) console.error('Error al registrar venta:', error);
    res.status(status).json({ error: mensaje });
  } finally {
    client.release();
  }
};

module.exports = { getVentas, getVentaDetalle, crearVenta };