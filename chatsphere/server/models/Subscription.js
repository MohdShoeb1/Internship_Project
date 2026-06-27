const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Subscription = sequelize.define('Subscription', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('premium_personal', 'team_billing', 'channel_access'),
    allowNull: false,
  },
  stripeSubscriptionId: {
    type: DataTypes.STRING,
    defaultValue: null,
  },
  stripePaymentIntentId: {
    type: DataTypes.STRING,
    defaultValue: null,
  },
  roomId: {
    type: DataTypes.UUID,
    defaultValue: null, // for channel_access
  },
  status: {
    type: DataTypes.ENUM('active', 'cancelled', 'past_due', 'trialing'),
    defaultValue: 'active',
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  currency: {
    type: DataTypes.STRING(10),
    defaultValue: 'usd',
  },
  currentPeriodStart: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  currentPeriodEnd: {
    type: DataTypes.DATE,
    defaultValue: null,
  },
}, {
  timestamps: true,
});

module.exports = Subscription;
