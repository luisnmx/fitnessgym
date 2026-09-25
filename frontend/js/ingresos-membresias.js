// FitnesGym — Ingresos por Membresías.
const API_BASE_URL = 'http://localhost:3000/api';

const formatearGs = (n) => `${new Intl.NumberFormat('es-PY').format(n)} Gs`;

const formatoISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
};

const lunesDeISO = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const offset = (dt.getDay() + 6) % 7;
  const lunes = new Date(y, m - 1, d - offset);
  return formatoISO(lunes);
};

const primeroDeMes = (iso) => `${iso.slice(0, 7)}-01`;

const desdeISO = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const estado = {
  tipo: 'diario',
  hoy: (() => {
    const h = new Date();
    return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`;
  })(),
  iso: { diario: null, semanal: null, mensual: null },
};

const $ = (id) => document.getElementById(id);

function aplicarTipo(tipo) {
  estado.tipo = tipo;
  document.querySelectorAll('.btn-tipo-reporte').forEach((btn) => {
    const activo = btn.dataset.tipo === tipo;
    btn.className = 'btn-tipo-reporte px-3 py-1.5 rounded text-label-md font-label-md transition-colors ' +
      (activo
        ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
        : 'text-on-surface-variant hover:text-on-surface');
  });

  $('selector-dia').classList.toggle('hidden', tipo !== 'diario');
  $('selector-semana').classList.toggle('hidden', tipo !== 'semanal');
  $('selector-mes').classList.toggle('hidden', tipo !== 'mensual');

  const etiquetas = { diario: 'Día:', semanal: 'Semana:', mensual: 'Mes:' };
  $('label-selector-fecha').textContent = etiquetas[tipo];

  if (window.__flatpickrInstancias) {
    Object.values(window.__flatpickrInstancias).forEach((i) => i.close());
  }
}

function fechaSeleccionada() {
  const iso = estado.iso[estado.tipo] || estado.hoy;
  if (estado.tipo === 'semanal') return lunesDeISO(iso);
  if (estado.tipo === 'mensual') return primeroDeMes(iso);
  return iso;
}

function toggleVacio(muestraDetalle) {
  const tiene = muestraDetalle && muestraDetalle.length > 0;
  const tabla = document.querySelector('#detalle-pagos-container');
  const vacio = $('estado-vacio-pagos');
  $('label-conteo-pagos').textContent = `Mostrando ${muestraDetalle.length} pagos`;
  tabla.classList.toggle('hidden', !tiene);
  vacio.classList.toggle('hidden', tiene);
}

function renderGrafico(evolucion) {
  const contenedor = $('grafico-barras');
  if (!evolucion || evolucion.length === 0) {
    contenedor.innerHTML = '<div class="font-body-sm text-body-sm text-on-surface-variant py-8">Sin datos para graficar</div>';
    return;
  }
  const max = Math.max(...evolucion.map((e) => e.monto), 1);
  contenedor.innerHTML = evolucion.map((e) => {
    const alto = e.monto === 0 ? 3 : Math.max(6, Math.round((e.monto / max) * 140));
    const barraCls = e.monto === 0
      ? 'background:#2a2a2d;height:' + alto + 'px;border-radius:4px 4px 0 0;'
      : 'background:linear-gradient(180deg,#4edea3,#10b981);height:' + alto + 'px;border-radius:4px 4px 0 0;box-shadow:0 2px 6px rgba(16,185,129,0.25);';
    return (
      '<div class="flex flex-col items-center justify-end gap-1 min-w-[18px] flex-1" title="' + e.label + ': ' + formatearGs(e.monto) + '">' +
      '<span class="font-label-sm text-label-sm text-on-surface-variant leading-none">' +
        (e.monto === 0 ? '' : new Intl.NumberFormat('es-PY', { notation: 'compact', maximumFractionDigits: 1 }).format(e.monto)) +
      '</span>' +
      '<div style="width:100%;max-width:34px;' + barraCls + '"></div>' +
      '<span class="font-label-sm text-label-sm text-on-surface-variant leading-none">' + e.label + '</span>' +
      '</div>'
    );
  }).join('');
}

function renderMetodos(detalle) {
  const conteo = {};
  detalle.forEach((p) => {
    const m = p.metodo_pago || 'Efectivo';
    conteo[m] = (conteo[m] || 0) + 1;
  });
  const entradas = Object.entries(conteo);
  $('metodo-principal-reporte').textContent = entradas.length === 0 ? '—' : entradas[0][0];
  $('total-efectivo-reporte').textContent = formatearGs(
    detalle.filter((p) => (p.metodo_pago || 'Efectivo') === 'Efectivo')
      .reduce((a, p) => a + p.monto_pagado, 0)
  );
}

async function cargarReporte() {
  const fecha = fechaSeleccionada();
  const b = new URLSearchParams({ tipo: estado.tipo, fecha });
  try {
    const resp = await fetch(`${API_BASE_URL}/membresias/ingresos?${b.toString()}`);
    if (!resp.ok) {
      const e = await resp.json().catch(() => ({}));
      throw new Error(e.error || 'Error al obtener los ingresos');
    }
    const data = await resp.json();

    $('total-ingresos').textContent = formatearGs(data.total);
    $('periodo-reporte').textContent = `Período: ${data.desde} → ${data.hasta}`;
    $('contador-pagos-reporte').textContent = data.cantidad;
    $('promedio-reporte').textContent = formatearGs(data.cantidad ? Math.round(data.total / data.cantidad) : 0);

    renderMetodos(data.detalle);

    const pluralDia = data.desde === data.hasta ? 'día' : 'días';
    const subtitulos = {
      diario: `Ingresos agrupados por día (${pluralDia}).`,
      semanal: 'Ingresos agrupados por cada día de la semana seleccionada.',
      mensual: 'Ingresos agrupados por cada día del mes seleccionado.',
    };
    $('subtitulo-grafico').textContent = subtitulos[data.tipo] || subtitulos.diario;
    renderGrafico(data.evolucion);

    const tbody = $('detalle-pagos-container');
    tbody.innerHTML = data.detalle.map((p) =>
      '<tr>' +
      '<td class="py-space-sm px-space-md font-semibold text-on-surface">' + p.socio + '</td>' +
      '<td class="py-space-sm px-space-md text-on-surface-variant">' + p.plan + '</td>' +
      '<td class="py-space-sm px-space-md text-on-surface-variant">' + p.fecha_pago + '</td>' +
      '<td class="py-space-sm px-space-md"><span class="px-2 py-0.5 rounded text-[11px] font-bold bg-surface-container-high text-on-surface">' + p.metodo_pago + '</span></td>' +
      '<td class="py-space-sm px-space-md text-right font-bold text-primary">' + formatearGs(p.monto_pagado) + '</td>' +
      '</tr>'
    ).join('');
    toggleVacio(data.detalle);
  } catch (error) {
    $('total-ingresos').textContent = '0 Gs';
    $('periodo-reporte').textContent = '—';
    $('contador-pagos-reporte').textContent = '0';
    $('promedio-reporte').textContent = '0 Gs';
    $('metodo-principal-reporte').textContent = '—';
    $('total-efectivo-reporte').textContent = '0 Gs';
    $('grafico-barras').innerHTML = '<div class="font-body-sm text-body-sm text-on-surface-variant py-8">No se pudo consultar: ' + error.message + '</div>';
    const tbody = $('detalle-pagos-container');
    tbody.innerHTML = '<tr><td colspan="5" class="py-6 text-center text-on-surface-variant">' + error.message + '</td></tr>';
    toggleVacio([]);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const hoy = new Date();
  estado.iso.diario = formatoISO(hoy);
  estado.iso.semanal = formatoISO(hoy);
  estado.iso.mensual = formatoISO(hoy);

  if (window.flatpickr) {
    const crearInstancia = (id, clave) => window.flatpickr(`#${id}`, {
      dateFormat: 'd/m/Y',
      defaultDate: desdeISO(estado.iso[clave]),
      disableMobile: true,
      allowInput: false,
      locale: (window.flatpickr.l10ns && window.flatpickr.l10ns.es) || 'default',
      onChange: (selectedDates) => {
        if (!selectedDates || selectedDates.length === 0) return;
        estado.iso[clave] = formatoISO(selectedDates[0]);
        cargarReporte();
      },
    });

    window.__flatpickrInstancias = {
      diario: crearInstancia('selector-dia', 'diario'),
      semanal: crearInstancia('selector-semana', 'semanal'),
      mensual: crearInstancia('selector-mes', 'mensual'),
    };
  }

  aplicarTipo(estado.tipo);

  document.querySelectorAll('.btn-tipo-reporte').forEach((btn) => {
    btn.addEventListener('click', () => {
      aplicarTipo(btn.dataset.tipo);
      cargarReporte();
    });
  });

  cargarReporte();
});