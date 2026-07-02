import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css'
import App from './App.jsx'
import api from './api';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '859696768801-v22lsodpdclfkb03m5kljtd71ps018ok.apps.googleusercontent.com';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={clientId}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)
window.addEventListener("error", (e) => console.error("Global Error:", e.error));
