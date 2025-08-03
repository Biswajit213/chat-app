// Authentication management using Firebase
let currentUser = null;
let isAuthenticated = false;
let currentAuthMode = 'login'; // 'login' or 'register'

// DOM elements
const authScreen = document.getElementById('auth-screen');
const chatScreen = document.getElementById('chat-screen');
const authError = document.getElementById('auth-error');
const currentUsername = document.getElementById('current-username');
const userStatus = document.getElementById('user-status');
const signOutBtn = document.getElementById('sign-out-btn');

// Auth mode toggle elements
const loginModeBtn = document.getElementById('login-mode-btn');
const registerModeBtn = document.getElementById('register-mode-btn');

// Login form elements
const loginForm = document.getElementById('login-form');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const loginBtn = document.getElementById('login-btn');
const forgotPasswordBtn = document.getElementById('forgot-password-btn');

// Register form elements
const registerForm = document.getElementById('register-form');
const registerEmail = document.getElementById('register-email');
const registerUsername = document.getElementById('register-username');
const registerPassword = document.getElementById('register-password');
const registerConfirmPassword = document.getElementById('register-confirm-password');
const registerBtn = document.getElementById('register-btn');

// Quick sign in elements
const quickSigninBtn = document.getElementById('quick-signin-btn');

// Password reset modal elements
const passwordResetModal = document.getElementById('password-reset-modal');
const closePasswordResetModal = document.getElementById('close-password-reset-modal');
const resetEmail = document.getElementById('reset-email');
const sendResetEmailBtn = document.getElementById('send-reset-email-btn');
const resetMessage = document.getElementById('reset-message');

// Initialize authentication
function initAuth() {
    setupAuthEventListeners();
    setupFirebaseAuthListener();
}

// Setup event listeners for authentication
function setupAuthEventListeners() {
    // Auth mode toggle
    loginModeBtn.addEventListener('click', () => switchAuthMode('login'));
    registerModeBtn.addEventListener('click', () => switchAuthMode('register'));
    
    // Login form
    loginForm.addEventListener('submit', handleLogin);
    forgotPasswordBtn.addEventListener('click', showPasswordResetModal);
    
    // Register form
    registerForm.addEventListener('submit', handleRegister);
    
    // Quick sign in
    quickSigninBtn.addEventListener('click', handleQuickSignIn);
    
    // Password reset modal
    closePasswordResetModal.addEventListener('click', hidePasswordResetModal);
    sendResetEmailBtn.addEventListener('click', handlePasswordReset);
    
    // Sign out
    signOutBtn.addEventListener('click', handleSignOut);
    
    // Handle Enter key in inputs and clear errors on input
    [loginEmail, loginPassword, registerEmail, registerUsername, registerPassword, registerConfirmPassword].forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (currentAuthMode === 'login') {
                    handleLogin();
                } else {
                    handleRegister();
                }
            }
        });
        
        // Clear error message when user starts typing
        input.addEventListener('input', () => {
            if (authError.style.display !== 'none') {
                clearAuthError();
            }
        });
    });
}

// Switch between login and register modes
function switchAuthMode(mode) {
    currentAuthMode = mode;
    
    // Clear any existing error messages first
    clearAuthError();
    
    if (mode === 'login') {
        loginModeBtn.classList.add('active');
        registerModeBtn.classList.remove('active');
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        
        // Clear register form fields
        registerEmail.value = '';
        registerUsername.value = '';
        registerPassword.value = '';
        registerConfirmPassword.value = '';
    } else {
        registerModeBtn.classList.add('active');
        loginModeBtn.classList.remove('active');
        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
        
        // Clear login form fields
        loginEmail.value = '';
        loginPassword.value = '';
    }
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

// Handle login
async function handleLogin(e) {
    if (e) e.preventDefault();
    
    const email = loginEmail.value.trim();
    const password = loginPassword.value;
    
    // Clear any previous error messages
    clearAuthError();
    
    // Validate inputs
    if (!email || !password) {
        showAuthError('Please enter both email and password');
        return;
    }
    
    try {
        setButtonLoading(loginBtn, 'Logging in...');
        
        // Sign in with email and password
        const userCredential = await firebase.signInWithEmailAndPassword(firebase.auth, email, password);
        const user = userCredential.user;
        
        // Get user data from Firebase
        const userData = await getUserData(user.uid);
        if (userData) {
            currentUser = { ...user, ...userData };
            updateUIForAuthenticatedUser();
            enableChatFeatures();
        }
        
    } catch (error) {
        console.error('Login error:', error);
        let errorMessage = 'Failed to login. Please try again.';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'No account found with this email address. Please register first or try a different email.';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Incorrect password. Please try again.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Please enter a valid email address.';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Too many failed attempts. Please try again later.';
                break;
            case 'auth/user-disabled':
                errorMessage = 'This account has been disabled.';
                break;
        }
        
        showAuthError(errorMessage);
        resetButton(loginBtn, 'Login');
    }
}

