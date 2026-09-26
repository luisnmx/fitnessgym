const API_BASE_URL = window.location.origin + '/api';

let ventasCache = [];
let filtroTipo = 'todos';
let filtroTiempo = 'todos';
let ventasDetalleCache = {};

document.addEventListener('DOMContentLoaded', () => {
  cargarVentas();
  configurarFiltros();

  document.getElementById('buscador-ventas').addEventListener('keyup', renderTabla);

  document.getElementById('modal-ticket').addEventListener('click', (e) => {
    if (e.target.id === 'modal-ticket') cerrarTicket();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('modal-ticket');
      if (!modal.classList.contains('opacity-0')) cerrarTicket();
    }
  });
});

// ============================================================
// CARGA
// ============================================================
async function cargarVentas() {
  const tbody = document.getElementById('ventas-container');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" class="py-6 text-center text-on-surface-variant">Cargando ventas...</td></tr>';
  try {
    const response = await fetch(`${API_BASE_URL}/ventas`);
    if (!response.ok) throw new Error('Error HTTP ' + response.status);
    ventasCache = await response.json();
    actualizarStats();
    renderTabla();
  } catch (error) {
    console.error(error);
    tbody.innerHTML = '<tr><td colspan="7" class="py-6 text-center text-error">No se pudieron cargar las ventas. Verificá que el servidor esté corriendo.</td></tr>';
  }
}

// ============================================================
// AUXILIARES DE FORMATO
// ============================================================
function formatearMoneda(num) {
  return `Gs ${Number(num).toLocaleString('es-PY', { maximumFractionDigits: 0 })}`;
}

