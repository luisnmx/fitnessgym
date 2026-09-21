const express = require('express');
const router = express.Router();
const {
  getProductos,
  crearProducto,
  actualizarProducto,
  cambiarEstadoProducto,
  ajustarStockProducto,
} = require('../controllers/productosController');

router.get('/', getProductos);
router.post('/', crearProducto);
router.put('/:id', actualizarProducto);
router.patch('/:id/estado', cambiarEstadoProducto);
router.patch('/:id/stock', ajustarStockProducto);

module.exports = router;