// Handle register
async function handleRegister(e) {
    if (e) e.preventDefault();
    
    const email = registerEmail.value.trim();
    const username = registerUsername.value.trim();
    const password = registerPassword.value;
    const confirmPassword = registerConfirmPassword.value;
    
    // Clear any previous error messages
    clearAuthError();
    
    // Validate inputs
    if (!email || !username || !password || !confirmPassword) {
        showAuthError('Please fill in all fields');
        return;
    }
    
    if (password !== confirmPassword) {
        showAuthError('Passwords do not match');
        return;
    }
    
    if (password.length < 6) {
        showAuthError('Password must be at least 6 characters long');
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
        setButtonLoading(registerBtn, 'Creating account...');
        
        // Create user with email and password
        const userCredential = await firebase.createUserWithEmailAndPassword(firebase.auth, email, password);
        const user = userCredential.user;
        
        // Store user data in Firebase
        await storeUserData(user.uid, email, username);
        
        // Switch to login mode after successful registration
        switchAuthMode('login');
        showAuthError('Account created successfully! You can now log in with your email and password.', 'success');
        
    } catch (error) {
        console.error('Registration error:', error);
        let errorMessage = 'Failed to create account. Please try again.';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'An account with this email already exists.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Please enter a valid email address.';
                break;
            case 'auth/weak-password':
                errorMessage = 'Password is too weak. Please choose a stronger password.';
                break;
        }
        
        showAuthError(errorMessage);
        resetButton(registerBtn, 'Register');
    }
}

// Handle quick sign in (anonymous)
async function handleQuickSignIn() {
    try {
        setButtonLoading(quickSigninBtn, 'Signing in...');
        
        // Generate a random username for anonymous users
        const randomUsername = `Guest_${Math.random().toString(36).substr(2, 6)}`;
        
        // Sign in anonymously with Firebase
        const userCredential = await firebase.signInAnonymously(firebase.auth);
        const user = userCredential.user;
        
        // Store user data in Firebase
        await storeUserData(user.uid, `anonymous_${user.uid}@guest.com`, randomUsername);
        
    } catch (error) {
        console.error('Quick sign in error:', error);
        showAuthError('Failed to sign in. Please try again.');
        resetButton(quickSigninBtn, 'Quick Sign In (Anonymous)');
    }
}

// Handle password reset
async function handlePasswordReset() {
    const email = resetEmail.value.trim();
    
    if (!email) {
        showResetMessage('Please enter your email address', 'error');
        return;
    }
    
    try {
        setButtonLoading(sendResetEmailBtn, 'Sending...');
        
        await firebase.sendPasswordResetEmail(firebase.auth, email);
        
        showResetMessage('Password reset email sent! Check your inbox.', 'success');
        resetEmail.value = '';
        
        // Hide modal after 3 seconds
        setTimeout(() => {
            hidePasswordResetModal();
        }, 3000);
        
    } catch (error) {
        console.error('Password reset error:', error);
        let errorMessage = 'Failed to send reset email. Please try again.';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'No account found with this email address.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Please enter a valid email address.';
                break;
        }
        
        showResetMessage(errorMessage, 'error');
        resetButton(sendResetEmailBtn, 'Send Reset Email');
    }
}

// Show password reset modal
function showPasswordResetModal() {
    passwordResetModal.classList.remove('hidden');
    resetEmail.focus();
    resetMessage.textContent = '';
    resetMessage.className = 'reset-message';
}

// Hide password reset modal
function hidePasswordResetModal() {
    passwordResetModal.classList.add('hidden');
    resetEmail.value = '';
    resetMessage.textContent = '';
    resetMessage.className = 'reset-message';
}

// Show reset message
function showResetMessage(message, type = '') {
    resetMessage.textContent = message;
    resetMessage.className = `reset-message ${type}`;
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
            
            // Connect to WebSocket and authenticate
            if (window.wsManager) {
                wsManager.connect().then(() => {
                    wsManager.authenticate(user.uid, userData.username);
                    
                    // Sync room state after a short delay to ensure authentication is complete
                    setTimeout(() => {
                        wsManager.syncRoom();
                    }, 500);
                }).catch(error => {
                    console.error('Failed to connect to WebSocket:', error);
                });
            }
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
        await firebase.signOut(firebase.auth);
        
    } catch (error) {
        console.error('Sign out error:', error);
    } finally {
        // Reset UI
        currentUser = null;
        isAuthenticated = false;
        
        authScreen.classList.remove('hidden');
        chatScreen.classList.add('hidden');
        
        // Clear inputs
        loginEmail.value = '';
        loginPassword.value = '';
        registerEmail.value = '';
        registerUsername.value = '';
        registerPassword.value = '';
        registerConfirmPassword.value = '';
        
        // Reset buttons
        resetButton(loginBtn, 'Login');
        resetButton(registerBtn, 'Register');
        resetButton(quickSigninBtn, 'Quick Sign In (Anonymous)');
        
        // Clear error
        clearAuthError();
        
        // Switch back to login mode
        switchAuthMode('login');
        
        // Disable chat features
        disableChatFeatures();
    }
}

// Set button loading state
function setButtonLoading(button, text) {
    button.disabled = true;
    button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
}

// Reset button to normal state
function resetButton(button, text) {
    button.disabled = false;
    button.innerHTML = text;
}

// Show authentication error
function showAuthError(message, type = 'error') {
    console.log('Showing auth error:', message, type);
    authError.textContent = message;
    authError.style.display = 'block';
    authError.className = `error-message ${type}`;
}

// Clear authentication error
function clearAuthError() {
    console.log('Clearing auth error');
    if (authError) {
        authError.textContent = '';
        authError.style.display = 'none';
        authError.className = 'error-message';
    }
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