const WebSocket = require('ws');
const http = require('http');

// Create HTTP server
const server = http.createServer();

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store connected clients and their data
const clients = new Map(); // WebSocket -> { userId, username, roomId }
const users = new Map(); // userId -> { username, roomId, lastSeen, connections: Set<WebSocket> }
const rooms = new Map(); // roomId -> { name, description, participants: Set<userId>, messages: [] }
const userRooms = new Map(); // userId -> roomId

// Generate unique IDs
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// Initialize default rooms
function initializeDefaultRooms() {
    const defaultRooms = [
        { id: 'general', name: 'General', description: 'General discussion room' },
        { id: 'random', name: 'Random', description: 'Random topics and fun conversations' },
        { id: 'help', name: 'Help', description: 'Get help and ask questions' }
    ];

    defaultRooms.forEach(room => {
        rooms.set(room.id, {
            ...room,
            participants: new Set(),
            messages: [],
            createdAt: Date.now()
        });
    });
}

// Send message to client
function sendMessage(ws, type, data) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type, data }));
    }
}

// Send error to client
function sendError(ws, message) {
    sendMessage(ws, 'error', { message });
}

// Broadcast to all clients in a room
function broadcastToRoom(roomId, type, data, excludeUserId = null) {
    const room = rooms.get(roomId);
    if (!room) return;

    room.participants.forEach(userId => {
        if (userId === excludeUserId) return;
        
        const user = users.get(userId);
        if (user && user.connections) {
            // Send to all connections of this user
            user.connections.forEach(ws => {
                if (ws.readyState === WebSocket.OPEN) {
                    sendMessage(ws, type, data);
                }
            });
        }
    });
}

// Broadcast room list to all clients
function broadcastRoomList() {
    const roomList = Array.from(rooms.values()).map(room => ({
        id: room.id,
        name: room.name,
        description: room.description,
        participantCount: room.participants.size,
        messageCount: room.messages.length
    }));

    // Send to all connected clients
    clients.forEach((clientData, ws) => {
        if (ws.readyState === WebSocket.OPEN) {
            sendMessage(ws, 'room_list', { rooms: roomList });
        }
    });
}

// Broadcast online users to all clients
function broadcastOnlineUsers() {
    const onlineUsers = Array.from(users.values())
        .filter(user => user.isOnline)
        .map(user => ({
            userId: user.userId,
            username: user.username
        }));

    // Send to all connected clients
    clients.forEach((clientData, ws) => {
        if (ws.readyState === WebSocket.OPEN) {
            sendMessage(ws, 'online_users', { users: onlineUsers });
        }
    });
}

