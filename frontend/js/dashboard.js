document.addEventListener('DOMContentLoaded', cargarAlertas);

async function cargarAlertas() {
  const contenedor = document.getElementById('alertas-container');

  try {
    const alertas = await obtenerAlertas();

    if (alertas.length === 0) {
      contenedor.innerHTML = '<p>No hay socios por vencer ni vencidos. Todo al día.</p>';
      return;
    }

    let filas = '';
    alertas.forEach(socio => {
      const claseEstado = socio.estado_alerta === 'VENCIDO' ? 'estado-vencido' : 'estado-por-vencer';
      filas += `
        <tr class="${claseEstado}">
          <td>${socio.nombre} ${socio.apellido}</td>
          <td>${socio.telefono || '-'}</td>
          <td>${socio.nombre_plan}</td>
          <td>${new Date(socio.fecha_fin).toLocaleDateString('es-PY')}</td>
          <td>${socio.dias_restantes}</td>
          <td>${socio.estado_alerta}</td>
        </tr>
      `;
    });

    contenedor.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Socio</th>
            <th>Teléfono</th>
            <th>Plan</th>
            <th>Vencimiento</th>
            <th>Días restantes</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
    `;

  } catch (error) {
    contenedor.innerHTML = '<p>Error al cargar las alertas. Verificá que el servidor esté corriendo.</p>';
    console.error(error);
  }
}