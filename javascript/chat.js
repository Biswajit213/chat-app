// Chat functionality using Firebase Realtime Database
let messages = [];
let onlineUsers = [];
let currentDay = null;

// DOM elements
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendMessageBtn = document.getElementById('send-message-btn');
const formatBoldBtn = document.getElementById('format-bold-btn');
const formatItalicBtn = document.getElementById('format-italic-btn');
const formatLinkBtn = document.getElementById('format-link-btn');
const onlineUsersList = document.getElementById('online-users-list');

// Initialize chat
function initChat() {
    setupChatEventListeners();
    setupMessageFormatting();
    setupWebSocketListeners();
}

// Setup event listeners for chat interactions
function setupChatEventListeners() {
    // Send message
    sendMessageBtn.addEventListener('click', sendMessage);
    
    // Enter key to send message
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Format buttons
    formatBoldBtn.addEventListener('click', () => insertFormatting('**', '**'));
    formatItalicBtn.addEventListener('click', () => insertFormatting('*', '*'));
    formatLinkBtn.addEventListener('click', insertLink);
}

// Setup WebSocket listeners for real-time updates
function setupWebSocketListeners() {
    // Listen for new messages
    wsManager.on('new_message', (message) => {
        addMessage(message);
    });

    // Listen for online users updates
    wsManager.on('online_users', (data) => {
        onlineUsers = data.users || [];
        renderOnlineUsers();
    });
}

// Setup message formatting
function setupMessageFormatting() {
    // Add formatting buttons functionality
    formatBoldBtn.title = 'Bold (Ctrl+B)';
    formatItalicBtn.title = 'Italic (Ctrl+I)';
    formatLinkBtn.title = 'Insert Link (Ctrl+L)';

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && !e.shiftKey) {
            switch (e.key.toLowerCase()) {
                case 'b':
                    e.preventDefault();
                    insertFormatting('**', '**');
                    break;
                case 'i':
                    e.preventDefault();
                    insertFormatting('*', '*');
                    break;
                case 'l':
                    e.preventDefault();
                    insertLink();
                    break;
            }
        }
    });
}

// Insert formatting around selected text
function insertFormatting(before, after) {
    const start = messageInput.selectionStart;
    const end = messageInput.selectionEnd;
    const selectedText = messageInput.value.substring(start, end);
    
    const newText = messageInput.value.substring(0, start) + 
                   before + selectedText + after + 
                   messageInput.value.substring(end);
    
    messageInput.value = newText;
    messageInput.focus();
    
    // Set cursor position after the inserted formatting
    messageInput.setSelectionRange(start + before.length, end + before.length);
}

// Insert link
function insertLink() {
    const url = prompt('Enter URL:');
    if (url) {
        const text = prompt('Enter link text (optional):') || url;
        insertFormatting(`[${text}](`, ')');
    }
}

// Send message
function sendMessage() {
    const content = messageInput.value.trim();
    const currentUser = getCurrentUser();
    const currentRoom = getCurrentRoom();

    if (!content || !currentUser || !currentRoom) {
        return;
    }

    try {
        // Disable input temporarily
        messageInput.disabled = true;
        sendMessageBtn.disabled = true;

        // Send message via WebSocket
        wsManager.sendMessage(content);

        // Clear input
        messageInput.value = '';
        messageInput.focus();

    } catch (error) {
        console.error('Error sending message:', error);
        showNotification('Failed to send message', 'error');
    } finally {
        // Re-enable input
        messageInput.disabled = false;
        sendMessageBtn.disabled = false;
    }
}

// Load room messages
function loadRoomMessages(messages) {
    try {
        clearMessages();
        
        if (messages && messages.length > 0) {
            messages = messages.sort((a, b) => a.timestamp - b.timestamp);
            renderMessages();
        }
        
    } catch (error) {
        console.error('Error loading messages:', error);
        showNotification('Failed to load messages', 'error');
    }
}

// Add message to UI
function addMessage(message) {
    const messageDay = getMessageDay(message.timestamp);
    
    // Add day divider if needed
    if (messageDay !== currentDay) {
        addDayDivider(messageDay);
        currentDay = messageDay;
    }
    
    // Add message
    const messageElement = createMessageElement(message);
    messagesContainer.appendChild(messageElement);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Create message element
function createMessageElement(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    
    const currentUser = getCurrentUser();
    const isOwnMessage = currentUser && message.sender === currentUser.uid;
    
    messageDiv.classList.add(isOwnMessage ? 'own-message' : 'other-message');
    
    messageDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-user"></i>
        </div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-sender">${escapeHtml(message.senderName)}</span>
                <span class="message-time">${formatTime(message.timestamp)}</span>
            </div>
            <div class="message-text">${formatMessageContent(message.content)}</div>
        </div>
    `;
    
    return messageDiv;
}

// Add day divider
function addDayDivider(day) {
    const dividerDiv = document.createElement('div');
    dividerDiv.className = 'message-day-divider';
    dividerDiv.innerHTML = `<span>${day}</span>`;
    messagesContainer.appendChild(dividerDiv);
}

// Add system message
function addSystemMessage(message) {
    const systemDiv = document.createElement('div');
    systemDiv.className = 'system-message';
    systemDiv.innerHTML = `
        <div class="system-message-content">
            <i class="fas fa-info-circle"></i>
            <span>${escapeHtml(message)}</span>
        </div>
    `;
    messagesContainer.appendChild(systemDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Render all messages
function renderMessages() {
    messagesContainer.innerHTML = '';
    currentDay = null;
    
    messages.forEach(message => {
        addMessage(message);
    });
}

// Format message content (basic markdown)
function formatMessageContent(content) {
    // Bold: **text**
    content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic: *text*
    content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Links: [text](url)
    content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    // Line breaks
    content = content.replace(/\n/g, '<br>');
    
    return content;
}

// Render online users
function renderOnlineUsers() {
    if (!onlineUsersList) return;
    
    if (onlineUsers.length === 0) {
        onlineUsersList.innerHTML = '<div class="no-online-users">No users online</div>';
        return;
    }
    
    onlineUsersList.innerHTML = onlineUsers.map(user => `
        <div class="online-user-item">
            <div class="online-user-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="online-user-name">${escapeHtml(user.username)}</div>
        </div>
    `).join('');
}

// Clear messages
function clearMessages() {
    messages = [];
    messagesContainer.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-comments"></i>
            <p>No messages yet. Start the conversation!</p>
        </div>
    `;
    currentDay = null;
}

// Enable chat input
function enableChatInput() {
    messageInput.disabled = false;
    sendMessageBtn.disabled = false;
    formatBoldBtn.disabled = false;
    formatItalicBtn.disabled = false;
    formatLinkBtn.disabled = false;
}

// Disable chat input
function disableChatInput() {
    messageInput.disabled = true;
    sendMessageBtn.disabled = true;
    formatBoldBtn.disabled = true;
    formatItalicBtn.disabled = true;
    formatLinkBtn.disabled = true;
}

// Enable chat functionality
function enableChat() {
    enableChatInput();
}

// Disable chat functionality
function disableChat() {
    disableChatInput();
    clearMessages();
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // If today, show time only
    if (diff < 24 * 60 * 60 * 1000 && date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If yesterday, show "Yesterday"
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Otherwise show date and time
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getMessageDay(timestamp) {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString();
    }
}

// Export functions
window.addSystemMessage = addSystemMessage;
window.enableChatInput = enableChatInput;
window.disableChatInput = disableChatInput;
window.enableChat = enableChat;
window.disableChat = disableChat;
window.loadRoomMessages = loadRoomMessages;