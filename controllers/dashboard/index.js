// controllers/dashboard/index.js
var { isAuthenticated } = require('../../middleware/auth');
var User = require('../../models/User');
var { Profile, Employment, Degree, Certification } = require('../../models/Profile');

exports.setup = function(app) {
  app.get('/dashboard', isAuthenticated, exports.index);
  app.get('/dashboard/alumni', isAuthenticated, exports.alumni);
};

exports.index = async function(req, res) {
  try {
    const totalAlumni = await Profile.count();
    const activeUsers = await User.count({ where: { is_verified: true } });
    
    // Quick simple metrics
    const totalDegrees = await Degree.count();
    const totalCertifications = await Certification.count();

    const user = await User.findByPk(req.session.userId);

    res.render('dashboard/index', {
      user: { email: user.email },
      metrics: {
        totalAlumni,
        activeUsers,
        totalDegrees,
        totalCertifications
      }
    });
  } catch (error) {
    console.error('Dashboard Error:', error);
    res.message({ type: 'error', text: 'Failed to load dashboard' });
    res.redirect('/');
  }
};

exports.alumni = async function(req, res) {
  try {
    const { programme, year, sector } = req.query;
    
    // Build filter objects
    const profileFilter = {};
    if (programme) profileFilter.programme = programme;
    if (year) profileFilter.graduation_year = year;

    const employmentFilter = {};
    if (sector) employmentFilter.industry_sector = sector;

    // Fetch profiles with their employment data to match the sector filter
    const profiles = await Profile.findAll({
      where: profileFilter,
      include: [
        {
          model: Employment,
          as: 'employmentHistory',
          where: Object.keys(employmentFilter).length > 0 ? employmentFilter : undefined,
          required: Object.keys(employmentFilter).length > 0
        }
      ],
      limit: 50 // Simple limit instead of full pagination for compactness
    });

    res.render('dashboard/alumni', { 
      profiles, 
      query: { programme, year, sector }
    });
  } catch (error) {
    console.error('Alumni Error:', error);
    res.message({ type: 'error', text: 'Failed to fetch alumni' });
    res.redirect('/dashboard');
  }
};
