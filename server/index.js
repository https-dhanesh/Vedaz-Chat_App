const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const socketIo = require('socket.io');
const auth = require('./middleware/auth');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');

const User = require('./models/User');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const onlineUsers = new Map();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/api', messageRoutes);

app.get('/protected', auth, (req, res) => {
    res.json({ message: 'This is protected!', user: req.user });
});

// Basic route to test server
app.get('/', (req, res) => {
    res.send('Server is running!');
});

// Make io available to routes
app.io = io;

// SINGLE Socket.IO connection handler (remove the duplicate one at the bottom)
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // User joins - store their socket ID and user ID
    socket.on('user_online', (userId) => {
        onlineUsers.set(userId, socket.id);
        socket.userId = userId;

        console.log(`User ${userId} is online. Socket: ${socket.id}`);

        // Send current online users to the newly connected user
        const currentOnlineUsers = Array.from(onlineUsers.keys());
        console.log('Sending current online users to new user:', currentOnlineUsers);
        socket.emit('current_online_users', currentOnlineUsers);

        // Broadcast to all other users that this user is online
        socket.broadcast.emit('user_status', {
            userId: userId,
            isOnline: true
        });

        console.log(`Online users:`, Array.from(onlineUsers.keys()));
    });

    // Handle message sending with persistence
    socket.on('message:send', async (data) => {
        try {
            console.log('Received message:', data);

            // Save message to database
            const message = new Message({
                sender: data.sender,
                receiver: data.receiver,
                message: data.message,
                deliveredTo: [data.receiver] // Mark as delivered to receiver
            });

            const savedMessage = await message.save();
            console.log('Message saved to DB:', savedMessage._id);

            // Populate the saved message with user data
            const populatedMessage = await Message.findById(savedMessage._id)
                .populate('sender', 'username')
                .populate('receiver', 'username');

            // Send to receiver if online
            const receiverSocketId = onlineUsers.get(data.receiver);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('message:new', populatedMessage);
                console.log('Message sent to receiver:', data.receiver);
            }

            // Also send back to sender for confirmation
            socket.emit('message:new', populatedMessage);

        } catch (error) {
            console.error('Error saving message:', error);
            socket.emit('message:error', { error: 'Failed to send message' });
        }
    });

    // Handle user disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);

        if (socket.userId) {
            onlineUsers.delete(socket.userId);

            // Broadcast that user went offline
            socket.broadcast.emit('user_status', {
                userId: socket.userId,
                isOnline: false
            });

            console.log(`User ${socket.userId} went offline`);
            console.log(`Remaining online users:`, Array.from(onlineUsers.keys()));
        }
    });

    // Handle typing events
    socket.on('typing:start', (data) => {
        const { receiverId } = data;
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('typing:start', {
                senderId: socket.userId
            });
        }
    });

    socket.on('typing:stop', (data) => {
        const { receiverId } = data;
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('typing:stop', {
                senderId: socket.userId
            });
        }
    });
});

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));