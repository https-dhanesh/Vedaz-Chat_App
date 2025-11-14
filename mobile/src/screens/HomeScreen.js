import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useOnlineUsers } from '../context/OnlineUsersContext';
import api from '../services/api';
import { getSocket } from '../services/socket';

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { onlineUsers, isUserOnline } = useOnlineUsers();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socketStatus, setSocketStatus] = useState('Disconnected');
  const [forceUpdate, setForceUpdate] = useState(0); 

  useEffect(() => {
    fetchUsers();
    setupSocketStatusListener();
    
    console.log('HomeScreen mounted, onlineUsers:', onlineUsers);
  }, [onlineUsers, forceUpdate]);

const setupSocketStatusListener = () => {
  const socket = getSocket();
  if (socket) {
    setSocketStatus(socket.connected ? 'Connected' : 'Disconnected');
    
    socket.on('connect', () => {
      console.log('HomeScreen: Socket connected');
      setSocketStatus('Connected');
    });
    
    socket.on('disconnect', () => {
      console.log('HomeScreen: Socket disconnected');
      setSocketStatus('Disconnected');
    });
  }
};

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
      console.log('Fetched users:', response.data.length);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch users');
      console.log('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshUsers = async () => {
    setLoading(true);
    await fetchUsers();
  };

  const startChat = (otherUser) => {
    navigation.navigate('Chat', { 
      otherUser,
      currentUser: user 
    });
  };

  const renderUserItem = ({ item }) => {
    const isOnline = isUserOnline(item._id);
    const isCurrentUser = item._id === user?._id;
    
    console.log(`Rendering user ${item.username}, online: ${isOnline}, id: ${item._id}`);
    
    if (isCurrentUser) return null;

    return (
      <TouchableOpacity 
        style={styles.userItem}
        onPress={() => startChat(item)}
      >
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.username}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <Text style={styles.userId}>ID: {item._id}</Text>
          <Text style={[styles.onlineStatus, isOnline ? styles.online : styles.offline]}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </Text>
        </View>
        <View style={styles.statusContainer}>
          <View 
            style={[
              styles.statusIndicator,
              { backgroundColor: isOnline ? '#4CAF50' : '#9E9E9E' }
            ]} 
          />
          <Text style={styles.statusText}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const onlineCount = onlineUsers.filter(userId => userId !== user?._id).length;

  console.log('HomeScreen render - onlineCount:', onlineCount, 'onlineUsers:', onlineUsers, 'forceUpdate:', forceUpdate);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Chats</Text>
        <Text style={styles.welcome}>Welcome, {user?.username}!</Text>
        <Text style={styles.userId}>Your ID: {user?._id}</Text>
        
        <View style={styles.statusRow}>
          <Text style={styles.onlineInfo}>
            {onlineCount} user{onlineCount !== 1 ? 's' : ''} online
          </Text>
          <View style={[styles.socketStatus, 
            socketStatus === 'Connected' ? styles.socketConnected : styles.socketDisconnected
          ]}>
            <Text style={styles.socketStatusText}>
              {socketStatus}
            </Text>
          </View>
        </View>
        
        <View style={styles.debugInfo}>
          <Text style={styles.debugText}>
            Online IDs: {onlineUsers.join(', ') || 'None'}
          </Text>
          <Text style={styles.debugText}>
            Total Users: {users.length}
          </Text>
        </View>
        
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={users}
        renderItem={renderUserItem}
        keyExtractor={(item) => item._id}
        style={styles.userList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No other users found</Text>
            <TouchableOpacity style={styles.retryButton} onPress={refreshUsers}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  welcome: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  userId: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  onlineInfo: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  socketStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  socketConnected: {
    backgroundColor: '#4CAF50',
  },
  socketDisconnected: {
    backgroundColor: '#FF5722',
  },
  socketStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  debugInfo: {
    marginTop: 5,
    padding: 5,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
  debugText: {
    fontSize: 10,
    color: '#666',
    fontFamily: 'monospace',
  },
  headerButtons: {
    position: 'absolute',
    top: 60,
    right: 20,
    flexDirection: 'row',
  },
  refreshButton: {
    padding: 10,
    marginRight: 10,
  },
  refreshText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  forceUpdateButton: {
    padding: 10,
    marginRight: 10,
  },
  forceUpdateText: {
    color: '#FF9500',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    padding: 10,
  },
  logoutText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  userList: {
    flex: 1,
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 10,
    marginVertical: 5,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  onlineStatus: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: 'bold',
  },
  online: {
    color: '#4CAF50',
  },
  offline: {
    color: '#9E9E9E',
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
});