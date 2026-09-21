const API_BASE_URL = 'http://localhost:3000/api';

let planesCache = [];

document.addEventListener('DOMContentLoaded', () => {
  cargarPlanes();
});

async function cargarPlanes() {
  try {
    const response = await fetch(`${API_BASE_URL}/planes/todos`);
    planesCache = await response.json();
    renderTabla();
  } catch (error) {
    console.error(error);
    mostrarMensaje('Error al cargar los planes. Verificá que el servidor esté corriendo.', 'error');
  }
}

function renderTabla() {
  const tbody = document.getElementById('planes-container');

  if (planesCache.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-[#71717a] text-xs">No hay planes cargados todavía.</td></tr>`;
    return;
  }

  tbody.innerHTML = planesCache.map(p => {
    const activo = p.activo;
    const badge = activo
      ? `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><span class="w-1 h-1 rounded-full bg-emerald-400"></span> Activo</span>`
      : `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#2a2a30] text-[#8e8e99] border border-[#3a3a44]"><span class="w-1 h-1 rounded-full bg-[#8e8e99]"></span> Desactivado</span>`;

    return `
      <tr class="hover:bg-[#1a1a1e] transition-colors ${activo ? '' : 'opacity-50 hover:opacity-80'}">
        <td class="py-3.5 px-4 font-mono text-[#71717a]">#${String(p.id_plan).padStart(2, '0')}</td>
        <td class="py-3.5 px-4">
          <div class="font-semibold text-white">${p.nombre_plan}</div>
        </td>
        <td class="py-3.5 px-4 font-mono text-[#a1a1aa]">${p.duracion_dias} días</td>
        <td class="py-3.5 px-4 font-mono text-[#d4d4d8]">Gs ${Number(p.precio).toLocaleString('es-PY')}</td>
        <td class="py-3.5 px-4 text-center">${badge}</td>
        <td class="py-3.5 px-4 text-right">
          <div class="flex items-center justify-end gap-2">
            <button onclick="abrirModalEditar(${p.id_plan})" class="px-2.5 py-1 rounded bg-[#1e1e24] hover:bg-[#2a2a34] text-[#d4d4d8] hover:text-white border border-[#2e2e38] transition-colors font-medium text-[11px]">
              Editar
            </button>
            ${activo
              ? `<button onclick="toggleEstadoPlan(${p.id_plan})" class="px-2.5 py-1 rounded bg-[#1b1717] hover:bg-[#2d1a1a] text-[#f87171] border border-red-900/30 transition-colors font-medium text-[11px]">
                  Desactivar
                </button>`
              : `<button onclick="reactivarPlan(${p.id_plan})" class="px-2.5 py-1 rounded bg-[#132018] hover:bg-[#1a2b21] text-emerald-400 border border-emerald-900/30 transition-colors font-medium text-[11px]">
                  Reactivar
                </button>`}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ============================================================
// MODAL
// ============================================================
function abrirModalCrear() {
  document.getElementById('plan-id-editing').value = '';
  document.getElementById('modal-titulo').innerText = 'Nuevo Plan';
  document.getElementById('plan-nombre').value = '';
  document.getElementById('plan-dias').value = '';
  document.getElementById('plan-precio').value = '';
  document.getElementById('modal-plan').classList.remove('hidden');
  document.getElementById('plan-nombre').focus();
}

function abrirModalEditar(id) {
  const p = planesCache.find(x => Number(x.id_plan) === Number(id));
  if (!p) return;

  document.getElementById('plan-id-editing').value = p.id_plan;
  document.getElementById('modal-titulo').innerText = `Editar Plan #${p.id_plan}`;
  document.getElementById('plan-nombre').value = p.nombre_plan || '';
  document.getElementById('plan-dias').value = p.duracion_dias || '';
  document.getElementById('plan-precio').value = p.precio;
  document.getElementById('modal-plan').classList.remove('hidden');
  document.getElementById('plan-nombre').focus();
}

function cerrarModal() {
  document.getElementById('modal-plan').classList.add('hidden');
}

// ============================================================
// GUARDAR (CREAR / ACTUALIZAR)
// ============================================================
async function guardarPlan(e) {
  e.preventDefault();

  const id = document.getElementById('plan-id-editing').value;
  const datos = {
    nombre_plan: document.getElementById('plan-nombre').value.trim(),
    duracion_dias: Number(document.getElementById('plan-dias').value),
    precio: Number(document.getElementById('plan-precio').value),
  };

  if (!datos.nombre_plan) {
    mostrarMensaje('El nombre del plan es obligatorio.', 'error');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/planes${id ? '/' + id : ''}`, {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    });
    const resultado = await response.json();
    if (!response.ok) throw new Error(resultado.error || 'Error al guardar');

    cerrarModal();
    mostrarMensaje(
      id ? `Plan "${datos.nombre_plan}" actualizado correctamente.` : `Plan "${datos.nombre_plan}" creado correctamente.`,
      'success'
    );
    cargarPlanes();

  } catch (error) {
    mostrarMensaje('Error: ' + error.message, 'error');
    console.error(error);
  }
}

// ============================================================
// DESACTIVAR / REACTIVAR
// ============================================================
async function toggleEstadoPlan(id) {
  const p = planesCache.find(x => Number(x.id_plan) === Number(id));
  if (!p) return;

  const confirmar = confirm(`¿Desactivar el plan "${p.nombre_plan}"? Ya no aparecerá al registrar socios.`);
  if (!confirmar) return;

  try {
    const response = await fetch(`${API_BASE_URL}/planes/${id}/desactivar`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
    });
    const resultado = await response.json();
    if (!response.ok) throw new Error(resultado.error || 'Error al desactivar');

    mostrarMensaje(`Plan "${p.nombre_plan}" desactivado.`, 'info');
    cargarPlanes();

  } catch (error) {
    mostrarMensaje('Error: ' + error.message, 'error');
    console.error(error);
  }
}

async function reactivarPlan(id) {
  const p = planesCache.find(x => Number(x.id_plan) === Number(id));
  if (!p) return;

  try {
    const response = await fetch(`${API_BASE_URL}/planes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre_plan: p.nombre_plan,
        duracion_dias: p.duracion_dias,
        precio: p.precio,
        activo: true,
      }),
    });
    const resultado = await response.json();
    if (!response.ok) throw new Error(resultado.error || 'Error al reactivar');

    mostrarMensaje(`Plan "${p.nombre_plan}" reactivado.`, 'success');
    cargarPlanes();

  } catch (error) {
    mostrarMensaje('Error: ' + error.message, 'error');
    console.error(error);
  }
}

// ============================================================
// MENSAJE DE FEEDBACK
// ============================================================
function mostrarMensaje(texto, tipo) {
  const el = document.getElementById('mensaje-resultado');
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