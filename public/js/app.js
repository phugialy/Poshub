// NextAuth.js configuration
const NEXTAUTH_URL = window.location.origin;

// API base URL
const API_BASE_URL = window.location.origin;

// Global state
let currentUser = null;

// DOM elements
const loginSection = document.getElementById('login-section');
const userSection = document.getElementById('user-section');
const loginContent = document.getElementById('login-content');
const dashboardContent = document.getElementById('dashboard-content');
const loginBtn = document.getElementById('login-btn');
const loginContentBtn = document.getElementById('login-content-btn');
const logoutBtn = document.getElementById('logout-btn');
const trackingForm = document.getElementById('tracking-form');
const trackingList = document.getElementById('tracking-list');
const loadingOverlay = document.getElementById('loading-overlay');

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    setupEventListeners();
    setupPopupMessageListener();
});

// Listen for popup messages
function setupPopupMessageListener() {
    window.addEventListener('message', (event) => {
        if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
            // Store token and reload to update auth state
            localStorage.setItem('auth_token', event.data.token);
            window.location.reload();
        }
    });
}

// Check authentication status
async function checkAuth() {
    try {
        // Check for token in URL (from OAuth callback)
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        
        if (token) {
            localStorage.setItem('auth_token', token);
            // Remove token from URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        const storedToken = localStorage.getItem('auth_token');
        
        if (storedToken) {
            // Verify token with server
            const response = await fetch(`${NEXTAUTH_URL}/api/auth/session`, {
                headers: {
                    'Authorization': `Bearer ${storedToken}`
                }
            });
            
            if (response.ok) {
                const session = await response.json();
                currentUser = session.user;
                showDashboard();
                await loadDashboardData();
            } else {
                localStorage.removeItem('auth_token');
                showLogin();
            }
        } else {
            showLogin();
        }
    } catch (error) {
        console.error('Auth check error:', error);
        showLogin();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Login buttons - use popup method
    loginBtn?.addEventListener('click', signInWithGooglePopup);
    loginContentBtn?.addEventListener('click', signInWithGooglePopup);
    
    // Logout button
    logoutBtn?.addEventListener('click', signOut);
    
    // Tracking form
    trackingForm?.addEventListener('submit', handleTrackingSubmit);
}

// Show login interface
function showLogin() {
    loginSection.classList.remove('hidden');
    userSection.classList.add('hidden');
    loginContent.classList.remove('hidden');
    dashboardContent.classList.add('hidden');
}

// Show dashboard interface
function showDashboard() {
    if (!currentUser) return;
    
    loginSection.classList.add('hidden');
    userSection.classList.remove('hidden');
    loginContent.classList.add('hidden');
    dashboardContent.classList.remove('hidden');
    
    // Update user info
    document.getElementById('user-name').textContent = currentUser.name || 'User';
    document.getElementById('user-email').textContent = currentUser.email || '';
    document.getElementById('user-avatar').src = currentUser.image || 'https://via.placeholder.com/40';
}

// Sign in with Google (Redirect method)
async function signInWithGoogle() {
    try {
        showLoading(true);
        // Redirect to our custom Google OAuth
        window.location.href = `${NEXTAUTH_URL}/api/auth/google`;
    } catch (error) {
        console.error('Sign in error:', error);
        alert('Failed to sign in. Please try again.');
        showLoading(false);
    }
}

// Sign in with Google (Popup method)
async function signInWithGooglePopup() {
    try {
        showLoading(true);
        
        // Get the OAuth URL from server
        const response = await fetch(`${NEXTAUTH_URL}/api/auth/google-url`);
        const data = await response.json();
        
        // Open popup window
        const popup = window.open(
            data.authUrl,
            'google-auth',
            'width=500,height=600,scrollbars=yes,resizable=yes,top=100,left=100'
        );
        
        // Listen for popup completion
        const checkClosed = setInterval(() => {
            if (popup.closed) {
                clearInterval(checkClosed);
                showLoading(false);
                // The popup message listener will handle token storage and reload
            }
        }, 1000);
        
    } catch (error) {
        console.error('Sign in error:', error);
        alert('Failed to sign in. Please try again.');
        showLoading(false);
    }
}

// Sign out
async function signOut() {
    try {
        showLoading(true);
        // Clear token and reload page
        localStorage.removeItem('auth_token');
        window.location.href = '/';
    } catch (error) {
        console.error('Sign out error:', error);
        alert('Failed to sign out. Please try again.');
        showLoading(false);
    }
}

// Handle tracking form submission
async function handleTrackingSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const trackingData = {
        trackingNumber: formData.get('trackingNumber'),
        carrier: formData.get('carrier')
    };
    
    try {
        showLoading(true);
        
        const token = localStorage.getItem('auth_token');
        
        if (!token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${API_BASE_URL}/api/tracking/track`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(trackingData)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Failed to add tracking');
        }
        
        // Reset form
        e.target.reset();
        
        // Reload dashboard data
        await loadDashboardData();
        
        // Show success message
        showNotification('Tracking added successfully!', 'success');
        
    } catch (error) {
        console.error('Tracking submission error:', error);
        showNotification(error.message || 'Failed to add tracking', 'error');
    } finally {
        showLoading(false);
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        const token = localStorage.getItem('auth_token');
        
        if (!token) {
            console.error('No token found');
            return;
        }
        
        // Load dashboard stats and tracking data
        const [dashboardResponse, requestsResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/api/user/dashboard`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }),
            fetch(`${API_BASE_URL}/api/tracking/requests`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
        ]);
        
        const dashboardData = await dashboardResponse.json();
        const requestsData = await requestsResponse.json();
        
        if (dashboardResponse.ok) {
            updateDashboardStats(dashboardData.stats);
            updateTrackingList(requestsData.requests);
        } else {
            console.error('Dashboard data error:', dashboardData);
        }
        
    } catch (error) {
        console.error('Load dashboard error:', error);
    }
}

