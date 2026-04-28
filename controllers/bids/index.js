// controllers/bids/index.js
//
// BIDDING CONTROLLER (MVC Pattern — SSR)
// =======================================
// This controller handles the Server-Side Rendered bidding page.
// It queries all bidding data and passes it to the bids/index.ejs view.
//
// The bidding system is a "sealed-bid" (blind) auction:
//   - Alumni place bids each day for tomorrow's featured slot
//   - No one can see anyone else's bid amounts
//   - Users only receive "winning" or "losing" feedback
//   - A cron job (cronJobs.js) selects the winner at 6 PM daily
//
// DATA FLOW:
// 1. User visits GET /bids
// 2. Controller queries: today's bid, blind status, monthly wins, featured alumni
// 3. View renders the full bidding dashboard with forms
// 4. POST /bids/place → places or increases a bid (form submit → redirect)
// 5. POST /bids/cancel → cancels today's bid (form submit → redirect)
//
var { isAuthenticated, requireRole } = require('../../middleware/auth');
var { Op } = require('sequelize');
var Bid = require('../../models/Bid');
var FeaturedAlumni = require('../../models/FeaturedAlumni');
var { Profile } = require('../../models/Profile');
var { sequelize } = require('../../db');

/**
 * Route registration — called by lib/boot.js during app startup.
 * Role guard: only 'alumnus' and 'admin' can access bidding (per Use Case diagram)
 */
exports.setup = function(app) {
  app.get('/bids', isAuthenticated, requireRole('alumnus', 'admin'), exports.index);
  app.post('/bids/place', isAuthenticated, requireRole('alumnus', 'admin'), exports.placeBid);
  app.post('/bids/cancel', isAuthenticated, requireRole('alumnus', 'admin'), exports.cancelBid);
};

/**
 * GET /bids — Renders the bidding dashboard with all relevant data.
 * Queries: today's bid, blind status, monthly stats, featured alumni, history.
 */
exports.index = async function(req, res) {
  try {
    var userId = req.session.userId;
    var today = new Date().toISOString().split('T')[0];

    // 1. Get user's bid for today (if any)
    var todaysBid = await Bid.findOne({
      where: { user_id: userId, bid_date: today }
    });

    // 2. Blind status check — only reveals "winning" or "losing", never amounts
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

    // 3. Monthly win statistics
    var now = new Date();
    var monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    var monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    var monthlyWins = await FeaturedAlumni.count({
      where: { user_id: userId, featured_date: { [Op.between]: [monthStart, monthEnd] } }
    });

    // 4. Event attendance bonus — attended event this month → 4 max wins instead of 3
    var [attendResults] = await sequelize.query(
      'SELECT ea.id FROM event_attendees ea JOIN events e ON ea.event_id = e.id WHERE ea.user_id = ? AND e.date BETWEEN ? AND ? LIMIT 1',
      { replacements: [userId, monthStart, monthEnd] }
    );
    var attended = attendResults.length > 0;
    var maxWins = attended ? 4 : 3;
    var remaining = Math.max(0, maxWins - monthlyWins);

    // 5. Bid history (last 20)
    var history = await Bid.findAll({
      where: { user_id: userId },
      order: [['bid_date', 'DESC']],
      limit: 20
    });

    // 6. Today's featured alumnus
    var featured = await FeaturedAlumni.findOne({ where: { featured_date: today } });
    var featuredProfile = null;
    if (featured) {
      featuredProfile = await Profile.findOne({ where: { user_id: featured.user_id } });
    }

    // 7. Tomorrow's slot availability
    var tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    var tomorrowStr = tomorrow.toISOString().split('T')[0];
    var tomorrowFeatured = await FeaturedAlumni.findOne({ where: { featured_date: tomorrowStr } });
    var tomorrowSlot = null;
    if (tomorrowFeatured) {
      var tp = await Profile.findOne({ where: { user_id: tomorrowFeatured.user_id } });
      tomorrowSlot = { date: tomorrowStr, status: 'taken', winner: tp ? tp.first_name + ' ' + tp.last_name : 'Unknown' };
    } else {
      tomorrowSlot = { date: tomorrowStr, status: 'available' };
    }

    // 8. Total all-time appearances
    var totalAppearances = await FeaturedAlumni.count({ where: { user_id: userId } });

    // 9. Total bidders today (for context — but NOT their amounts)
    var totalBiddersToday = await Bid.count({ where: { bid_date: today, status: 'pending' } });

    // Calculate Sponsorship Budget - Requirement 2
    const { Certification, Licence, Course, SponsorshipOffer } = require('../../models');
    const profile = await Profile.findOne({ where: { user_id: userId } });
    
    let totalSponsorship = 0;
    if (profile) {
      const certs = await Certification.findAll({ where: { profile_id: profile.id } });
      const licences = await Licence.findAll({ where: { profile_id: profile.id } });
      const courses = await Course.findAll({ where: { profile_id: profile.id } });
      
      const sum = (arr) => arr.reduce((acc, item) => acc + parseFloat(item.sponsor_amount || 0), 0);
      
      // Base amount from profile credentials
      totalSponsorship = sum(certs) + sum(licences) + sum(courses);

      // Add amount from accepted sponsorship offers (from clients)
      const activeOffers = await SponsorshipOffer.findAll({
        where: { alumnus_id: userId, status: 'accepted' }
      });
      const offersSum = activeOffers.reduce((acc, offer) => acc + parseFloat(offer.amount), 0);
      totalSponsorship += offersSum;
    }

    res.render('bids/index', {
      todaysBid,
      bidStatus,
      totalSponsorship,
      monthlyWins,
      maxWins,
      remainingSlots: remaining,
      attended,
      history,
      featured,
      featuredProfile,
      tomorrowSlot,
      totalAppearances,
      totalBiddersToday,
      today
    });
  } catch (error) {
    console.error('Bids page error:', error);
    res.message({ type: 'error', text: 'Failed to load bidding page' });
    res.redirect('/dashboard');
  }
};

