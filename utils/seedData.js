// utils/seedData.js
require('dotenv').config();
const { connectDB, sequelize } = require('../db');
const User = require('../models/User');
const { Profile, Employment, Degree, Certification } = require('../models/Profile');

const firstNames = ['Kamal', 'Dilini', 'Pathum', 'Amara', 'Kasun', 'Tharindu', 'Sajith', 'Nimali', 'Roshani', 'Nuwan'];
const lastNames = ['Perera', 'Fernando', 'Silva', 'Jayawardena', 'Gunawardena', 'Rajapaksa', 'Wickramasinghe', 'Ratnayake', 'Bandara', 'Dias'];
const programmes = ['Computer Science', 'Business Management', 'Fine Arts', 'Mechanical Engineering', 'Data Science', 'Nursing'];
const sectors = ['Technology', 'Finance', 'Healthcare', 'Education', 'Manufacturing', 'Retail', 'Consulting'];
const locations = ['Colombo', 'Kandy', 'Galle', 'Gampaha', 'Kurunegala', 'Negombo', 'Remote'];
const roles = ['Software Engineer', 'Data Analyst', 'Project Manager', 'Consultant', 'Registered Nurse', 'Marketing Director', 'CEO'];
const certs = ['AWS Solutions Architect', 'PMP', 'CPA', 'CompTIA Security+', 'CFA Level 1', 'Google Cloud Engineer'];
const slCompanies = ['Dialog Axiata', 'Virtusa', 'WSO2', 'John Keells', 'MAS Holdings', 'Brandix', 'LSEG SL'];

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomYear = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function seed() {
  await connectDB();
  console.log('Syncing DB models explicitly for seed...');
  require('../models'); // ensure relationships load
  await sequelize.sync({ force: true }); // Warning: clears the database for fresh seed!
  
  console.log('Creating Core Users (Admin, Developer, Sponsor)...');
  
  await User.create({
    email: 'admin@eastminster.ac.uk',
    password: 'password123',
    role: 'admin',
    is_verified: true
  });

  await User.create({
    email: 'developer@eastminster.ac.uk',
    password: 'password123',
    role: 'developer',
    is_verified: true
  });

  await User.create({
    email: 'sponsor@eastminster.ac.uk',
    password: 'password123',
    role: 'sponsor',
    is_verified: true
  });

  console.log('Generating 10 Sri Lankan Alumni Profiles...');
  for(let i=0; i<10; i++) {
    const fName = firstNames[i];
    const lName = lastNames[i];
    const email = `${fName.toLowerCase()}.${lName.toLowerCase()}@eastminster.ac.uk`;

    const user = await User.create({
      email: email,
      password: 'password123',
      role: 'alumnus',
      is_verified: true
    });

    const gradYear = randomYear(2015, 2024);

    const profile = await Profile.create({
      user_id: user.id,
      first_name: fName,
      last_name: lName,
      biography: `A distinguished graduate of Eastminster, currently leading projects in the ${randomItem(sectors)} sector. Focused on innovation and community growth.`,
      programme: randomItem(programmes),
      graduation_year: gradYear,
      linkedin_url: `https://linkedin.com/in/${fName.toLowerCase()}-${lName.toLowerCase()}`
    });

    // Add Degrees
    await Degree.create({
      profile_id: profile.id,
      name: 'BSc ' + profile.programme,
      institution: 'University of Eastminster',
      completion_date: new Date(gradYear, 5, 1)
    });

    // Add Certifications
    if(Math.random() > 0.3) {
      await Certification.create({
        profile_id: profile.id,
        name: randomItem(certs),
        issuing_body: 'Global Certification Body',
        completion_date: new Date(gradYear + 1, 1, 1),
        sponsor_amount: 0.00
      });
    }

    // Add Employment
    await Employment.create({
      profile_id: profile.id,
      company: randomItem(slCompanies),
      role: randomItem(roles),
      industry_sector: randomItem(sectors),
      location: randomItem(locations),
      start_date: new Date(gradYear, 6, 1),
      is_current: true
    });
  }

  console.log('Seeding Complete!');
  console.log('------------------');
  console.log('Admin: admin@eastminster.ac.uk / password123');
  console.log('Dev: developer@eastminster.ac.uk / password123');
  console.log('Sponsor: sponsor@eastminster.ac.uk / password123');
  console.log('Alumni: 10 users with @eastminster.ac.uk');
  
  process.exit();
}

seed().catch(err => {
  console.error("Seed error:", err);
  process.exit(1);
});
