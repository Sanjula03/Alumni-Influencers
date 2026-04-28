// cron jobs - automated daily winner selection and appearance tracking
//
// BLIND BIDDING WINNER SELECTION ALGORITHM
// ==========================================
// This module implements two scheduled cron jobs:
//
// 1. DAILY WINNER SELECTION (runs at 6 PM every day)
//    Algorithm:
//    a) Fetch all bids for today with status = 'pending', sorted by amount DESC
//    b) The highest bidder wins (bids[0]) — this is a sealed-bid auction
//    c) Winner's bid is marked as 'won', all others as 'lost'
//    d) A FeaturedAlumni record is created for TOMORROW's date
//    e) Win/lose notification emails are sent to all bidders
//
//    KEY DESIGN DECISIONS:
//    - "Blind" means bidders cannot see each other's amounts (enforced in bidRoutes.js)
//    - Winner is determined by highest amount (simple max — no randomisation)
//    - Featured date is TOMORROW, not today (gives time for AR app to cache)
//    - Monthly limit (3 wins max) is enforced at BID PLACEMENT time, not here
//
// 2. MONTHLY RESET (runs at midnight on the 1st of each month)
//    - Does NOT delete any data — monthly wins are calculated dynamically
//    - Logs a summary of the previous month's winners for auditing
//
const cron = require('node-cron');
const { Op } = require('sequelize');
const Bid = require('../models/Bid');
const FeaturedAlumni = require('../models/FeaturedAlumni');
const User = require('../models/User');
const { sendBidNotificationEmail } = require('./email');

const initCronJobs = () => {
  // runs every day at 6 PM (18:00) - select winner and update appearance count
  cron.schedule('0 18 * * *', async () => {
    console.log('=== Running Daily Winner Selection (6 PM) ===');

    try {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      // get all pending bids for today sorted by amount
      const bids = await Bid.findAll({
        where: { bid_date: today, status: 'pending' },
        order: [['amount', 'DESC']]
      });

      if (bids.length === 0) {
        console.log('No pending bids found for today.');
        return;
      }

      // highest bidder wins
      const winningBid = bids[0];
      await winningBid.update({ status: 'won' });

      // mark everyone else as lost
      await Bid.update(
        { status: 'lost' },
        {
          where: {
            bid_date: today,
            status: 'pending',
            id: { [Op.ne]: winningBid.id }
          }
        }
      );

      // create featured record for tomorrow (activates winning alumni profile)
      await FeaturedAlumni.create({
        user_id: winningBid.user_id,
        bid_id: winningBid.id,
        featured_date: tomorrowStr,
        winning_bid_amount: winningBid.amount
      });

      // update appearance count - log total appearances for the winner
      const totalAppearances = await FeaturedAlumni.count({
        where: { user_id: winningBid.user_id }
      });
      console.log(`Winner: User ${winningBid.user_id} with £${winningBid.amount} (Total appearances: ${totalAppearances})`);

      // send emails to all bidders
      for (const bid of bids) {
        try {
          const user = await User.findByPk(bid.user_id);
          if (user && user.email) {
            const status = bid.id === winningBid.id ? 'won' : 'lost';
            await sendBidNotificationEmail(user.email, status, tomorrowStr);
          }
        } catch (emailError) {
          console.error(`Email failed for bid ${bid.id}:`, emailError.message);
        }
      }

      console.log('=== Winner Selection Complete ===');
    } catch (error) {
      console.error('Cron job error:', error);
    }
  });

  // runs on the 1st of every month at midnight - reset monthly appearance counts
  // this resets the monthly win tracking so users can bid again
  cron.schedule('0 0 1 * *', async () => {
    console.log('=== Monthly Appearance Count Reset ===');
    try {
      // no data deletion needed - monthly wins are calculated dynamically
      // by counting FeaturedAlumni records within the current month range
      // this log confirms the system is tracking the monthly reset cycle
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const monthName = lastMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

      const monthStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1).toISOString().split('T')[0];
      const monthEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0).toISOString().split('T')[0];

      const { sequelize } = require('../db');
      const [results] = await sequelize.query(
        'SELECT user_id, COUNT(*) as wins FROM featured_alumni WHERE featured_date BETWEEN ? AND ? GROUP BY user_id ORDER BY wins DESC',
        { replacements: [monthStart, monthEnd] }
      );

      console.log(`Monthly summary for ${monthName}:`);
      if (results.length === 0) {
        console.log('  No winners last month.');
      } else {
        for (const r of results) {
          console.log(`  User ${r.user_id}: ${r.wins} win(s)`);
        }
      }
      console.log('Monthly counts automatically reset for new month.');
      console.log('=== Monthly Reset Complete ===');
    } catch (error) {
      console.error('Monthly reset error:', error);
    }
  });

  console.log('Cron job scheduled: Daily winner selection at midnight');
  console.log('Cron job scheduled: Monthly appearance count reset on 1st');
};

module.exports = { initCronJobs };

