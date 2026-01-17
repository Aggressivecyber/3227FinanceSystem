const prisma = require('../utils/prisma');
const path = require('path');

const uploadsRoot = path.join(__dirname, '../../uploads');

const toPublicUploadUrl = (filePath) => {
    if (!filePath) return null;
    const normalized = String(filePath).replace(/\\/g, '/');
    const marker = '/uploads/';
    const idx = normalized.toLowerCase().indexOf(marker);
    if (idx >= 0) return normalized.slice(idx);

    // Fallback: attempt relative path from uploads root
    try {
        const rel = path.relative(uploadsRoot, filePath).replace(/\\/g, '/');
        if (rel && !rel.startsWith('..')) return `${marker}${rel}`;
    } catch {
        // ignore
    }
    return normalized;
};

// Read-only: get remaining total funds (for user display)
exports.getFunds = async (req, res) => {
    try {
        const setting = await prisma.systemSettings.findUnique({ where: { key: 'total_funds' } });
        const funds = setting ? parseFloat(setting.value) : 0;
        res.json({ totalFunds: funds });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.createRequest = async (req, res) => {
    try {
        const { amount, purpose } = req.body;

        const amountText = amount === undefined || amount === null ? '' : String(amount).trim();
        // Allow integers or decimals with up to 2 digits. Reject negatives and more precision.
        // Examples allowed: 1, 1.2, 1.23, 0.01
        const amountFormatOk = /^\d+(?:\.\d{1,2})?$/.test(amountText);
        const amountValue = Number.parseFloat(amountText);

        if (!amountFormatOk || !Number.isFinite(amountValue) || amountValue <= 0) {
            return res.status(400).json({ error: '金额必须大于0，且小数位不超过2位' });
        }

        // Handle multiple files - req.files is an array
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: '请上传至少一张发票' });
        }

        // Collect all file URLs as JSON array (web-accessible)
        const invoiceUrls = req.files
            .map(file => toPublicUploadUrl(file.path))
            .filter(Boolean);

        const reimbursement = await prisma.reimbursement.create({
            data: {
                amount: amountValue,
                purpose,
                invoiceUrl: JSON.stringify(invoiceUrls), // Store as JSON string
                userId: req.user.userId
            }
        });

        res.status(201).json({
            ...reimbursement,
            invoiceUrls,
            invoiceUrl: invoiceUrls[0] || null
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getMyHistory = async (req, res) => {
    try {
        const requests = await prisma.reimbursement.findMany({
            where: { userId: req.user.userId },
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { username: true } } }
        });

        // Parse invoiceUrl JSON for frontend
        const parsed = requests.map(req => ({
            ...req,
            invoiceUrls: (() => {
                try {
                    const arr = JSON.parse(req.invoiceUrl);
                    return Array.isArray(arr) ? arr.map(toPublicUploadUrl).filter(Boolean) : [];
                } catch {
                    return req.invoiceUrl ? [toPublicUploadUrl(req.invoiceUrl)].filter(Boolean) : [];
                }
            })(),
            invoiceUrl: (() => {
                try {
                    const arr = JSON.parse(req.invoiceUrl);
                    const first = Array.isArray(arr) ? arr[0] : null;
                    return first ? toPublicUploadUrl(first) : null;
                } catch {
                    return req.invoiceUrl ? toPublicUploadUrl(req.invoiceUrl) : null;
                }
            })()
        }));

        res.json(parsed);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.withdrawRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const request = await prisma.reimbursement.findUnique({ where: { id: parseInt(id) } });

        if (!request) return res.status(404).json({ error: 'Request not found' });
        if (request.userId !== req.user.userId) return res.sendStatus(403);
        if (request.status !== 'PENDING') return res.status(400).json({ error: 'Cannot withdraw processed request' });

        const updated = await prisma.reimbursement.update({
            where: { id: parseInt(id) },
            data: { status: 'WITHDRAWN' }
        });

        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
