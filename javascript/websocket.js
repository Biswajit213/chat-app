// WebSocket client manager for real-time communication
const WS_SERVER_URL = 'ws://localhost:8080';

class WebSocketManager {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.eventListeners = new Map();
        this.pendingMessages = [];
    }

    // Connect to WebSocket server
    connect() {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(WS_SERVER_URL);
                
                this.ws.onopen = () => {
                    console.log('Connected to WebSocket server');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    
                    // Send pending messages
                    while (this.pendingMessages.length > 0) {
                        const message = this.pendingMessages.shift();
                        this.send(message.type, message.data);
                    }
                    
                    this.emit('connected');
                    resolve();
                };
                
                this.ws.onmessage = (event) => {
                    try {
                        const { type, data } = JSON.parse(event.data);
                        this.handleMessage(type, data);
                    } catch (error) {
                        console.error('Error parsing WebSocket message:', error);
                    }
                };
                
                this.ws.onclose = (event) => {
                    console.log('WebSocket connection closed:', event.code, event.reason);
                    this.isConnected = false;
                    this.emit('disconnected', event);
                    
                    // Attempt to reconnect if not a normal closure
                    if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.attemptReconnect();
                    }
                };
                
                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    this.emit('error', error);
                    reject(error);
                };
                
            } catch (error) {
                console.error('Error creating WebSocket connection:', error);
                reject(error);
            }
        });
    }

    // Attempt to reconnect
    attemptReconnect() {
        this.reconnectAttempts++;
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        
        setTimeout(() => {
            this.connect().catch(error => {
                console.error('Reconnection failed:', error);
            });
        }, this.reconnectDelay * this.reconnectAttempts);
    }

    // Disconnect from WebSocket server
    disconnect() {
        if (this.ws) {
            this.ws.close(1000, 'Client disconnecting');
            this.ws = null;
            this.isConnected = false;
        }
    }

    // Send message to server
    send(type, data) {
        const message = { type, data };
        
        if (this.isConnected && this.ws) {
            this.ws.send(JSON.stringify(message));
        } else {
            // Queue message for when connection is restored
            this.pendingMessages.push(message);
        }
    }

    // Handle incoming messages
    handleMessage(type, data) {
        this.emit(type, data);
    }

    // Add event listener
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    // Remove event listener
    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    // Emit event to listeners
    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    // High-level methods for chat functionality
    
    // Authenticate user after Firebase auth
    authenticate(userId, username) {
        this.send('authenticate', { userId, username });
    }

    // Get list of rooms
    getRooms() {
        this.send('get_rooms');
    }

    // Create a new room
    createRoom(name, description = '') {
        this.send('create_room', { name, description });
    }

    // Join a room
    joinRoom(roomId) {
        this.send('join_room', { roomId });
    }

    // Leave current room
    leaveRoom(roomId) {
        this.send('leave_room', { roomId });
    }

    // Send a message
    sendMessage(content) {
        this.send('send_message', { content });
    }

    // Sync room state for multiple connections
    syncRoom() {
        this.send('room_sync', {});
    }

    // Get connection status
    getConnectionStatus() {
        return this.isConnected;
    }
}

// Create global WebSocket manager instance
const wsManager = new WebSocketManager();

// Export for use in other modules
window.wsManager = wsManager; 