// Handle WebSocket connections
wss.on('connection', (ws) => {
    console.log('New client connected');
    
    // Send initial room list
    const roomList = Array.from(rooms.values()).map(room => ({
        id: room.id,
        name: room.name,
        description: room.description,
        participantCount: room.participants.size,
        messageCount: room.messages.length
    }));
    
    sendMessage(ws, 'room_list', { rooms: roomList });

    // Handle messages from client
    ws.on('message', (message) => {
        try {
            const { type, data } = JSON.parse(message);
            handleMessage(ws, type, data);
        } catch (error) {
            console.error('Error parsing message:', error);
            sendError(ws, 'Invalid message format');
        }
    });

    // Handle client disconnection
    ws.on('close', () => {
        const clientData = clients.get(ws);
        if (clientData) {
            console.log(`Client disconnected: ${clientData.username}`);
            
            // Remove from room
            if (clientData.roomId) {
                const room = rooms.get(clientData.roomId);
                if (room) {
                    room.participants.delete(clientData.userId);
                    broadcastToRoom(clientData.roomId, 'user_left', {
                        userId: clientData.userId,
                        username: clientData.username
                    });
                }
            }
            
            // Update user status and remove connection
            const user = users.get(clientData.userId);
            if (user) {
                user.connections.delete(ws);
                
                // Only mark as offline if no more connections
                if (user.connections.size === 0) {
                    user.isOnline = false;
                    user.lastSeen = Date.now();
                    userRooms.delete(clientData.userId);
                    console.log(`User ${clientData.username} is now offline (no more connections)`);
                } else {
                    console.log(`User ${clientData.username} still has ${user.connections.size} active connections`);
                }
            }
            
            // Remove from clients
            clients.delete(ws);
            
            // Broadcast updated online users
            broadcastOnlineUsers();
        }
    });

    // Handle errors
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// Handle different message types
function handleMessage(ws, type, data) {
    switch (type) {
        case 'authenticate':
            handleAuthenticate(ws, data);
            break;
        case 'join_room':
            handleJoinRoom(ws, data);
            break;
        case 'leave_room':
            handleLeaveRoom(ws, data);
            break;
        case 'send_message':
            handleSendMessage(ws, data);
            break;
        case 'create_room':
            handleCreateRoom(ws, data);
            break;
        case 'get_rooms':
            handleGetRooms(ws);
            break;
        case 'room_sync':
            handleRoomSync(ws, data);
            break;
        default:
            sendError(ws, `Unknown message type: ${type}`);
    }
}

// Handle user authentication
function handleAuthenticate(ws, data) {
    const { userId, username } = data;
    
    if (!userId || !username) {
        sendError(ws, 'Missing userId or username');
        return;
    }
    
    // Check if username is already taken by another user
    const existingUser = Array.from(users.values())
        .find(user => user.username === username && user.userId !== userId);
    
    if (existingUser) {
        sendError(ws, 'Username is already taken');
        return;
    }
    
    // Store client data
    clients.set(ws, { userId, username, roomId: null });
    
    // Update or create user
    const user = users.get(userId) || { userId, connections: new Set() };
    user.username = username;
    user.isOnline = true;
    user.lastSeen = Date.now();
    user.connections.add(ws);
    users.set(userId, user);
    
    // Send authentication success
    sendMessage(ws, 'auth_success', {
        userId,
        username,
        message: 'Successfully authenticated'
    });
    
    // Broadcast updated online users
    broadcastOnlineUsers();
    
    console.log(`User authenticated: ${username} (${userId}) - Total connections: ${user.connections.size}`);
}

// Handle joining a room
function handleJoinRoom(ws, data) {
    const { roomId } = data;
    const clientData = clients.get(ws);
    
    if (!clientData) {
        sendError(ws, 'Not authenticated');
        return;
    }
    
    const room = rooms.get(roomId);
    if (!room) {
        sendError(ws, 'Room not found');
        return;
    }
    
    // Leave current room if any
    if (clientData.roomId) {
        handleLeaveRoom(ws, { roomId: clientData.roomId });
    }
    
    // Join new room
    room.participants.add(clientData.userId);
    clientData.roomId = roomId;
    userRooms.set(clientData.userId, roomId);
    
    // Send room joined confirmation
    sendMessage(ws, 'room_joined', {
        room: {
            id: room.id,
            name: room.name,
            description: room.description,
            participantCount: room.participants.size
        }
    });
    
    // Send recent messages
    const recentMessages = room.messages.slice(-50); // Last 50 messages
    sendMessage(ws, 'room_messages', { messages: recentMessages });
    
    // Notify other users in room
    broadcastToRoom(roomId, 'user_joined', {
        userId: clientData.userId,
        username: clientData.username
    }, clientData.userId);
    
    console.log(`${clientData.username} joined room: ${room.name} (connection: ${ws._socket?.remoteAddress || 'unknown'})`);
}

// Handle leaving a room
function handleLeaveRoom(ws, data) {
    const { roomId } = data;
    const clientData = clients.get(ws);
    
    if (!clientData || clientData.roomId !== roomId) {
        return;
    }
    
    const room = rooms.get(roomId);
    if (room) {
        room.participants.delete(clientData.userId);
        
        // Notify other users
        broadcastToRoom(roomId, 'user_left', {
            userId: clientData.userId,
            username: clientData.username
        });
    }
    
    clientData.roomId = null;
    userRooms.delete(clientData.userId);
    
    sendMessage(ws, 'room_left', { roomId });
    
    console.log(`${clientData.username} left room: ${roomId}`);
}

// Handle sending a message
function handleSendMessage(ws, data) {
    const { content } = data;
    const clientData = clients.get(ws);
    
    if (!clientData) {
        sendError(ws, 'Not authenticated');
        return;
    }
    
    if (!clientData.roomId) {
        sendError(ws, 'Not in a room');
        return;
    }
    
    if (!content || content.trim().length === 0) {
        sendError(ws, 'Message cannot be empty');
        return;
    }
    
    const room = rooms.get(clientData.roomId);
    if (!room) {
        sendError(ws, 'Room not found');
        return;
    }
    
    const message = {
        id: generateId(),
        content: content.trim(),
        sender: clientData.userId,
        senderName: clientData.username,
        timestamp: Date.now(),
        roomId: clientData.roomId
    };
    
    // Store message
    room.messages.push(message);
    
    // Keep only last 100 messages
    if (room.messages.length > 100) {
        room.messages = room.messages.slice(-100);
    }
    
    // Broadcast to room
    broadcastToRoom(clientData.roomId, 'new_message', message);
    
    console.log(`Message from ${clientData.username} in ${room.name}: ${content}`);
}

// Handle creating a room
function handleCreateRoom(ws, data) {
    const { name, description } = data;
    const clientData = clients.get(ws);
    
    if (!clientData) {
        sendError(ws, 'Not authenticated');
        return;
    }
    
    if (!name || name.trim().length === 0) {
        sendError(ws, 'Room name is required');
        return;
    }
    
    if (name.length > 30) {
        sendError(ws, 'Room name must be 30 characters or less');
        return;
    }
    
    // Check if room name already exists
    const existingRoom = Array.from(rooms.values())
        .find(room => room.name.toLowerCase() === name.toLowerCase());
    
    if (existingRoom) {
        sendError(ws, 'Room name already exists');
        return;
    }
    
    const roomId = generateId();
    const room = {
        id: roomId,
        name: name.trim(),
        description: description ? description.trim() : '',
        participants: new Set(),
        messages: [],
        createdBy: clientData.userId,
        createdAt: Date.now()
    };
    
    rooms.set(roomId, room);
    
    // Broadcast new room to all clients
    broadcastRoomList();
    
    sendMessage(ws, 'room_created', {
        room: {
            id: room.id,
            name: room.name,
            description: room.description,
            participantCount: 0,
            messageCount: 0
        }
    });
    
    console.log(`Room created by ${clientData.username}: ${room.name}`);
}

// Handle getting rooms list
function handleGetRooms(ws) {
    const roomList = Array.from(rooms.values()).map(room => ({
        id: room.id,
        name: room.name,
        description: room.description,
        participantCount: room.participants.size,
        messageCount: room.messages.length
    }));
    
    sendMessage(ws, 'room_list', { rooms: roomList });
}

// Handle room synchronization for multiple connections
function handleRoomSync(ws, data) {
    const clientData = clients.get(ws);
    if (!clientData) {
        sendError(ws, 'Not authenticated');
        return;
    }
    
    // Send current room state to this connection
    if (clientData.roomId) {
        const room = rooms.get(clientData.roomId);
        if (room) {
            sendMessage(ws, 'room_joined', {
                room: {
                    id: room.id,
                    name: room.name,
                    description: room.description,
                    participantCount: room.participants.size
                }
            });
            
            // Send recent messages
            const recentMessages = room.messages.slice(-50);
            sendMessage(ws, 'room_messages', { messages: recentMessages });
        }
    }
}

// Initialize default rooms
initializeDefaultRooms();

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`WebSocket server running on port ${PORT}`);
    console.log(`Default rooms created: ${Array.from(rooms.keys()).join(', ')}`);
}); 