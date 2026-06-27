const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const RoomMember = sequelize.define('RoomMember', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  roomId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('admin', 'moderator', 'member'),
    defaultValue: 'member',
  },
  lastReadAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  isMuted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  timestamps: true,
});

module.exports = RoomMember;
