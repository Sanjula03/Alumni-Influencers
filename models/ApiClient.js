// ApiClient model - manages bearer tokens for external api consumers
const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const ApiClient = sequelize.define('ApiClient', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  client_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  token_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  is_revoked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  last_used_at: {
    type: DataTypes.DATE,
    defaultValue: null
  }
}, {
  tableName: 'api_clients',
  indexes: [
    { fields: ['token_hash'], unique: true },
    { fields: ['created_by'] }
  ]
});

// separate table to log api usage (normalised)
const ApiUsageLog = sequelize.define('ApiUsageLog', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  client_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'api_clients', key: 'id' }
  },
  endpoint: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  method: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  ip_address: {
    type: DataTypes.STRING(45),
    defaultValue: null
  }
}, {
  tableName: 'api_usage_logs',
  indexes: [
    { fields: ['client_id'] }
  ]
});

ApiClient.hasMany(ApiUsageLog, { foreignKey: 'client_id', as: 'usageLogs', onDelete: 'CASCADE' });
ApiUsageLog.belongsTo(ApiClient, { foreignKey: 'client_id' });

module.exports = { ApiClient, ApiUsageLog };
