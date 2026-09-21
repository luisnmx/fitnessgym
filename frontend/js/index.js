const API_BASE_URL = 'http://localhost:3000/api';

let alertasCache = [];
let planesCache = [];
let currentFilter = 'TODOS';
let socioSeleccionadoId = null;

document.addEventListener('DOMContentLoaded', () => {
  cargarAlertas();
  cargarPlanes();
  cargarResumen();
});

// ============================================================
// CARGA DE DATOS
// ============================================================
async function cargarAlertas() {
  try {
    const response = await fetch(`${API_BASE_URL}/socios/alertas`);
    alertasCache = await response.json();
    renderTabla();
  } catch (error) {
    console.error(error);
    document.getElementById('alertas-container').innerHTML =
      `<tr><td colspan="6" class="py-6 text-center text-secondary">Error al cargar las alertas. Verificá que el servidor esté corriendo.</td></tr>`;
  }
}

async function cargarPlanes() {
  try {
    const response = await fetch(`${API_BASE_URL}/planes`);
    planesCache = await response.json();
  } catch (error) {
    console.error('Error al cargar planes:', error);
  }
}

async function cargarResumen() {
  try {
    const [sociosRes, productosRes] = await Promise.all([
      fetch(`${API_BASE_URL}/socios`),
      fetch(`${API_BASE_URL}/productos`),
    ]);
    const [socios, productos] = await Promise.all([sociosRes.json(), productosRes.json()]);

    const activos = Array.isArray(socios) ? socios.filter(s => s.activo === true).length : 0;
    const stockBajo = Array.isArray(productos)
      ? productos.filter(p => p.activo && Number(p.stock) <= 5).length
      : 0;

    const contadorActivos = document.getElementById('contador-socios-activos');
    const contadorStock = document.getElementById('contador-stock-bajo');
    if (contadorActivos) contadorActivos.textContent = activos;
    if (contadorStock) contadorStock.textContent = stockBajo;
  } catch (error) {
    console.error('Error al cargar el resumen:', error);
  }
}

