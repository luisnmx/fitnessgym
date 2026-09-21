const pool = require('../config/db');

const registrarPago = async (req, res) => {
  const { id_socio, id_plan, monto_pagado } = req.body;

  if (!id_socio || !id_plan || !monto_pagado) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  try {
    const planResult = await pool.query(
      'SELECT duracion_dias FROM planes WHERE id_plan = $1', [id_plan]
    );
    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: 'Plan no encontrado' });
    }
    const duracionDias = planResult.rows[0].duracion_dias;

    const result = await pool.query(
      `INSERT INTO membresias (id_socio, id_plan, fecha_inicio, fecha_fin, monto_pagado)
       VALUES ($1, $2, CURRENT_DATE, CURRENT_DATE + $3::int, $4)
       RETURNING *`,
      [id_socio, id_plan, duracionDias, monto_pagado]
    );

    res.status(201).json({ mensaje: 'Pago registrado correctamente', membresia: result.rows[0] });

  } catch (error) {
    console.error('Error al registrar pago:', error);
    res.status(500).json({ error: 'Error al registrar el pago' });
  }
};

module.exports = { registrarPago };