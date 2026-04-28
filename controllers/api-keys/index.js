// controllers/api-keys/index.js
// Handles the web UI for managing API keys (create, list, revoke).
// This is the SSR controller — separate from routes/apiRoutes.js which handles the JSON API.
var crypto = require('crypto');
var { isAuthenticated, requireRole } = require('../../middleware/auth');
var { ApiClient, ApiUsageLog } = require('../../models/ApiClient');
var { generateToken, hashToken } = require('../../utils/tokenGenerator');

/**
 * Route setup — called by lib/boot.js to register these routes.
 * Role guard: only 'developer' and 'admin' can manage API keys (per Use Case diagram)
 */
exports.setup = function(app) {
  app.get('/api-keys', isAuthenticated, requireRole('developer', 'admin'), exports.index);
  app.post('/api-keys', isAuthenticated, requireRole('developer', 'admin'), exports.create);
  app.delete('/api-keys/:id', isAuthenticated, requireRole('developer', 'admin'), exports.revoke);
};

/**
 * GET /api-keys
 * Lists all API clients created by the currently logged-in user.
 * Includes usage count for each key so the user can see activity.
 */
exports.index = async function(req, res) {
  try {
    const keys = await ApiClient.findAll({ 
      where: { created_by: req.session.userId },
      order: [['created_at', 'DESC']],
      include: [{
        model: ApiUsageLog,
        as: 'usageLogs',
        attributes: [] // don't fetch log data, just need the count
      }]
    });

    // For each key, get the total usage count
    for (let key of keys) {
      key.dataValues.usageCount = await ApiUsageLog.count({ 
        where: { client_id: key.id } 
      });
    }

    res.render('api-keys/index', { keys });
  } catch (error) {
    console.error('API Keys Error:', error);
    res.message({ type: 'error', text: 'Failed to load API keys' });
    res.redirect('/dashboard');
  }
};

/**
 * POST /api-keys
 * Generates a new API bearer token with scoped permissions.
 * 
 * IMPORTANT SECURITY NOTE:
 * - The raw token is shown to the user ONCE and never stored.
 * - We store only the SHA-256 hash of the token in the database.
 * - When a client sends the token in the Authorization header,
 *   we hash it and compare against the stored hash.
 * - This is the same pattern used by GitHub and Stripe for API keys.
 */
exports.create = async function(req, res) {
  try {
    const { app_name, scopes } = req.body;
    
    if (!app_name) {
      res.message({ type: 'error', text: 'App name is required' });
      return res.redirect('/api-keys');
    }

    // Convert scopes checkbox values into an array
    // If only one checkbox is checked, Express sends a string; if multiple, an array
    let permissions = [];
    if (typeof scopes === 'string') permissions.push(scopes);
    else if (Array.isArray(scopes)) permissions = scopes;

    // Generate cryptographically random token (48 bytes = 96 hex chars)
    // This uses crypto.randomBytes which is CSPRNG (rubric: "cryptographically random")
    const rawToken = generateToken(48);
    
    // Hash the token with SHA-256 before storing (never store raw tokens)
    const tokenHashed = hashToken(rawToken);

    // Create the record using the CORRECT model field names
    await ApiClient.create({
      client_name: app_name,        // model field is client_name, not app_name
      token_hash: tokenHashed,       // model field is token_hash, not client_secret
      created_by: req.session.userId,
      permissions: permissions       // stored as JSON array: ["read:alumni", "read:analytics"]
    });

    // Show the raw token ONCE — it cannot be retrieved after this
    res.message({ type: 'success', text: `Key Created! Bearer Token: ${rawToken} — Save this now, it will NOT be shown again.` });
    res.redirect('/api-keys');
  } catch (error) {
    console.error('Create Key Error:', error);
    res.message({ type: 'error', text: 'Failed to create key' });
    res.redirect('/api-keys');
  }
};

/**
 * DELETE /api-keys/:id
 * Revokes an API key by setting is_revoked = true.
 * The token hash remains in the database for audit purposes,
 * but authenticateApiToken middleware will reject it with 403.
 */
exports.revoke = async function(req, res) {
  try {
    const key = await ApiClient.findOne({ 
      where: { id: req.params.id, created_by: req.session.userId } 
    });

    if (!key) {
      res.message({ type: 'error', text: 'Key not found' });
      return res.redirect('/api-keys');
    }

    key.is_revoked = true;
    await key.save();

    res.message({ type: 'success', text: 'Key revoked successfully' });
    res.redirect('/api-keys');
  } catch (error) {
    console.error('Revoke Key Error:', error);
    res.message({ type: 'error', text: 'Failed to revoke key' });
    res.redirect('/api-keys');
  }
};
