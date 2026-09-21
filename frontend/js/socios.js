

let planesCache = [];

document.addEventListener('DOMContentLoaded', () => {
  cargarPlanes();
  document.getElementById('socio-form').addEventListener('submit', registrarSocio);
});

async function cargarPlanes() {
  const contenedor = document.getElementById('planes-container');
  try {
    const response = await fetch(`${API_BASE_URL}/planes`);
    const planes = await response.json();
    planesCache = planes;

    contenedor.innerHTML = planes.map((plan, index) => `
      <div class="relative">
        <input class="sr-only peer" type="radio" name="id_plan"
               id="plan-${plan.id_plan}" value="${plan.id_plan}" ${index === 0 ? 'checked' : ''}>
        <label class="flex flex-col justify-between h-full p-4 rounded-md border border-neutral-800 bg-[#121215] hover:border-neutral-700 cursor-pointer transition-all peer-checked:border-white peer-checked:bg-[#1a1a20]"
               for="plan-${plan.id_plan}">
          <div class="flex items-start justify-between">
            <span class="text-[10px] font-mono tracking-wider uppercase text-neutral-500">${plan.duracion_dias} DÍAS</span>
            <span class="h-2 w-2 rounded-full border border-neutral-600 peer-checked:bg-white check-dot opacity-0 transition-opacity"></span>
          </div>
          <div class="mt-4">
            <div class="text-sm font-medium text-white">${plan.nombre_plan}</div>
            <div class="mt-3 pt-2.5 border-t border-neutral-700/80 flex items-baseline justify-between font-mono">
              <span class="text-xs font-semibold text-white">Gs ${Number(plan.precio).toLocaleString('es-PY')}</span>
            </div>
          </div>
        </label>
      </div>
    `).join('');
  } catch (error) {
    contenedor.innerHTML = '<p class="text-xs text-red-400 col-span-3">Error al cargar los planes.</p>';
    console.error(error);
  }
}

function cerrarVentana() {
  window.close();
  if (!window.closed) {
    window.location.href = 'gestion-socios.html';
  }
}

async function registrarSocio(event) {
  event.preventDefault();
  const mensaje = document.getElementById('mensaje-resultado');

  const idPlanSeleccionado = document.querySelector('input[name="id_plan"]:checked');
  if (!idPlanSeleccionado) {
    mensaje.textContent = 'Seleccioná un plan.';
    mensaje.className = 'text-xs font-mono mt-2 text-red-400';
    return;
  }

  const planSeleccionado = planesCache.find(p => Number(p.id_plan) === Number(idPlanSeleccionado.value));

  const datos = {
    nombre: document.getElementById('nombre').value.trim(),
    apellido: document.getElementById('apellido').value.trim(),
    telefono: document.getElementById('telefono').value.trim(),
    email: document.getElementById('email').value.trim(),
    id_plan: idPlanSeleccionado.value,
    monto_pagado: planSeleccionado ? planSeleccionado.precio : null,
  };

  try {
    const response = await fetch(`${API_BASE_URL}/socios/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    });

    const resultado = await response.json();

    if (!response.ok) {
      throw new Error(resultado.error || 'Error al registrar');
    }

    mensaje.textContent = `Socio registrado: ${resultado.socio.nombre} ${resultado.socio.apellido}`;
    mensaje.className = 'text-xs font-mono mt-2 text-emerald-400';
    document.getElementById('socio-form').reset();
    cargarPlanes();
    cerrarVentana();

  } catch (error) {
    mensaje.textContent = `Error: ${error.message}`;
    mensaje.className = 'text-xs font-mono mt-2 text-red-400';
    console.error(error);
  }
}