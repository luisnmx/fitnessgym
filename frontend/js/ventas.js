const API_BASE_URL = window.location.origin + '/api';

let tipoActualCliente = 'socio';
let carrito = [];              // { id, nombre, precio, cantidad, stockMax }
let productosCache = {};       // { id_producto: {...} }
let sociosCache = [];

document.addEventListener('DOMContentLoaded', () => {
  cargarProductos();
  cargarSocios();
  renderizarCarrito();

  document.getElementById('socio-selector').addEventListener('change', actualizarInterfazCliente);
  document.getElementById('cliente-casual-nombre').addEventListener('input', actualizarInterfazCliente);

  document.getElementById('cantidad-producto').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      agregarDesdeSelector();
    }
  });
  document.getElementById('producto-selector').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      agregarDesdeSelector();
    }
  });

  document.addEventListener('keydown', manejarAtajosTeclado);
});

function formatGs(valor) {
  return new Intl.NumberFormat('es-PY').format(valor) + ' Gs';
}

// ============================================================
// ATAJOS DE TECLADO
// ============================================================
function manejarAtajosTeclado(e) {
  if (e.key === 'F1') {
    e.preventDefault();
    document.getElementById('socio-selector').focus();
    mostrarNotificacion('Selección de socio activada. (F1)', 'info');
    return;
  }
  if (e.key === 'F2') {
    e.preventDefault();
    document.getElementById('buscador-catalogo').focus();
    mostrarNotificacion('Catálogo activo: escribí para filtrar y Enter para agregar. (F2)', 'info');
    return;
  }
  if (e.key === 'F3') {
    e.preventDefault();
    ejecutarConfirmarVenta();
    return;
  }
  if (e.key === 'Escape') {
    const modal = document.getElementById('modal-confirmacion');
    if (!modal.classList.contains('hidden')) {
      cerrarModalVenta();
      return;
    }
    e.preventDefault();
    cancelarVenta();
  }
}

function filtrarCatalogo() {
  const q = (document.getElementById('buscador-catalogo').value || '').toLowerCase();
  document.querySelectorAll('#catalogo-container tr[data-prod]').forEach(row => {
    const nombre = (row.getAttribute('data-prod') || '').toLowerCase();
    row.style.display = (!q || nombre.includes(q)) ? '' : 'none';
  });
}

function agregarPrimerCoincidencia() {
  const visible = [...document.querySelectorAll('#catalogo-container tr[data-prod-id]')]
    .filter(r => r.style.display !== 'none');
  if (visible.length === 0) {
    mostrarNotificacion('Sin resultados para agregar.', 'error');
    return;
  }
  const id = Number(visible[0].getAttribute('data-prod-id'));
  agregarProductoDirecto(id);
  document.getElementById('buscador-catalogo').value = '';
  filtrarCatalogo();
  document.getElementById('buscador-catalogo').focus();
}

// ============================================================
// CANCELAR VENTA
// ============================================================
function cancelarVenta() {
  const hayAlgo = carrito.length > 0 ||
    document.getElementById('socio-selector').value ||
    document.getElementById('cliente-casual-nombre').value.trim() ||
    document.getElementById('buscador-catalogo').value;

  if (!hayAlgo) {
    mostrarNotificacion('No hay una venta en curso para cancelar.', 'info');
    return;
  }

  const confirmar = window.confirm('¿Cancelar la venta actual? Se vaciará el carrito y se reiniciará el ticket.');
  if (!confirmar) return;

  carrito = [];
  document.getElementById('socio-selector').selectedIndex = 0;
  document.getElementById('cliente-casual-nombre').value = '';
  document.getElementById('producto-selector').selectedIndex = 0;
  document.getElementById('cantidad-producto').value = 1;
  document.getElementById('buscador-catalogo').value = '';
  filtrarCatalogo();
  cambiarTipoCliente('socio');
  renderizarCarrito();
  mostrarNotificacion('Venta cancelada. Ticket reiniciado.', 'error');
}

