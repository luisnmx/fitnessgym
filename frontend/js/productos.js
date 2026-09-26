const API_BASE_URL = window.location.origin + '/api';

let productosCache = [];

document.addEventListener('DOMContentLoaded', () => {
  cargarProductos();
});

// ============================================================
// CARGA Y RENDER DE LA TABLA
// ============================================================
async function cargarProductos() {
  try {
    const response = await fetch(`${API_BASE_URL}/productos`);
    productosCache = await response.json();
    renderTabla();
    actualizarStats();
  } catch (error) {
    console.error(error);
    mostrarMensaje('Error al cargar los productos. Verificá que el servidor esté corriendo.', 'error');
  }
}

function renderTabla() {
  const tbody = document.getElementById('productos-container');
  if (!tbody) return;

  if (productosCache.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-[#71717a] text-xs">No hay productos cargados todavía.</td></tr>`;
    return;
  }

  tbody.innerHTML = productosCache.map(p => {
    const stockBajo = p.stock <= 5;
    const nombreEsc = escapeAttr(p.nombre_producto);
    const descEsc = escapeAttr(p.descripcion || '');

    return `
      <tr class="producto-row hover:bg-[#1a1a1e] transition-colors group ${stockBajo ? 'bg-amber-500/[0.02]' : ''}"
          data-activo="${p.activo}" data-nombre="${nombreEsc} ${descEsc}">
        <td class="py-3.5 px-4 font-mono text-[#71717a]">#${String(p.id_producto).padStart(2, '0')}</td>
        <td class="py-3.5 px-4">
          <div class="font-semibold text-white flex items-center gap-2">
            ${p.nombre_producto}
            ${stockBajo ? '<span class="px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-500/15 text-amber-400 border border-amber-500/30 font-medium tracking-wide uppercase">¡Pocas unidades!</span>' : ''}
          </div>
          <div class="text-[11px] text-[#71717a] truncate max-w-xs mt-0.5">${p.descripcion || ''}</div>
        </td>
        <td class="py-3.5 px-4 font-mono font-medium text-white">
          ${Number(p.precio).toLocaleString('es-PY')} <span class="text-[10px] text-[#71717a]">Gs</span>
        </td>
        <td class="py-3.5 px-4 font-mono">
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded font-bold ${stockBajo ? 'text-amber-300 bg-amber-500/20 border border-amber-500/40' : 'text-white bg-[#22222a] border border-[#30303a]'}">${p.stock}</span>
            <div class="flex items-center border ${stockBajo ? 'border-amber-500/30' : 'border-[#2b2b35]'} rounded overflow-hidden">
              <button title="Descontar 1 unidad" onclick="ajustarStock(${p.id_producto}, -1)" class="px-1.5 py-0.5 bg-[#1a1a20] hover:bg-[#2b2b35] text-[#9ca3af] hover:text-white transition-colors">-</button>
              <button title="Reponer stock" onclick="abrirModalReponer(${p.id_producto}, '${nombreEsc}', ${p.stock})" class="px-1.5 py-0.5 bg-[#1a1a20] hover:bg-[#2b2b35] ${stockBajo ? 'text-amber-400' : 'text-[#9ca3af]'} font-mono text-[10px] border-l ${stockBajo ? 'border-amber-500/30' : 'border-[#2b2b35]'}">+ Reponer</button>
            </div>
          </div>
        </td>
        <td class="py-3.5 px-4 text-center">
          ${p.activo
            ? `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><span class="w-1 h-1 rounded-full bg-emerald-400"></span> Activo</span>`
            : `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#2a2a30] text-[#8e8e99] border border-[#3a3a44]"><span class="w-1 h-1 rounded-full bg-[#8e8e99]"></span> Inactivo</span>`
          }
        </td>
        <td class="py-3.5 px-4 text-right">
          <div class="flex items-center justify-end gap-2">
            <button onclick="abrirModalEditar(${p.id_producto}, '${nombreEsc}', '${descEsc}', ${p.precio}, ${p.stock})" class="px-2.5 py-1 rounded bg-[#1e1e24] hover:bg-[#2a2a34] text-[#d4d4d8] hover:text-white border border-[#2e2e38] transition-colors font-medium text-[11px]">
              Editar
            </button>
            <button onclick="toggleEstadoProducto(${p.id_producto}, ${!p.activo})" class="px-2.5 py-1 rounded ${p.activo ? 'bg-[#1b1717] hover:bg-[#2d1a1a] text-[#f87171] border border-red-900/30' : 'bg-[#132018] hover:bg-[#1a2b21] text-emerald-400 border border-emerald-900/30'} transition-colors font-medium text-[11px]">
              ${p.activo ? 'Dar de baja' : 'Reactivar'}
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  filtrarProductos(); // re-aplica el filtro de búsqueda / mostrar inactivos actual
}

function actualizarStats() {
  const total = productosCache.length;
  const activos = productosCache.filter(p => p.activo).length;
  const stockBajo = productosCache.filter(p => p.activo && p.stock <= 5).length;
  const inactivos = total - activos;

  const stats = document.querySelectorAll('.grid.grid-cols-2.md\\:grid-cols-4 .text-2xl');
  if (stats.length === 4) {
    stats[0].textContent = total;
    stats[1].textContent = activos;
    stats[2].textContent = stockBajo;
    stats[3].textContent = inactivos;
  }
}

function escapeAttr(text) {
  return String(text).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// ============================================================
// MODAL ALTA / EDICIÓN
// ============================================================
function abrirModalNuevo() {
  document.getElementById('modal-titulo').innerText = 'Agregar Producto';
  document.getElementById('modal-subtitulo').innerText = 'INVENTARIO • NUEVO REGISTRO';
  document.getElementById('btn-submit-text').innerText = 'Guardar Producto';
  document.getElementById('producto-id-editing').value = '';

  document.getElementById('nombre').value = '';
  document.getElementById('descripcion').value = '';
  document.getElementById('precio').value = '';
  document.getElementById('stock').value = '';
  document.getElementById('producto-activo').checked = true;

  document.getElementById('modal-producto').classList.remove('hidden');
  document.getElementById('nombre').focus();
}

function abrirModalEditar(id, nombre, desc, precio, stock) {
  document.getElementById('modal-titulo').innerText = 'Editar Producto #' + id;
  document.getElementById('modal-subtitulo').innerText = 'INVENTARIO • ACTUALIZAR DATOS';
  document.getElementById('btn-submit-text').innerText = 'Actualizar Producto';
  document.getElementById('producto-id-editing').value = id;

  document.getElementById('nombre').value = nombre;
  document.getElementById('descripcion').value = desc;
  document.getElementById('precio').value = precio;
  document.getElementById('stock').value = stock;
  document.getElementById('producto-activo').checked = true;

  document.getElementById('modal-producto').classList.remove('hidden');
  document.getElementById('nombre').focus();
}

function cerrarModal() {
  document.getElementById('modal-producto').classList.add('hidden');
}

// ============================================================
// GUARDAR (CREAR O ACTUALIZAR)
// ============================================================
async function guardarProducto(e) {
  e.preventDefault();

  const id = document.getElementById('producto-id-editing').value;
  const nombre_producto = document.getElementById('nombre').value.trim();
  const descripcion = document.getElementById('descripcion').value.trim();
  const precio = document.getElementById('precio').value;
  const stock = document.getElementById('stock').value;

  if (precio < 0 || stock < 0) {
    mostrarMensaje('Error de validación: ni el precio ni el stock pueden ser negativos.', 'error');
    return;
  }

  const datos = { nombre_producto, descripcion, precio, stock };

  try {
    const url = id ? `${API_BASE_URL}/productos/${id}` : `${API_BASE_URL}/productos`;
    const method = id ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    });
    const resultado = await response.json();

    if (!response.ok) throw new Error(resultado.error || 'Error al guardar');

    cerrarModal();
    mostrarMensaje(
      id
        ? `Producto #${id} "${nombre_producto}" actualizado correctamente.`
        : `Producto "${nombre_producto}" registrado con éxito.`,
      'success'
    );
    cargarProductos();

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
async function toggleEstadoProducto(id, reactivar) {
  const p = productosCache.find(x => Number(x.id_producto) === Number(id));
  const nombre = p ? p.nombre_producto : `producto #${id}`;

  if (!reactivar) {
    const confirmado = await mostrarConfirmacionModal(`¿Dar de baja el producto "${nombre}"? El producto quedará inactivo pero su histórico contable se mantendrá seguro.`);
    if (!confirmado) return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/productos/${id}/estado`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: reactivar }),
    });
    const resultado = await response.json();
    if (!response.ok) throw new Error(resultado.error || 'Error al cambiar estado');

    mostrarMensaje(
      reactivar
        ? `Producto "${nombre}" reactivado con éxito.`
        : `Producto "${nombre}" marcado como inactivo.`,
      reactivar ? 'success' : 'info'
    );
    cargarProductos();

  } catch (error) {
    mostrarMensaje('Error: ' + error.message, 'error');
    console.error(error);
  }
}

// ============================================================
// AJUSTE RÁPIDO DE STOCK (-1 desde la tabla)
// ============================================================
async function ajustarStock(id, cambio) {
  try {
    const response = await fetch(`${API_BASE_URL}/productos/${id}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cantidad: cambio }),
    });
    const resultado = await response.json();
    if (!response.ok) throw new Error(resultado.error || 'Error al ajustar stock');

    mostrarMensaje(`Stock de producto #${id} ajustado en ${cambio} unidad(es).`, 'info');
    cargarProductos();

  } catch (error) {
    mostrarMensaje('Error: ' + error.message, 'error');
    console.error(error);
  }
}

