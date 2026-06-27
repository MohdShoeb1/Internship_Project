require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const { connectDB } = require('./config/db');
const routes = require('./routes');
const { initSocket } = require('./socket');
const { handleWebhook } = require('./controllers/paymentController');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ── MIDDLEWARE ────────────────────────────────────────
// Stripe webhook needs raw body BEFORE json parser
app.post('/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  handleWebhook
);

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── ROUTES ────────────────────────────────────────────
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

// ── SOCKET.IO ─────────────────────────────────────────
initSocket(io);

// ── START SERVER ──────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 ChatSphere server running on http://localhost:${PORT}`);
    console.log(`📡 Socket.IO ready`);
  });
});

module.exports = { app, io };
