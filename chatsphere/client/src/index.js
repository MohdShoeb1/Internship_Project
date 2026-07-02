// MUST be first line — polyfill process before any import
if (typeof window !== 'undefined' && typeof window.process === 'undefined') {
  window.process = {
    env: { NODE_ENV: 'development' },
    browser: true,
    version: 'v16.0.0',
    versions: {},
    nextTick: function(fn) { Promise.resolve().then(fn); },
    argv: [],
    platform: 'browser',
    hrtime: function() { return [0, 0]; }
  };
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
