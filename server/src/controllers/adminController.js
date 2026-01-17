const prisma = require('../utils/prisma');
const excelService = require('../services/excelService');
const path = require('path');

const uploadsRoot = path.join(__dirname, '../../uploads');

const toPublicUploadUrl = (filePath) => {
    if (!filePath) return null;
    const normalized = String(filePath).replace(/\\/g, '/');
    const marker = '/uploads/';
    const idx = normalized.toLowerCase().indexOf(marker);
    if (idx >= 0) return normalized.slice(idx);

    try {
        const rel = path.relative(uploadsRoot, filePath).replace(/\\/g, '/');
        if (rel && !rel.startsWith('..')) return `${marker}${rel}`;
    } catch {
        // ignore
    }

    return normalized;
};

// Get total funds
exports.getFunds = async (req, res) => {
    try {
        const setting = await prisma.systemSettings.findUnique({ where: { key: 'total_funds' } });
        const funds = setting ? parseFloat(setting.value) : 0;
        res.json({ totalFunds: funds });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

// Set total funds
exports.setFunds = async (req, res) => {
    try {
        const { amount } = req.body;
        await prisma.systemSettings.upsert({
            where: { key: 'total_funds' },
            update: { value: amount.toString() },
            create: { key: 'total_funds', value: amount.toString() }
        });
        res.json({ message: 'Funds updated' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

// Get all requests
exports.getAllRequests = async (req, res) => {
    try {
        const requests = await prisma.reimbursement.findMany({
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { username: true } } }
        });

        const mapped = requests.map(r => {
            let invoiceUrls = [];
            try {
                const arr = JSON.parse(r.invoiceUrl);
                if (Array.isArray(arr)) invoiceUrls = arr.map(toPublicUploadUrl).filter(Boolean);
            } catch {
                if (r.invoiceUrl) invoiceUrls = [toPublicUploadUrl(r.invoiceUrl)].filter(Boolean);
            }

            return {
                ...r,
                invoiceUrls,
                invoiceUrl: invoiceUrls[0] || null
            };
        });

        res.json(mapped);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

// Approve/Reject
exports.updateRequestStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // APPROVED, REJECTED
        const reviewerId = req.user.userId;

        if (!['APPROVED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const request = await prisma.reimbursement.findUnique({
            where: { id: parseInt(id) },
            include: { user: true }
        });

        if (!request) return res.status(404).json({ error: 'Request not found' });
        if (request.status !== 'PENDING') return res.status(400).json({ error: 'Request already processed' });

        // Transaction to update status and deduct funds if approved
        await prisma.$transaction(async (prisma) => {
            // Update request
            await prisma.reimbursement.update({
                where: { id: parseInt(id) },
                data: { status }
            });

            // Deduct funds if approved
            if (status === 'APPROVED') {
                const setting = await prisma.systemSettings.findUnique({ where: { key: 'total_funds' } });
                let currentFunds = setting ? parseFloat(setting.value) : 0;
                currentFunds -= request.amount;

                await prisma.systemSettings.upsert({
                    where: { key: 'total_funds' },
                    update: { value: currentFunds.toString() },
                    create: { key: 'total_funds', value: currentFunds.toString() }
                });
            }
        });

        // Log to Excel (outside transaction or inside? Outside is safer for file I/O)
        // We need username and reviewer name. We have reviewerId.
        // Fetch reviewer name?
        // Optimization: passed in req.user?
        // For now status and reviewerId
        excelService.addRecord({
            amount: request.amount,
            purpose: request.purpose,
            invoiceUrl: request.invoiceUrl,
            username: request.user.username,
            status: status,
            reviewer: req.user.role // or just 'Admin'
        });

        res.json({ message: `Request ${status}` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
