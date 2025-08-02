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
    setupFirebaseListeners();
    loadDefaultRooms();
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

// Setup Firebase listeners for real-time updates
function setupFirebaseListeners() {
    // Listen for rooms changes
    const roomsRef = firebase.ref(firebase.database, 'rooms');
    firebase.onValue(roomsRef, (snapshot) => {
        const roomsData = snapshot.val();
        if (roomsData) {
            rooms = Object.entries(roomsData).map(([id, room]) => ({
                id,
                ...room
            }));
        } else {
            rooms = [];
        }
        renderRooms();
    });

    // Listen for online users changes
    const usersRef = firebase.ref(firebase.database, 'users');
    firebase.onValue(usersRef, (snapshot) => {
        const usersData = snapshot.val();
        if (usersData) {
            const onlineUsers = Object.values(usersData).filter(user => user.isOnline);
            updateOnlineCount(onlineUsers.length);
        }
    });
}

// Load default rooms if none exist
async function loadDefaultRooms() {
    try {
        const roomsRef = firebase.ref(firebase.database, 'rooms');
        const snapshot = await firebase.get(roomsRef);
        
        if (!snapshot.exists()) {
            const defaultRooms = {
                general: {
                    name: 'General',
                    description: 'General discussion room',
                    createdBy: 'system',
                    createdAt: Date.now(),
                    participants: {},
                    messageCount: 0
                },
                random: {
                    name: 'Random',
                    description: 'Random topics and fun conversations',
                    createdBy: 'system',
                    createdAt: Date.now(),
                    participants: {},
                    messageCount: 0
                },
                help: {
                    name: 'Help',
                    description: 'Get help and ask questions',
                    createdBy: 'system',
                    createdAt: Date.now(),
                    participants: {},
                    messageCount: 0
                }
            };

            await firebase.set(roomsRef, defaultRooms);
        }
    } catch (error) {
        console.error('Error loading default rooms:', error);
    }
}

// Handle create room
async function handleCreateRoom() {
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

        const currentUser = getCurrentUser();
        const roomData = {
            name: name,
            description: description || '',
            createdBy: currentUser.uid,
            createdAt: Date.now(),
            participants: {},
            messageCount: 0
        };

        const roomsRef = firebase.ref(firebase.database, 'rooms');
        const newRoomRef = firebase.push(roomsRef);
        await firebase.set(newRoomRef, roomData);

        // Close modal and clear form
        createRoomModal.classList.add('hidden');
        newRoomName.value = '';
        newRoomDescription.value = '';

        showNotification('Room created successfully!', 'success');

    } catch (error) {
        console.error('Error creating room:', error);
        showNotification('Failed to create room. Please try again.', 'error');
    } finally {
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
async function joinRoom(roomId) {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) return;

        // Leave current room if any
        if (currentRoom) {
            await leaveCurrentRoom();
        }

        // Get room data
        const roomRef = firebase.ref(firebase.database, `rooms/${roomId}`);
        const snapshot = await firebase.get(roomRef);
        
        if (!snapshot.exists()) {
            showNotification('Room not found', 'error');
            return;
        }

        const roomData = snapshot.val();
        currentRoom = { id: roomId, ...roomData };

        // Add user to room participants
        const participantRef = firebase.ref(firebase.database, `rooms/${roomId}/participants/${currentUser.uid}`);
        await firebase.set(participantRef, {
            username: currentUser.username,
            joinedAt: Date.now()
        });

        // Update UI
        updateRoomUI();
        enableChatInput();

        // Load room messages
        if (typeof loadRoomMessages === 'function') {
            loadRoomMessages(roomId);
        }

        showNotification(`Joined ${roomData.name}`, 'success');

    } catch (error) {
        console.error('Error joining room:', error);
        showNotification('Failed to join room', 'error');
    }
}

// Leave current room
async function leaveCurrentRoom() {
    if (!currentRoom) return;

    try {
        const currentUser = getCurrentUser();
        if (currentUser) {
            const participantRef = firebase.ref(firebase.database, `rooms/${currentRoom.id}/participants/${currentUser.uid}`);
            await firebase.set(participantRef, null);
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