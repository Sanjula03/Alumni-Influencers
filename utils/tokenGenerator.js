// token generator - creates secure random tokens for verification and api keys
const crypto = require('crypto');

// generate a random hex token
const generateToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString('hex');
};

// hash a token using sha256 (for storing api keys securely)
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

module.exports = { generateToken, hashToken };
