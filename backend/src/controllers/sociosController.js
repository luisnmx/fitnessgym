const pool = require('../config/db');

const getAlertas = async (req, res) => {
  try {
    const query = `
      SELECT
          s.id_socio,
          s.nombre,
          s.apellido,
          s.telefono,
          p.nombre_plan,
          m.fecha_fin,
          (m.fecha_fin - CURRENT_DATE) AS dias_restantes,
          CASE
              WHEN (m.fecha_fin - CURRENT_DATE) < 0 THEN 'VENCIDO'
              ELSE 'POR VENCER'
          END AS estado_alerta
      FROM (
          SELECT DISTINCT ON (id_socio)
              id_socio, id_plan, fecha_fin
          FROM membresias
          ORDER BY id_socio, fecha_fin DESC
      ) m
      JOIN socios s  ON s.id_socio = m.id_socio
      JOIN planes p  ON p.id_plan  = m.id_plan
      WHERE s.activo = TRUE
        AND (m.fecha_fin - CURRENT_DATE) <= 4
      ORDER BY dias_restantes ASC;
    `;

    const result = await pool.query(query);
    res.json(result.rows);

  } catch (error) {
    console.error('Error al obtener alertas:', error);
    res.status(500).json({ error: 'Error al consultar las alertas de socios' });
  }
};

const getSocios = async (req, res) => {
  try {
    const query = `
      SELECT
          s.id_socio,
          s.nombre,
          s.apellido,
          s.telefono,
          s.email,
          s.activo,
          m.id_membresia,
          m.id_plan,
          p.nombre_plan,
          m.fecha_inicio,
          m.fecha_fin,
          (m.fecha_fin - CURRENT_DATE) AS dias_restantes
      FROM socios s
      LEFT JOIN (
          SELECT DISTINCT ON (id_socio)
              id_socio, id_plan, fecha_inicio, fecha_fin, id_membresia
          FROM membresias
          ORDER BY id_socio, fecha_fin DESC, id_membresia DESC
      ) m ON s.id_socio = m.id_socio
      LEFT JOIN planes p ON p.id_plan = m.id_plan
      ORDER BY s.id_socio DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener socios:', error);
    res.status(500).json({ error: 'Error al consultar los socios' });
  }
};

const getSocioById = async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT
          s.id_socio,
          s.nombre,
          s.apellido,
          s.telefono,
          s.email,
          s.activo,
          m.id_membresia,
          m.id_plan,
          p.nombre_plan,
          m.fecha_inicio,
          m.fecha_fin,
          (m.fecha_fin - CURRENT_DATE) AS dias_restantes
      FROM socios s
      LEFT JOIN (
          SELECT DISTINCT ON (id_socio)
              id_socio, id_plan, fecha_inicio, fecha_fin, id_membresia
          FROM membresias
          ORDER BY id_socio, fecha_fin DESC, id_membresia DESC
      ) m ON s.id_socio = m.id_socio
      LEFT JOIN planes p ON p.id_plan = m.id_plan
      WHERE s.id_socio = $1
    `;
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Socio no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener socio:', error);
    res.status(500).json({ error: 'Error al consultar el socio' });
  }
};

const updateSocio = async (req, res) => {
  const { id } = req.params;
  const { nombre, apellido, telefono, email, id_membresia, fecha_inicio, fecha_fin } = req.body;

  if (!nombre || !apellido) {
    return res.status(400).json({ error: 'Nombre y apellido son obligatorios' });
  }

  if (id_membresia && (!fecha_inicio || !fecha_fin)) {
    return res.status(400).json({ error: 'Para editar la membresía se requieren fecha_inicio y fecha_fin' });
  }

  if (fecha_inicio && fecha_fin && new Date(fecha_fin) < new Date(fecha_inicio)) {
    return res.status(400).json({ error: 'La fecha de vencimiento no puede ser anterior a la de inicio' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE socios
       SET nombre = $1, apellido = $2, telefono = $3, email = $4
       WHERE id_socio = $5
       RETURNING id_socio, nombre, apellido, telefono, email`,
      [nombre, apellido, telefono || null, email || null, id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Socio no encontrado' });
    }

    let membresia = null;
    if (id_membresia) {
      const membresiaResult = await client.query(
        `UPDATE membresias
         SET fecha_inicio = $1, fecha_fin = $2
         WHERE id_membresia = $3 AND id_socio = $4
         RETURNING id_membresia, id_socio, id_plan, fecha_inicio, fecha_fin`,
        [fecha_inicio, fecha_fin, id_membresia, id]
      );

      if (membresiaResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Membresía no encontrada para este socio' });
      }
      membresia = membresiaResult.rows[0];
    }

    await client.query('COMMIT');

    res.json({
      mensaje: 'Socio actualizado correctamente',
      socio: result.rows[0],
      membresia,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al actualizar socio:', error);
    res.status(500).json({ error: 'Error al actualizar el socio' });
  } finally {
    client.release();
  }
};

const toggleEstadoSocio = async (req, res) => {
  const { id } = req.params;
  const { activo } = req.body;

  if (typeof activo !== 'boolean') {
    return res.status(400).json({ error: 'El campo activo debe ser booleano' });
  }

  try {
    const result = await pool.query(
      'UPDATE socios SET activo = $1 WHERE id_socio = $2 RETURNING id_socio, activo',
      [activo, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Socio no encontrado' });
    }

    res.json({
      mensaje: activo ? 'Socio reactivado' : 'Socio dado de baja',
      socio: result.rows[0],
    });
  } catch (error) {
    console.error('Error al cambiar estado del socio:', error);
    res.status(500).json({ error: 'Error al cambiar el estado del socio' });
  }
};

const registrarSocio = async (req, res) => {
  const { nombre, apellido, telefono, email, id_plan, monto_pagado, metodo_pago } = req.body;

  if (!nombre || !apellido || !id_plan || !monto_pagado) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  const metodo = (metodo_pago && String(metodo_pago).trim()) || 'Efectivo';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const planResult = await client.query(
      'SELECT duracion_dias FROM planes WHERE id_plan = $1', [id_plan]
    );
    if (planResult.rows.length === 0) {
      throw new Error('Plan no encontrado');
    }
    const duracionDias = planResult.rows[0].duracion_dias;

    const socioResult = await client.query(
      `INSERT INTO socios (nombre, apellido, telefono, email)
       VALUES ($1, $2, $3, $4) RETURNING id_socio`,
      [nombre, apellido, telefono || null, email || null]
    );
    const idSocio = socioResult.rows[0].id_socio;

    const membresiaResult = await client.query(
      `INSERT INTO membresias (id_socio, id_plan, fecha_inicio, fecha_fin, monto_pagado, metodo_pago)
       VALUES ($1, $2, CURRENT_DATE, CURRENT_DATE + $3::int, $4, $5)
       RETURNING *`,
      [idSocio, id_plan, duracionDias, monto_pagado, metodo]
    );

    await client.query('COMMIT');
    res.status(201).json({
      mensaje: 'Socio registrado correctamente',
      socio: { id_socio: idSocio, nombre, apellido },
      membresia: membresiaResult.rows[0],
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al registrar socio:', error);
    res.status(500).json({ error: 'Error al registrar el socio' });
  } finally {
    client.release();
  }
};

module.exports = { getAlertas, getSocios, getSocioById, registrarSocio, updateSocio, toggleEstadoSocio };