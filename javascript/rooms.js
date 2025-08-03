// Room management using Firebase Realtime Database
let rooms = [];
let currentRoom = null;
let filteredRooms = [];

// DOM elements
const roomsList = document.getElementById('rooms-list');
const searchRooms = document.getElementById('search-rooms');
const createRoomBtn = document.getElementById('create-room-btn');
const createRoomModal = document.getElementById('create-room-modal');
const closeCreateRoomModal = document.getElementById('close-create-room-modal');
const newRoomName = document.getElementById('new-room-name');
const newRoomDescription = document.getElementById('new-room-description');
const createRoomSubmitBtn = document.getElementById('create-room-submit-btn');
const roomInfoModal = document.getElementById('room-info-modal');
const closeRoomInfoModal = document.getElementById('close-room-info-modal');
const roomInfoContent = document.getElementById('room-info-content');
const roomInfoBtn = document.getElementById('room-info-btn');
const roomSettingsBtn = document.getElementById('room-settings-btn');
const chatTitle = document.getElementById('chat-title');
const chatSubtitle = document.getElementById('chat-subtitle');
const chatIcon = document.getElementById('chat-icon');

// Initialize rooms
function initRooms() {
    setupRoomEventListeners();
    setupWebSocketListeners();
}

// Setup event listeners for room interactions
function setupRoomEventListeners() {
    // Create room button
    createRoomBtn.addEventListener('click', () => {
        createRoomModal.classList.remove('hidden');
        newRoomName.focus();
    });

    // Close create room modal
    closeCreateRoomModal.addEventListener('click', () => {
        createRoomModal.classList.add('hidden');
        newRoomName.value = '';
        newRoomDescription.value = '';
    });

    // Create room form submission
    createRoomSubmitBtn.addEventListener('click', handleCreateRoom);

    // Search rooms
    searchRooms.addEventListener('input', (e) => {
        filterRooms(e.target.value);
    });

    // Room info and settings buttons
    roomInfoBtn.addEventListener('click', () => showRoomInfo());
    roomSettingsBtn.addEventListener('click', () => showRoomSettings());

    // Close room info modal
    closeRoomInfoModal.addEventListener('click', () => {
        roomInfoModal.classList.add('hidden');
    });

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === createRoomModal) {
            createRoomModal.classList.add('hidden');
        }
        if (e.target === roomInfoModal) {
            roomInfoModal.classList.add('hidden');
        }
    });
}

// Setup WebSocket listeners for real-time updates
function setupWebSocketListeners() {
    // Listen for room list updates
    wsManager.on('room_list', (data) => {
        rooms = data.rooms || [];
        renderRooms();
    });

    // Listen for room created
    wsManager.on('room_created', (data) => {
        if (data.room) {
            rooms.push(data.room);
            renderRooms();
            showNotification('Room created successfully!', 'success');
        }
    });

    // Listen for room joined
    wsManager.on('room_joined', (data) => {
        if (data.room) {
            currentRoom = data.room;
            updateRoomUI();
            enableChatInput();
        }
    });

    // Listen for room messages
    wsManager.on('room_messages', (data) => {
        if (data.messages && typeof loadRoomMessages === 'function') {
            loadRoomMessages(data.messages);
        }
    });

    // Listen for user joined room
    wsManager.on('user_joined', (data) => {
        if (currentRoom && data.roomId === currentRoom.id) {
            showSystemMessage(`${data.username} joined the room`);
        }
    });

    // Listen for user left room
    wsManager.on('user_left', (data) => {
        if (currentRoom && data.roomId === currentRoom.id) {
            showSystemMessage(`${data.username} left the room`);
        }
    });

    // Listen for online users updates
    wsManager.on('online_users', (data) => {
        const onlineCount = data.users ? data.users.length : 0;
        updateOnlineCount(onlineCount);
    });
}

// Load default rooms if none exist
function loadDefaultRooms() {
    // Default rooms are created by the WebSocket server
    // This function is no longer needed as the server handles it
}

// Handle create room
function handleCreateRoom() {
    const name = newRoomName.value.trim();
    const description = newRoomDescription.value.trim();

    if (!name) {
        showNotification('Please enter a room name', 'error');
        return;
    }

    if (name.length > 30) {
        showNotification('Room name must be 30 characters or less', 'error');
        return;
    }

    try {
        createRoomSubmitBtn.disabled = true;
        createRoomSubmitBtn.textContent = 'Creating...';

        // Send create room request via WebSocket
        wsManager.createRoom(name, description);

        // Close modal and clear form
        createRoomModal.classList.add('hidden');
        newRoomName.value = '';
        newRoomDescription.value = '';

    } catch (error) {
        console.error('Error creating room:', error);
        showNotification('Failed to create room. Please try again.', 'error');
        createRoomSubmitBtn.disabled = false;
        createRoomSubmitBtn.textContent = 'Create Room';
    }
}

