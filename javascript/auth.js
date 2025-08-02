// Authentication management using Firebase
let currentUser = null;
let isAuthenticated = false;

// DOM elements
const authScreen = document.getElementById('auth-screen');
const chatScreen = document.getElementById('chat-screen');
const emailInput = document.getElementById('email-input');
const usernameInput = document.getElementById('username-input');
const signInBtn = document.getElementById('sign-in-btn');
const signOutBtn = document.getElementById('sign-out-btn');
const authError = document.getElementById('auth-error');
const currentUsername = document.getElementById('current-username');
const userStatus = document.getElementById('user-status');

// Initialize authentication
function initAuth() {
    setupAuthEventListeners();
    setupFirebaseAuthListener();
}

// Setup event listeners for authentication
function setupAuthEventListeners() {
    signInBtn.addEventListener('click', handleSignIn);
    signOutBtn.addEventListener('click', handleSignOut);
    
    // Handle Enter key in inputs
    emailInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSignIn();
    });
    
    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSignIn();
    });
}

// Setup Firebase authentication listener
function setupFirebaseAuthListener() {
    firebase.onAuthStateChanged(firebase.auth, (user) => {
        if (user) {
            // User is signed in
            handleAuthSuccess(user);
        } else {
            // User is signed out
            handleSignOut();
        }
    });
}

// Handle sign in
async function handleSignIn() {
    const email = emailInput.value.trim();
    const username = usernameInput.value.trim();
    
    // Validate inputs
    if (!email || !username) {
        showAuthError('Please enter both email and username');
        return;
    }
    
    if (username.length < 3 || username.length > 20) {
        showAuthError('Username must be between 3 and 20 characters');
        return;
    }
    
    // Check if username is available
    const isUsernameAvailable = await checkUsernameAvailability(username);
    if (!isUsernameAvailable) {
        showAuthError('Username is already taken');
        return;
    }
    
    try {
        signInBtn.disabled = true;
        signInBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';
        
        // Sign in anonymously with Firebase
        const userCredential = await firebase.signInAnonymously(firebase.auth);
        const user = userCredential.user;
        
        // Store user data in Firebase
        await storeUserData(user.uid, email, username);
        
    } catch (error) {
        console.error('Sign in error:', error);
        showAuthError('Failed to sign in. Please try again.');
        resetSignInButton();
    }
}

// Check if username is available
async function checkUsernameAvailability(username) {
    try {
        const usernameRef = firebase.ref(firebase.database, 'usernames/' + username);
        const snapshot = await firebase.get(usernameRef);
        return !snapshot.exists();
    } catch (error) {
        console.error('Error checking username:', error);
        return false;
    }
}

// Store user data in Firebase
async function storeUserData(uid, email, username) {
    try {
        // Store user profile
        const userRef = firebase.ref(firebase.database, 'users/' + uid);
        await firebase.set(userRef, {
            email: email,
            username: username,
            createdAt: Date.now(),
            lastSeen: Date.now(),
            isOnline: true
        });
        
        // Reserve username
        const usernameRef = firebase.ref(firebase.database, 'usernames/' + username);
        await firebase.set(usernameRef, uid);
        
    } catch (error) {
        console.error('Error storing user data:', error);
        throw error;
    }
}

// Handle successful authentication
function handleAuthSuccess(user) {
    currentUser = user;
    isAuthenticated = true;
    
    // Get user data from Firebase
    getUserData(user.uid).then(userData => {
        if (userData) {
            currentUser = { ...user, ...userData };
            updateUIForAuthenticatedUser();
            enableChatFeatures();
        }
    });
}

// Get user data from Firebase
async function getUserData(uid) {
    try {
        const userRef = firebase.ref(firebase.database, 'users/' + uid);
        const snapshot = await firebase.get(userRef);
        return snapshot.val();
    } catch (error) {
        console.error('Error getting user data:', error);
        return null;
    }
}

// Update UI for authenticated user
function updateUIForAuthenticatedUser() {
    authScreen.classList.add('hidden');
    chatScreen.classList.remove('hidden');
    
    if (currentUser && currentUser.username) {
        currentUsername.textContent = currentUser.username;
    }
    
    userStatus.textContent = 'Online';
    userStatus.className = 'online';
}

// Handle sign out
async function handleSignOut() {
    try {
        // Update user status to offline
        if (currentUser && currentUser.uid) {
            const userRef = firebase.ref(firebase.database, 'users/' + currentUser.uid + '/isOnline');
            await firebase.set(userRef, false);
        }
        
        // Sign out from Firebase
        await firebase.auth.signOut(firebase.auth);
        
    } catch (error) {
        console.error('Sign out error:', error);
    } finally {
        // Reset UI
        currentUser = null;
        isAuthenticated = false;
        
        authScreen.classList.remove('hidden');
        chatScreen.classList.add('hidden');
        
        // Clear inputs
        emailInput.value = '';
        usernameInput.value = '';
        
        // Reset button
        resetSignInButton();
        
        // Clear error
        clearAuthError();
        
        // Disable chat features
        disableChatFeatures();
    }
}

// Reset sign in button
function resetSignInButton() {
    signInBtn.disabled = false;
    signInBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
}

// Show authentication error
function showAuthError(message) {
    authError.textContent = message;
    authError.style.display = 'block';
}

// Clear authentication error
function clearAuthError() {
    authError.textContent = '';
    authError.style.display = 'none';
}

// Enable chat features
function enableChatFeatures() {
    // This will be called by other modules
    if (typeof enableRooms === 'function') enableRooms();
    if (typeof enableChat === 'function') enableChat();
}

// Disable chat features
function disableChatFeatures() {
    // This will be called by other modules
    if (typeof disableRooms === 'function') disableRooms();
    if (typeof disableChat === 'function') disableChat();
}

// Export functions
window.getCurrentUser = () => currentUser;
window.isUserAuthenticated = () => isAuthenticated;