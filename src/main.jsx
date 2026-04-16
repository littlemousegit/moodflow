import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { FriendsProvider } from './contexts/FriendsContext';
import { ReactionsProvider } from './contexts/ReactionsContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <FriendsProvider>
        <ReactionsProvider>
          <App />
        </ReactionsProvider>
      </FriendsProvider>
    </AuthProvider>
  </React.StrictMode>
);