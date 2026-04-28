// utils/verify-sponsorship.js
const { User, Profile, Course, SponsorshipOffer } = require('../models');
const bcrypt = require('bcrypt');

async function setupVerification() {
  console.log('--- Sponsorship Workflow Verification Setup ---');

  try {
    // 1. Create a Test Sponsor (Client)
    const sponsorEmail = 'sponsor@westminster.ac.uk';
    let sponsor = await User.findOne({ where: { email: sponsorEmail } });
    
    if (!sponsor) {
      sponsor = await User.create({
        email: sponsorEmail,
        password: 'password123',
        role: 'sponsor',
        is_verified: true
      });
      console.log('✅ Created Sponsor Account: sponsor@westminster.ac.uk / password123');
    } else {
      await sponsor.update({ role: 'sponsor', is_verified: true });
      console.log('✅ Updated existing Sponsor Account');
    }

    // 2. Create a Test Alumnus (Influencer)
    const alumnusEmail = 'alumnus@westminster.ac.uk';
    let alumnus = await User.findOne({ where: { email: alumnusEmail } });

    if (!alumnus) {
      alumnus = await User.create({
        email: alumnusEmail,
        password: 'password123',
        role: 'alumnus',
        is_verified: true
      });
      console.log('✅ Created Alumnus Account: alumnus@westminster.ac.uk / password123');
    }

    // 3. Setup Alumnus Profile & Course
    let profile = await Profile.findOne({ where: { user_id: alumnus.id } });
    if (!profile) {
      profile = await Profile.create({
        user_id: alumnus.id,
        first_name: 'Test',
        last_name: 'Influencer',
        programme: 'Computer Science',
        graduation_year: 2024,
        biography: 'I am a test influencer for the sponsorship verification.'
      });
    }

    let course = await Course.findOne({ where: { profile_id: profile.id } });
    if (!course) {
      course = await Course.create({
        profile_id: profile.id,
        name: 'Advanced Web API Design',
        provider: 'Google Cloud Academy',
        sponsor_amount: 100.00, // Base amount
        completion_date: new Date()
      });
      console.log('✅ Created Course: Advanced Web API Design');
    }

    // 4. Create an initial Sponsorship Offer (Optional, but shows it working)
    const existingOffer = await SponsorshipOffer.findOne({ 
      where: { sponsor_id: sponsor.id, alumnus_id: alumnus.id } 
    });

    if (!existingOffer) {
      await SponsorshipOffer.create({
        sponsor_id: sponsor.id,
        alumnus_id: alumnus.id,
        credential_type: 'course',
        credential_id: course.id,
        amount: 500.00,
        message: 'We want to sponsor you to promote our Advanced Web API course!',
        status: 'pending'
      });
      console.log('✅ Created a Pending Sponsorship Offer (£500.00)');
    }

    console.log('\n--- Setup Complete ---');
    console.log('1. Log in as SPONSOR (sponsor@westminster.ac.uk) to "Explore Network" and offer sponsorships.');
    console.log('2. Log in as ALUMNUS (alumnus@westminster.ac.uk) to "Dashboard" to accept offers.');
    console.log('3. Visit "Bidding Hub" as Alumnus to see your budget grow!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

setupVerification();