// Update dashboard statistics
function updateDashboardStats(stats) {
    document.getElementById('stat-total').textContent = stats.total || 0;
    document.getElementById('stat-pending').textContent = stats.pending || 0;
    document.getElementById('stat-processing').textContent = stats.processing || 0;
    document.getElementById('stat-completed').textContent = stats.completed || 0;
}

// Update tracking list
function updateTrackingList(requests) {
    if (!requests || requests.length === 0) {
        trackingList.innerHTML = `
            <div class="text-center text-gray-500 py-8">
                <svg class="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                </svg>
                <p>No packages tracked yet. Add your first tracking number above!</p>
            </div>
        `;
        return;
    }
    
    const listHTML = requests.map(request => {
        const statusClass = getStatusClass(request.status);
        const carrierName = request.carriers?.display_name || request.carriers?.name || 'Unknown';
        const shipment = request.shipments?.[0];
        
        return `
            <div class="border border-gray-200 rounded-lg p-4 mb-4 hover:shadow-md transition-shadow">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h3 class="font-medium text-gray-900">${request.tracking_number}</h3>
                        <p class="text-sm text-gray-600">${carrierName}</p>
                    </div>
                    <span class="px-2 py-1 rounded-full text-xs font-medium ${statusClass}">
                        ${request.status}
                    </span>
                </div>
                ${shipment ? `
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                            <span class="text-gray-500">Status:</span>
                            <p class="font-medium">${shipment.current_status || 'Unknown'}</p>
                        </div>
                        <div>
                            <span class="text-gray-500">Location:</span>
                            <p class="font-medium">${shipment.current_location || 'Unknown'}</p>
                        </div>
                        <div>
                            <span class="text-gray-500">Expected Delivery:</span>
                            <p class="font-medium">${shipment.expected_delivery_date || 'Not available'}</p>
                        </div>
                    </div>
                ` : `
                    <div class="text-sm text-gray-500">
                        ${request.status === 'pending' ? 'Waiting to process...' : 
                          request.status === 'processing' ? 'Processing tracking data...' :
                          request.status === 'failed' ? 'Failed to retrieve tracking data' : 
                          'No shipment data available'}
                    </div>
                `}
                <div class="text-xs text-gray-400 mt-2">
                    Added: ${new Date(request.created_at).toLocaleDateString()}
                </div>
            </div>
        `;
    }).join('');
    
    trackingList.innerHTML = listHTML;
}

// Get status CSS class
function getStatusClass(status) {
    switch (status) {
        case 'pending': return 'status-pending';
        case 'processing': return 'status-processing';
        case 'completed': return 'status-completed';
        case 'failed': return 'status-failed';
        default: return 'bg-gray-100 text-gray-800';
    }
}

// Show loading overlay
function showLoading(show) {
    if (show) {
        loadingOverlay.classList.remove('hidden');
    } else {
        loadingOverlay.classList.add('hidden');
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}
