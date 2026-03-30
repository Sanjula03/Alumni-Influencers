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
    var { firstName, lastName, biography, linkedInUrl,
      degrees, certifications, licences, courses, employmentHistory } = req.body;

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
        await Degree.create({
          profile_id: profileId, name: d.name,
          institution: d.institution || '', url: d.url || null,
          completion_date: d.completionDate || new Date()
        });
      }
    }

    if (certifications && Array.isArray(certifications)) {
      await Certification.destroy({ where: { profile_id: profileId } });
      for (var c of certifications.filter(function(x) { return x && x.name; })) {
        await Certification.create({
          profile_id: profileId, name: c.name,
          issuing_body: c.issuingBody || '', url: c.url || null,
          completion_date: c.completionDate || new Date()
        });
      }
    }

    if (licences && Array.isArray(licences)) {
      await Licence.destroy({ where: { profile_id: profileId } });
      for (var l of licences.filter(function(x) { return x && x.name; })) {
        await Licence.create({
          profile_id: profileId, name: l.name,
          awarding_body: l.awardingBody || '', url: l.url || null,
          completion_date: l.completionDate || new Date()
        });
      }
    }

    if (courses && Array.isArray(courses)) {
      await Course.destroy({ where: { profile_id: profileId } });
      for (var co of courses.filter(function(x) { return x && x.name; })) {
        await Course.create({
          profile_id: profileId, name: co.name,
          provider: co.provider || '', url: co.url || null,
          completion_date: co.completionDate || new Date()
        });
      }
    }

    if (employmentHistory && Array.isArray(employmentHistory)) {
      await Employment.destroy({ where: { profile_id: profileId } });
      for (var e of employmentHistory.filter(function(x) { return x && x.company; })) {
        await Employment.create({
          profile_id: profileId, company: e.company,
          role: e.role || '', start_date: e.startDate || new Date(),
          end_date: e.endDate || null, is_current: e.isCurrent || false
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

module.exports = router;
