const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

// ── AUTH ROUTES ──────────────────────────────────────
const { register, login, getMe, updateProfile, changePassword, logout } = require('../controllers/authController');

router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/me', protect, getMe);
router.put('/auth/profile', protect, upload.single('avatar'), updateProfile);
router.put('/auth/change-password', protect, changePassword);
router.post('/auth/logout', protect, logout);

// ── ROOM ROUTES ───────────────────────────────────────
const { createDirectRoom, createGroupRoom, getMyRooms, getRoom, addMember, leaveRoom, searchUsers } = require('../controllers/roomController');

router.post('/rooms/direct', protect, createDirectRoom);
router.post('/rooms/group', protect, upload.single('avatar'), createGroupRoom);
router.get('/rooms', protect, getMyRooms);
router.get('/rooms/search/users', protect, searchUsers);
router.get('/rooms/:roomId', protect, getRoom);
router.post('/rooms/:roomId/members', protect, addMember);
router.delete('/rooms/:roomId/leave', protect, leaveRoom);

// ── MESSAGE ROUTES ────────────────────────────────────
const { getMessages, sendMessage, reactToMessage, editMessage, deleteMessage, pinMessage, searchMessages } = require('../controllers/messageController');

router.get('/messages/:roomId', protect, getMessages);
router.post('/messages/:roomId', protect, upload.single('file'), sendMessage);
router.get('/messages/:roomId/search', protect, searchMessages);
router.put('/messages/:messageId', protect, editMessage);
router.delete('/messages/:messageId', protect, deleteMessage);
router.put('/messages/:messageId/react', protect, reactToMessage);
router.put('/messages/:messageId/pin', protect, pinMessage);

// ── PAYMENT ROUTES ────────────────────────────────────
const { createPremiumCheckout, joinPremiumChannel, createTeamBilling, getMySubscriptions } = require('../controllers/paymentController');

router.post('/payments/premium', protect, createPremiumCheckout);
router.post('/payments/channel/:roomId', protect, joinPremiumChannel);
router.post('/payments/team', protect, createTeamBilling);
router.get('/payments/subscriptions', protect, getMySubscriptions);

module.exports = router;