/**
 * POST /bids/place — Places a new bid or increases an existing one.
 * Business rules:
 *   - Amount must be > 0
 *   - Monthly win limit must not be exceeded
 *   - Existing bids can only be INCREASED, never decreased (sealed-bid rule)
 */
exports.placeBid = async function(req, res) {
  try {
    var userId = req.session.userId;
    var amount = parseFloat(req.body.amount);
    var today = new Date().toISOString().split('T')[0];

    // Validate amount
    if (!amount || amount <= 0) {
      res.message({ type: 'error', text: 'Bid amount must be greater than 0.' });
      return res.redirect('/bids');
    }

    // 10. Calculate Sponsorship Budget - Requirement 2 Validation
    const { Certification, Licence, Course, SponsorshipOffer } = require('../../models');
    const profile = await Profile.findOne({ where: { user_id: userId } });
    
    let totalSponsorship = 0;
    if (profile) {
      const certs = await Certification.findAll({ where: { profile_id: profile.id } });
      const licences = await Licence.findAll({ where: { profile_id: profile.id } });
      const courses = await Course.findAll({ where: { profile_id: profile.id } });
      
      const sum = (arr) => arr.reduce((acc, item) => acc + parseFloat(item.sponsor_amount || 0), 0);
      
      // Base amount
      totalSponsorship = sum(certs) + sum(licences) + sum(courses);

      // Add accepted offers
      const activeOffers = await SponsorshipOffer.findAll({
        where: { alumnus_id: userId, status: 'accepted' }
      });
      totalSponsorship += activeOffers.reduce((acc, offer) => acc + parseFloat(offer.amount), 0);
    }

    if (amount > totalSponsorship) {
      res.message({ 
        type: 'error', 
        text: 'Insufficient sponsorship funds. Your total budget from endorsements is £' + totalSponsorship.toFixed(2) 
      });
      return res.redirect('/bids');
    }

    // Check monthly limit
    var now = new Date();
    var monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    var monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    var monthlyWins = await FeaturedAlumni.count({
      where: { user_id: userId, featured_date: { [Op.between]: [monthStart, monthEnd] } }
    });

    var [attendResults] = await sequelize.query(
      'SELECT ea.id FROM event_attendees ea JOIN events e ON ea.event_id = e.id WHERE ea.user_id = ? AND e.date BETWEEN ? AND ? LIMIT 1',
      { replacements: [userId, monthStart, monthEnd] }
    );
    var maxWins = attendResults.length > 0 ? 4 : 3;

    if (monthlyWins >= maxWins) {
      res.message({ type: 'error', text: 'You have reached your monthly win limit (' + maxWins + ' wins). Try again next month.' });
      return res.redirect('/bids');
    }

    // Check for existing bid today
    var existing = await Bid.findOne({ where: { user_id: userId, bid_date: today } });

    if (existing) {
      // Can only INCREASE, never decrease (blind bidding rule)
      if (amount <= parseFloat(existing.amount)) {
        res.message({ type: 'error', text: 'New bid must be higher than your current bid of £' + parseFloat(existing.amount).toFixed(2) });
        return res.redirect('/bids');
      }
      await existing.update({ amount: amount });
      res.message({ type: 'success', text: 'Bid increased to £' + amount.toFixed(2) });
    } else {
      await Bid.create({
        user_id: userId,
        amount: amount,
        bid_date: today,
        status: 'pending'
      });
      res.message({ type: 'success', text: 'Bid placed: £' + amount.toFixed(2) });
    }

    res.redirect('/bids');
  } catch (error) {
    console.error('Place bid error:', error);
    res.message({ type: 'error', text: 'Failed to place bid. Please try again.' });
    res.redirect('/bids');
  }
};

/**
 * POST /bids/cancel — Cancels the user's pending bid for today.
 * Only works if the bid status is still 'pending' (not yet resolved by cron).
 */
exports.cancelBid = async function(req, res) {
  try {
    var userId = req.session.userId;
    var today = new Date().toISOString().split('T')[0];

    var bid = await Bid.findOne({
      where: { user_id: userId, bid_date: today, status: 'pending' }
    });

    if (!bid) {
      res.message({ type: 'error', text: 'No active bid found for today.' });
      return res.redirect('/bids');
    }

    await bid.destroy();
    res.message({ type: 'success', text: 'Bid cancelled successfully.' });
    res.redirect('/bids');
  } catch (error) {
    console.error('Cancel bid error:', error);
    res.message({ type: 'error', text: 'Failed to cancel bid.' });
    res.redirect('/bids');
  }
};
