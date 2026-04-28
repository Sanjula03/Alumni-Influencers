// models/SponsorshipOffer.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const SponsorshipOffer = sequelize.define('SponsorshipOffer', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  sponsor_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  alumnus_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  credential_type: {
    type: DataTypes.ENUM('certification', 'licence', 'course'),
    allowNull: false
  },
  credential_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: { min: 1 }
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'won', 'expired'),
    defaultValue: 'pending'
  },
  message: {
    type: DataTypes.TEXT,
    defaultValue: null
  }
}, {
  tableName: 'sponsorship_offers'
});

module.exports = SponsorshipOffer;
