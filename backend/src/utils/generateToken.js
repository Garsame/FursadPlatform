const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/secrets');

const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

module.exports = generateToken;
