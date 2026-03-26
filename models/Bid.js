// Bid model - tracks daily blind bids from alumni
const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const Bid = sequelize.define('Bid', {
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
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: { args: [0.01], msg: 'Bid amount must be greater than zero' }
    }
  },
  bid_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'won', 'lost'),
    defaultValue: 'pending'
  }
}, {
  tableName: 'bids',
  indexes: [
    { fields: ['user_id', 'bid_date'], unique: true }, // one bid per user per day
    { fields: ['bid_date', 'status'] },
    { fields: ['bid_date', 'amount'] }
  ]
});

module.exports = Bid;
