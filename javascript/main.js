// Main application initialization and utilities
document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    initRooms();
    initChat();
    showEmptyState();
    setupErrorHandling();
    setupConnectionStatus();
});

// Show empty state when no room is selected
function showEmptyState() {
    const messagesContainer = document.getElementById('messages-container');
    if (messagesContainer) {
        messagesContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comments"></i>
                <p>Select a chat room to start messaging</p>
            </div>
        `;
    }
}

// Setup error handling
function setupErrorHandling() {
    // Handle Firebase connection errors
    window.addEventListener('error', (event) => {
        console.error('Application error:', event.error);
        showNotification('An error occurred. Please refresh the page.', 'error');
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        showNotification('Connection error. Please check your internet connection.', 'error');
    });
}

// Setup connection status
function setupConnectionStatus() {
    const userStatus = document.getElementById('user-status');
    
    // Listen for Firebase connection state
    const connectedRef = firebase.ref(firebase.database, '.info/connected');
    firebase.onValue(connectedRef, (snapshot) => {
        if (snapshot.val() === true) {
            userStatus.textContent = 'Online';
            userStatus.className = 'online';
        } else {
            userStatus.textContent = 'Offline';
            userStatus.className = 'offline';
        }
    });
}

// Notification system
let notificationId = 0;
const notifications = new Map();

function showNotification(message, type = 'info', duration = 5000) {
    const id = ++notificationId;
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.id = `notification-${id}`;
    
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${escapeHtml(message)}</span>
            <button class="notification-close" onclick="removeNotification(${id})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Add to page
    let notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        notificationContainer.className = 'notification-container';
        document.body.appendChild(notificationContainer);
    }
    
    notificationContainer.appendChild(notification);
    notifications.set(id, notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Auto remove after duration
    if (duration > 0) {
        setTimeout(() => {
            removeNotification(id);
        }, duration);
    }
    
    return id;
}

function removeNotification(id) {
    const notification = notifications.get(id);
    if (notification) {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            notifications.delete(id);
        }, 300);
    }
}

function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        case 'info': return 'fa-info-circle';
        default: return 'fa-info-circle';
    }
}

function getNotificationColor(type) {
    switch (type) {
        case 'success': return '#4caf50';
        case 'error': return '#f44336';
        case 'warning': return '#ff9800';
        case 'info': return '#2196f3';
        default: return '#2196f3';
    }
}

// Add notification styles if not already present
function addNotificationStyles() {
    if (document.getElementById('notification-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        .notification-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
        }
        
        .notification {
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            margin-bottom: 10px;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            border-left: 4px solid #2196f3;
        }
        
        .notification.show {
            transform: translateX(0);
        }
        
        .notification-content {
            display: flex;
            align-items: center;
            padding: 12px 16px;
            gap: 8px;
        }
        
        .notification i {
            font-size: 16px;
        }
        
        .notification-success {
            border-left-color: #4caf50;
        }
        
        .notification-error {
            border-left-color: #f44336;
        }
        
        .notification-warning {
            border-left-color: #ff9800;
        }
        
        .notification-info {
            border-left-color: #2196f3;
        }
        
        .notification-close {
            background: none;
            border: none;
            cursor: pointer;
            padding: 4px;
            margin-left: auto;
            opacity: 0.6;
            transition: opacity 0.2s;
        }
        
        .notification-close:hover {
            opacity: 1;
        }
    `;
    
    document.head.appendChild(style);
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize notification styles
addNotificationStyles();

// Export functions
window.showNotification = showNotification;
window.removeNotification = removeNotification;