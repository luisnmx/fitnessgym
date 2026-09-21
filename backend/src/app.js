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

app.get('/', (req, res) => {
  res.send('API del gimnasio funcionando');
});

app.use('/api/socios', sociosRoutes);
app.use('/api/planes', planesRoutes);
app.use('/api/membresias', membresiasRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/ventas', ventasRoutes);

module.exports = app;