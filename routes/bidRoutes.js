// routes/bidRoutes.js - bidding system routes
// maps bid endpoints to the bid controller
'use strict'

var express = require('express');
var router = express.Router();
var { Op } = require('sequelize');
var Bid = require('../models/Bid');
var FeaturedAlumni = require('../models/FeaturedAlumni');
var { Profile } = require('../models/Profile');
var { isAuthenticated } = require('../middleware/auth');

// GET /bids - get bidding page data
router.get('/bids', isAuthenticated, async function(req, res) {
  try {
    var userId = req.session.userId;
    var today = new Date().toISOString().split('T')[0];

    var todaysBid = await Bid.findOne({
      where: { user_id: userId, bid_date: today }
    });

    // blind status check
    var bidStatus = null;
    if (todaysBid && todaysBid.status === 'pending') {
      var highest = await Bid.findOne({
        where: { bid_date: today, status: 'pending' },
        order: [['amount', 'DESC']]
      });
      if (highest) {
        bidStatus = highest.user_id === userId ? 'winning' : 'losing';
      }
    }

    // monthly stats
    var now = new Date();
    var monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    var monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    var monthlyWins = await FeaturedAlumni.count({
      where: { user_id: userId, featured_date: { [Op.between]: [monthStart, monthEnd] } }
    });

    // event attendance bonus
    var { sequelize } = require('../db');
    var [attendResults] = await sequelize.query(
      'SELECT ea.id FROM event_attendees ea JOIN events e ON ea.event_id = e.id WHERE ea.user_id = ? AND e.date BETWEEN ? AND ? LIMIT 1',
      { replacements: [userId, monthStart, monthEnd] }
    );
    var attended = attendResults.length > 0;

    var maxWins = attended ? 4 : 3;
    var remaining = Math.max(0, maxWins - monthlyWins);

    // recent history
    var history = await Bid.findAll({
      where: { user_id: userId },
      order: [['bid_date', 'DESC']],
      limit: 20
    });

    // todays featured
    var featured = await FeaturedAlumni.findOne({ where: { featured_date: today } });
    var featuredProfile = null;
    if (featured) {
      featuredProfile = await Profile.findOne({ where: { user_id: featured.user_id } });
    }

    // tomorrows slot info
    var tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    var tomorrowStr = tomorrow.toISOString().split('T')[0];
    var tomorrowFeatured = await FeaturedAlumni.findOne({ where: { featured_date: tomorrowStr } });
    var tomorrowSlot = null;
    if (tomorrowFeatured) {
      var tp = await Profile.findOne({ where: { user_id: tomorrowFeatured.user_id } });
      tomorrowSlot = { date: tomorrowStr, status: 'taken', winner: tp ? tp.first_name + ' ' + tp.last_name : 'Unknown' };
    } else {
      tomorrowSlot = { date: tomorrowStr, status: 'available', message: 'No winner yet - place your bid!' };
    }

    // appearance count
    var totalAppearances = await FeaturedAlumni.count({ where: { user_id: userId } });

    res.json({
      success: true,
      data: {
        todaysBid: todaysBid,
        bidStatus: bidStatus,
        monthlyWins: monthlyWins,
        maxWins: maxWins,
        remainingSlots: remaining,
        totalAppearances: totalAppearances,
        tomorrowSlot: tomorrowSlot,
        history: history,
        featuredToday: featured,
        featuredProfile: featuredProfile
      }
    });
  } catch (error) {
    console.error('Get bids error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch bid data' });
  }
});

// POST /bid - place or update bid
router.post('/bid', isAuthenticated, async function(req, res) {
  try {
    var userId = req.session.userId;
    var amount = parseFloat(req.body.amount);
    var today = new Date().toISOString().split('T')[0];

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Bid amount must be greater than 0' });
    }

    // check monthly limit
    var now = new Date();
    var monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    var monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    var monthlyWins = await FeaturedAlumni.count({
      where: { user_id: userId, featured_date: { [Op.between]: [monthStart, monthEnd] } }
    });

    var { sequelize } = require('../db');
    var [attendResults] = await sequelize.query(
      'SELECT ea.id FROM event_attendees ea JOIN events e ON ea.event_id = e.id WHERE ea.user_id = ? AND e.date BETWEEN ? AND ? LIMIT 1',
      { replacements: [userId, monthStart, monthEnd] }
    );
    var attended = attendResults.length > 0;

    var maxWins = attended ? 4 : 3;
    if (monthlyWins >= maxWins) {
      return res.status(403).json({ success: false, error: 'Monthly win limit reached' });
    }

    var existing = await Bid.findOne({ where: { user_id: userId, bid_date: today } });

    if (existing) {
      if (amount <= parseFloat(existing.amount)) {
        return res.status(400).json({
          success: false,
          error: 'New bid must be higher than current bid of ' + parseFloat(existing.amount).toFixed(2)
        });
      }
      await existing.update({ amount: amount });
      res.json({ success: true, message: 'Bid updated to ' + amount.toFixed(2), data: existing });
    } else {
      var bid = await Bid.create({
        user_id: userId, amount: amount,
        bid_date: today, status: 'pending'
      });
      res.status(201).json({ success: true, message: 'Bid placed: ' + amount.toFixed(2), data: bid });
    }
  } catch (error) {
    console.error('Place bid error:', error);
    res.status(500).json({ success: false, error: 'Failed to place bid' });
  }
});

// DELETE /bid - cancel todays bid
router.delete('/bid', isAuthenticated, async function(req, res) {
  try {
    var userId = req.session.userId;
    var today = new Date().toISOString().split('T')[0];

    var bid = await Bid.findOne({
      where: { user_id: userId, bid_date: today, status: 'pending' }
    });

    if (!bid) {
      return res.status(404).json({ success: false, error: 'No active bid found for today' });
    }

    await bid.destroy();
    res.json({ success: true, message: 'Bid cancelled successfully' });
  } catch (error) {
    console.error('Cancel bid error:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel bid' });
  }
});

// GET /bid/history - full bid history
router.get('/bid/history', isAuthenticated, async function(req, res) {
  try {
    var bids = await Bid.findAll({
      where: { user_id: req.session.userId },
      order: [['bid_date', 'DESC']]
    });
    res.json({ success: true, data: bids });
  } catch (error) {
    console.error('Bid history error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch history' });
  }
});

module.exports = router;
