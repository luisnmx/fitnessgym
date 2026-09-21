const pool = require('../config/db');

// GET /api/productos -> lista todos (activos e inactivos, el frontend filtra)
const getProductos = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id_producto, nombre_producto, descripcion, precio, stock, activo
       FROM productos
       ORDER BY id_producto DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ error: 'Error al consultar los productos' });
  }
};

// POST /api/productos -> crear producto nuevo
const crearProducto = async (req, res) => {
  const { nombre_producto, descripcion, precio, stock } = req.body;

  if (!nombre_producto || precio === undefined || stock === undefined) {
    return res.status(400).json({ error: 'Faltan datos obligatorios (nombre, precio, stock)' });
  }
  if (Number(precio) < 0 || Number(stock) < 0) {
    return res.status(400).json({ error: 'El precio y el stock no pueden ser negativos' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO productos (nombre_producto, descripcion, precio, stock)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [nombre_producto, descripcion || null, precio, stock]
    );
    res.status(201).json({ mensaje: 'Producto creado correctamente', producto: result.rows[0] });
  } catch (error) {
    console.error('Error al crear producto:', error);
    res.status(500).json({ error: 'Error al crear el producto' });
  }
};

// PUT /api/productos/:id -> editar nombre/descripcion/precio/stock
const actualizarProducto = async (req, res) => {
  const { id } = req.params;
  const { nombre_producto, descripcion, precio, stock } = req.body;

  if (!nombre_producto || precio === undefined || stock === undefined) {
    return res.status(400).json({ error: 'Faltan datos obligatorios (nombre, precio, stock)' });
  }
  if (Number(precio) < 0 || Number(stock) < 0) {
    return res.status(400).json({ error: 'El precio y el stock no pueden ser negativos' });
  }

  try {
    const result = await pool.query(
      `UPDATE productos
       SET nombre_producto = $1, descripcion = $2, precio = $3, stock = $4
       WHERE id_producto = $5
       RETURNING *`,
      [nombre_producto, descripcion || null, precio, stock, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json({ mensaje: 'Producto actualizado correctamente', producto: result.rows[0] });
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    res.status(500).json({ error: 'Error al actualizar el producto' });
  }
};

// PATCH /api/productos/:id/estado -> baja logica / reactivar (no borra nunca)
const cambiarEstadoProducto = async (req, res) => {
  const { id } = req.params;
  const { activo } = req.body; // true o false

  try {
    const result = await pool.query(
      `UPDATE productos SET activo = $1 WHERE id_producto = $2 RETURNING *`,
      [activo, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json({ mensaje: activo ? 'Producto reactivado' : 'Producto dado de baja', producto: result.rows[0] });
  } catch (error) {
    console.error('Error al cambiar estado del producto:', error);
    res.status(500).json({ error: 'Error al cambiar el estado del producto' });
  }
};

// PATCH /api/productos/:id/stock -> ajuste manual de stock (+cantidad o -cantidad)
const ajustarStockProducto = async (req, res) => {
  const { id } = req.params;
  const { cantidad } = req.body; // puede ser positivo (reponer) o negativo (descontar)

  if (cantidad === undefined || isNaN(cantidad)) {
    return res.status(400).json({ error: 'Cantidad inválida' });
  }

  try {
    const result = await pool.query(
      `UPDATE productos
       SET stock = stock + $1
       WHERE id_producto = $2 AND stock + $1 >= 0
       RETURNING *`,
      [cantidad, id]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'No se pudo ajustar el stock (producto inexistente o stock insuficiente)' });
    }
    res.json({ mensaje: 'Stock actualizado correctamente', producto: result.rows[0] });
  } catch (error) {
    console.error('Error al ajustar stock:', error);
    res.status(500).json({ error: 'Error al ajustar el stock' });
  }
};

module.exports = {
  getProductos,
  crearProducto,
  actualizarProducto,
  cambiarEstadoProducto,
  ajustarStockProducto,
};