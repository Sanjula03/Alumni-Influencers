// FeaturedAlumni model - records daily winners
const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const FeaturedAlumni = sequelize.define('FeaturedAlumni', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  bid_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'bids', key: 'id' }
  },
  featured_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    unique: true
  },
  winning_bid_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  }
}, {
  tableName: 'featured_alumni',
  indexes: [
    { fields: ['user_id', 'featured_date'] },
    { fields: ['featured_date'], unique: true }
  ]
});

module.exports = FeaturedAlumni;
