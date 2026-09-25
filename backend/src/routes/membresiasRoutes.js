const express = require('express');
const router = express.Router();
const { registrarPago, getIngresos } = require('../controllers/membresiasController');

router.get('/ingresos', getIngresos);
router.post('/', registrarPago);

module.exports = router;