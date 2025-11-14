# Vedaz Chat App

A real-time 1:1 chat application built with React Native (frontend) and Node.js (backend) using Socket.IO for real-time communication and MongoDB for data persistence.

## 🚀 Features

- **User Authentication** - JWT-based register/login
- **Real-time Messaging** - Instant message delivery using Socket.IO
- **Online Status** - See who's online in real-time
- **Typing Indicators** - Know when someone is typing
- **Message Persistence** - All messages stored in MongoDB
- **Message Read Receipts** - See when messages are delivered and read
- **Modern UI** - Clean and intuitive user interface

## 🛠 Tech Stack

### Frontend
- React Native with Expo
- React Navigation for screen management
- Socket.IO Client for real-time communication
- Axios for API calls
- AsyncStorage for local data persistence
- React Context API for state management

### Backend
- Node.js with Express.js
- Socket.IO for real-time bidirectional communication
- MongoDB with Mongoose ODM
- JWT for authentication
- bcryptjs for password hashing
- CORS for cross-origin requests

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or MongoDB Atlas)
- Expo CLI
- iOS Simulator / Android Emulator or physical device

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd vedaz-chat-app
```

### 2. Backend Setup
```bash
cd server

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### 3. Edit server/.env:
```server/.env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_super_strong_jwt_secret_key
PORT=5000
```
### Start server :
```bash
npm run dev
```

3. Frontend Setup
```bash
cd mobile
```

# Install dependencies
```
npm install
```

### Update IP configuration in:

  mobile/src/services/api.js
  
  mobile/src/services/socket.js
  
  Replace 192.168.1.2:5000 with your computer's IP address.

### Start the mobile app:

```bash
npx expo start
```

### 📱 Running the Application

  Start MongoDB (if using local instance)
  
  Start the backend server: cd server && npm run dev
  
  Start the mobile app: cd mobile && npx expo start
  
  Scan QR code with Expo Go app or run on emulator

### 🔧 API Endpoints

#### Authentication

POST /auth/register - User registration

POST /auth/login - User login

#### Users
GET /users - Get all users (except current user)

#### Messages
GET /conversations/:userId/messages - Get message history

GET /api/conversations/:userId/messages - Alternative endpoint

### Socket.IO Events

user_online - User comes online

user_status - Online/offline status updates

message:send - Send a message

message:new - Receive a new message

typing:start - Start typing indicator

typing:stop - Stop typing indicator

current_online_users - Get current online users

### 🗄 Database Models

#### User : 
javascript
{
  username: String,
  email: String,
  password: String,
  createdAt: Date
}

#### Message : 
javascript
{
  sender: ObjectId (User),
  receiver: ObjectId (User),
  message: String,
  readBy: [ObjectId],
  deliveredTo: [ObjectId],
  createdAt: Date
}

### 🌐 Network Configuration

For mobile devices to connect to your local server:

Find your computer's IP address:

Windows: ipconfig

Mac/Linux: ifconfig or ip addr

#### Update IP in mobile files:

mobile/src/services/api.js

mobile/src/services/socket.js

Ensure devices are on same WiFi network

🧪 Testing
Sample Users for Testing
```
json
{
  "username": "testuser1",
  "email": "test1@example.com",
  "password": "password123"
}
```
```
json
{
  "username": "testuser2", 
  "email": "test2@example.com",
  "password": "password123"
}
```

Clear Expo cache: npx expo start --clear


### Project Structure

```
vedaz-chat-app/
├── mobile/                 # React Native app
│   ├── src/
│   │   ├── screens/        # App screens
│   │   ├── context/        # State management
│   │   ├── services/       # API and socket services
│   │   └── App.js          # Main app component
│   └── package.json
├── server/                 # Node.js backend
│   ├── routes/            # API routes
│   ├── models/            # Database models
│   ├── middleware/        # Auth middleware
│   ├── index.js           # Server entry point
│   └── package.json
└── README.md
```
