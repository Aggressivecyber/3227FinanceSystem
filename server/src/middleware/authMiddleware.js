const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
        if (err) return res.sendStatus(403);
        try {
            const dbUser = await prisma.user.findUnique({
                where: { id: user.userId },
                select: { id: true, isDeleted: true }
            });

            if (!dbUser || dbUser.isDeleted) return res.sendStatus(401);

            req.user = user;
            next();
        } catch (e) {
            return res.sendStatus(500);
        }
    });
};

const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'ADMIN') {
        next();
    } else {
        res.sendStatus(403);
    }
};

module.exports = { authenticateToken, isAdmin, requireAdmin: isAdmin };
