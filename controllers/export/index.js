// controllers/export/index.js
var { isAuthenticated } = require('../../middleware/auth');
var { sequelize } = require('../../db');
var PDFDocument = require('pdfkit');

exports.setup = function(app) {
  app.get('/export', isAuthenticated, exports.index);
  app.get('/export/csv', isAuthenticated, exports.csv);
  app.get('/export/pdf', isAuthenticated, exports.pdf);
};

exports.index = function(req, res) {
  res.render('export/index');
};

/**
 * Shared helper — builds the filtered SQL query for both CSV and PDF.
 * Accepts programme, year, and sector as optional filters.
 * @param {string|undefined} programme - Filter by programme name
 * @param {string|undefined} year - Filter by graduation year
 * @param {string|undefined} sector - Filter by industry sector
 * @returns {Array} Filtered alumni rows from the database
 */
const getFilteredDataForExport = async (programme, year, sector) => {
  let conditions = [];
  let replacements = [];
  if (programme) { conditions.push('p.programme = ?'); replacements.push(programme); }
  if (year) { conditions.push('p.graduation_year = ?'); replacements.push(year); }
  if (sector) { conditions.push('e.industry_sector = ?'); replacements.push(sector); }
  let whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const [rows] = await sequelize.query(
    `SELECT p.first_name, p.last_name, p.programme, p.graduation_year, 
            e.company, e.role, e.industry_sector, e.location 
     FROM profiles p 
     LEFT JOIN employment_history e ON p.id = e.profile_id AND e.is_current = 1
     ${whereClause}`,
    { replacements }
  );
  return rows;
};

exports.csv = async function(req, res) {
  try {
    const { programme, year, sector } = req.query;
    const data = await getFilteredDataForExport(programme, year, sector);

    let csvContent = 'First Name,Last Name,Programme,Graduation Year,Company,Role,Sector,Location\n';
    data.forEach(row => {
      csvContent += `"${row.first_name}","${row.last_name}","${row.programme || ''}","${row.graduation_year || ''}","${row.company || ''}","${row.role || ''}","${row.industry_sector || ''}","${row.location || ''}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="alumni-export.csv"');
    res.send(csvContent);
  } catch (error) {
    console.error('CSV Export Error:', error);
    res.message({ type: 'error', text: 'CSV Export Failed' });
    res.redirect('/export');
  }
};

exports.pdf = async function(req, res) {
  try {
    const { programme, year, sector } = req.query;
    const data = await getFilteredDataForExport(programme, year, sector);

    const doc = new PDFDocument();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="alumni-report.pdf"');
    
    doc.pipe(res);

    doc.fontSize(20).text('Alumni Intelligence Report', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(12).text(`Filters Applied - Programme: ${programme || 'All'}, Year: ${year || 'All'}`);
    doc.moveDown();

    doc.fontSize(14).text(`Total Alumni in Report: ${data.length}`);
    doc.moveDown();

    data.forEach(row => {
      doc.fontSize(10).text(`${row.first_name} ${row.last_name} (${row.graduation_year || 'N/A'}) - ${row.programme || 'N/A'}`);
      if(row.company) {
        doc.fontSize(10).text(`  Currently: ${row.role} at ${row.company} (${row.industry_sector || 'N/A'})`, { color: 'grey' });
      }
      doc.moveDown(0.5);
    });

    doc.end();
  } catch (error) {
    console.error('PDF Export Error:', error);
    res.status(500).send('PDF generation failed');
  }
};
