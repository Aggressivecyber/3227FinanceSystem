const express = require('express');
const router = express.Router();
const reimbursementController = require('../controllers/reimbursementController');
const { authenticateToken } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const toSafeFolderName = (name) => {
    if (typeof name !== 'string') return null;
    const trimmed = name.normalize('NFKC').trim();
    if (!trimmed) return null;

    // Windows-illegal characters + control chars
    let safe = trimmed.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
    safe = safe.replace(/\s+/g, ' ');
    safe = safe.replace(/\.+$/g, '');
    safe = safe.trim();
    if (!safe) return null;

    const upper = safe.toUpperCase();
    const reserved = new Set(['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9']);
    if (reserved.has(upper)) safe = `${safe}_user`;

    return safe.length > 64 ? safe.slice(0, 64) : safe;
};

// Configure multer with user-specific folders
const storageConfig = multer.diskStorage({
    destination: function (req, file, cb) {
        // Create user-specific folder based on username from token
        const userId = req.user?.userId;
        const safeUsername = toSafeFolderName(req.user?.username);
        const folderName = safeUsername || (userId ? `user_${userId}` : 'unknown_user');
        const userFolder = path.join(__dirname, '../../uploads', folderName);

        // Create folder if it doesn't exist
        if (!fs.existsSync(userFolder)) {
            fs.mkdirSync(userFolder, { recursive: true });
        }

        cb(null, userFolder);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'invoice-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadMiddleware = multer({
    storage: storageConfig,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit per file
    fileFilter: function (req, file, cb) {
        // Accept common images + PDF
        // Note: some phones upload HEIC/HEIF; some browsers produce WEBP.
        const allowedTypes = /jpeg|jpg|png|gif|webp|heic|heif|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('只支持图片和PDF文件！'));
    }
});

// Routes
router.post(
    '/submit',
    authenticateToken,
    (req, res, next) => {
        uploadMiddleware.array('invoices', 10)(req, res, (err) => {
            if (!err) return next();
            return res.status(400).json({ error: err.message || '文件上传失败' });
        });
    },
    reimbursementController.createRequest
);
router.get('/funds', authenticateToken, reimbursementController.getFunds);
router.get('/my', authenticateToken, reimbursementController.getMyHistory);
router.get('/history', authenticateToken, reimbursementController.getMyHistory);
router.post('/withdraw/:id', authenticateToken, reimbursementController.withdrawRequest);
router.post('/:id/withdraw', authenticateToken, reimbursementController.withdrawRequest);

module.exports = router;
