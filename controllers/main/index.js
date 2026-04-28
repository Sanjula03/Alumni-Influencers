// main controller - handles the root route and landing page
'use strict'

const FeaturedAlumni = require('../../models/FeaturedAlumni');
const { Profile } = require('../../models/Profile');

exports.index = async function(req, res) {
  // If user is already logged in, take them to the dashboard
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard');
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Fetch today's winner
    const featured = await FeaturedAlumni.findOne({ 
      where: { featured_date: today } 
    });

    let featuredProfile = null;
    if (featured) {
      featuredProfile = await Profile.findOne({
        where: { user_id: featured.user_id },
        include: ['certifications', 'courses', 'licences', 'employmentHistory']
      });
    }

    res.render('index', { 
      featuredProfile,
      featuredDate: featured ? featured.featured_date : null
    });
  } catch (error) {
    console.error('Home Page Error:', error);
    res.render('index', { featuredProfile: null, featuredDate: null });
  }
};
