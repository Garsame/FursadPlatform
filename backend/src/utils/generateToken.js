const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/secrets');

const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, {
    // One hour. Overridable, but the default is deliberately short: a
    // session that outlives the person at the keyboard is a liability on a
    // shared or public machine, which is common here.
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  });
};

module.exports = generateToken;
