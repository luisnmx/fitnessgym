const API_BASE_URL = 'http://localhost:3000/api';

let sociosCache = [];

document.addEventListener('DOMContentLoaded', () => {
  mostrarFechaActual();
  cargarSocios();
});

function mostrarFechaActual() {
  const el = document.getElementById('fecha-actual');
  if (!el) return;
  const hoy = new Date();
  const opciones = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  const fecha = hoy.toLocaleDateString('es-PY', opciones);
  const hora = hoy.toLocaleTimeString('es-PY', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  el.textContent = `${fecha.toUpperCase()} · ${hora} HS`;
}

// ============================================================
// CARGA Y RENDER DE LA TABLA
// ============================================================
async function cargarSocios() {
  try {
    const response = await fetch(`${API_BASE_URL}/socios`);
    sociosCache = await response.json();
    renderTabla();
    actualizarStats();
  } catch (error) {
    console.error(error);
    mostrarMensaje('Error al cargar los socios. Verificá que el servidor esté corriendo.', 'error');
  }
}

function renderTabla() {
  const tbody = document.getElementById('socios-container');
  if (!tbody) return;

  if (sociosCache.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-[#71717a] text-xs">No hay socios cargados todavía.</td></tr>`;
    return;
  }

  tbody.innerHTML = sociosCache.map(s => {
    const activo = s.activo;
    const dias = s.dias_restantes === null ? null : Number(s.dias_restantes);

    let badgeEstado, badgeMembresia = '';
    if (activo) {
      badgeEstado = `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><span class="w-1 h-1 rounded-full bg-emerald-400"></span> Activo</span>`;
    } else {
      badgeEstado = `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#2a2a30] text-[#8e8e99] border border-[#3a3a44]"><span class="w-1 h-1 rounded-full bg-[#8e8e99]"></span> Inactivo</span>`;
    }

    if (s.fecha_fin) {
      if (dias < 0) {
        badgeMembresia = `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-red-500/10 text-red-400 border border-red-500/20"><span class="w-1 h-1 rounded-full bg-red-400"></span> Vencida</span>`;
      } else if (dias <= 4) {
        badgeMembresia = `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20"><span class="w-1 h-1 rounded-full bg-amber-400"></span> ${dias === 0 ? 'Vence hoy' : `${Number(s.dias_restantes).toLocaleString('es-PY')} días`}</span>`;
      }
    }

    const busquedaEsc = escapeAttr(`${s.nombre} ${s.apellido} ${s.telefono || ''} ${s.email || ''}`);
    const planNombre = s.nombre_plan || '—';
    const fechaFin = formatearFecha(s.fecha_fin);

    return `
      <tr class="socio-row hover:bg-[#1a1a1e] transition-colors group ${activo ? '' : 'opacity-50 hover:opacity-80'}"
          data-activo="${activo}" data-busqueda="${busquedaEsc}">
        <td class="py-3.5 px-4 font-mono text-[#71717a]">#${String(s.id_socio).padStart(2, '0')}</td>
        <td class="py-3.5 px-4">
          <div class="font-semibold text-white">${s.apellido || ''}, ${s.nombre}</div>
        </td>
        <td class="py-3.5 px-4">
          <div class="text-[#d4d4d8]">${s.telefono || '<span class="text-[#52525b]">—</span>'}</div>
          <div class="text-[11px] text-[#71717a] mt-0.5">${s.email || ''}</div>
        </td>
        <td class="py-3.5 px-4 font-mono text-[#a1a1aa]">${planNombre}</td>
        <td class="py-3.5 px-4">
          <div class="font-mono text-[#d4d4d8]">${fechaFin}</div>
          ${badgeMembresia}
        </td>
        <td class="py-3.5 px-4 text-center">${badgeEstado}</td>
        <td class="py-3.5 px-4 text-right">
          <div class="flex items-center justify-end gap-2">
            <button onclick="abrirModalEditar(${s.id_socio})" class="px-2.5 py-1 rounded bg-[#1e1e24] hover:bg-[#2a2a34] text-[#d4d4d8] hover:text-white border border-[#2e2e38] transition-colors font-medium text-[11px]">
              Editar
            </button>
            <button onclick="toggleEstadoSocio(${s.id_socio}, ${!activo})" class="px-2.5 py-1 rounded ${activo ? 'bg-[#1b1717] hover:bg-[#2d1a1a] text-[#f87171] border border-red-900/30' : 'bg-[#132018] hover:bg-[#1a2b21] text-emerald-400 border border-emerald-900/30'} transition-colors font-medium text-[11px]">
              ${activo ? 'Dar de baja' : 'Reactivar'}
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  filtrarSocios();
}

function actualizarStats() {
  const total = sociosCache.length;
  const activos = sociosCache.filter(s => s.activo).length;
  const inactivos = total - activos;
  const enAlerta = sociosCache.filter(s => s.activo && s.dias_restantes !== null && Number(s.dias_restantes) <= 4).length;

  const elTotal = document.getElementById('stat-total');
  const elActivos = document.getElementById('stat-activos');
  const elVencidos = document.getElementById('stat-vencidos');
  const elInactivos = document.getElementById('stat-inactivos');

  if (elTotal) elTotal.textContent = total;
  if (elActivos) elActivos.textContent = activos;
  if (elVencidos) elVencidos.textContent = enAlerta;
  if (elInactivos) elInactivos.textContent = inactivos;
}

function formatearFecha(iso) {
  if (!iso) return '—';
  const texto = Array.isArray(iso) ? iso[0] : String(iso);
  const soloDia = texto.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(soloDia)) return '—';
  const [anio, mes, dia] = soloDia.split('-');
  return `${dia}/${mes}/${anio}`;
}

function escapeAttr(text) {
  return String(text).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function fechaAInput(iso) {
  if (!iso) return '';
  const texto = Array.isArray(iso) ? iso[0] : String(iso);
  const soloDia = texto.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(soloDia) ? soloDia : '';
}

// ============================================================
// MODAL EDICIÓN
// ============================================================
function abrirModalEditar(id) {
  const s = sociosCache.find(x => Number(x.id_socio) === Number(id));
  if (!s) return;

  document.getElementById('socio-id-editing').value = s.id_socio;
  document.getElementById('modal-titulo').innerText = `Editar Socio #${s.id_socio}`;
  document.getElementById('edit-nombre').value = s.nombre || '';
  document.getElementById('edit-apellido').value = s.apellido || '';
  document.getElementById('edit-telefono').value = s.telefono || '';
  document.getElementById('edit-email').value = s.email || '';
  document.getElementById('modal-plan').textContent = s.nombre_plan || 'Sin membresía';

  document.getElementById('membresia-id-editing').value = s.id_membresia || '';
  document.getElementById('edit-fecha-inicio').value = fechaAInput(s.fecha_inicio);
  document.getElementById('edit-fecha-fin').value = fechaAInput(s.fecha_fin);

  document.getElementById('modal-socio').classList.remove('hidden');
  document.getElementById('edit-nombre').focus();
}

function cerrarModal() {
  document.getElementById('modal-socio').classList.add('hidden');
}

// ============================================================
// GUARDAR CAMBIOS
// ============================================================
async function guardarSocio(e) {
  e.preventDefault();

  const id = document.getElementById('socio-id-editing').value;
  const idMembresia = document.getElementById('membresia-id-editing').value;
  const fechaInicio = document.getElementById('edit-fecha-inicio').value || null;
  const fechaFin = document.getElementById('edit-fecha-fin').value || null;

  const datos = {
    nombre: document.getElementById('edit-nombre').value.trim(),
    apellido: document.getElementById('edit-apellido').value.trim(),
    telefono: document.getElementById('edit-telefono').value.trim(),
    email: document.getElementById('edit-email').value.trim(),
    ...(idMembresia ? { id_membresia: Number(idMembresia), fecha_inicio: fechaInicio, fecha_fin: fechaFin } : {}),
  };

  if (!datos.nombre || !datos.apellido) {
    mostrarMensaje('Nombre y apellido son obligatorios.', 'error');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/socios/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    });
    const resultado = await response.json();
    if (!response.ok) throw new Error(resultado.error || 'Error al actualizar');

    cerrarModal();
    mostrarMensaje(`Socio #${id} "${datos.nombre} ${datos.apellido}" actualizado correctamente.`, 'success');
    cargarSocios();

  } catch (error) {
    mostrarMensaje('Error: ' + error.message, 'error');
    console.error(error);
  }
}

// ============================================================
// MODAL DE CONFIRMACIÓN PERSONALIZADO (Reemplazo de confirm())
// ============================================================
function mostrarConfirmacionModal(mensaje) {
  return new Promise((resolve) => {
    // Buscar o inyectar dinámicamente el HTML del modal si no existe en el DOM
    let modal = document.getElementById('custom-confirm-modal');
    if (!modal) {
      const modalHTML = `
        <div id="custom-confirm-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm hidden">
          <div class="w-full max-w-md bg-[#161619] border border-neutral-800 rounded-lg shadow-2xl p-6 mx-4 space-y-6">
            <div class="space-y-2">
              <span class="text-[10px] font-mono tracking-[0.25em] text-neutral-400 uppercase">Confirmación requerida</span>
              <h3 id="custom-confirm-mensaje" class="text-lg font-light text-white leading-relaxed"></h3>
            </div>
            <div class="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
              <button id="custom-confirm-btn-cancelar" class="px-4 py-2 text-xs font-mono tracking-wider uppercase text-neutral-400 hover:text-white transition-colors cursor-pointer" type="button">
                Cancelar
              </button>
              <button id="custom-confirm-btn-aceptar" class="px-5 py-2.5 rounded-md text-xs font-semibold uppercase tracking-[0.14em] text-neutral-950 bg-white hover:bg-neutral-200 transition-all cursor-pointer shadow-sm" type="button">
                Sí, confirmar
              </button>
            </div>
          </div>
        </div>`;
      document.body.insertAdjacentHTML('beforeend', modalHTML);
      modal = document.getElementById('custom-confirm-modal');
    }

    const textoMensaje = document.getElementById('custom-confirm-mensaje');
    const btnAceptar = document.getElementById('custom-confirm-btn-aceptar');
    const btnCancelar = document.getElementById('custom-confirm-btn-cancelar');

    textoMensaje.textContent = mensaje;
    modal.classList.remove('hidden');

    // Clonar botones para limpiar listeners anteriores y evitar ejecuciones múltiples
    const nuevoBtnAceptar = btnAceptar.cloneNode(true);
    const nuevoBtnCancelar = btnCancelar.cloneNode(true);
    btnAceptar.parentNode.replaceChild(nuevoBtnAceptar, btnAceptar);
    btnCancelar.parentNode.replaceChild(nuevoBtnCancelar, btnCancelar);

    document.getElementById('custom-confirm-btn-aceptar').addEventListener('click', () => {
      modal.classList.add('hidden');
      resolve(true);
    });

    document.getElementById('custom-confirm-btn-cancelar').addEventListener('click', () => {
      modal.classList.add('hidden');
      resolve(false);
    });
  });
}

// ============================================================
// BAJA LÓGICA / REACTIVAR
// ============================================================
async function toggleEstadoSocio(id, reactivar) {
  const s = sociosCache.find(x => Number(x.id_socio) === Number(id));
  const nombre = s ? `${s.nombre} ${s.apellido}` : `#${id}`;

  if (!reactivar) {
    const confirmado = await mostrarConfirmacionModal(`¿Dar de baja a ${nombre}? El socio quedará inactivo pero su histórico se mantendrá.`);
    if (!confirmado) return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/socios/${id}/estado`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: reactivar }),
    });
    const resultado = await response.json();
    if (!response.ok) throw new Error(resultado.error || 'Error al cambiar estado');

    mostrarMensaje(
      reactivar
        ? `${nombre} reactivado con éxito.`
        : `${nombre} marcado como inactivo.`,
      reactivar ? 'success' : 'info'
    );
    cargarSocios();

  } catch (error) {
    mostrarMensaje('Error: ' + error.message, 'error');
    console.error(error);
  }
}

// ============================================================
// FILTROS DE BÚSQUEDA
// ============================================================
function filtrarSocios() {
  const buscador = document.getElementById('buscador-socio');
  const toggleInactivos = document.getElementById('toggle-inactivos');
  
  if (!buscador || !toggleInactivos) return;

  const texto = buscador.value.toLowerCase();
  const mostrarInactivos = toggleInactivos.checked;
  const rows = document.querySelectorAll('.socio-row');

  rows.forEach(row => {
    const busqueda = (row.getAttribute('data-busqueda') || '').toLowerCase();
    const activo = row.getAttribute('data-activo') === 'true';

    const coincideTexto = busqueda.includes(texto);
    const coincideEstado = activo || mostrarInactivos;

    row.style.display = (coincideTexto && coincideEstado) ? '' : 'none';
  });
}

// ============================================================
// MENSAJE DE FEEDBACK
// ============================================================
function mostrarMensaje(texto, tipo) {
  const el = document.getElementById('mensaje-resultado');
  if (!el) return;
  
  el.classList.remove('hidden', 'bg-emerald-500/10', 'text-emerald-300', 'border-emerald-500/30', 'bg-red-500/10', 'text-red-300', 'border-red-500/30', 'bg-blue-500/10', 'text-blue-300', 'border-blue-500/30');

  if (tipo === 'success') {
    el.classList.add('bg-emerald-500/10', 'text-emerald-300', 'border-emerald-500/30');
  } else if (tipo === 'error') {
    el.classList.add('bg-red-500/10', 'text-red-300', 'border-red-500/30');
  } else {
    el.classList.add('bg-blue-500/10', 'text-blue-300', 'border-blue-500/30');
  }

  el.innerHTML = `
    <div class="flex items-center gap-2">
      <span class="w-2 h-2 rounded-full ${tipo === 'error' ? 'bg-red-400' : tipo === 'success' ? 'bg-emerald-400' : 'bg-blue-400'}"></span>
      <span>${texto}</span>
    </div>
    <button onclick="this.parentElement.classList.add('hidden')" class="hover:text-white font-mono">&times;</button>
  `;

  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}