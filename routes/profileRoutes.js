// routes/profileRoutes.js - profile management routes
// maps profile endpoints to the profile controller
'use strict'

var express = require('express');
var router = express.Router();
var { Profile, Degree, Certification, Licence, Course, Employment } = require('../models/Profile');
var { isAuthenticated } = require('../middleware/auth');
var multer = require('multer');
var path = require('path');

// multer config for profile images
var storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, path.join(__dirname, '..', 'public', 'uploads'));
  },
  filename: function(req, file, cb) {
    cb(null, req.session.userId + '-' + Date.now() + path.extname(file.originalname));
  }
});

var upload = multer({
  storage: storage,
  fileFilter: function(req, file, cb) {
    var allowed = ['image/jpeg', 'image/png', 'image/gif'];
    cb(null, allowed.includes(file.mimetype));
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

// GET /profiles - list all profiles (public)
router.get('/profiles', async function(req, res) {
  try {
    var profiles = await Profile.findAll({
      include: [
        { model: Degree, as: 'degrees' },
        { model: Certification, as: 'certifications' },
        { model: Licence, as: 'licences' },
        { model: Course, as: 'courses' },
        { model: Employment, as: 'employmentHistory' }
      ]
    });
    res.json({ success: true, data: profiles });
  } catch (error) {
    console.error('List profiles error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch profiles' });
  }
});

// GET /profile/me - get my profile with completion status
router.get('/profile/me', isAuthenticated, async function(req, res) {
  try {
    var profile = await Profile.findOne({
      where: { user_id: req.session.userId },
      include: [
        { model: Degree, as: 'degrees' },
        { model: Certification, as: 'certifications' },
        { model: Licence, as: 'licences' },
        { model: Course, as: 'courses' },
        { model: Employment, as: 'employmentHistory' }
      ]
    });
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found. Create one first.' });
    }

    // calculate profile completion status
    var p = profile.get({ plain: true });
    var total = 9;
    var filled = 0;
    if (p.first_name) filled++;
    if (p.last_name) filled++;
    if (p.biography) filled++;
    if (p.linkedin_url) filled++;
    if (p.profile_image) filled++;
    if (p.degrees && p.degrees.length > 0) filled++;
    if (p.certifications && p.certifications.length > 0) filled++;
    if (p.licences && p.licences.length > 0) filled++;
    if (p.courses && p.courses.length > 0) filled++;

    var completionPercent = Math.round((filled / total) * 100);
    var missing = [];
    if (!p.biography) missing.push('biography');
    if (!p.linkedin_url) missing.push('linkedInUrl');
    if (!p.profile_image) missing.push('profileImage');
    if (!p.degrees || p.degrees.length === 0) missing.push('degrees');
    if (!p.certifications || p.certifications.length === 0) missing.push('certifications');
    if (!p.licences || p.licences.length === 0) missing.push('licences');
    if (!p.courses || p.courses.length === 0) missing.push('courses');

    res.json({
      success: true,
      data: profile,
      completionStatus: {
        percentage: completionPercent,
        missingFields: missing,
        isComplete: completionPercent === 100
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

// GET /profile/:profile_id - get profile by user id
router.get('/profile/:profile_id', async function(req, res) {
  try {
    var profile = await Profile.findOne({
      where: { user_id: req.params.profile_id },
      include: [
        { model: Degree, as: 'degrees' },
        { model: Certification, as: 'certifications' },
        { model: Licence, as: 'licences' },
        { model: Course, as: 'courses' },
        { model: Employment, as: 'employmentHistory' }
      ]
    });
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }
    res.json({ success: true, data: profile });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

// POST /profile - create or update profile
router.post('/profile', isAuthenticated, upload.single('profileImage'), async function(req, res) {
  try {
    var { firstName, lastName, biography, linkedInUrl } = req.body;
    var { degrees, certifications, licences, courses, employmentHistory } = req.body;

    // Helper to parse JSON strings if needed (for AJAX compatibility)
    const safeParse = (data) => {
      if (typeof data === 'string') {
        try { return JSON.parse(data); } catch (e) { return null; }
      }
      return data;
    };

    degrees = safeParse(degrees);
    certifications = safeParse(certifications);
    licences = safeParse(licences);
    courses = safeParse(courses);
    employmentHistory = safeParse(employmentHistory);

    if (!firstName || !lastName) {
      return res.status(400).json({ success: false, error: 'First name and last name are required' });
    }

    var profile = await Profile.findOne({ where: { user_id: req.session.userId } });

    if (profile) {
      await profile.update({
        first_name: firstName,
        last_name: lastName,
        biography: biography || null,
        linkedin_url: linkedInUrl || null,
        profile_image: req.file ? '/uploads/' + req.file.filename : profile.profile_image
      });
    } else {
      profile = await Profile.create({
        user_id: req.session.userId,
        first_name: firstName,
        last_name: lastName,
        biography: biography || null,
        linkedin_url: linkedInUrl || null,
        profile_image: req.file ? '/uploads/' + req.file.filename : null
      });
    }

    var profileId = profile.id;

    // rebuild sub entries
    if (degrees && Array.isArray(degrees)) {
      await Degree.destroy({ where: { profile_id: profileId } });
      for (var d of degrees.filter(function(x) { return x && x.name; })) {
        var compDate = d.completionDate ? new Date(d.completionDate) : new Date();
        if (isNaN(compDate.getTime())) compDate = new Date();
        
        await Degree.create({
          profile_id: profileId, name: d.name,
          institution: d.institution || '', url: d.url || null,
          completion_date: compDate
        });
      }
    }

    if (certifications && Array.isArray(certifications)) {
      await Certification.destroy({ where: { profile_id: profileId } });
      for (var c of certifications.filter(function(x) { return x && x.name; })) {
        var certDate = c.completionDate ? new Date(c.completionDate) : new Date();
        if (isNaN(certDate.getTime())) certDate = new Date();

        await Certification.create({
          profile_id: profileId, name: c.name,
          issuing_body: c.issuingBody || '', url: c.url || null,
          completion_date: certDate
        });
      }
    }

    if (licences && Array.isArray(licences)) {
      await Licence.destroy({ where: { profile_id: profileId } });
      for (var l of licences.filter(function(x) { return x && x.name; })) {
        var licDate = l.completionDate ? new Date(l.completionDate) : new Date();
        if (isNaN(licDate.getTime())) licDate = new Date();

        await Licence.create({
          profile_id: profileId, name: l.name,
          awarding_body: l.awardingBody || '', url: l.url || null,
          completion_date: licDate
        });
      }
    }

    if (courses && Array.isArray(courses)) {
      await Course.destroy({ where: { profile_id: profileId } });
      for (var co of courses.filter(function(x) { return x && x.name; })) {
        var courseDate = co.completionDate ? new Date(co.completionDate) : new Date();
        if (isNaN(courseDate.getTime())) courseDate = new Date();

        await Course.create({
          profile_id: profileId, name: co.name,
          provider: co.provider || '', url: co.url || null,
          completion_date: courseDate
        });
      }
    }

    if (employmentHistory && Array.isArray(employmentHistory)) {
      await Employment.destroy({ where: { profile_id: profileId } });
      for (var e of employmentHistory.filter(function(x) { return x && x.company; })) {
        // Robust date handling
        var startDate = e.startDate ? new Date(e.startDate) : new Date();
        if (isNaN(startDate.getTime())) startDate = new Date();
        
        var endDate = e.endDate ? new Date(e.endDate) : null;
        if (endDate && isNaN(endDate.getTime())) endDate = null;

        await Employment.create({
          profile_id: profileId, company: e.company,
          role: e.role || '', start_date: startDate,
          end_date: endDate, is_current: e.isCurrent || false
        });
      }
    }

    var updated = await Profile.findOne({
      where: { id: profileId },
      include: [
        { model: Degree, as: 'degrees' },
        { model: Certification, as: 'certifications' },
        { model: Licence, as: 'licences' },
        { model: Course, as: 'courses' },
        { model: Employment, as: 'employmentHistory' }
      ]
    });

    res.json({ success: true, message: 'Profile saved', data: updated });
  } catch (error) {
    console.error('Save profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to save profile' });
  }
});

// DELETE /profile/entry/:type/:entry_id - delete a sub entry
router.delete('/profile/entry/:type/:entry_id', isAuthenticated, async function(req, res) {
  try {
    var modelMap = {
      degree: Degree, certification: Certification,
      licence: Licence, course: Course, employment: Employment
    };

    var Model = modelMap[req.params.type];
    if (!Model) {
      return res.status(400).json({ success: false, error: 'Invalid entry type' });
    }

    var profile = await Profile.findOne({ where: { user_id: req.session.userId } });
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }

    var deleted = await Model.destroy({
      where: { id: req.params.entry_id, profile_id: profile.id }
    });

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Entry not found' });
    }

    res.json({ success: true, message: 'Entry deleted' });
  } catch (error) {
    console.error('Delete entry error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete entry' });
  }
});

// --- Sponsorship Routes ---

// POST /sponsorship/offer - make an offer to an alumnus for a specific course/cert
router.post('/sponsorship/offer', isAuthenticated, async function(req, res) {
  try {
    if (req.session.userRole !== 'sponsor' && req.session.userRole !== 'admin') {
      return res.status(403).json({ success: false, error: 'Only sponsors can make offers' });
    }

    const { alumnusId, credentialType, credentialId, amount, message } = req.body;
    const { SponsorshipOffer } = require('../models');

    // Verify the credential exists for the alumnus
    const Model = { certification: Certification, licence: Licence, course: Course }[credentialType];
    if (!Model) return res.status(400).json({ success: false, error: 'Invalid credential type' });

    const profile = await Profile.findOne({ where: { user_id: alumnusId } });
    if (!profile) return res.status(404).json({ success: false, error: 'Alumnus profile not found' });

    const credential = await Model.findOne({ where: { id: credentialId, profile_id: profile.id } });
    if (!credential) return res.status(404).json({ success: false, error: 'Credential not found on this profile' });

    const offer = await SponsorshipOffer.create({
      sponsor_id: req.session.userId,
      alumnus_id: alumnusId,
      credential_type: credentialType,
      credential_id: credentialId,
      amount,
      message,
      status: 'pending'
    });

    res.status(201).json({ success: true, message: 'Sponsorship offer sent successfully', data: offer });
  } catch (error) {
    console.error('Sponsorship offer error:', error);
    res.status(500).json({ success: false, error: 'Failed to send offer' });
  }
});

// GET /sponsorship/received - alumni sees offers sent to them
router.get('/sponsorship/received', isAuthenticated, async function(req, res) {
  try {
    const { SponsorshipOffer, User } = require('../models');
    const offers = await SponsorshipOffer.findAll({
      where: { alumnus_id: req.session.userId },
      include: [{ model: User, as: 'sponsor', attributes: ['email'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: offers });
  } catch (error) {
    console.error('Get received offers error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch offers' });
  }
});

// POST /sponsorship/accept/:id - alumnus accepts an offer
router.post('/sponsorship/accept/:id', isAuthenticated, async function(req, res) {
  try {
    const { SponsorshipOffer } = require('../models');
    const offer = await SponsorshipOffer.findOne({
      where: { id: req.params.id, alumnus_id: req.session.userId, status: 'pending' }
    });

    if (!offer) return res.status(404).json({ success: false, error: 'Offer not found or already processed' });

    await offer.update({ status: 'accepted' });
    res.json({ success: true, message: 'Offer accepted! The funds will be available for your next bid.' });
  } catch (error) {
    console.error('Accept offer error:', error);
    res.status(500).json({ success: false, error: 'Failed to accept offer' });
  }
});

module.exports = router;
