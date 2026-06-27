const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  avatar: {
    type: DataTypes.STRING,
    defaultValue: null,
  },
  bio: {
    type: DataTypes.TEXT,
    defaultValue: null,
  },
  status: {
    type: DataTypes.ENUM('online', 'away', 'busy', 'offline'),
    defaultValue: 'offline',
  },
  lastSeen: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  isPremium: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  storageUsed: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
  },
  storageLimit: {
    type: DataTypes.BIGINT,
    defaultValue: 104857600, // 100 MB default
  },
  stripeCustomerId: {
    type: DataTypes.STRING,
    defaultValue: null,
  },
  socketId: {
    type: DataTypes.STRING,
    defaultValue: null,
  },
}, {
  timestamps: true,
});

module.exports = User;
