import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import './Auth.css';

export default function AuthPage() {
  const [mode, setMode]     = useState('login'); // login | register
  const [loading, setLoading] = useState(false);
  const [form, setForm]     = useState({ name: '', username: '', email: '', password: '' });
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const onChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        if (!form.name || !form.username || !form.email || !form.password)
          return toast.error('All fields required');
        if (form.password.length < 6)
          return toast.error('Password must be at least 6 characters');
        await register(form);
      }
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">C</div>
          <h1>ChatSphere</h1>
          <p>Real-time messaging, reimagined</p>
        </div>

        <div className="auth-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Sign In</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Sign Up</button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <>
              <div className="field">
                <label>Full Name</label>
                <input name="name" type="text" placeholder="Mohd Shoeb" value={form.name} onChange={onChange} required />
              </div>
              <div className="field">
                <label>Username</label>
                <input name="username" type="text" placeholder="mohdshoeb" value={form.username} onChange={onChange} required />
              </div>
            </>
          )}
          <div className="field">
            <label>Email</label>
            <input name="email" type="email" placeholder="you@example.com" value={form.email} onChange={onChange} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input name="password" type="password" placeholder="••••••••" value={form.password} onChange={onChange} required />
          </div>
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <span onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Sign Up' : 'Sign In'}
          </span>
        </p>
      </div>
    </div>
  );
}
