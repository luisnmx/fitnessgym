const pool = require('../config/db');

const getPlanes = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id_plan, nombre_plan, duracion_dias, precio FROM planes WHERE activo = TRUE ORDER BY duracion_dias'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener planes:', error);
    res.status(500).json({ error: 'Error al consultar los planes' });
  }
};

const getPlanesTodos = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id_plan, nombre_plan, duracion_dias, precio, activo FROM planes ORDER BY duracion_dias'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener planes:', error);
    res.status(500).json({ error: 'Error al consultar los planes' });
  }
};

const createPlan = async (req, res) => {
  const { nombre_plan, duracion_dias, precio } = req.body;

  if (!nombre_plan || !duracion_dias || precio === undefined) {
    return res.status(400).json({ error: 'Nombre, duración y precio son obligatorios' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO planes (nombre_plan, duracion_dias, precio)
       VALUES ($1, $2, $3) RETURNING *`,
      [nombre_plan, duracion_dias, precio]
    );
    res.status(201).json({ mensaje: 'Plan creado correctamente', plan: result.rows[0] });
  } catch (error) {
    console.error('Error al crear plan:', error);
    res.status(500).json({ error: 'Error al crear el plan' });
  }
};

const updatePlan = async (req, res) => {
  const { id } = req.params;
  const { nombre_plan, duracion_dias, precio, activo } = req.body;

  if (!nombre_plan || !duracion_dias || precio === undefined) {
    return res.status(400).json({ error: 'Nombre, duración y precio son obligatorios' });
  }

  try {
    const result = await pool.query(
      `UPDATE planes
       SET nombre_plan = $1, duracion_dias = $2, precio = $3, activo = COALESCE($4, activo)
       WHERE id_plan = $5
       RETURNING *`,
      [nombre_plan, duracion_dias, precio, activo ?? null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan no encontrado' });
    }

    res.json({ mensaje: 'Plan actualizado correctamente', plan: result.rows[0] });
  } catch (error) {
    console.error('Error al actualizar plan:', error);
    res.status(500).json({ error: 'Error al actualizar el plan' });
  }
};

const deactivatePlan = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'UPDATE planes SET activo = FALSE WHERE id_plan = $1 RETURNING id_plan, nombre_plan',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan no encontrado' });
    }

    res.json({ mensaje: 'Plan desactivado correctamente', plan: result.rows[0] });
  } catch (error) {
    console.error('Error al desactivar plan:', error);
    res.status(500).json({ error: 'Error al desactivar el plan' });
  }
};

module.exports = { getPlanes, getPlanesTodos, createPlan, updatePlan, deactivatePlan };