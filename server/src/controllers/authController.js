const prisma = require('../utils/prisma');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils/auth');

const normalizeUsername = (value) => {
    if (typeof value !== 'string') return null;
    const normalized = value.normalize('NFKC').trim();
    if (!normalized) return null;
    // collapse internal whitespace runs to a single space
    return normalized.replace(/\s+/g, ' ');
};

exports.register = async (req, res) => {
    try {
        const username = normalizeUsername(req.body?.username);
        const { password } = req.body;

        if (!username) return res.status(400).json({ error: '用户名不能为空' });
        if (!password) return res.status(400).json({ error: '密码不能为空' });

        // Check if user exists
        // Enforce case-insensitive uniqueness (SQLite unique is case-sensitive by default)
        const existingUser = await prisma.$queryRaw`
            SELECT id, username FROM User
            WHERE LOWER(username) = LOWER(${username})
            LIMIT 1;
        `;

        if (Array.isArray(existingUser) && existingUser.length > 0) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user (always USER; admin is only created via seed)
        const user = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                role: 'USER' // Always create as USER, admin is only created via seed
            }
        });

        res.status(201).json({ message: 'User created' });
    } catch (error) {
        // Unique constraint fallback (race condition / exact duplicates)
        if (error && error.code === 'P2002') {
            return res.status(400).json({ error: 'Username already exists' });
        }
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.login = async (req, res) => {
    try {
        const username = normalizeUsername(req.body?.username);
        const { password } = req.body;

        if (!username) return res.status(400).json({ error: '用户名不能为空' });
        if (!password) return res.status(400).json({ error: '密码不能为空' });

        const user = await prisma.user.findUnique({
            where: { username }
        });

        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

        const token = generateToken(user.id, user.role, user.username);

        res.json({ token, role: user.role, username: user.username });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Change password (admin only for now)
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.userId;

        // Get current user
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) return res.status(404).json({ error: 'User not found' });

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(401).json({ error: '当前密码错误' });

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });

        res.json({ message: '密码修改成功' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};