// ============================================================
// RENDER DE TABLA Y CONTADORES
// ============================================================
function renderTabla() {
  const tbody = document.getElementById('alertas-container');

  const vencidos = alertasCache.filter(a => a.estado_alerta === 'VENCIDO').length;
  const porVencer = alertasCache.filter(a => a.estado_alerta === 'POR VENCER').length;
  const total = alertasCache.length;

  document.getElementById('contador-vencidos').textContent = vencidos;
  document.getElementById('contador-por-vencer').textContent = porVencer;
  document.getElementById('contador-total').textContent = total;
  document.getElementById('badge-total').textContent = total;
  document.getElementById('badge-vencidos').textContent = vencidos;
  document.getElementById('badge-por-vencer').textContent = porVencer;

  if (total === 0) {
    tbody.innerHTML = '';
    document.getElementById('empty-state').classList.remove('hidden');
    document.getElementById('label-conteo-filtrado').textContent = 'Mostrando 0 registros';
    return;
  }
  document.getElementById('empty-state').classList.add('hidden');

  tbody.innerHTML = alertasCache.map(a => {
    const iniciales = (a.nombre[0] || '') + (a.apellido[0] || '');
    const esVencido = a.estado_alerta === 'VENCIDO';
    const fecha = new Date(a.fecha_fin);
    const fechaTexto = fecha.toLocaleDateString('es-PY', { day: '2-digit', month: 'short', year: 'numeric' });
    const diasTexto = a.dias_restantes < 0
      ? `${a.dias_restantes} días`
      : `${a.dias_restantes} ${a.dias_restantes === 1 ? 'día' : 'días'}`;

    return `
      <tr class="alert-row bg-transparent hover:bg-surface-container transition-colors group"
          data-estado="${a.estado_alerta}" data-nombre="${a.nombre} ${a.apellido}" data-plan="${a.nombre_plan}" data-tel="${a.telefono || ''}">
        <td class="py-space-sm px-space-md">
          <div class="flex items-center gap-space-sm">
            <div class="w-9 h-9 rounded bg-surface-container-high flex items-center justify-center font-headline-sm text-headline-sm ${esVencido ? 'text-secondary' : 'text-tertiary'} font-bold shrink-0">${iniciales.toUpperCase()}</div>
            <div class="flex flex-col min-w-0">
              <span class="font-label-lg text-label-lg text-on-surface truncate group-hover:text-primary transition-colors">${a.nombre} ${a.apellido}</span>
              <span class="font-body-sm text-body-sm text-on-surface-variant truncate">${a.telefono || 'Sin teléfono'}</span>
            </div>
          </div>
        </td>
        <td class="py-space-sm px-space-md"><span class="font-body-md text-body-md text-on-surface font-semibold">${a.nombre_plan}</span></td>
        <td class="py-space-sm px-space-md"><span class="font-body-md text-body-md text-on-surface">${fechaTexto}</span></td>
        <td class="py-space-sm px-space-md"><span class="font-label-lg text-label-lg font-bold ${esVencido ? 'text-secondary' : 'text-tertiary'}">${diasTexto}</span></td>
        <td class="py-space-sm px-space-md">
          <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase ${esVencido ? 'bg-secondary-container/30 text-secondary' : 'bg-tertiary-container/30 text-tertiary'}">
            <span class="w-1.5 h-1.5 rounded-full ${esVencido ? 'bg-secondary' : 'bg-tertiary'}"></span>
            ${a.estado_alerta}
          </span>
        </td>
        <td class="py-space-sm px-space-md text-right">
          <div class="flex items-center justify-end gap-space-xs">
            <button class="flex items-center gap-1 px-space-sm py-space-xs bg-primary text-on-primary font-label-md text-label-md font-bold rounded hover:bg-primary-fixed transition-transform active:scale-95 cursor-pointer"
                    onclick="registrarPagoModal(${a.id_socio}, '${a.nombre} ${a.apellido}')" title="Registrar Pago">
              <span class="material-symbols-outlined text-[16px]">payments</span><span>Cobrar</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  aplicarFiltros();
}

// ============================================================
// FILTROS Y BÚSQUEDA
// ============================================================
function filtrarEstado(estado) {
  currentFilter = estado;
  document.querySelectorAll('.tab-pill').forEach(pill => {
    if (pill.getAttribute('data-filter') === estado) {
      pill.className = 'tab-pill px-space-md py-space-xs rounded font-label-md text-label-md transition-colors bg-primary-container text-on-primary-container font-bold flex items-center gap-1.5 cursor-pointer';
    } else {
      pill.className = 'tab-pill px-space-md py-space-xs rounded font-label-md text-label-md transition-colors text-on-surface-variant hover:bg-surface-container hover:text-on-surface flex items-center gap-1.5 cursor-pointer';
    }
  });
  aplicarFiltros();
}

function handleSearch(term) {
  const clearBtn = document.getElementById('btn-clear-search');
  clearBtn.classList.toggle('hidden', !term);
  aplicarFiltros();
}

function clearSearch() {
  document.getElementById('buscador-alertas').value = '';
  document.getElementById('btn-clear-search').classList.add('hidden');
  aplicarFiltros();
}

function aplicarFiltros() {
  const searchTerm = document.getElementById('buscador-alertas').value.toLowerCase().trim();
  const rows = document.querySelectorAll('#alertas-container .alert-row');
  let visibles = 0;

  rows.forEach(row => {
    const estado = row.getAttribute('data-estado');
    const nombre = (row.getAttribute('data-nombre') || '').toLowerCase();
    const tel = (row.getAttribute('data-tel') || '').toLowerCase();
    const plan = (row.getAttribute('data-plan') || '').toLowerCase();

    const matchEstado = (currentFilter === 'TODOS') || (estado === currentFilter);
    const matchSearch = !searchTerm || nombre.includes(searchTerm) || tel.includes(searchTerm) || plan.includes(searchTerm);

    row.classList.toggle('hidden', !(matchEstado && matchSearch));
    if (matchEstado && matchSearch) visibles++;
  });

  document.getElementById('label-conteo-filtrado').textContent = `Mostrando ${visibles} registro${visibles === 1 ? '' : 's'}`;
}

function syncAlertas() {
  const icon = document.getElementById('sync-icon');
  icon.classList.add('animate-spin');
  cargarAlertas().finally(() => {
    setTimeout(() => icon.classList.remove('animate-spin'), 400);
  });
}

function exportarReporte() {
  if (alertasCache.length === 0) {
    alert('No hay alertas para exportar.');
    return;
  }
  const encabezado = ['Nombre', 'Apellido', 'Telefono', 'Plan', 'Fecha Vencimiento', 'Dias Restantes', 'Estado'];
  const filas = alertasCache.map(a => [
    a.nombre, a.apellido, a.telefono || '', a.nombre_plan,
    new Date(a.fecha_fin).toLocaleDateString('es-PY'), a.dias_restantes, a.estado_alerta
  ]);
  const csv = [encabezado, ...filas].map(fila => fila.map(v => `"${v}"`).join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `alertas_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
}

// ============================================================
// MODAL DE COBRO (registra el pago real vía /api/membresias)
// ============================================================
function registrarPagoModal(idSocio, nombreSocio) {
  socioSeleccionadoId = idSocio;
  document.getElementById('modal-socio-nombre').textContent = nombreSocio;
  document.getElementById('modal-mensaje').textContent = '';

  const selector = document.getElementById('modal-plan-selector');
  if (planesCache.length === 0) {
    selector.innerHTML = '<option value="">No hay planes disponibles</option>';
  } else {
    selector.innerHTML = planesCache.map(p =>
      `<option value="${p.id_plan}" data-precio="${p.precio}">${p.nombre_plan} (${p.duracion_dias} días) — ${Number(p.precio).toLocaleString('es-PY')} Gs</option>`
    ).join('');
  }
  actualizarMontoSugerido();

  document.getElementById('modal-cobro').classList.remove('hidden');
  document.getElementById('modal-cobro').classList.add('flex');
}

function actualizarMontoSugerido() {
  const selector = document.getElementById('modal-plan-selector');
  const opcion = selector.options[selector.selectedIndex];
  if (opcion) {
    document.getElementById('modal-monto').value = opcion.getAttribute('data-precio') || '';
  }
}

function cerrarModalCobro() {
  document.getElementById('modal-cobro').classList.add('hidden');
  document.getElementById('modal-cobro').classList.remove('flex');
  socioSeleccionadoId = null;
}

async function confirmarCobro() {
  const idPlan = document.getElementById('modal-plan-selector').value;
  const monto = document.getElementById('modal-monto').value;
  const mensaje = document.getElementById('modal-mensaje');

  if (!socioSeleccionadoId || !idPlan || !monto) {
    mensaje.textContent = 'Completá el plan y el monto antes de confirmar.';
    mensaje.className = 'text-xs text-secondary';
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/membresias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_socio: socioSeleccionadoId,
        id_plan: Number(idPlan),
        monto_pagado: monto,
      }),
    });
    const resultado = await response.json();

    if (!response.ok) throw new Error(resultado.error || 'Error al registrar el pago');

    mensaje.textContent = 'Pago registrado correctamente.';
    mensaje.className = 'text-xs text-primary';

    setTimeout(() => {
      cerrarModalCobro();
      cargarAlertas(); // el socio recién pagado desaparece de la lista de alertas
    }, 700);

  } catch (error) {
    mensaje.textContent = 'Error: ' + error.message;
    mensaje.className = 'text-xs text-secondary';
    console.error(error);
  }
}