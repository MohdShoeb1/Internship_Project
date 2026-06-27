# 💬 ChatSphere — Full Stack Real-Time Chat App

> React + Node.js + Socket.io + MySQL

## 🗂️ Project Structure

```
chatsphere/
├── client/                  ← React Frontend
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.jsx
│   │   ├── index.js
│   │   ├── index.css
│   │   ├── components/
│   │   │   └── Chat/
│   │   │       ├── Sidebar.jsx        ← Contact list, search, rooms
│   │   │       ├── ChatWindow.jsx     ← Messages, input, typing
│   │   │       ├── MessageBubble.jsx  ← Each message with reactions
│   │   │       ├── CallModal.jsx      ← WebRTC voice/video call UI
│   │   │       ├── NewChatModal.jsx   ← Create DM or group chat
│   │   │       └── styles.css         ← All component styles
│   │   ├── context/
│   │   │   ├── AuthContext.jsx        ← Global user/auth state
│   │   │   └── SocketContext.jsx      ← Socket.io connection
│   │   ├── hooks/
│   │   │   └── useWebRTC.js           ← WebRTC call logic
│   │   ├── pages/
│   │   │   ├── AuthPage.jsx           ← Login / Register
│   │   │   └── ChatPage.jsx           ← Main chat layout
│   │   └── utils/
│   │       └── api.js                 ← Axios + all API calls
│   ├── .env
│   └── package.json
│
└── server/                  ← Node.js Backend
    ├── index.js             ← Express + Socket.io entry
    ├── config/
    │   └── db.js            ← MySQL / Sequelize config
    ├── controllers/
    │   ├── authController.js
    │   ├── roomController.js
    │   ├── messageController.js
    │   └── paymentController.js
    ├── middleware/
    │   ├── auth.js          ← JWT protect + socket auth
    │   └── upload.js        ← Multer file upload
    ├── models/
    │   ├── User.js
    │   ├── Room.js
    │   ├── RoomMember.js
    │   ├── Message.js
    │   ├── Subscription.js
    │   └── index.js         ← Associations
    ├── routes/
    │   └── index.js         ← All API routes
    ├── socket/
    │   └── index.js         ← All Socket.io events
    ├── uploads/             ← Uploaded files stored here
    ├── .env
    └── package.json
```

---

## ⚡ Features

| Feature | Status |
|---|---|
| User Register / Login (JWT) | ✅ |
| One-on-One Chat | ✅ |
| Group Chat | ✅ |
| Real-time messaging (Socket.io) | ✅ |
| Typing indicators | ✅ |
| Read receipts (✓✓) | ✅ |
| Online / Away / Busy / Offline status | ✅ |
| File & Image sharing (Multer) | ✅ |
| Emoji reactions | ✅ |
| Message edit & delete | ✅ |
| Reply to message | ✅ |
| Pin message | ✅ |
| Disappearing messages | ✅ |
| Full-text message search | ✅ |
| Voice call (WebRTC) | ✅ |
| Video call (WebRTC) | ✅ |
| E2E Encryption (badge) | ✅ |
| Premium subscription (Stripe) | ✅ |
| Paid group channels (Stripe) | ✅ |
| Team billing (Stripe) | ✅ |
| Mobile responsive | ✅ |

---

## 🚀 Setup & Run

### Step 1 — MySQL Database
```sql
CREATE DATABASE chatsphere;
```

### Step 2 — Server Setup
```bash
cd server
npm install
# Edit .env — set DB_PASSWORD, JWT_SECRET, STRIPE keys
npm run dev
```
Server runs on → http://localhost:5000

### Step 3 — Client Setup
```bash
cd client
npm install
# Edit .env — set REACT_APP_STRIPE_PUBLIC_KEY
npm start
```
Client runs on → http://localhost:3000

---

## 🔑 Environment Variables

### server/.env
```
PORT=5000
CLIENT_URL=http://localhost:3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=chatsphere
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=7d
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
```

### client/.env
```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
REACT_APP_STRIPE_PUBLIC_KEY=pk_test_xxxxx
```

---

## 🛠️ Tech Stack

**Frontend:** React 18, React Router v6, Socket.io-client, SimplePeer (WebRTC), Axios, date-fns, emoji-picker-react, React Toastify

**Backend:** Node.js, Express, Socket.io, Sequelize ORM, MySQL2, JWT, Bcrypt, Multer, Stripe

**Database:** MySQL

---

## 👨‍💻 Author
**Mohd Shoeb** — B.Tech CSE 3rd Year  
Shri Ramswaroop Memorial University, Barabanki  
Roll No: 202410101230016  
Supervisor: Tushar Satija Sir
