import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cs_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('cs_token');
      localStorage.removeItem('cs_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── AUTH ──────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login:    (data) => api.post('/auth/login', data),
  getMe:    ()     => api.get('/auth/me'),
  logout:   ()     => api.post('/auth/logout'),
  updateProfile: (data) => api.put('/auth/profile', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// ── ROOMS ─────────────────────────────────────────────
export const roomAPI = {
  getMyRooms:      ()             => api.get('/rooms'),
  getRoom:         (id)           => api.get(`/rooms/${id}`),
  createDirect:    (targetUserId) => api.post('/rooms/direct', { targetUserId }),
  createGroup:     (data)         => api.post('/rooms/group', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  searchUsers:     (q)            => api.get(`/rooms/search/users?q=${q}`),
  addMember:       (roomId, userId) => api.post(`/rooms/${roomId}/members`, { userId }),
  leaveRoom:       (roomId)       => api.delete(`/rooms/${roomId}/leave`),
};

// ── MESSAGES ──────────────────────────────────────────
export const messageAPI = {
  getMessages:  (roomId, page = 1) => api.get(`/messages/${roomId}?page=${page}&limit=50`),
  sendMessage:  (roomId, data)     => api.post(`/messages/${roomId}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  searchMessages: (roomId, q)    => api.get(`/messages/${roomId}/search?q=${q}`),
  editMessage:  (id, content)    => api.put(`/messages/${id}`, { content }),
  deleteMessage:(id)             => api.delete(`/messages/${id}`),
  reactToMsg:   (id, emoji)      => api.put(`/messages/${id}/react`, { emoji }),
  pinMessage:   (id)             => api.put(`/messages/${id}/pin`),
};

// ── PAYMENTS ──────────────────────────────────────────
export const paymentAPI = {
  getPremiumCheckout: ()          => api.post('/payments/premium'),
  joinChannel:  (roomId)          => api.post(`/payments/channel/${roomId}`),
  teamBilling:  (seats)           => api.post('/payments/team', { seats }),
  getSubscriptions: ()            => api.get('/payments/subscriptions'),
};

export default api;
