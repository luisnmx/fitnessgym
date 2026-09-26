const API_BASE_URL = window.location.origin + '/api';

async function obtenerAlertas() {
  const response = await fetch(`${API_BASE_URL}/socios/alertas`);
  if (!response.ok) {
    throw new Error('Error al obtener las alertas');
  }
  return response.json();
}


async function obtenerPlanes() {
  const response = await fetch(`${API_BASE_URL}/planes`);
  if (!response.ok) {
    throw new Error('Error al obtener los planes');
  }
  return response.json();
}

async function registrarSocio(datos) {
  const response = await fetch(`${API_BASE_URL}/socios/registro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
  const resultado = await response.json();
  if (!response.ok) {
    throw new Error(resultado.error || 'Error al registrar el socio');
  }
  return resultado;
}
