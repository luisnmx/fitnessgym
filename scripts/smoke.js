const BASE = process.env.API_BASE || 'http://localhost:3000';

const GET_ENDPOINTS = [
  ['/', 'health'],
  ['/api/socios', 'socios'],
  ['/api/socios/alertas', 'alertas'],
  ['/api/planes', 'planes'],
  ['/api/planes/todos', 'planes-todos'],
  ['/api/productos', 'productos'],
  ['/api/ventas', 'ventas'],
];

const check = async (label, fn) => {
  try {
    const result = await fn();
    console.log(`  OK   ${label}`);
    return result;
  } catch (error) {
    console.log(`  FAIL ${label} — ${error.message}`);
    return { __ok: false };
  }
};

const main = async () => {
  console.log(`\nFitnesGym — smoke test contra ${BASE}\n`);

  const results = [];
  for (const [path, label] of GET_ENDPOINTS) {
    results.push([
      label,
      await check(`GET ${path}`, async () => {
        const res = await fetch(BASE + path);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        if (path === '/') {
          if (!text.includes('API')) throw new Error('respuesta inesperada');
          return text;
        }
        const data = JSON.parse(text);
        if (Array.isArray(data) && data.length === 0) throw new Error('lista vacía');
        return data;
      }),
    ]);
  }

  const failed = results.filter(([, r]) => r.__ok === false).length;
  console.log(
    `\n${failed === 0 ? '✓ Todos los endpoints responden' : '✗ ' + failed + ' endpoint(s) con problemas'}\n`
  );
  process.exit(failed === 0 ? 0 : 1);
};

main().catch((error) => {
  console.error('Error de ejecución:', error.message);
  process.exit(1);
});