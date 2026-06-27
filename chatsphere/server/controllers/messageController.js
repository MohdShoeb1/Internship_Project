const { Op } = require('sequelize');
const { Message, User, Room, RoomMember } = require('../models');

// GET /api/messages/:roomId
const getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // Verify membership
    const member = await RoomMember.findOne({ where: { roomId, userId: req.user.id } });
    if (!member) return res.status(403).json({ success: false, message: 'Not a member' });

    const { count, rows } = await Message.findAndCountAll({
      where: { roomId, isDeleted: false },
      include: [
        { model: User, as: 'sender', attributes: ['id', 'name', 'username', 'avatar'] },
        {
          model: Message, as: 'replyTo',
          include: [{ model: User, as: 'sender', attributes: ['id', 'name'] }],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Mark room as read
    await member.update({ lastReadAt: new Date() });

    res.json({
      success: true,
      messages: rows.reverse(),
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / limit),
    });
  } catch (error) {
    console.error('getMessages error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/messages/:roomId  — send with file upload
const sendMessage = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content, type = 'text', replyToId, disappearsIn } = req.body;

    const member = await RoomMember.findOne({ where: { roomId, userId: req.user.id } });
    if (!member) return res.status(403).json({ success: false, message: 'Not a member' });

    let disappearsAt = null;
    if (disappearsIn) {
      disappearsAt = new Date(Date.now() + parseInt(disappearsIn) * 1000);
    }

    const msgData = {
      roomId,
      senderId: req.user.id,
      type,
      content: content || null,
      replyToId: replyToId || null,
      disappearsAt,
      readBy: [req.user.id],
    };

    if (req.file) {
      msgData.type = req.file.mimetype.startsWith('image') ? 'image'
        : req.file.mimetype.startsWith('video') ? 'video'
        : req.file.mimetype.startsWith('audio') ? 'audio' : 'file';
      msgData.fileUrl = `/uploads/${req.file.filename}`;
      msgData.fileName = req.file.originalname;
      msgData.fileSize = req.file.size;
      msgData.fileMimeType = req.file.mimetype;
    }

    const message = await Message.create(msgData);

    const full = await Message.findByPk(message.id, {
      include: [
        { model: User, as: 'sender', attributes: ['id', 'name', 'username', 'avatar'] },
        {
          model: Message, as: 'replyTo',
          include: [{ model: User, as: 'sender', attributes: ['id', 'name'] }],
        },
      ],
    });

    // Update room's updatedAt so it bubbles to top
    await Room.update({ updatedAt: new Date() }, { where: { id: roomId } });

    res.status(201).json({ success: true, message: full });
  } catch (error) {
    console.error('sendMessage error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/messages/:messageId/react
const reactToMessage = async (req, res) => {
  try {
    const { emoji } = req.body;
    const message = await Message.findByPk(req.params.messageId);
    if (!message) return res.status(404).json({ success: false, message: 'Message not found' });

    const reactions = message.reactions || {};
    if (!reactions[emoji]) reactions[emoji] = [];

    const userId = req.user.id;
    const idx = reactions[emoji].indexOf(userId);
    if (idx > -1) {
      reactions[emoji].splice(idx, 1); // toggle off
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji].push(userId); // toggle on
    }

    await message.update({ reactions });
    res.json({ success: true, reactions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/messages/:messageId  — edit message
const editMessage = async (req, res) => {
  try {
    const message = await Message.findByPk(req.params.messageId);
    if (!message) return res.status(404).json({ success: false, message: 'Message not found' });
    if (message.senderId !== req.user.id)
      return res.status(403).json({ success: false, message: 'Not your message' });

    await message.update({ content: req.body.content, isEdited: true });
    res.json({ success: true, message });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/messages/:messageId
const deleteMessage = async (req, res) => {
  try {
    const message = await Message.findByPk(req.params.messageId);
    if (!message) return res.status(404).json({ success: false, message: 'Message not found' });
    if (message.senderId !== req.user.id)
      return res.status(403).json({ success: false, message: 'Not your message' });

    await message.update({ isDeleted: true, content: 'This message was deleted' });
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/messages/:messageId/pin
const pinMessage = async (req, res) => {
  try {
    const message = await Message.findByPk(req.params.messageId);
    if (!message) return res.status(404).json({ success: false, message: 'Not found' });

    await message.update({ isPinned: !message.isPinned });
    if (message.isPinned) {
      await Room.update({ pinnedMessageId: message.id }, { where: { id: message.roomId } });
    }
    res.json({ success: true, isPinned: message.isPinned });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/messages/:roomId/search
const searchMessages = async (req, res) => {
  try {
    const { q } = req.query;
    const { roomId } = req.params;
    if (!q) return res.json({ success: true, messages: [] });

    const member = await RoomMember.findOne({ where: { roomId, userId: req.user.id } });
    if (!member) return res.status(403).json({ success: false, message: 'Not a member' });

    const messages = await Message.findAll({
      where: {
        roomId,
        content: { [Op.like]: `%${q}%` },
        isDeleted: false,
      },
      include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'avatar'] }],
      order: [['createdAt', 'DESC']],
      limit: 30,
    });

    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getMessages, sendMessage, reactToMessage, editMessage, deleteMessage, pinMessage, searchMessages };
