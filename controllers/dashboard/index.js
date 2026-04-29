// controllers/dashboard/index.js
var { isAuthenticated } = require('../../middleware/auth');
var User = require('../../models/User');
var { Profile, Employment, Degree, Certification, Licence, Course } = require('../../models/Profile');

exports.setup = function (app) {
  app.get('/dashboard', isAuthenticated, exports.index);
  app.get('/dashboard/alumni', isAuthenticated, exports.alumni);
  app.get('/dashboard/profile', isAuthenticated, exports.profileEdit);
};

exports.index = async function (req, res) {
  try {
    const totalAlumni = await Profile.count();
    const activeUsers = await User.count({ where: { is_verified: true } });

    // Quick simple metrics
    const totalDegrees = await Degree.count();
    const totalCertifications = await Certification.count();

    const user = await User.findByPk(req.session.userId);
    const profile = await Profile.findOne({ where: { user_id: req.session.userId } });

    // Fetch pending sponsorship offers for this alumnus - Requirement 2
    const { SponsorshipOffer } = require('../../models');
    const pendingOffers = await SponsorshipOffer.findAll({
      where: { alumnus_id: req.session.userId, status: 'pending' },
      include: [{ model: User, as: 'sponsor', attributes: ['email'] }]
    });

    // Fetch today's winner for the dashboard showcase
    const FeaturedAlumni = require('../../models/FeaturedAlumni');
    const today = new Date().toISOString().split('T')[0];
    const featured = await FeaturedAlumni.findOne({ 
      where: { featured_date: today }
    });

    let featuredProfile = null;
    if (featured) {
      featuredProfile = await Profile.findOne({ where: { user_id: featured.user_id } });
    }

    res.render('dashboard/index', {
      user: { email: user.email, role: user.role, profile },
      metrics: {
        totalAlumni,
        activeUsers,
        totalDegrees,
        totalCertifications
      },
      featuredProfile,
      pendingOffers
    });
  } catch (error) {
    console.error('Dashboard Error:', error);
    res.message({ type: 'error', text: 'Failed to load dashboard' });
    res.redirect('/auth/login');
  }
};

exports.alumni = async function (req, res) {
  try {
    const { programme, year, sector } = req.query;

    // Build filter objects
    const profileFilter = {};
    if (programme) profileFilter.programme = programme;
    if (year) profileFilter.graduation_year = year;

    const employmentFilter = {};
    if (sector) employmentFilter.industry_sector = sector;

    const user = await User.findByPk(req.session.userId);

    // Fetch profiles with all their data for the detail modal
    const profiles = await Profile.findAll({
      where: profileFilter,
      include: [
        { model: Employment, as: 'employmentHistory' },
        { model: Degree, as: 'degrees' },
        { model: Certification, as: 'certifications' },
        { model: Course, as: 'courses' }
      ],
      limit: 1000 
    });

    res.render('dashboard/alumni', {
      profiles,
      query: { programme, year, sector },
      user: { email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Alumni Error:', error);
    res.message({ type: 'error', text: 'Failed to fetch alumni' });
    res.redirect('/dashboard');
  }
};

exports.profileEdit = async function (req, res) {
  try {
    const profile = await Profile.findOne({
      where: { user_id: req.session.userId },
      include: [
        { model: Degree, as: 'degrees' },
        { model: Certification, as: 'certifications' },
        { model: Licence, as: 'licences' },
        { model: Course, as: 'courses' },
        { model: Employment, as: 'employmentHistory' }
      ]
    });

    res.render('dashboard/profile-edit', { 
      profile: profile || {}
    });
  } catch (error) {
    console.error('Profile Edit Error:', error);
    res.message({ type: 'error', text: 'Failed to load profile for editing' });
    res.redirect('/dashboard');
  }
};
