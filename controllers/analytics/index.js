// controllers/analytics/index.js
// 
// ANALYTICS CONTROLLER (MVC Pattern)
// ====================================
// This controller handles the Data Visualization & Charts page.
// It executes 8 different SQL aggregate queries against the database, 
// then passes the results to the charts.ejs view for client-side rendering.
//
// ARCHITECTURE DECISION: Why Raw SQL Instead of Sequelize?
// - Complex GROUP BY aggregations with JOINs are cleaner in raw SQL
// - Sequelize's aggregate functions don't support multi-table JOINs well
// - Raw queries give us full control over performance (LIMIT, indexing)
// - Parameterised queries (?) prevent SQL injection just as effectively
//
// DATA FLOW:
// 1. User visits /analytics/charts (with optional filter query params)
// 2. This controller builds a dynamic WHERE clause from the filters
// 3. 8 SQL queries run in parallel against profiles, employment_history, certifications
// 4. Results are passed to charts.ejs as JSON
// 5. Chart.js on the client renders 9 interactive charts (8 datasets)
//
var { isAuthenticated } = require('../../middleware/auth');
var { sequelize } = require('../../db');

/**
 * Route registration — called by lib/boot.js during app startup.
 * Only one route: GET /analytics/charts (requires authentication).
 */
exports.setup = function(app) {
  app.get('/analytics/charts', isAuthenticated, exports.charts);
  app.get('/api/v1/analytics/charts-data', isAuthenticated, exports.chartsData);
};

exports.charts = async function(req, res) {
  try {
    const data = await fetchAnalyticsData(req.query);
    res.render('analytics/charts', {
      query: req.query,
      chartData: data.chartData,
      summary: data.summary
    });
  } catch (error) {
    console.error('Analytics Error:', error);
    res.message({ type: 'error', text: 'Failed to load analytics data' });
    res.redirect('/dashboard');
  }
};

exports.chartsData = async function(req, res) {
  try {
    const data = await fetchAnalyticsData(req.query);
    res.json({ success: true, data: data.chartData });
  } catch (error) {
    console.error('Analytics API Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics data' });
  }
};

async function fetchAnalyticsData(query) {
  const { programme, year, sector } = query;

  // Build where clause
  let conditions = [];
  let replacements = [];
  if (programme) { conditions.push('p.programme = ?'); replacements.push(programme); }
  if (year) { conditions.push('p.graduation_year = ?'); replacements.push(year); }

  let whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  // 1 & 8. Curriculum Skills Gap (Certifications vs Degrees)
  const [skillsGapRows] = await sequelize.query(
    `SELECT c.name, COUNT(*) as count 
     FROM certifications c 
     JOIN profiles p ON c.profile_id = p.id 
     ${whereClause} 
     GROUP BY c.name ORDER BY count DESC LIMIT 8`,
    { replacements }
  );

  // 2. Employment by Sector (Doughnut)
  const [sectorRows] = await sequelize.query(
    `SELECT e.industry_sector as label, COUNT(DISTINCT e.profile_id) as count 
     FROM employment_history e 
     JOIN profiles p ON e.profile_id = p.id 
     ${whereClause} 
     GROUP BY e.industry_sector ORDER BY count DESC LIMIT 6`,
    { replacements }
  );

  // 3. Most Common Job Titles (Horizontal Bar)
  const [jobRows] = await sequelize.query(
    `SELECT e.role as label, COUNT(*) as count 
     FROM employment_history e 
     JOIN profiles p ON e.profile_id = p.id 
     ${whereClause} 
     GROUP BY e.role ORDER BY count DESC LIMIT 10`,
    { replacements }
  );

  // 4. Top Employers (Bar)
  const [employerRows] = await sequelize.query(
    `SELECT e.company as label, COUNT(*) as count 
     FROM employment_history e 
     JOIN profiles p ON e.profile_id = p.id 
     ${whereClause} 
     GROUP BY e.company ORDER BY count DESC LIMIT 10`,
    { replacements }
  );

  // 5. Geographic Distribution (Pie)
  const [geoRows] = await sequelize.query(
    `SELECT e.location as label, COUNT(DISTINCT e.profile_id) as count 
     FROM employment_history e 
     JOIN profiles p ON e.profile_id = p.id 
     ${whereClause} 
     GROUP BY e.location ORDER BY count DESC LIMIT 5`,
    { replacements }
  );

  // 6. Graduation Trends (Line)
  const [gradRows] = await sequelize.query(
    `SELECT p.graduation_year as label, COUNT(*) as count 
     FROM profiles p 
     GROUP BY p.graduation_year ORDER BY p.graduation_year ASC`
  );

  // 7. Certification Trends (Area)
  const [certTrendRows] = await sequelize.query(
    `SELECT YEAR(c.completion_date) as label, COUNT(*) as count 
     FROM certifications c 
     JOIN profiles p ON c.profile_id = p.id 
     ${whereClause} 
     GROUP BY YEAR(c.completion_date) ORDER BY label ASC`,
    { replacements }
  );

  // 8. Programme Distribution (Polar Area — gives us a 6th chart type)
  const [programmeRows] = await sequelize.query(
    `SELECT p.programme as label, COUNT(*) as count 
     FROM profiles p 
     ${whereClause} 
     GROUP BY p.programme ORDER BY count DESC LIMIT 8`,
    { replacements }
  );

  // Summary stats for dashboard insight badges
  const [[summaryRow]] = await sequelize.query(
    `SELECT 
       COUNT(DISTINCT p.id) as totalAlumni,
       COUNT(DISTINCT e.company) as totalEmployers,
       COUNT(DISTINCT c.name) as totalCerts
     FROM profiles p
     LEFT JOIN employment_history e ON p.id = e.profile_id
     LEFT JOIN certifications c ON p.id = c.profile_id`
  );

  return {
    chartData: {
      skillsGap: skillsGapRows,
      sector: sectorRows,
      jobs: jobRows,
      employers: employerRows,
      geo: geoRows,
      grads: gradRows,
      certTrends: certTrendRows,
      programmes: programmeRows
    },
    summary: summaryRow || { totalAlumni: 0, totalEmployers: 0, totalCerts: 0 }
  };
}
