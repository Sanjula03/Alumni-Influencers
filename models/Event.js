// Event model - tracks university events and attendees
// alumni who attend events get an extra featured slot per month
const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const Event = sequelize.define('Event', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    defaultValue: null
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  }
}, {
  tableName: 'events',
  indexes: [{ fields: ['date'] }]
});

// junction table for many-to-many (events <-> users)
const EventAttendee = sequelize.define('EventAttendee', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  event_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'events', key: 'id' }
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  }
}, {
  tableName: 'event_attendees',
  indexes: [
    { fields: ['event_id', 'user_id'], unique: true }
  ]
});

Event.belongsToMany(require('./User'), { through: EventAttendee, foreignKey: 'event_id', as: 'attendees' });
require('./User').belongsToMany(Event, { through: EventAttendee, foreignKey: 'user_id', as: 'events' });

module.exports = { Event, EventAttendee };
