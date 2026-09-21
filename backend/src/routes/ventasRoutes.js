const express = require('express');
const router = express.Router();
const { getVentas, getVentaDetalle, crearVenta } = require('../controllers/ventasController');

router.get('/', getVentas);
router.get('/:id', getVentaDetalle);
router.post('/', crearVenta);

module.exports = router;