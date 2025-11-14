import io from 'socket.io-client';

// Global socket instance
let socket = null;

export const initializeSocket = (userToken, userId) => {
  console.log('Initializing socket with userId:', userId);
  
  // Always disconnect existing socket first
  if (socket) {
    console.log('Disconnecting existing socket');
    socket.disconnect();
    socket = null;
  }

  // USE YOUR ACTUAL IP ADDRESS HERE
  const SOCKET_URL = 'http://192.168.1.2:5000'; // Replace XX with your IP

  socket = io(SOCKET_URL, {
    auth: {
      token: userToken
    },
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  // Emit user_online event when connected
  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
    if (userId) {
      console.log('Emitting user_online for:', userId);
      socket.emit('user_online', userId);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.log('Socket connection error:', error.message);
  });

  return socket;
};

export const getSocket = () => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    console.log('Disconnecting socket...');
    socket.disconnect();
    socket = null;
  }
};