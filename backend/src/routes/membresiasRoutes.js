const express = require('express');
const router = express.Router();
const { registrarPago } = require('../controllers/membresiasController');

router.post('/', registrarPago);

module.exports = router;