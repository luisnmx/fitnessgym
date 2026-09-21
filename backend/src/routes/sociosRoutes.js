const express = require('express');
const router = express.Router();
const { getAlertas, getSocios, getSocioById, registrarSocio, updateSocio, toggleEstadoSocio } = require('../controllers/sociosController');

router.get('/alertas', getAlertas);
router.get('/:id', getSocioById);
router.get('/', getSocios);
router.post('/registro', registrarSocio);
router.put('/:id', updateSocio);
router.patch('/:id/estado', toggleEstadoSocio);

module.exports = router;