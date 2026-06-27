const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Room = sequelize.define('Room', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    defaultValue: null,
  },
  description: {
    type: DataTypes.TEXT,
    defaultValue: null,
  },
  type: {
    type: DataTypes.ENUM('direct', 'group', 'premium_channel'),
    defaultValue: 'direct',
  },
  avatar: {
    type: DataTypes.STRING,
    defaultValue: null,
  },
  isPremium: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  premiumPrice: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  pinnedMessageId: {
    type: DataTypes.UUID,
    defaultValue: null,
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  maxMembers: {
    type: DataTypes.INTEGER,
    defaultValue: 256,
  },
}, {
  timestamps: true,
});

module.exports = Room;
