# Team Chat Application

A real-time chat application built with HTML, CSS, JavaScript, and Firebase. Users can create chat rooms, send messages, and communicate in real-time with a modern, responsive interface.

## Features

### 🎨 User Interface
- **Modern Design**: Clean, intuitive interface with responsive design
- **Chat Rooms**: Browse and join different chat rooms
- **Real-time Updates**: Live message updates and user presence
- **Message Formatting**: Support for bold, italic, and links
- **Notifications**: Toast notifications for important events

### 🔄 Real-Time Communication
- **Firebase Realtime Database**: Instant message synchronization
- **Live User Presence**: See who's online in real-time
- **Room Management**: Create and join chat rooms dynamically
- **Message History**: Persistent message storage

### 🔐 User Authentication
- **Email-based Sign In**: Simple email and username authentication
- **Unique Usernames**: No duplicate usernames allowed
- **Anonymous Authentication**: Quick sign-in without complex setup
- **User Profiles**: Store user data and preferences

### 💬 Chat Features
- **Text Messages**: Send and receive text messages
- **Message Formatting**: Basic markdown support (bold, italic, links)
- **Timestamps**: Message timestamps and day dividers
- **Sender Identification**: Clear message attribution
- **Message Count**: Track messages per room

### 🏠 Room Management
- **Create Rooms**: Add new chat rooms with descriptions
- **Join Rooms**: Browse and join existing rooms
- **Room Information**: View room details and statistics
- **Participant Tracking**: See who's in each room
- **Default Rooms**: Pre-created general, random, and help rooms

### 🎯 User Experience
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Smooth Animations**: Fluid transitions and interactions
- **Error Handling**: Graceful error handling and user feedback
- **Loading States**: Visual feedback during operations
- **Keyboard Shortcuts**: Quick formatting with Ctrl+B, Ctrl+I, Ctrl+L

## Project Structure

```
chat-application/
├── index.html              # Main HTML file
├── firebase-config.js      # Firebase configuration and initialization
├── css/
│   └── style.css          # Main stylesheet
├── javascript/
│   ├── auth.js            # Authentication logic
│   ├── rooms.js           # Room management
│   ├── chat.js            # Chat functionality
│   └── main.js            # Main application logic
└── README.md              # This file
```

## Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Firebase project with Realtime Database enabled
- Basic knowledge of HTML, CSS, and JavaScript

## Installation & Setup

### 1. Firebase Setup

1. **Create a Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Add project" and follow the setup wizard
   - Enable Google Analytics (optional)

2. **Enable Authentication**:
   - In Firebase Console, go to "Authentication"
   - Click "Get started"
   - Enable "Anonymous" authentication method

3. **Enable Realtime Database**:
   - In Firebase Console, go to "Realtime Database"
   - Click "Create database"
   - Choose a location and start in test mode

4. **Get Firebase Configuration**:
   - In Firebase Console, go to Project Settings (gear icon)
   - Scroll down to "Your apps" section
   - Click the web app icon (</>) to add a web app
   - Copy the configuration object

### 2. Application Setup

1. **Clone or Download** the project files to your local machine

2. **Configure Firebase**:
   - Open `firebase-config.js`
   - Replace the placeholder configuration with your actual Firebase config:
   ```javascript
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-project.firebaseapp.com",
     databaseURL: "https://your-project-default-rtdb.firebaseio.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "your-sender-id",
     appId: "your-app-id"
   };
   ```

3. **Set Database Rules** (Optional):
   - In Firebase Console, go to Realtime Database
   - Click "Rules" tab
   - Use these basic rules for testing:
   ```json
   {
     "rules": {
       ".read": "auth != null",
       ".write": "auth != null"
     }
   }
   ```

4. **Open the Application**:
   - Open `index.html` in your web browser
   - Or serve it using a local server (recommended)

## How to Use

### Getting Started
1. **Sign In**: Enter your email and choose a unique username
2. **Join a Room**: Click on any available chat room
3. **Start Chatting**: Type your message and press Enter or click Send

### Creating Rooms
1. Click the "+" button next to "Chat Rooms"
2. Enter a room name (required) and description (optional)
3. Click "Create Room"

### Message Formatting
- **Bold**: Use `**text**` or Ctrl+B
- **Italic**: Use `*text*` or Ctrl+I
- **Links**: Use `[text](url)` or Ctrl+L

### Room Management
- **Join Room**: Click on any room in the sidebar
- **Room Info**: Click the info button to see room details
- **Leave Room**: Join another room to leave the current one

## Technical Details

### Firebase Integration
- **Authentication**: Anonymous authentication for quick sign-in
- **Realtime Database**: Stores users, rooms, and messages
- **Security Rules**: Basic read/write rules for authenticated users
- **Offline Support**: Firebase handles offline/online transitions

### Data Structure
```javascript
// Users
users/{userId} = {
  email: string,
  username: string,
  createdAt: timestamp,
  lastSeen: timestamp,
  isOnline: boolean
}

// Usernames (for uniqueness)
usernames/{username} = userId

// Rooms
rooms/{roomId} = {
  name: string,
  description: string,
  createdBy: userId,
  createdAt: timestamp,
  participants: {userId: {username, joinedAt}},
  messageCount: number
}

// Messages
messages/{roomId}/{messageId} = {
  content: string,
  sender: userId,
  senderName: string,
  timestamp: timestamp,
  roomId: string
}
```

### Browser Compatibility
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Security Considerations

- **Authentication Required**: All database operations require authentication
- **Input Validation**: Client-side validation for all user inputs
- **XSS Prevention**: HTML escaping for user-generated content
- **Rate Limiting**: Consider implementing rate limiting for production

## Troubleshooting

### Common Issues

1. **"Firebase not initialized" error**:
   - Check your Firebase configuration in `firebase-config.js`
   - Ensure all required fields are filled

2. **"Permission denied" error**:
   - Check Firebase Database rules
   - Ensure authentication is enabled

3. **Messages not appearing**:
   - Check browser console for errors
   - Verify Firebase connection status

4. **Username already taken**:
   - Choose a different username
   - Usernames must be unique across all users

### Debug Mode
Open browser console (F12) to see detailed error messages and debug information.

## Customization

### Styling
- Modify `css/style.css` to change the appearance
- Update CSS variables for consistent theming
- Add custom animations and transitions

### Features
- Add file upload functionality
- Implement user avatars
- Add message reactions
- Create private rooms
- Add admin features

### Firebase Rules
Customize database rules for production:
```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null && auth.uid == $uid"
      }
    },
    "rooms": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "messages": {
      "$roomId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

## Future Enhancements

- [ ] User avatars and profiles
- [ ] File and image sharing
- [ ] Message reactions and emojis
- [ ] Private messaging
- [ ] Room categories and tags
- [ ] Message search functionality
- [ ] Push notifications
- [ ] Voice and video calls
- [ ] Message encryption
- [ ] Admin panel and moderation tools

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review Firebase documentation
3. Check browser console for error messages
4. Ensure all prerequisites are met

---

**Note**: This application is designed for educational purposes and small-scale use. For production deployment, consider implementing additional security measures, rate limiting, and proper error handling.
