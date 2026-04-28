// utils/seedData.js
require('dotenv').config();
const { connectDB, sequelize } = require('../db');
const User = require('../models/User');
const { Profile, Employment, Degree, Certification } = require('../models/Profile');

const programmes = ['Computer Science', 'Business Management', 'Fine Arts', 'Mechanical Engineering', 'Data Science', 'Nursing'];
const sectors = ['Technology', 'Finance', 'Healthcare', 'Education', 'Manufacturing', 'Retail', 'Consulting'];
const locations = ['London', 'Manchester', 'Birmingham', 'New York', 'Dubai', 'Singapore', 'Remote'];
const roles = ['Software Engineer', 'Data Analyst', 'Project Manager', 'Consultant', 'Registered Nurse', 'Marketing Director', 'CEO'];
const certs = ['AWS Solutions Architect', 'PMP', 'CPA', 'CompTIA Security+', 'CFA Level 1', 'Google Cloud Engineer'];

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomYear = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function seed() {
  await connectDB();
  console.log('Syncing DB models explicitly for seed...');
  require('../models'); // ensure relationships load
  await sequelize.sync({ force: true }); // Warning: clears the database for fresh seed!
  
  console.log('Creating Admin User...');
  const admin = await User.create({
    email: 'admin@westminster.ac.uk',
    password: 'password123',
    role: 'admin',
    is_verified: true
  });

  console.log('Creating Developer User...');
  const dev = await User.create({
    email: 'developer@westminster.ac.uk',
    password: 'password123',
    role: 'developer',
    is_verified: true
  });

  console.log('Generating 100 Alumni Profiles with Sponsorship Funds...');
  for(let i=0; i<100; i++) {
    const user = await User.create({
      email: `alumni${i}@example.com`,
      password: 'password123',
      role: 'alumnus',
      is_verified: true
    });

    const gradYear = randomYear(2015, 2024);

    const profile = await Profile.create({
      user_id: user.id,
      first_name: 'John' + i,
      last_name: 'Doe' + i,
      biography: 'A successful graduate with multiple professional endorsements.',
      programme: randomItem(programmes),
      graduation_year: gradYear,
      linkedin_url: 'https://linkedin.com/in/johndoe' + i
    });

    // Add Degrees
    await Degree.create({
      profile_id: profile.id,
      name: 'BSc ' + profile.programme,
      institution: 'University of Westminster',
      completion_date: new Date(gradYear, 5, 1)
    });

    // Add Certifications (70% chance - Requirement 1)
    if(Math.random() > 0.3) {
      await Certification.create({
        profile_id: profile.id,
        name: randomItem(certs),
        issuing_body: 'Global Certification Body',
        completion_date: new Date(gradYear + 1, 1, 1),
        sponsor_amount: randomYear(150, 450) // Requirement 2: Sponsorship Model
      });
    }

    // Add Licences (40% chance - Requirement 1)
    if(Math.random() > 0.6) {
      const { Licence } = require('../models/Profile');
      await Licence.create({
        profile_id: profile.id,
        name: 'Professional Practice Licence',
        awarding_body: 'National Licensing Board',
        completion_date: new Date(gradYear + 2, 6, 1),
        sponsor_amount: randomYear(200, 600) // Requirement 2: Sponsorship Model
      });
    }

    // Add Short Courses (60% chance - Requirement 1)
    if(Math.random() > 0.4) {
      const { Course } = require('../models/Profile');
      await Course.create({
        profile_id: profile.id,
        name: 'Executive Leadership Course',
        provider: 'Industry Leaders Academy',
        completion_date: new Date(gradYear, 11, 1),
        sponsor_amount: randomYear(100, 300) // Requirement 2: Sponsorship Model
      });
    }

    // Add Employment
    await Employment.create({
      profile_id: profile.id,
      company: 'Company ' + String.fromCharCode(65 + (i % 5)),
      role: randomItem(roles),
      industry_sector: randomItem(sectors),
      location: randomItem(locations),
      start_date: new Date(gradYear, 6, 1),
      is_current: true
    });
  }

  console.log('Seeding Complete! Admin email: admin@westminster.ac.uk / password123');
  process.exit();
}

seed().catch(err => {
  console.error("Seed error:", err);
  process.exit(1);
});
