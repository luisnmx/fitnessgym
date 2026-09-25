const pool = require('../config/db');

const pad = (n) => String(n).padStart(2, '0');

const toISODate = (obj) => {
  if (!obj) return '';
  if (obj instanceof Date) return obj.toISOString().slice(0, 10);
  return String(obj).slice(0, 10);
};

const addDays = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
};

const getDow = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
};

const registrarPago = async (req, res) => {
  const { id_socio, id_plan, monto_pagado, metodo_pago } = req.body;

  if (!id_socio || !id_plan || !monto_pagado) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  const metodo = (metodo_pago && String(metodo_pago).trim()) || 'Efectivo';

  try {
    const planResult = await pool.query(
      'SELECT duracion_dias FROM planes WHERE id_plan = $1', [id_plan]
    );
    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: 'Plan no encontrado' });
    }
    const duracionDias = planResult.rows[0].duracion_dias;

    const result = await pool.query(
      `INSERT INTO membresias (id_socio, id_plan, fecha_inicio, fecha_fin, monto_pagado, metodo_pago)
       VALUES ($1, $2, CURRENT_DATE, CURRENT_DATE + $3::int, $4, $5)
       RETURNING *`,
      [id_socio, id_plan, duracionDias, monto_pagado, metodo]
    );

    res.status(201).json({ mensaje: 'Pago registrado correctamente', membresia: result.rows[0] });

  } catch (error) {
    console.error('Error al registrar pago:', error);
    res.status(500).json({ error: 'Error al registrar el pago' });
  }
};

const getIngresos = async (req, res) => {
  const { tipo = 'diario', fecha } = req.query;

  let base;
  if (fecha) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({ error: 'Fecha inválida. Usá el formato YYYY-MM-DD' });
    }
    base = fecha;
  } else {
    const now = new Date();
    base = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }

  let desde;
  let hasta;
  if (tipo === 'diario') {
    desde = base;
    hasta = base;
  } else if (tipo === 'semanal') {
    const offset = getDow(base) === 0 ? -6 : 1 - getDow(base);
    desde = addDays(base, offset);
    hasta = addDays(desde, 6);
  } else if (tipo === 'mensual') {
    const [y, m] = base.split('-').map(Number);
    const ultimoDia = new Date(y, m, 0).getDate();
    desde = `${y}-${pad(m)}-01`;
    hasta = `${y}-${pad(m)}-${pad(ultimoDia)}`;
  } else {
    return res.status(400).json({ error: "tipo debe ser 'diario', 'semanal' o 'mensual'" });
  }

  try {
    const result = await pool.query(
      `SELECT
          m.id_membresia,
          s.id_socio,
          s.nombre || ' ' || s.apellido AS socio,
          p.nombre_plan AS plan,
          m.fecha_pago,
          m.monto_pagado,
          COALESCE(m.metodo_pago, 'Efectivo') AS metodo_pago
       FROM membresias m
       JOIN socios s ON s.id_socio = m.id_socio
       JOIN planes p ON p.id_plan = m.id_plan
       WHERE m.fecha_pago BETWEEN $1 AND $2
       ORDER BY m.fecha_pago DESC, m.id_membresia DESC`,
      [desde, hasta]
    );

    const rows = result.rows.map((r) => ({
      id_membresia: r.id_membresia,
      id_socio: r.id_socio,
      socio: r.socio,
      plan: r.plan,
      fecha_pago: toISODate(r.fecha_pago),
      monto_pagado: Number(r.monto_pagado),
      metodo_pago: r.metodo_pago,
    }));

    const total = rows.reduce((acc, r) => acc + r.monto_pagado, 0);

    const porFecha = new Map();
    for (const r of rows) {
      porFecha.set(r.fecha_pago, (porFecha.get(r.fecha_pago) || 0) + r.monto_pagado);
    }

    let evolucion;
    if (tipo === 'diario') {
      evolucion = [{ label: base, fecha: base, monto: total }];
    } else if (tipo === 'semanal') {
      const nombreDia = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
      evolucion = [];
      let cursor = desde;
      for (let i = 0; i < 7; i++) {
        evolucion.push({
          label: nombreDia[getDow(cursor)],
          fecha: cursor,
          monto: porFecha.get(cursor) || 0,
        });
        cursor = addDays(cursor, 1);
      }
    } else {
      evolucion = [];
      let cursor = desde;
      while (cursor <= hasta) {
        evolucion.push({
          label: String(Number(cursor.split('-')[2])),
          fecha: cursor,
          monto: porFecha.get(cursor) || 0,
        });
        cursor = addDays(cursor, 1);
      }
    }

    res.json({ tipo, fecha: base, desde, hasta, total, cantidad: rows.length, detalle: rows, evolucion });
  } catch (error) {
    console.error('Error al obtener ingresos:', error);
    res.status(500).json({ error: 'Error al obtener los ingresos por membresía' });
  }
};

module.exports = { registrarPago, getIngresos };