import { io } from 'socket.io-client';

let socket = null;

export const socketService = {
  connect: () => {
    if (!socket) {
      const token = sessionStorage.getItem('access');
      const url = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      
      socket = io(url, {
        auth: { token }
      });

      socket.on('connect', () => {
        console.log('Socket connected:', socket.id);
      });

      socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message);
      });
    }
    return socket;
  },

  disconnect: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  getSocket: () => socket
};
