const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

router.get('/funds', authenticateToken, isAdmin, adminController.getFunds);
router.post('/funds', authenticateToken, isAdmin, adminController.setFunds);
router.get('/requests', authenticateToken, isAdmin, adminController.getAllRequests);
router.post('/requests/:id/status', authenticateToken, isAdmin, adminController.updateRequestStatus);
router.get('/users', authenticateToken, isAdmin, adminController.listUsers);
router.delete('/users/:id', authenticateToken, isAdmin, adminController.deleteUser);

module.exports = router;
