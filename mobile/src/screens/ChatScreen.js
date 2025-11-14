import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { getSocket } from '../services/socket';
import api from '../services/api';

export default function ChatScreen({ route, navigation }) {
  const { otherUser, currentUser } = route.params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);
  const messageIds = useRef(new Set()); // Track all message IDs to prevent duplicates
  const pendingMessages = useRef(new Map()); // Track pending messages by content

  useEffect(() => {
    navigation.setOptions({ title: otherUser.username });
    loadMessageHistory();
    initializeSocketListeners();
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const loadMessageHistory = async () => {
    try {
      // Try different endpoint variations
      let response;
      try {
        // First try: without /api
        response = await api.get(`/conversations/${otherUser._id}/messages`);
        console.log('Using endpoint: /conversations/:id/messages');
      } catch (error) {
        console.log('First endpoint failed, trying with /api');
        // Second try: with /api
        response = await api.get(`/api/conversations/${otherUser._id}/messages`);
        console.log('Using endpoint: /api/conversations/:id/messages');
      }
      
      console.log('Loaded message history:', response.data.length, 'messages');
      
      // Add all message IDs to the tracking set
      response.data.forEach(msg => {
        messageIds.current.add(msg._id);
      });
      
      setMessages(response.data || []);
    } catch (error) {
      console.log('Error loading messages:', error.response?.data || error.message);
      // Set empty messages array on error
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const initializeSocketListeners = () => {
    const socket = getSocket();
    
    if (socket) {
      console.log('Setting up chat socket listeners');

      socket.on('message:new', (message) => {
        console.log('Received new message:', message._id);
        
        // Check if we've already seen this message ID
        if (messageIds.current.has(message._id)) {
          console.log('Ignoring duplicate message:', message._id);
          return;
        }
        
        // Add to tracked IDs
        messageIds.current.add(message._id);
        
        setMessages(prev => {
          // Check if we have a pending optimistic message for this content
          const pendingKey = `${message.sender._id}_${message.message}_${message.receiver._id}`;
          const pendingMessageId = pendingMessages.current.get(pendingKey);
          
          if (pendingMessageId) {
            console.log('Replacing optimistic message with real one');
            pendingMessages.current.delete(pendingKey);
            return prev.map(m => 
              m._id === pendingMessageId ? message : m
            );
          }
          
          console.log('Adding new message from server:', message._id);
          return [...prev, message];
        });
      });

      socket.on('typing:start', (data) => {
        console.log('Typing start from:', data.senderId);
        if (data.senderId === otherUser._id) {
          setIsTyping(true);
        }
      });

      socket.on('typing:stop', (data) => {
        console.log('Typing stop from:', data.senderId);
        if (data.senderId === otherUser._id) {
          setIsTyping(false);
        }
      });

      socket.on('message:error', (data) => {
        console.log('Message error:', data.error);
        alert('Failed to send message: ' + data.error);
        setSending(false);
        
        // Remove the optimistic message on error
        const currentMessage = newMessage;
        const pendingKey = `${currentUser._id}_${currentMessage}_${otherUser._id}`;
        const pendingMessageId = pendingMessages.current.get(pendingKey);
        
        if (pendingMessageId) {
          setMessages(prev => prev.filter(m => m._id !== pendingMessageId));
          pendingMessages.current.delete(pendingKey);
        }
      });

      // Cleanup on unmount
      return () => {
        socket.off('message:new');
        socket.off('typing:start');
        socket.off('typing:stop');
        socket.off('message:error');
      };
    } else {
      console.log('No socket available for chat');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    const socket = getSocket();
    if (socket && socket.connected) {
      setSending(true);
      
      const messageData = {
        sender: currentUser._id,
        receiver: otherUser._id,
        message: newMessage.trim(),
      };

      console.log('Sending message:', messageData);
      
      // Create temporary ID for optimistic message
      const tempId = `temp_${Date.now()}`;
      const pendingKey = `${currentUser._id}_${newMessage.trim()}_${otherUser._id}`;
      pendingMessages.current.set(pendingKey, tempId);
      
      try {
        // Add message optimistically to UI immediately
        const optimisticMessage = {
          _id: tempId,
          sender: { _id: currentUser._id, username: currentUser.username },
          receiver: { _id: otherUser._id, username: otherUser.username },
          message: newMessage.trim(),
          createdAt: new Date().toISOString(),
          deliveredTo: [],
          readBy: [],
          isOptimistic: true
        };
        
        setMessages(prev => [...prev, optimisticMessage]);
        setNewMessage('');
        
        // Emit the message after adding to UI
        socket.emit('message:send', messageData);
        
      } catch (error) {
        console.log('Error sending message:', error);
        alert('Failed to send message');

        setMessages(prev => prev.filter(m => m._id !== tempId));
        pendingMessages.current.delete(pendingKey);
        setSending(false);
      }
    } else {
      console.log('Socket not connected');
      alert('Not connected to server. Please check your connection.');
      setSending(false);
    }
  };

  const handleTypingStart = () => {
    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit('typing:start', { receiverId: otherUser._id });
    }
  };

  const handleTypingStop = () => {
    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit('typing:stop', { receiverId: otherUser._id });
    }
  };

  const renderMessage = ({ item }) => {
    const isMyMessage = item.sender._id === currentUser._id;
    const isOptimistic = item.isOptimistic;
    
    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessage : styles.theirMessage,
        isOptimistic && styles.optimisticMessage
      ]}>
        <Text style={[
          styles.messageText,
          isMyMessage ? styles.myMessageText : styles.theirMessageText
        ]}>
          {item.message}
        </Text>
        <View style={styles.timestampContainer}>
          <Text style={[
            styles.timestamp,
            isMyMessage ? styles.myTimestamp : styles.theirTimestamp
          ]}>
            {new Date(item.createdAt).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
          {isOptimistic && (
            <Text style={styles.sendingIndicator}>⏳</Text>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text>Loading messages...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item._id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {isTyping && (
        <View style={styles.typingContainer}>
          <Text style={styles.typingText}>
            {otherUser.username} is typing...
          </Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={newMessage}
          onChangeText={setNewMessage}
          onFocus={handleTypingStart}
          onBlur={handleTypingStop}
          placeholder="Type a message..."
          multiline
          maxLength={500}
        />
        <TouchableOpacity 
          style={[
            styles.sendButton,
            (!newMessage.trim() || sending) && styles.sendButtonDisabled
          ]} 
          onPress={sendMessage}
          disabled={!newMessage.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendButtonText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 10,
    paddingBottom: 5,
  },
  messageContainer: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 15,
    marginVertical: 5,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E5EA',
  },
  optimisticMessage: {
    opacity: 0.7,
  },
  messageText: {
    fontSize: 16,
  },
  myMessageText: {
    color: '#fff',
  },
  theirMessageText: {
    color: '#000',
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 11,
  },
  myTimestamp: {
    color: 'rgba(255,255,255,0.7)',
  },
  theirTimestamp: {
    color: 'rgba(0,0,0,0.5)',
  },
  sendingIndicator: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  typingContainer: {
    padding: 10,
    alignItems: 'center',
  },
  typingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});