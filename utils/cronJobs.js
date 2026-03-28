// cron jobs - automated daily winner selection
const cron = require('node-cron');
const { Op } = require('sequelize');
const Bid = require('../models/Bid');
const FeaturedAlumni = require('../models/FeaturedAlumni');
const User = require('../models/User');
const { sendBidNotificationEmail } = require('./email');

const initCronJobs = () => {
  // runs every day at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('=== Running Daily Winner Selection ===');

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

      // create featured record for tomorrow
      await FeaturedAlumni.create({
        user_id: winningBid.user_id,
        bid_id: winningBid.id,
        featured_date: tomorrowStr,
        winning_bid_amount: winningBid.amount
      });

      console.log(`Winner: User ${winningBid.user_id} with £${winningBid.amount}`);

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

  console.log('Cron job scheduled: Daily winner selection at midnight');
};

module.exports = { initCronJobs };
