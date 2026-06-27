const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  roomId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  senderId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('text', 'image', 'file', 'audio', 'video', 'system'),
    defaultValue: 'text',
  },
  content: {
    type: DataTypes.TEXT,
    defaultValue: null,
  },
  // Encrypted content (for E2E)
  encryptedContent: {
    type: DataTypes.TEXT,
    defaultValue: null,
  },
  fileUrl: {
    type: DataTypes.STRING,
    defaultValue: null,
  },
  fileName: {
    type: DataTypes.STRING,
    defaultValue: null,
  },
  fileSize: {
    type: DataTypes.BIGINT,
    defaultValue: null,
  },
  fileMimeType: {
    type: DataTypes.STRING,
    defaultValue: null,
  },
  replyToId: {
    type: DataTypes.UUID,
    defaultValue: null,
  },
  reactions: {
    type: DataTypes.JSON,
    defaultValue: {},
  },
  readBy: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  isPinned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isEdited: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  deletedAt: {
    type: DataTypes.DATE,
    defaultValue: null,
  },
  disappearsAt: {
    type: DataTypes.DATE,
    defaultValue: null,
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  timestamps: true,
});

module.exports = Message;
