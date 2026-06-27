const { User, Room, RoomMember, Message } = require('../models');
const { socketAuth } = require('../middleware/auth');

// Track online users: userId -> socketId
const onlineUsers = new Map();

const initSocket = (io) => {
  // Auth middleware for every socket connection
  io.use(socketAuth);

  io.on('connection', async (socket) => {
    const user = socket.user;
    console.log(`🔌 Connected: ${user.name} (${socket.id})`);

    // ── ONLINE STATUS ─────────────────────────────────
    onlineUsers.set(user.id, socket.id);
    await User.update({ status: 'online', socketId: socket.id, lastSeen: new Date() }, { where: { id: user.id } });

    // Join all rooms this user belongs to
    const memberships = await RoomMember.findAll({ where: { userId: user.id } });
    for (const m of memberships) {
      socket.join(m.roomId);
    }

    // Broadcast online status to all contacts
    socket.broadcast.emit('user:status', { userId: user.id, status: 'online' });

    // ── JOIN ROOM ─────────────────────────────────────
    socket.on('room:join', async ({ roomId }) => {
      const member = await RoomMember.findOne({ where: { roomId, userId: user.id } });
      if (!member) return socket.emit('error', { message: 'Not a member of this room' });
      socket.join(roomId);
      socket.emit('room:joined', { roomId });
    });

    // ── SEND MESSAGE ──────────────────────────────────
    socket.on('message:send', async (data) => {
      try {
        const { roomId, content, type = 'text', replyToId, disappearsIn } = data;

        const member = await RoomMember.findOne({ where: { roomId, userId: user.id } });
        if (!member) return socket.emit('error', { message: 'Not a member' });

        let disappearsAt = null;
        if (disappearsIn) disappearsAt = new Date(Date.now() + disappearsIn * 1000);

        const message = await Message.create({
          roomId,
          senderId: user.id,
          type,
          content,
          replyToId: replyToId || null,
          disappearsAt,
          readBy: [user.id],
        });

        const full = await Message.findByPk(message.id, {
          include: [
            { model: User, as: 'sender', attributes: ['id', 'name', 'username', 'avatar'] },
            {
              model: Message, as: 'replyTo',
              include: [{ model: User, as: 'sender', attributes: ['id', 'name'] }],
            },
          ],
        });

        // Emit to all room members including sender
        io.to(roomId).emit('message:new', full);

        // Update room's updatedAt
        await Room.update({ updatedAt: new Date() }, { where: { id: roomId } });

        // Schedule disappearing message deletion
        if (disappearsAt) {
          const delay = disappearsAt.getTime() - Date.now();
          setTimeout(async () => {
            await message.update({ isDeleted: true, content: 'This message has disappeared' });
            io.to(roomId).emit('message:deleted', { messageId: message.id, roomId });
          }, delay);
        }

        // Push notification to offline users
        const roomMembers = await RoomMember.findAll({ where: { roomId } });
        for (const rm of roomMembers) {
          if (rm.userId !== user.id && !onlineUsers.has(rm.userId) && !rm.isMuted) {
            // In production: send FCM/APNs push here
            console.log(`📱 Push notification → user ${rm.userId}`);
          }
        }

      } catch (err) {
        console.error('message:send error:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ── TYPING INDICATOR ──────────────────────────────
    socket.on('typing:start', ({ roomId }) => {
      socket.to(roomId).emit('typing:start', {
        roomId,
        userId: user.id,
        name: user.name,
        avatar: user.avatar,
      });
    });

    socket.on('typing:stop', ({ roomId }) => {
      socket.to(roomId).emit('typing:stop', { roomId, userId: user.id });
    });

    // ── READ RECEIPTS ─────────────────────────────────
    socket.on('message:read', async ({ roomId, messageId }) => {
      try {
        await RoomMember.update({ lastReadAt: new Date() }, { where: { roomId, userId: user.id } });

        if (messageId) {
          const msg = await Message.findByPk(messageId);
          if (msg) {
            const readBy = msg.readBy || [];
            if (!readBy.includes(user.id)) {
              readBy.push(user.id);
              await msg.update({ readBy });
            }
          }
        }

        socket.to(roomId).emit('message:read', { roomId, userId: user.id, messageId });
      } catch (err) {
        console.error('message:read error:', err);
      }
    });

    // ── REACT TO MESSAGE ──────────────────────────────
    socket.on('message:react', async ({ messageId, emoji }) => {
      try {
        const message = await Message.findByPk(messageId);
        if (!message) return;

        const reactions = message.reactions || {};
        if (!reactions[emoji]) reactions[emoji] = [];
        const idx = reactions[emoji].indexOf(user.id);
        if (idx > -1) {
          reactions[emoji].splice(idx, 1);
          if (reactions[emoji].length === 0) delete reactions[emoji];
        } else {
          reactions[emoji].push(user.id);
        }

        await message.update({ reactions });
        io.to(message.roomId).emit('message:reacted', { messageId, reactions, roomId: message.roomId });
      } catch (err) {
        console.error('react error:', err);
      }
    });

    // ── EDIT MESSAGE ──────────────────────────────────
    socket.on('message:edit', async ({ messageId, content }) => {
      try {
        const message = await Message.findByPk(messageId);
        if (!message || message.senderId !== user.id) return;
        await message.update({ content, isEdited: true });
        io.to(message.roomId).emit('message:edited', { messageId, content, roomId: message.roomId });
      } catch (err) {
        console.error('edit error:', err);
      }
    });

    // ── DELETE MESSAGE ────────────────────────────────
    socket.on('message:delete', async ({ messageId }) => {
      try {
        const message = await Message.findByPk(messageId);
        if (!message || message.senderId !== user.id) return;
        await message.update({ isDeleted: true, content: 'This message was deleted' });
        io.to(message.roomId).emit('message:deleted', { messageId, roomId: message.roomId });
      } catch (err) {
        console.error('delete error:', err);
      }
    });

    // ── PIN MESSAGE ───────────────────────────────────
    socket.on('message:pin', async ({ messageId }) => {
      try {
        const message = await Message.findByPk(messageId);
        if (!message) return;
        await message.update({ isPinned: true });
        await Room.update({ pinnedMessageId: messageId }, { where: { id: message.roomId } });
        io.to(message.roomId).emit('message:pinned', { messageId, roomId: message.roomId, content: message.content });
      } catch (err) {
        console.error('pin error:', err);
      }
    });

    // ── WEBRTC SIGNALING ──────────────────────────────
    socket.on('call:initiate', async ({ targetUserId, roomId, offer, callType }) => {
      const targetSocketId = onlineUsers.get(targetUserId);
      if (!targetSocketId) {
        return socket.emit('call:user_offline', { targetUserId });
      }
      io.to(targetSocketId).emit('call:incoming', {
        from: { id: user.id, name: user.name, avatar: user.avatar },
        offer,
        callType,
        roomId,
      });
    });

    socket.on('call:answer', ({ targetUserId, answer }) => {
      const targetSocketId = onlineUsers.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('call:answered', { answer, from: user.id });
      }
    });

    socket.on('call:ice-candidate', ({ targetUserId, candidate }) => {
      const targetSocketId = onlineUsers.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('call:ice-candidate', { candidate, from: user.id });
      }
    });

    socket.on('call:reject', ({ targetUserId }) => {
      const targetSocketId = onlineUsers.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('call:rejected', { by: user.id });
      }
    });

    socket.on('call:end', ({ targetUserId }) => {
      const targetSocketId = onlineUsers.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('call:ended', { by: user.id });
      }
    });

    // ── STATUS CHANGE ─────────────────────────────────
    socket.on('status:change', async ({ status }) => {
      const allowed = ['online', 'away', 'busy'];
      if (!allowed.includes(status)) return;
      await User.update({ status }, { where: { id: user.id } });
      socket.broadcast.emit('user:status', { userId: user.id, status });
    });

    // ── DISCONNECT ────────────────────────────────────
    socket.on('disconnect', async () => {
      console.log(`❌ Disconnected: ${user.name}`);
      onlineUsers.delete(user.id);
      await User.update(
        { status: 'offline', socketId: null, lastSeen: new Date() },
        { where: { id: user.id } }
      );
      socket.broadcast.emit('user:status', {
        userId: user.id,
        status: 'offline',
        lastSeen: new Date(),
      });
    });
  });
};

module.exports = { initSocket, onlineUsers };
