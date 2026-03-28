// api auth middleware - validates bearer tokens for public api routes
const crypto = require('crypto');
const { ApiClient, ApiUsageLog } = require('../models/ApiClient');

const authenticateApiToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. No bearer token provided.'
      });
    }

    const token = authHeader.split(' ')[1];

    // hash the token and look it up in db
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const client = await ApiClient.findOne({ where: { token_hash: tokenHash } });

    if (!client) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API token.'
      });
    }

    if (client.is_revoked) {
      return res.status(403).json({
        success: false,
        error: 'This API token has been revoked.'
      });
    }

    // log the usage
    await ApiUsageLog.create({
      client_id: client.id,
      endpoint: req.originalUrl,
      method: req.method,
      ip_address: req.ip
    });

    await client.update({ last_used_at: new Date() });

    req.apiClient = client;
    next();
  } catch (error) {
    console.error('API Auth Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error.'
    });
  }
};

module.exports = { authenticateApiToken };
