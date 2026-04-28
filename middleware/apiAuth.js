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

/**
 * Permission-checking middleware factory.
 * Usage: router.get('/api/v1/alumni', authenticateApiToken, requirePermission('read:alumni'), handler)
 * 
 * Checks if the authenticated API client's permissions array includes the required scope.
 * Returns 403 Forbidden if the permission is missing — this is the key enforcement
 * that prevents a "read:alumni_of_day" token from accessing analytics endpoints.
 * 
 * @param {string} requiredPermission - The permission scope string (e.g. 'read:alumni', 'read:analytics')
 * @returns {Function} Express middleware
 */
const requirePermission = (requiredPermission) => {
  return (req, res, next) => {
    const client = req.apiClient;

    // Defensive check: ensure authenticateApiToken ran first
    if (!client) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required before permission check.'
      });
    }

    // Parse permissions — stored as JSON array in the database
    const permissions = client.permissions || [];

    if (!permissions.includes(requiredPermission)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. This token does not have the '${requiredPermission}' permission.`,
        requiredPermission: requiredPermission,
        yourPermissions: permissions
      });
    }

    next();
  };
};

module.exports = { authenticateApiToken, requirePermission };