// ============================================================
// CARGA DE DATOS REALES
// ============================================================
async function cargarProductos() {
  try {
    const response = await fetch(`${API_BASE_URL}/productos`);
    const productos = await response.json();
    const activos = productos.filter(p => p.activo);

    productosCache = {};
    activos.forEach(p => { productosCache[p.id_producto] = p; });

    // Selector
    const selector = document.getElementById('producto-selector');
    selector.innerHTML = `<option value="" disabled selected>-- Elegir producto --</option>` +
      activos.map(p => `
        <option value="${p.id_producto}" data-nombre="${p.nombre_producto}" data-precio="${p.precio}" data-stock="${p.stock}">
          ${p.nombre_producto} — ${formatGs(p.precio)} (Stock: ${p.stock})
        </option>
      `).join('');

    // Catálogo tabla
    const catalogo = document.getElementById('catalogo-container');
    if (activos.length === 0) {
      catalogo.innerHTML = `<tr><td colspan="4" class="py-6 text-center text-gray-500">No hay productos activos cargados.</td></tr>`;
    } else {
      catalogo.innerHTML = activos.map(p => {
        const bajo = p.stock <= 5;
        return `
          <tr class="hover:bg-[#1c1c22] transition-colors cursor-pointer" data-prod-id="${p.id_producto}" data-prod="${String(p.nombre_producto).toLowerCase()}" onclick="agregarProductoDirecto(${p.id_producto})" title="Click para agregar al carrito">
            <td class="py-3.5 px-4 font-semibold text-white">
              <p class="text-sm font-bold text-white">${p.nombre_producto}</p>
              <p class="text-xs text-gray-400">${p.descripcion || ''}</p>
            </td>
            <td class="py-3.5 px-4 font-bold text-white">${formatGs(p.precio)}</td>
            <td class="py-3.5 px-4 text-center">
              <span class="px-2.5 py-1 rounded-full text-xs font-medium ${bajo ? 'bg-[#2a241e] text-amber-400 border border-amber-900/40' : 'bg-[#1e2a22] text-green-400 border border-green-900/40'}">${p.stock} disp.</span>
            </td>
            <td class="py-3.5 px-4 text-right">
              <button type="button" onclick="event.stopPropagation();agregarProductoDirecto(${p.id_producto})" class="px-4 py-2 bg-[#262630] hover:bg-green-500 hover:text-black text-gray-100 font-semibold text-xs rounded-lg transition-colors border border-[#363644]">
                + Agregar
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }
  } catch (error) {
    console.error(error);
    mostrarNotificacion('Error al cargar productos. Verificá el servidor.', 'error');
  }
}

async function cargarSocios() {
  try {
    const response = await fetch(`${API_BASE_URL}/socios`);
    sociosCache = (await response.json()).filter(s => s.activo);

    const selector = document.getElementById('socio-selector');
    if (sociosCache.length === 0) {
      selector.innerHTML = `<option value="">No hay socios registrados</option>`;
      return;
    }
    selector.innerHTML = `<option value="" disabled selected>-- Elegir socio por nombre --</option>` +
      sociosCache.map(s => `<option value="${s.id_socio}">${s.nombre} ${s.apellido} (#${s.id_socio})</option>`).join('');

  } catch (error) {
    console.error(error);
    mostrarNotificacion('Error al cargar socios. Verificá el servidor.', 'error');
  }
}

// ============================================================
// TIPO DE CLIENTE
// ============================================================
function cambiarTipoCliente(tipo) {
  tipoActualCliente = tipo;
  const btnSocio = document.getElementById('btn-tipo-socio');
  const btnOcasional = document.getElementById('btn-tipo-ocasional');
  const wrapSocio = document.getElementById('wrapper-socio');
  const wrapOcasional = document.getElementById('wrapper-ocasional');

  const activo = "flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-2 bg-[#262630] text-white shadow-sm border border-[#343440]";
  const inactivo = "flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-2 text-gray-400 hover:text-white hover:bg-[#1a1a20]";

  if (tipo === 'socio') {
    btnSocio.className = activo;
    btnOcasional.className = inactivo;
    wrapSocio.classList.remove('hidden');
    wrapOcasional.classList.add('hidden');
  } else {
    btnOcasional.className = activo;
    btnSocio.className = inactivo;
    wrapOcasional.classList.remove('hidden');
    wrapSocio.classList.add('hidden');
  }
  actualizarInterfazCliente();
}

function actualizarInterfazCliente() {
  const labelTicket = document.getElementById('label-cliente-ticket');
  if (tipoActualCliente === 'socio') {
    const select = document.getElementById('socio-selector');
    const text = select.options[select.selectedIndex]?.text || 'Socio no seleccionado';
    labelTicket.textContent = text.replace(/ \(#\d+\)/, '');
  } else {
    const input = document.getElementById('cliente-casual-nombre');
    labelTicket.textContent = input.value.trim() || 'Cliente Ocasional';
  }
}

// ============================================================
// AGREGAR PRODUCTOS AL CARRITO (con validación real de stock)
// ============================================================
function agregarProductoDirecto(idProducto) {
  agregarAlCarrito(idProducto, 1);
}

function agregarDesdeSelector() {
  const select = document.getElementById('producto-selector');
  const cantInput = document.getElementById('cantidad-producto');
  const idProducto = select.value;
  const cantidad = parseInt(cantInput.value, 10) || 1;

  if (!idProducto) {
    mostrarNotificacion('Por favor, seleccioná un producto de la lista.', 'error');
    return;
  }

  agregarAlCarrito(idProducto, cantidad);
  cantInput.value = 1;
  select.selectedIndex = 0;
}

function agregarAlCarrito(idProducto, cantidad) {
  const id = Number(idProducto);
  const producto = productosCache[id];
  if (!producto) return;

  const itemExistente = carrito.find(item => item.id === id);
  const cantidadTotal = (itemExistente ? itemExistente.cantidad : 0) + cantidad;

  if (cantidadTotal > producto.stock) {
    mostrarNotificacion(`Stock insuficiente de "${producto.nombre_producto}". Disponible: ${producto.stock} uds.`, 'error');
    return;
  }

  if (itemExistente) {
    itemExistente.cantidad = cantidadTotal;
  } else {
    carrito.push({ id, nombre: producto.nombre_producto, precio: Number(producto.precio), cantidad, stockMax: producto.stock });
  }

  mostrarNotificacion(`Se agregó "${producto.nombre_producto}" al carrito.`, 'success');
  renderizarCarrito();
}

// ============================================================
// MODIFICAR CARRITO
// ============================================================
function cambiarCantidad(id, delta) {
  const item = carrito.find(i => Number(i.id) === Number(id));
  if (!item) return;

  const nuevaCantidad = item.cantidad + delta;
  if (nuevaCantidad <= 0) {
    quitarProducto(id);
    return;
  }
  if (nuevaCantidad > item.stockMax) {
    mostrarNotificacion(`Stock límite alcanzado: ${item.stockMax} uds.`, 'error');
    return;
  }
  item.cantidad = nuevaCantidad;
  renderizarCarrito();
}

function quitarProducto(id) {
  carrito = carrito.filter(i => Number(i.id) !== Number(id));
  renderizarCarrito();
}

function vaciarCarrito() {
  carrito = [];
  renderizarCarrito();
}

function renderizarCarrito() {
  const contenedor = document.getElementById('carrito-items-list');
  const totalEl = document.getElementById('total-venta');
  contenedor.innerHTML = '';

  if (carrito.length === 0) {
    contenedor.innerHTML = `
      <div class="py-10 text-center text-gray-500 flex flex-col items-center justify-center">
        <p class="text-sm">El ticket está vacío</p>
        <p class="text-xs text-gray-600 mt-0.5">Elegí productos del catálogo a la izquierda</p>
      </div>
    `;
    totalEl.textContent = formatGs(0);
    return;
  }

  let total = 0;
  carrito.forEach(item => {
    const subtotal = item.precio * item.cantidad;
    total += subtotal;

    const row = document.createElement('div');
    row.className = "bg-[#131316] border border-[#24242c] p-3 rounded-xl flex items-center justify-between gap-3 group";
    row.innerHTML = `
      <div class="flex-1 min-w-0">
        <h4 class="text-sm font-semibold text-white truncate">${item.nombre}</h4>
        <p class="text-xs text-gray-400 font-medium">${formatGs(item.precio)} c/u <span class="text-gray-600">|</span> <span class="text-green-400 font-bold">${formatGs(subtotal)}</span></p>
      </div>
      <div class="flex items-center gap-1.5 bg-[#1a1a20] p-1 rounded-lg border border-[#2c2c36]">
        <button type="button" onclick="cambiarCantidad('${item.id}', -1)" class="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-white hover:bg-[#282834] rounded font-bold text-sm transition-colors">−</button>
        <span class="w-6 text-center text-xs font-extrabold text-white">${item.cantidad}</span>
        <button type="button" onclick="cambiarCantidad('${item.id}', 1)" class="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-white hover:bg-[#282834] rounded font-bold text-sm transition-colors">+</button>
      </div>
      <button type="button" onclick="quitarProducto('${item.id}')" title="Quitar producto" class="text-gray-500 hover:text-red-400 p-1.5 rounded transition-colors">✕</button>
    `;
    contenedor.appendChild(row);
  });

  totalEl.textContent = formatGs(total);
}

// ============================================================
// CONFIRMAR VENTA (conexión real al backend)
// ============================================================
async function ejecutarConfirmarVenta() {
  if (carrito.length === 0) {
    mostrarNotificacion('No podés confirmar una venta con el carrito vacío.', 'error');
    return;
  }

  let payload = { items: carrito.map(item => ({ id_producto: Number(item.id), cantidad: item.cantidad })) };
  let clienteNombre = '';

  if (tipoActualCliente === 'socio') {
    const select = document.getElementById('socio-selector');
    if (!select.value) {
      mostrarNotificacion('Por favor, seleccioná un socio antes de confirmar.', 'error');
      select.focus();
      return;
    }
    payload.id_socio = Number(select.value);
    clienteNombre = select.options[select.selectedIndex].text;
  } else {
    const input = document.getElementById('cliente-casual-nombre');
    const ocasional = input.value.trim();
    payload.cliente_casual_nombre = ocasional || 'Cliente Ocasional';
    clienteNombre = ocasional ? ocasional + ' (Ocasional)' : 'Cliente Ocasional';
  }

  try {
    const response = await fetch(`${API_BASE_URL}/ventas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const resultado = await response.json();

    if (!response.ok) throw new Error(resultado.error || 'Error al registrar la venta');

    await mostrarModalConfirmacion(resultado.venta.id_venta, clienteNombre);
    carrito = [];
    cargarProductos(); // refresca stock real

  } catch (error) {
    mostrarNotificacion('Error: ' + error.message, 'error');
    console.error(error);
  }
}

async function mostrarModalConfirmacion(idVenta, clienteNombre) {
  try {
    const response = await fetch(`${API_BASE_URL}/ventas/${idVenta}`);
    const venta = await response.json();

    document.getElementById('modal-nro-venta').textContent = '#' + venta.id_venta;
    const fecha = new Date(venta.fecha_venta);
    document.getElementById('modal-fecha').textContent = fecha.toLocaleDateString('es-PY') + ' ' + fecha.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('modal-cliente').textContent = venta.cliente || clienteNombre;

    const modalItems = document.getElementById('modal-items-comprados');
    modalItems.innerHTML = venta.items.map(it => `
      <div class="py-2 flex justify-between items-center">
        <div>
          <span class="text-white font-medium">${it.nombre_producto}</span>
          <span class="text-gray-400 text-[11px] block">${it.cantidad} x ${formatGs(it.precio_unitario)}</span>
        </div>
        <span class="font-bold text-white">${formatGs(it.subtotal)}</span>
      </div>
    `).join('');

    document.getElementById('modal-total-final').textContent = formatGs(venta.total);
    document.getElementById('modal-confirmacion').classList.remove('hidden');

  } catch (error) {
    console.error(error);
    mostrarNotificacion('Venta registrada, pero no se pudo cargar el comprobante.', 'error');
  }
}

function cerrarModalVenta() {
  document.getElementById('modal-confirmacion').classList.add('hidden');
  renderizarCarrito();
  document.getElementById('cliente-casual-nombre').value = '';
  document.getElementById('socio-selector').selectedIndex = 0;
  cambiarTipoCliente('socio');
  mostrarNotificacion('Listo para la siguiente operación.', 'success');
}

// ============================================================
// NOTIFICACIONES
// ============================================================
function mostrarNotificacion(texto, tipo) {
  const msgBox = document.getElementById('mensaje-resultado');
  msgBox.textContent = texto;
  msgBox.classList.remove('hidden', 'bg-red-950/60', 'border-red-800', 'text-red-300', 'bg-emerald-950/60', 'border-emerald-800', 'text-emerald-300', 'bg-sky-950/60', 'border-sky-800', 'text-sky-300');

  if (tipo === 'error') {
    msgBox.classList.add('bg-red-950/60', 'border-red-800', 'text-red-300');
  } else if (tipo === 'info') {
    msgBox.classList.add('bg-sky-950/60', 'border-sky-800', 'text-sky-300');
  } else {
    msgBox.classList.add('bg-emerald-950/60', 'border-emerald-800', 'text-emerald-300');
  }

  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => msgBox.classList.add('hidden'), 3500);
}