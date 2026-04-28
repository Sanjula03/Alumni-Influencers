// Profile model - stores alumni personal and professional details
// separated from User for 3NF normalisation
const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const Profile = sequelize.define('Profile', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: { model: 'users', key: 'id' }
  },
  first_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: { notEmpty: { msg: 'First name is required' } }
  },
  last_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: { notEmpty: { msg: 'Last name is required' } }
  },
  biography: {
    type: DataTypes.TEXT,
    defaultValue: null
  },
  linkedin_url: {
    type: DataTypes.STRING(500),
    defaultValue: null
  },
  profile_image: {
    type: DataTypes.STRING(500),
    defaultValue: null
  },
  programme: {
    type: DataTypes.STRING(255),
    defaultValue: null
  },
  graduation_year: {
    type: DataTypes.INTEGER,
    defaultValue: null
  }
}, {
  tableName: 'profiles',
  indexes: [{ fields: ['user_id'], unique: true }, { fields: ['programme'] }, { fields: ['graduation_year'] }]
});

// ---- normalised sub tables (3NF) ----

// degrees table
const Degree = sequelize.define('Degree', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  profile_id: {
    type: DataTypes.INTEGER, allowNull: false,
    references: { model: 'profiles', key: 'id' }
  },
  name: { type: DataTypes.STRING(255), allowNull: false },
  institution: { type: DataTypes.STRING(255), allowNull: false },
  url: { type: DataTypes.STRING(500), defaultValue: null },
  completion_date: { type: DataTypes.DATEONLY, allowNull: false }
}, { tableName: 'degrees' });

// professional certifications
const Certification = sequelize.define('Certification', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  profile_id: {
    type: DataTypes.INTEGER, allowNull: false,
    references: { model: 'profiles', key: 'id' }
  },
  name: { type: DataTypes.STRING(255), allowNull: false },
  issuing_body: { type: DataTypes.STRING(255), allowNull: false },
  url: { type: DataTypes.STRING(500), defaultValue: null },
  completion_date: { type: DataTypes.DATEONLY, allowNull: false },
  sponsor_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 }
}, { tableName: 'certifications' });

// professional licences
const Licence = sequelize.define('Licence', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  profile_id: {
    type: DataTypes.INTEGER, allowNull: false,
    references: { model: 'profiles', key: 'id' }
  },
  name: { type: DataTypes.STRING(255), allowNull: false },
  awarding_body: { type: DataTypes.STRING(255), allowNull: false },
  url: { type: DataTypes.STRING(500), defaultValue: null },
  completion_date: { type: DataTypes.DATEONLY, allowNull: false },
  sponsor_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 }
}, { tableName: 'licences' });

// short courses
const Course = sequelize.define('Course', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  profile_id: {
    type: DataTypes.INTEGER, allowNull: false,
    references: { model: 'profiles', key: 'id' }
  },
  name: { type: DataTypes.STRING(255), allowNull: false },
  provider: { type: DataTypes.STRING(255), allowNull: false },
  url: { type: DataTypes.STRING(500), defaultValue: null },
  completion_date: { type: DataTypes.DATEONLY, allowNull: false },
  sponsor_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 }
}, { tableName: 'courses' });

// employment history
const Employment = sequelize.define('Employment', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  profile_id: {
    type: DataTypes.INTEGER, allowNull: false,
    references: { model: 'profiles', key: 'id' }
  },
  company: { type: DataTypes.STRING(255), allowNull: false },
  role: { type: DataTypes.STRING(255), allowNull: false },
  industry_sector: { type: DataTypes.STRING(100), defaultValue: null },
  location: { type: DataTypes.STRING(255), defaultValue: null },
  start_date: { type: DataTypes.DATEONLY, allowNull: false },
  end_date: { type: DataTypes.DATEONLY, defaultValue: null },
  is_current: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { 
  tableName: 'employment_history',
  indexes: [{ fields: ['industry_sector'] }]
});

// set up relationships
Profile.hasMany(Degree, { foreignKey: 'profile_id', as: 'degrees', onDelete: 'CASCADE' });
Profile.hasMany(Certification, { foreignKey: 'profile_id', as: 'certifications', onDelete: 'CASCADE' });
Profile.hasMany(Licence, { foreignKey: 'profile_id', as: 'licences', onDelete: 'CASCADE' });
Profile.hasMany(Course, { foreignKey: 'profile_id', as: 'courses', onDelete: 'CASCADE' });
Profile.hasMany(Employment, { foreignKey: 'profile_id', as: 'employmentHistory', onDelete: 'CASCADE' });

Degree.belongsTo(Profile, { foreignKey: 'profile_id' });
Certification.belongsTo(Profile, { foreignKey: 'profile_id' });
Licence.belongsTo(Profile, { foreignKey: 'profile_id' });
Course.belongsTo(Profile, { foreignKey: 'profile_id' });
Employment.belongsTo(Profile, { foreignKey: 'profile_id' });

module.exports = { Profile, Degree, Certification, Licence, Course, Employment };