// Filter rooms based on search
function filterRooms(searchTerm) {
    if (!searchTerm) {
        filteredRooms = [...rooms];
    } else {
        filteredRooms = rooms.filter(room => 
            room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            room.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    renderRooms();
}

// Render rooms list
function renderRooms() {
    const roomsToRender = filteredRooms.length > 0 ? filteredRooms : rooms;
    
    if (roomsToRender.length === 0) {
        roomsList.innerHTML = '<div class="no-rooms">No rooms available</div>';
        return;
    }

    roomsList.innerHTML = roomsToRender.map(room => createRoomElement(room)).join('');
    
    // Add click listeners to room items
    roomsList.querySelectorAll('.room-item').forEach(item => {
        item.addEventListener('click', () => {
            const roomId = item.dataset.roomId;
            joinRoom(roomId);
        });
    });
}

// Create room element HTML
function createRoomElement(room) {
    const isActive = currentRoom && currentRoom.id === room.id;
    const participantCount = Object.keys(room.participants || {}).length;
    
    return `
        <div class="room-item ${isActive ? 'active' : ''}" data-room-id="${room.id}">
            <div class="room-avatar">
                <i class="fas fa-hashtag"></i>
            </div>
            <div class="room-info">
                <div class="room-name">${escapeHtml(room.name)}</div>
                <div class="room-description">${escapeHtml(room.description)}</div>
                <div class="room-meta">
                    <span class="room-participants">${participantCount} participants</span>
                    <span class="room-messages">${room.messageCount || 0} messages</span>
                </div>
            </div>
        </div>
    `;
}

// Join a room
function joinRoom(roomId) {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) return;

        // Leave current room if any
        if (currentRoom) {
            leaveCurrentRoom();
        }

        // Join room via WebSocket
        wsManager.joinRoom(roomId);

    } catch (error) {
        console.error('Error joining room:', error);
        showNotification('Failed to join room', 'error');
    }
}

// Leave current room
function leaveCurrentRoom() {
    if (!currentRoom) return;

    try {
        const currentUser = getCurrentUser();
        if (currentUser) {
            wsManager.leaveRoom(currentRoom.id);
        }
    } catch (error) {
        console.error('Error leaving room:', error);
    }

    currentRoom = null;
    disableChatInput();
    updateRoomUI();
}

// Update room UI
function updateRoomUI() {
    if (currentRoom) {
        chatTitle.textContent = currentRoom.name;
        chatSubtitle.textContent = `${Object.keys(currentRoom.participants || {}).length} participants`;
        chatIcon.className = 'fas fa-hashtag';
        
        roomInfoBtn.classList.remove('hidden');
        roomSettingsBtn.classList.remove('hidden');
    } else {
        chatTitle.textContent = 'Select a chat room';
        chatSubtitle.textContent = 'Join a room to start chatting';
        chatIcon.className = 'fas fa-comments';
        
        roomInfoBtn.classList.add('hidden');
        roomSettingsBtn.classList.add('hidden');
    }

    // Update active room in list
    renderRooms();
}

// Show room info
function showRoomInfo() {
    if (!currentRoom) return;

    const participantCount = Object.keys(currentRoom.participants || {}).length;
    const createdDate = new Date(currentRoom.createdAt).toLocaleDateString();

    roomInfoContent.innerHTML = `
        <div class="room-info-details">
            <h4>${escapeHtml(currentRoom.name)}</h4>
            <p>${escapeHtml(currentRoom.description)}</p>
            <div class="room-stats">
                <div class="stat">
                    <span class="stat-label">Participants:</span>
                    <span class="stat-value">${participantCount}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Messages:</span>
                    <span class="stat-value">${currentRoom.messageCount || 0}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Created:</span>
                    <span class="stat-value">${createdDate}</span>
                </div>
            </div>
        </div>
    `;

    roomInfoModal.classList.remove('hidden');
}

// Show room settings (placeholder)
function showRoomSettings() {
    showNotification('Room settings coming soon!', 'info');
}

// Update online count
function updateOnlineCount(count) {
    const onlineCount = document.getElementById('online-count');
    if (onlineCount) {
        onlineCount.textContent = count;
    }
}

// Enable rooms functionality
function enableRooms() {
    createRoomBtn.disabled = false;
    searchRooms.disabled = false;
    // Get rooms list from WebSocket server
    wsManager.getRooms();
}

// Disable rooms functionality
function disableRooms() {
    createRoomBtn.disabled = true;
    searchRooms.disabled = true;
}

// Enable chat input
function enableChatInput() {
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-message-btn');
    if (messageInput) messageInput.disabled = false;
    if (sendBtn) sendBtn.disabled = false;
}

// Disable chat input
function disableChatInput() {
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-message-btn');
    if (messageInput) messageInput.disabled = true;
    if (sendBtn) sendBtn.disabled = true;
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString();
}

function showSystemMessage(message) {
    if (typeof addSystemMessage === 'function') {
        addSystemMessage(message);
    }
}

// Export functions
window.getCurrentRoom = () => currentRoom;
window.enableRooms = enableRooms;
window.disableRooms = disableRooms; 