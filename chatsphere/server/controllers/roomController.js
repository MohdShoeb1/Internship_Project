const { Op } = require('sequelize');
const { Room, RoomMember, User, Message } = require('../models');
const { v4: uuidv4 } = require('uuid');

// POST /api/rooms/direct  — create or fetch a 1-on-1 chat
const createDirectRoom = async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const myId = req.user.id;

    if (targetUserId === myId)
      return res.status(400).json({ success: false, message: 'Cannot chat with yourself' });

    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser)
      return res.status(404).json({ success: false, message: 'User not found' });

    // Check if direct room already exists between these two users
    const existing = await RoomMember.findAll({ where: { userId: myId } });
    const myRoomIds = existing.map(rm => rm.roomId);

    const directRoom = await Room.findOne({
      where: { id: { [Op.in]: myRoomIds }, type: 'direct' },
      include: [{
        model: RoomMember,
        as: 'roomMembers',
        where: { userId: targetUserId },
      }],
    });

    if (directRoom) {
      return res.json({ success: true, room: directRoom });
    }

    // Create new direct room
    const room = await Room.create({
      type: 'direct',
      createdBy: myId,
    });

    await RoomMember.bulkCreate([
      { roomId: room.id, userId: myId, role: 'admin' },
      { roomId: room.id, userId: targetUserId, role: 'admin' },
    ]);

    res.status(201).json({ success: true, room });
  } catch (error) {
    console.error('createDirectRoom error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/rooms/group — create group chat
const createGroupRoom = async (req, res) => {
  try {
    const { name, description, memberIds, isPremium, premiumPrice } = req.body;
    const myId = req.user.id;

    if (!name) return res.status(400).json({ success: false, message: 'Group name required' });

    const room = await Room.create({
      name,
      description,
      type: isPremium ? 'premium_channel' : 'group',
      isPremium: !!isPremium,
      premiumPrice: isPremium ? premiumPrice : 0,
      createdBy: myId,
      avatar: req.file ? `/uploads/${req.file.filename}` : null,
    });

    const members = [{ roomId: room.id, userId: myId, role: 'admin' }];
    if (memberIds && Array.isArray(memberIds)) {
      for (const uid of memberIds) {
        if (uid !== myId) members.push({ roomId: room.id, userId: uid, role: 'member' });
      }
    }
    await RoomMember.bulkCreate(members);

    res.status(201).json({ success: true, room });
  } catch (error) {
    console.error('createGroupRoom error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/rooms — get all rooms for current user
const getMyRooms = async (req, res) => {
  try {
    const myId = req.user.id;

    const memberships = await RoomMember.findAll({ where: { userId: myId } });
    const roomIds = memberships.map(m => m.roomId);

    const rooms = await Room.findAll({
      where: { id: { [Op.in]: roomIds } },
      include: [
        {
          model: User,
          as: 'members',
          attributes: ['id', 'name', 'username', 'avatar', 'status', 'lastSeen'],
        },
      ],
      order: [['updatedAt', 'DESC']],
    });

    // Attach last message and unread count to each room
    const enriched = await Promise.all(
      rooms.map(async (room) => {
        const lastMsg = await Message.findOne({
          where: { roomId: room.id, isDeleted: false },
          order: [['createdAt', 'DESC']],
          include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'avatar'] }],
        });

        const membership = memberships.find(m => m.roomId === room.id);
        const unreadCount = await Message.count({
          where: {
            roomId: room.id,
            createdAt: { [Op.gt]: membership?.lastReadAt || new Date(0) },
            senderId: { [Op.ne]: myId },
            isDeleted: false,
          },
        });

        return { ...room.toJSON(), lastMessage: lastMsg, unreadCount };
      })
    );

    res.json({ success: true, rooms: enriched });
  } catch (error) {
    console.error('getMyRooms error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/rooms/:roomId — get single room details
const getRoom = async (req, res) => {
  try {
    const room = await Room.findByPk(req.params.roomId, {
      include: [
        {
          model: User,
          as: 'members',
          attributes: ['id', 'name', 'username', 'avatar', 'status', 'lastSeen', 'bio'],
        },
      ],
    });

    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

    // Check membership
    const member = await RoomMember.findOne({
      where: { roomId: room.id, userId: req.user.id },
    });
    if (!member) return res.status(403).json({ success: false, message: 'Not a member' });

    res.json({ success: true, room });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/rooms/:roomId/members — add member to group
const addMember = async (req, res) => {
  try {
    const { userId } = req.body;
    const { roomId } = req.params;

    const adminCheck = await RoomMember.findOne({
      where: { roomId, userId: req.user.id, role: 'admin' },
    });
    if (!adminCheck) return res.status(403).json({ success: false, message: 'Admin only' });

    await RoomMember.findOrCreate({
      where: { roomId, userId },
      defaults: { roomId, userId, role: 'member' },
    });

    res.json({ success: true, message: 'Member added' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/rooms/:roomId/leave
const leaveRoom = async (req, res) => {
  try {
    await RoomMember.destroy({
      where: { roomId: req.params.roomId, userId: req.user.id },
    });
    res.json({ success: true, message: 'Left room' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/rooms/search/users — search users to start chat
const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ success: true, users: [] });

    const users = await User.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: `%${q}%` } },
          { username: { [Op.like]: `%${q}%` } },
          { email: { [Op.like]: `%${q}%` } },
        ],
        id: { [Op.ne]: req.user.id },
      },
      attributes: ['id', 'name', 'username', 'avatar', 'status', 'bio'],
      limit: 20,
    });

    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  createDirectRoom,
  createGroupRoom,
  getMyRooms,
  getRoom,
  addMember,
  leaveRoom,
  searchUsers,
};