function diaLocal(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatearFechaHora(iso) {
  if (!iso) return '—';
  const fecha = new Date(iso);
  if (isNaN(fecha)) return '—';
  const dia = fecha.toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const hora = fecha.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${dia} · ${hora} hs`;
}

// ============================================================
// FILTROS (tipo de cliente + período + texto)
// ============================================================
function configurarFiltros() {
  document.querySelectorAll('#filtro-tipo-cliente .btn-tipo-cliente').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#filtro-tipo-cliente .btn-tipo-cliente').forEach(b => desactivarBtn(b));
      activarBtn(btn);
      filtroTipo = btn.dataset.tipo;
      renderTabla();
    });
  });

  document.querySelectorAll('#filtro-tiempo .btn-tiempo').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#filtro-tiempo .btn-tiempo').forEach(b => desactivarBtn(b));
      activarBtn(btn);
      filtroTiempo = btn.dataset.tiempo;
      renderTabla();
    });
  });
}

function activarBtn(btn) {
  btn.classList.add('bg-primary-container', 'text-on-primary-container', 'font-bold', 'shadow-sm');
  btn.classList.remove('text-on-surface-variant', 'hover:text-on-surface');
}

function desactivarBtn(btn) {
  btn.classList.remove('bg-primary-container', 'text-on-primary-container', 'font-bold', 'shadow-sm');
  btn.classList.add('text-on-surface-variant', 'hover:text-on-surface');
}

function cumpleFiltroTipo(v) {
  if (filtroTipo === 'todos') return true;
  return filtroTipo === 'socio' ? !!v.id_socio : !v.id_socio;
}

function cumpleFiltroTiempo(v) {
  if (filtroTiempo === 'todos') return true;
  const hoy = new Date();
  const dia = diaLocal(v.fecha_venta);

  if (filtroTiempo === 'hoy') return dia === diaLocal(hoy);

  if (filtroTiempo === 'semana') {
    const hace7 = new Date();
    hace7.setDate(hoy.getDate() - 6);
    const fechaVenta = new Date(v.fecha_venta);
    return fechaVenta >= hace7 && fechaVenta <= hoy;
  }

  if (filtroTiempo === 'mes') {
    const f = new Date(v.fecha_venta);
    return f.getFullYear() === hoy.getFullYear() && f.getMonth() === hoy.getMonth();
  }

  return true;
}

function cumpleFiltroTexto(v) {
  const texto = (document.getElementById('buscador-ventas').value || '').toLowerCase().trim();
  if (!texto) return true;
  return `#${v.id_venta}`.includes(texto) ||
    String(v.cliente || '').toLowerCase().includes(texto) ||
    formatearFechaHora(v.fecha_venta).toLowerCase().includes(texto);
}

// ============================================================
// RENDER
// ============================================================
function renderTabla() {
  const tbody = document.getElementById('ventas-container');
  const vacio = document.getElementById('estado-vacio-ventas');
  const conteo = document.getElementById('label-conteo-ventas');

  if (ventasCache.length === 0) {
    tbody.innerHTML = '';
    vacio.classList.remove('hidden');
    vacio.classList.add('flex');
    conteo.textContent = 'Mostrando 0 transacciones';
    return;
  }
  vacio.classList.add('hidden');
  vacio.classList.remove('flex');

  const ventas = ventasCache
    .filter(v => cumpleFiltroTipo(v) && cumpleFiltroTiempo(v) && cumpleFiltroTexto(v))
    .slice()
    .sort((a, b) => new Date(b.fecha_venta) - new Date(a.fecha_venta));

  if (ventas.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="py-6 text-center text-on-surface-variant">No hay ventas que coincidan con los filtros.</td></tr>';
  } else {
    tbody.innerHTML = ventas.map(v => `
      <tr class="hover:bg-surface-container-high/50 transition-colors cursor-pointer" onclick="verTicket(${v.id_venta})">
        <td class="py-3.5 px-4 font-mono font-semibold text-on-surface whitespace-nowrap">#${String(v.id_venta).padStart(4, '0')}</td>
        <td class="py-3.5 px-4 font-mono text-on-surface-variant whitespace-nowrap">${formatearFechaHora(v.fecha_venta)}</td>
        <td class="py-3.5 px-4">
          ${v.id_socio
            ? '<span class="px-2.5 py-1 rounded-lg bg-primary-container/60 text-on-primary-container font-label-sm text-label-sm font-bold">Socio</span>'
            : '<span class="px-2.5 py-1 rounded-lg bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm font-medium">Ocasional</span>'}
        </td>
        <td class="py-3.5 px-4 text-on-surface">${v.cliente || '—'}</td>
        <td class="py-3.5 px-4 text-center font-mono text-on-surface-variant">${v.cantidad_items}</td>
        <td class="py-3.5 px-4 text-right font-mono font-semibold text-primary whitespace-nowrap">${formatearMoneda(v.total)}</td>
        <td class="py-3.5 px-4 text-right">
          <button type="button" onclick="event.stopPropagation();verTicket(${v.id_venta})" class="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface font-label-md text-label-md font-semibold transition-colors flex items-center gap-1.5 ml-auto">
            <span class="material-symbols-outlined text-[16px]">receipt_long</span>
            Ver ticket
          </button>
        </td>
      </tr>
    `).join('');
  }

  conteo.textContent = `Mostrando ${ventas.length} de ${ventasCache.length} transacciones`;
}

// ============================================================
// ESTADÍSTICAS (tarjetas)
// ============================================================
function actualizarStats() {
  const total = ventasCache.length;
  const recaudacion = ventasCache.reduce((acc, v) => acc + Number(v.total), 0);
  const socios = ventasCache.filter(v => !!v.id_socio).length;
  const ocasionales = ventasCache.filter(v => !v.id_socio).length;

  document.getElementById('contador-total-ventas').textContent = total;
  document.getElementById('contador-monto-total').textContent = formatearMoneda(recaudacion);
  document.getElementById('contador-socios').textContent = socios;
  document.getElementById('contador-ocasionales').textContent = ocasionales;
}

// ============================================================
// MODAL TICKET
// ============================================================
async function verTicket(id) {
  try {
    if (!ventasDetalleCache[id]) {
      const response = await fetch(`${API_BASE_URL}/ventas/${id}`);
      if (!response.ok) throw new Error('Error HTTP ' + response.status);
      ventasDetalleCache[id] = await response.json();
    }
    const detalle = ventasDetalleCache[id];

    document.getElementById('ticket-modal-id').innerText = `Ticket #${String(detalle.id_venta || id).padStart(4, '0')}`;
    document.getElementById('ticket-modal-fecha').textContent = formatearFechaHora(detalle.fecha_venta);
    document.getElementById('ticket-modal-cliente').textContent = detalle.cliente || '—';
    document.getElementById('ticket-modal-metodo').textContent = 'Contado (POS)';
    document.getElementById('ticket-modal-total').textContent = formatearMoneda(detalle.total);

    const items = detalle.items || [];
    document.getElementById('modal-items-ticket').innerHTML = items.length === 0
      ? '<tr><td colspan="4" class="py-4 text-center text-on-surface-variant">Sin ítems registrados.</td></tr>'
      : items.map(it => `
          <tr>
            <td class="py-2.5 px-3 font-medium text-on-surface">${it.nombre_producto}</td>
            <td class="py-2.5 px-2 text-center font-mono text-on-surface-variant">${it.cantidad}</td>
            <td class="py-2.5 px-3 text-right font-mono text-on-surface-variant">${formatearMoneda(it.precio_unitario)}</td>
            <td class="py-2.5 px-3 text-right font-mono text-on-surface font-semibold">${formatearMoneda(it.subtotal)}</td>
          </tr>
        `).join('');

    abrirTicket();
  } catch (error) {
    console.error(error);
    toast('Error al cargar el ticket: ' + error.message, 'error');
  }
}

function abrirTicket() {
  const modal = document.getElementById('modal-ticket');
  const card = document.getElementById('modal-ticket-card');
  modal.classList.remove('opacity-0', 'pointer-events-none');
  card.classList.remove('scale-95');
  card.classList.add('scale-100');
}

function cerrarTicket() {
  const modal = document.getElementById('modal-ticket');
  const card = document.getElementById('modal-ticket-card');
  modal.classList.add('opacity-0', 'pointer-events-none');
  card.classList.remove('scale-100');
  card.classList.add('scale-95');
}

// ============================================================
// EXPORTAR CSV
// ============================================================
function exportarCSV() {
  if (ventasCache.length === 0) {
    toast('No hay ventas para exportar.', 'info');
    return;
  }

  const filas = [['Ticket', 'Fecha', 'Tipo', 'Cliente', 'Items', 'Total (Gs)']];
  ventasCache.forEach(v => {
    filas.push([
      String(v.id_venta),
      formatearFechaHora(v.fecha_venta),
      v.id_socio ? 'Socio' : 'Ocasional',
      `"${(v.cliente || '').replace(/"/g, '""')}"`,
      String(v.cantidad_items),
      String(Number(v.total).toFixed(2)),
    ]);
  });

  const csv = filas.map(f => f.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `historial_ventas_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  toast(`Exportadas ${ventasCache.length} ventas a CSV.`, 'success');
}

// ============================================================
// TOAST (feedback temporal)
// ============================================================
function toast(texto, tipo) {
  const colores = {
    success: 'bg-emerald-600 text-white',
    error: 'bg-red-600 text-white',
    info: 'bg-sky-600 text-white',
  };
  const el = document.createElement('div');
  el.textContent = texto;
  el.className = `fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-xl shadow-2xl font-body-md text-body-md font-semibold ${colores[tipo] || colores.info}`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}