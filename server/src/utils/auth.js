const jwt = require('jsonwebtoken');

const generateToken = (userId, role, username) => {
    return jwt.sign({ userId, role, username }, process.env.JWT_SECRET, { expiresIn: '24h' });
};

const verifyToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { generateToken, verifyToken };
