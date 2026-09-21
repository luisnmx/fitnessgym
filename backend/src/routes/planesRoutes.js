const express = require('express');
const router = express.Router();
const { getPlanes, getPlanesTodos, createPlan, updatePlan, deactivatePlan } = require('../controllers/planesController');

router.get('/todos', getPlanesTodos);
router.get('/', getPlanes);
router.post('/', createPlan);
router.put('/:id', updatePlan);
router.patch('/:id/desactivar', deactivatePlan);

module.exports = router;
