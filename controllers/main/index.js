// main controller - handles the root route
'use strict'

exports.index = function(req, res) {
  res.json({
    message: 'Alumni Influencers API',
    version: '1.0.0',
    endpoints: {
      auth: '/auth/register, /auth/login, /auth/logout',
      profile: '/profiles, /profile/:id',
      bids: '/bids, /bid',
      api: '/api/clients, /api/featured'
    }
  });
};
