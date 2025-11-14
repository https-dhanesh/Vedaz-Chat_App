import React, { createContext, useState, useContext, useEffect } from 'react';
import { getSocket } from '../services/socket';

const OnlineUsersContext = createContext();

export const useOnlineUsers = () => {
  const context = useContext(OnlineUsersContext);
  if (!context) {
    throw new Error('useOnlineUsers must be used within an OnlineUsersProvider');
  }
  return context;
};

export const OnlineUsersProvider = ({ children }) => {
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    const setupSocketListeners = () => {
      const socket = getSocket();
      
      if (!socket) {
        console.log('No socket available, will retry...');
        setTimeout(setupSocketListeners, 1000);
        return;
      }

      console.log('Socket found, setting up global listeners');

      // Listen for user status updates
      const handleUserStatus = (data) => {
        console.log('GLOBAL Context received user_status:', data);
        
        setOnlineUsers(prev => {
          let newOnlineUsers;
          
          if (data.isOnline) {
            // Add user if not already in the array
            newOnlineUsers = prev.includes(data.userId) 
              ? prev 
              : [...prev, data.userId];
            console.log('GLOBAL: Added user to online:', data.userId);
          } else {
            // Remove user from array
            newOnlineUsers = prev.filter(id => id !== data.userId);
            console.log('GLOBAL: Removed user from online:', data.userId);
          }
          
          console.log('GLOBAL: Online users now:', newOnlineUsers);
          return newOnlineUsers;
        });
      };

      // Listen for current online users when first connecting
      const handleCurrentOnlineUsers = (userIds) => {
        console.log('Received current online users from server:', userIds);
        setOnlineUsers(userIds);
      };

      // Remove any existing listeners to avoid duplicates
      socket.off('user_status', handleUserStatus);
      socket.off('current_online_users', handleCurrentOnlineUsers);
      
      // Add the listeners
      socket.on('user_status', handleUserStatus);
      socket.on('current_online_users', handleCurrentOnlineUsers);

      console.log('Global socket listeners setup complete');
    };
    setupSocketListeners();
  }, []);

  const isUserOnline = (userId) => {
    return onlineUsers.includes(userId);
  };

  const value = {
    onlineUsers,
    isUserOnline,
    setOnlineUsers
  };

  return (
    <OnlineUsersContext.Provider value={value}>
      {children}
    </OnlineUsersContext.Provider>
  );
};