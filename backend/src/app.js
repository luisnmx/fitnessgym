const path = require('path');
const express = require('express');
const cors = require('cors');
const app = express();

const sociosRoutes = require('./routes/sociosRoutes');
const planesRoutes = require('./routes/planesRoutes');
const membresiasRoutes = require('./routes/membresiasRoutes');
const productosRoutes = require('./routes/productosRoutes');
const ventasRoutes = require('./routes/ventasRoutes');

app.use(cors());
app.use(express.json());

// Sirve el frontend (frontend/public) — esto hace que http://localhost:3000 cargue index.html
app.use(express.static(path.join(__dirname, '../../frontend/public')));
// CSS y JS viven como hermanos de public/ (frontend/css y frontend/js). Se exponen
// montando la carpeta frontend/ completa en la raíz: /css/styles.css y /js/*.js
// quedan servidos en el mismo origen, sin depender de Live Server.
app.use(express.static(path.join(__dirname, '../../frontend')));

app.get('/api/status', (req, res) => {
  res.send('API del gimnasio funcionando');
});

app.use('/api/socios', sociosRoutes);
app.use('/api/planes', planesRoutes);
app.use('/api/membresias', membresiasRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/ventas', ventasRoutes);

module.exports = app;