# FitnesGym

Sistema de gestión deportiva e inventario de salón. Frontend estático (HTML/CSS/JS + Tailwind CDN) y API en Node.js/Express con PostgreSQL.

## Requisitos

- Node.js **18+** (usa `fetch` global y `--watch`)
- PostgreSQL en `localhost:5432`
- Base de datos `fitnessgym` creada con las tablas del sistema

## Puesta en marcha

```bash
# 1. Instalar dependencias del backend
cd backend
npm install
cd ..

# 2. Configurar variables de entorno (copiar y ajustar si hace falta)
cp backend/.env.example backend/.env

# 3. Levantar la API
npm start          # producción
npm run dev        # desarrollo (se reinicia al guardar cambios)

# 4. Abrir la aplicación en el navegador
open frontend/public/index.html
```

La API queda en `http://localhost:3000` y el frontend apunta a `http://localhost:3000/api`.

## Scripts

| Comando        | Descripción                                              |
| -------------- | -------------------------------------------------------- |
| `npm start`    | Arranca la API en modo producción                        |
| `npm run dev`  | Arranca la API con auto-reload (`node --watch`)          |
| `npm test`     | Smoke test: verifica que todos los endpoints GET respondan |
| `npm run smoke`| Alias de `npm test`                                      |

El smoke test requiere la API arriba y terminal con:
```bash
curl --version      # disponible en macOS por defecto
```
(`npm test` usa `fetch` de Node, no necesita deps.)

## Endpoints de la API

| Método | Ruta                          | Descripción                            |
| ------ | ----------------------------- | -------------------------------------- |
| GET    | `/api/socios`                 | Lista de socios con su membresía      |
| GET    | `/api/socios/alertas`         | Socios próximos a vencer / vencidos    |
| GET    | `/api/socios/:id`             | Detalle de un socio                    |
| POST   | `/api/socios/registro`        | Registra socio + membresía             |
| PUT    | `/api/socios/:id`             | Actualiza socio                        |
| PATCH  | `/api/socios/:id/estado`      | Activa / desactiva socio               |
| GET    | `/api/planes`                 | Planes activos                         |
| GET    | `/api/planes/todos`           | Todos los planes (incl. inactivos)     |
| POST   | `/api/planes`                 | Crea plan                              |
| PUT    | `/api/planes/:id`             | Actualiza plan                         |
| PATCH  | `/api/planes/:id/desactivar`  | Desactiva plan                         |
| GET    | `/api/productos`              | Inventario del salón                   |
| POST   | `/api/productos`              | Crea producto                          |
| PUT    | `/api/productos/:id`          | Actualiza producto                     |
| PATCH  | `/api/productos/:id/estado`   | Activa / desactiva producto            |
| PATCH  | `/api/productos/:id/stock`    | Ajusta stock                           |
| GET    | `/api/ventas`                 | Historial de ventas                    |
| GET    | `/api/ventas/:id`             | Detalle de una venta                   |
| POST   | `/api/ventas`                 | Registra venta (descuenta stock)       |
| POST   | `/api/membresias`             | Registra pago de membresía             |

## Estructura

```
backend/               API Express + rutas + controladores
database/              Respaldos y esquema de la BD (pendiente de completar)
frontend/
  public/              Páginas HTML (index, socios, gestion-socios, gestion-planes, productos, ventas, historial-ventas)
  js/                  Lógica por página (index.js, socios.js, ventas.js, ...)
scripts/smoke.js       Smoke test de la API
```