// ============================================================
// MODAL DE REPOSICIÓN
// ============================================================
let currentReponerId = null;

function abrirModalReponer(id, nombre, stockActual) {
  currentReponerId = id;
  document.getElementById('reponer-titulo').innerText = 'Reponer: ' + nombre;
  document.getElementById('reponer-stock-actual').innerText = stockActual + ' uds';
  document.getElementById('reponer-cantidad').value = '10';
  document.getElementById('modal-reponer').classList.remove('hidden');
}

function cerrarModalReponer() {
  document.getElementById('modal-reponer').classList.add('hidden');
}

async function ejecutarReposicion() {
  const cantidad = parseInt(document.getElementById('reponer-cantidad').value) || 0;
  if (cantidad <= 0) {
    alert('Por favor ingrese una cantidad mayor a 0');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/productos/${currentReponerId}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cantidad }),
    });
    const resultado = await response.json();
    if (!response.ok) throw new Error(resultado.error || 'Error al reponer stock');

    cerrarModalReponer();
    mostrarMensaje(`Stock actualizado: +${cantidad} unidades ingresadas exitosamente al inventario.`, 'success');
    cargarProductos();

  } catch (error) {
    mostrarMensaje('Error: ' + error.message, 'error');
    console.error(error);
  }
}

// ============================================================
// FILTROS DE BÚSQUEDA
// ============================================================
function filtrarProductos() {
  const buscador = document.getElementById('buscador-producto');
  const toggleInactivos = document.getElementById('toggle-inactivos');
  
  if (!buscador || !toggleInactivos) return;

  const texto = buscador.value.toLowerCase();
  const mostrarInactivos = toggleInactivos.checked;
  const rows = document.querySelectorAll('.producto-row');

  rows.forEach(row => {
    const nombreYDesc = (row.getAttribute('data-nombre') || '').toLowerCase();
    const activo = row.getAttribute('data-activo') === 'true';

    const coincideTexto = nombreYDesc.includes(texto);
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