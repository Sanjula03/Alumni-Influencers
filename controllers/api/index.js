// api controller - token management and public featured endpoint
'use strict'

var { ApiClient, ApiUsageLog } = require('../../models/ApiClient');
var FeaturedAlumni = require('../../models/FeaturedAlumni');
var { Profile, Degree, Certification, Licence, Course, Employment } = require('../../models/Profile');
var { generateToken, hashToken } = require('../../utils/tokenGenerator');
var { isAuthenticated } = require('../../middleware/auth');
var { authenticateApiToken } = require('../../middleware/apiAuth');

exports.setup = function(app) {

  // list my api clients
  app.get('/api/clients', isAuthenticated, async function(req, res) {
    try {
      var clients = await ApiClient.findAll({
        where: { created_by: req.session.userId },
        order: [['created_at', 'DESC']]
      });
      res.json({ success: true, data: clients });
    } catch (error) {
      console.error('List clients error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch clients' });
    }
  });

  // generate new api token
  app.post('/api/client', isAuthenticated, async function(req, res) {
    try {
      var { clientName } = req.body;
      if (!clientName) {
        return res.status(400).json({ success: false, error: 'Client name is required' });
      }

      var rawToken = generateToken(48);
      var tokenHashed = hashToken(rawToken);

      var client = await ApiClient.create({
        client_name: clientName,
        token_hash: tokenHashed,
        created_by: req.session.userId
      });

      // return the raw token once, cant be retrieved after
      res.status(201).json({
        success: true,
        message: 'Token generated. Save it now, it wont be shown again.',
        data: { clientId: client.id, clientName: clientName, token: rawToken }
      });
    } catch (error) {
      console.error('Generate token error:', error);
      res.status(500).json({ success: false, error: 'Failed to generate token' });
    }
  });

  // revoke token
  app.put('/api/client/:client_id/revoke', isAuthenticated, async function(req, res) {
    try {
      var client = await ApiClient.findOne({
        where: { id: req.params.client_id, created_by: req.session.userId }
      });
      if (!client) {
        return res.status(404).json({ success: false, error: 'Client not found' });
      }

      await client.update({ is_revoked: true });
      res.json({ success: true, message: 'Token revoked for ' + client.client_name });
    } catch (error) {
      console.error('Revoke error:', error);
      res.status(500).json({ success: false, error: 'Failed to revoke token' });
    }
  });

  // usage stats for a client
  app.get('/api/client/:client_id/usage', isAuthenticated, async function(req, res) {
    try {
      var client = await ApiClient.findOne({
        where: { id: req.params.client_id, created_by: req.session.userId }
      });
      if (!client) {
        return res.status(404).json({ success: false, error: 'Client not found' });
      }

      var logs = await ApiUsageLog.findAll({
        where: { client_id: client.id },
        order: [['created_at', 'DESC']],
        limit: 100
      });

      var total = await ApiUsageLog.count({ where: { client_id: client.id } });

      res.json({ success: true, data: { client: client, logs: logs, totalRequests: total } });
    } catch (error) {
      console.error('Usage stats error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch usage stats' });
    }
  });

  // public api - get featured alumnus (requires bearer token)
  app.get('/api/v1/featured', authenticateApiToken, async function(req, res) {
    try {
      var today = new Date().toISOString().split('T')[0];

      var featured = await FeaturedAlumni.findOne({ where: { featured_date: today } });
      if (!featured) {
        return res.status(404).json({ success: false, message: 'No featured alumnus today' });
      }

      var profile = await Profile.findOne({
        where: { user_id: featured.user_id },
        include: [
          { model: Degree, as: 'degrees' },
          { model: Certification, as: 'certifications' },
          { model: Licence, as: 'licences' },
          { model: Course, as: 'courses' },
          { model: Employment, as: 'employmentHistory' }
        ]
      });

      if (!profile) {
        return res.status(404).json({ success: false, message: 'Profile not found' });
      }

      var p = profile.get({ plain: true });
      res.json({
        success: true,
        data: {
          featuredDate: featured.featured_date,
          alumnus: {
            name: p.first_name + ' ' + p.last_name,
            biography: p.biography,
            linkedInUrl: p.linkedin_url,
            profileImage: p.profile_image,
            degrees: p.degrees,
            certifications: p.certifications,
            licences: p.licences,
            courses: p.courses,
            employmentHistory: p.employmentHistory
          }
        }
      });
    } catch (error) {
      console.error('Featured API error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });
};
