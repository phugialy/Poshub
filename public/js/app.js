// Modern PostalHub App - SaaS Edition
const API_BASE_URL = window.location.origin;

// Global state
let currentUser = null;
let allTrackings = [];
let filteredTrackings = [];

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
const searchInput = document.getElementById('search-input');
const filterStatus = document.getElementById('filter-status');
const filterCarrier = document.getElementById('filter-carrier');
const userMenu = document.getElementById('user-menu');
const userAvatar = document.getElementById('user-avatar');

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
            localStorage.setItem('auth_token', event.data.token);
            window.location.reload();
        }
    });
}

// Check authentication status
async function checkAuth() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        
        if (token) {
            localStorage.setItem('auth_token', token);
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        const storedToken = localStorage.getItem('auth_token');
        
        if (storedToken) {
            const response = await fetch(`${API_BASE_URL}/api/auth/session`, {
                headers: {
                    'Authorization': `Bearer ${storedToken}`
                }
            });
            
            if (response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const session = await response.json();
                    currentUser = session.user;
                    showDashboard();
                    await loadDashboardData();
                } else {
                    localStorage.removeItem('auth_token');
                    showLogin();
                }
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
    loginBtn?.addEventListener('click', signInWithGooglePopup);
    loginContentBtn?.addEventListener('click', signInWithGooglePopup);
    logoutBtn?.addEventListener('click', signOut);
    trackingForm?.addEventListener('submit', handleTrackingSubmit);
    
    // Search and filters
    searchInput?.addEventListener('input', applyFilters);
    filterStatus?.addEventListener('change', applyFilters);
    filterCarrier?.addEventListener('change', applyFilters);
    
    // User menu dropdown
    userAvatar?.addEventListener('click', (e) => {
        e.stopPropagation();
        userMenu?.classList.toggle('hidden');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown')) {
            userMenu?.classList.add('hidden');
        }
    });
}

// Show login interface
function showLogin() {
    loginSection?.classList.add('hidden');
    userSection?.classList.add('hidden');
    loginContent?.classList.remove('hidden');
    dashboardContent?.classList.add('hidden');
}

// Show dashboard interface
function showDashboard() {
    if (!currentUser) return;
    
    loginSection?.classList.add('hidden');
    userSection?.classList.remove('hidden');
    loginContent?.classList.add('hidden');
    dashboardContent?.classList.remove('hidden');
    
    // Update user info
    const userNameEl = document.getElementById('user-name');
    const userEmailEl = document.getElementById('user-email');
    const welcomeNameEl = document.getElementById('welcome-name');
    
    if (userNameEl) userNameEl.textContent = currentUser.name || 'User';
    if (userEmailEl) userEmailEl.textContent = currentUser.email || '';
    if (welcomeNameEl) welcomeNameEl.textContent = currentUser.name?.split(' ')[0] || 'there';
    if (userAvatar) userAvatar.src = currentUser.image || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(currentUser.name || 'User');
}

// Sign in with Google (Popup method)
async function signInWithGooglePopup() {
    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/api/auth/google-url`);
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Server returned non-JSON response');
        }
        
        const data = await response.json();
        
        if (!data || !data.authUrl) {
            throw new Error('Invalid response from server');
        }
        
        const popup = window.open(
            data.authUrl,
            'google-auth',
            'width=500,height=600,scrollbars=yes,resizable=yes,top=100,left=100'
        );
        
        const checkClosed = setInterval(() => {
            if (popup.closed) {
                clearInterval(checkClosed);
                showLoading(false);
            }
        }, 1000);
        
    } catch (error) {
        console.error('Sign in error:', error);
        showToast('Failed to sign in. Please try again.', 'error');
        showLoading(false);
    }
}

// Sign out
async function signOut() {
    try {
        showLoading(true);
        localStorage.removeItem('auth_token');
        window.location.href = '/';
    } catch (error) {
        console.error('Sign out error:', error);
        showToast('Failed to sign out. Please try again.', 'error');
        showLoading(false);
    }
}

// Handle tracking form submission
async function handleTrackingSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const trackingData = {
        trackingNumber: formData.get('trackingNumber'),
        brand: formData.get('carrier') || undefined
    };
    
    try {
        showLoading(true);
        
        const token = localStorage.getItem('auth_token');
        if (!token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${API_BASE_URL}/api/tracking/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(trackingData)
        });
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Server returned non-JSON response');
        }
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Failed to add tracking');
        }
        
        e.target.reset();
        await loadDashboardData();
        showToast('Tracking added successfully!', 'success');
        
    } catch (error) {
        console.error('Tracking submission error:', error);
        showToast(error.message || 'Failed to add tracking', 'error');
    } finally {
        showLoading(false);
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        
        const [dashboardResponse, requestsResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/api/user/dashboard`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${API_BASE_URL}/api/tracking/user`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);
        
        if (dashboardResponse.ok) {
            const contentType = dashboardResponse.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const dashboardData = await dashboardResponse.json();
                updateDashboardStats(dashboardData.stats || {});
            }
        }
        
        if (requestsResponse.ok) {
            const contentType = requestsResponse.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const requestsData = await requestsResponse.json();
                allTrackings = requestsData.trackings || [];
                applyFilters();
            }
        }
        
    } catch (error) {
        console.error('Load dashboard error:', error);
    }
}

// Update dashboard statistics
function updateDashboardStats(stats) {
    const totalEl = document.getElementById('stat-total');
    const pendingEl = document.getElementById('stat-pending');
    const processingEl = document.getElementById('stat-processing');
    const completedEl = document.getElementById('stat-completed');
    
    if (totalEl) totalEl.textContent = stats.total || 0;
    if (pendingEl) pendingEl.textContent = stats.pending || 0;
    if (processingEl) processingEl.textContent = stats.processing || 0;
    if (completedEl) completedEl.textContent = stats.completed || 0;
}

// Apply search and filters
function applyFilters() {
    const searchTerm = searchInput?.value.toLowerCase() || '';
    const statusFilter = filterStatus?.value || '';
    const carrierFilter = filterCarrier?.value || '';
    
    filteredTrackings = allTrackings.filter(tracking => {
        const matchesSearch = !searchTerm || 
            tracking.trackingNumber.toLowerCase().includes(searchTerm) ||
            tracking.brand.toLowerCase().includes(searchTerm);
        
        const matchesStatus = !statusFilter || tracking.status === statusFilter;
        const matchesCarrier = !carrierFilter || tracking.brand.toLowerCase() === carrierFilter.toLowerCase();
        
        return matchesSearch && matchesStatus && matchesCarrier;
    });
    
    updateTrackingList(filteredTrackings);
    
    // Update count
    const countEl = document.getElementById('tracking-count');
    if (countEl) {
        const count = filteredTrackings.length;
        countEl.textContent = `${count} package${count !== 1 ? 's' : ''}`;
    }
}

// Update tracking list
function updateTrackingList(trackings) {
    if (!trackingList) return;
    
    if (!trackings || trackings.length === 0) {
        trackingList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="fas fa-box-open text-6xl"></i>
                </div>
                <h3 class="text-lg font-semibold text-gray-700 mb-2">No packages found</h3>
                <p class="text-gray-500">${allTrackings.length === 0 ? 'Add your first tracking number to get started!' : 'Try adjusting your search or filters.'}</p>
            </div>
        `;
        return;
    }
    
    const listHTML = trackings.map((tracking, index) => {
        const statusClass = getStatusClass(tracking.status);
        const carrierName = getCarrierDisplayName(tracking.brand);
        const carrierIcon = getCarrierIcon(tracking.brand);
        const dateAdded = new Date(tracking.dateAdded).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
        
        return `
            <div class="tracking-card fade-in" style="animation-delay: ${index * 0.05}s">
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div class="flex-1">
                        <div class="flex items-center gap-3 mb-3">
                            <div class="w-12 h-12 rounded-lg ${getCarrierColor(tracking.brand)} flex items-center justify-center">
                                <i class="${carrierIcon} text-white text-lg"></i>
                            </div>
                            <div class="flex-1">
                                <div class="flex items-center gap-2 mb-1">
                                    <h3 class="font-semibold text-gray-900 font-mono text-sm">${tracking.trackingNumber}</h3>
                                    <span class="badge ${statusClass}">${formatStatus(tracking.status)}</span>
                                </div>
                                <p class="text-sm text-gray-600">
                                    <i class="fas fa-truck mr-1"></i>
                                    ${carrierName}
                                </p>
                            </div>
                        </div>
                        ${tracking.description ? `
                            <p class="text-sm text-gray-600 mb-2">
                                <i class="fas fa-tag mr-1"></i>
                                ${tracking.description}
                            </p>
                        ` : ''}
                        <p class="text-xs text-gray-400">
                            <i class="far fa-calendar mr-1"></i>
                            Added ${dateAdded}
                        </p>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="viewTrackingUrl('${tracking.id}')" 
                                class="btn btn-secondary btn-sm" 
                                title="View on carrier website">
                            <i class="fas fa-external-link-alt"></i>
                            <span class="hidden md:inline">View</span>
                        </button>
                        <button onclick="editTracking('${tracking.id}')" 
                                class="btn btn-ghost btn-sm" 
                                title="Edit tracking">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteTracking('${tracking.id}')" 
                                class="btn btn-ghost btn-sm text-red-600 hover:text-red-700" 
                                title="Delete tracking">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    trackingList.innerHTML = listHTML;
}

// View tracking URL (opens carrier tracking page)
async function viewTrackingUrl(trackingId) {
    try {
        showLoading(true);
        const token = localStorage.getItem('auth_token');
        
        const response = await fetch(`${API_BASE_URL}/api/tracking/${trackingId}/url`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error('Failed to get tracking URL');
        }
        
        const data = await response.json();
        
        if (data.url) {
            // Open in new window/popup
            const popup = window.open(
                data.url,
                'tracking',
                'width=900,height=700,scrollbars=yes,resizable=yes'
            );
            
            if (!popup) {
                // Fallback if popup blocked
                window.open(data.url, '_blank');
            }
            
            showToast(`Opening ${data.carrierDisplayName || data.carrier} tracking page...`, 'info');
        }
    } catch (error) {
        console.error('View tracking URL error:', error);
        showToast('Failed to open tracking page', 'error');
    } finally {
        showLoading(false);
    }
}

// Edit tracking
async function editTracking(trackingId) {
    const tracking = allTrackings.find(t => t.id === trackingId);
    if (!tracking) return;
    
    // Simple prompt for now - can be enhanced with modal
    const newDescription = prompt('Edit description (optional):', tracking.description || '');
    if (newDescription === null) return; // User cancelled
    
    try {
        showLoading(true);
        const token = localStorage.getItem('auth_token');
        
        const response = await fetch(`${API_BASE_URL}/api/tracking/update`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                id: trackingId,
                description: newDescription
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update tracking');
        }
        
        await loadDashboardData();
        showToast('Tracking updated successfully!', 'success');
    } catch (error) {
        console.error('Edit tracking error:', error);
        showToast('Failed to update tracking', 'error');
    } finally {
        showLoading(false);
    }
}

// Delete tracking
async function deleteTracking(trackingId) {
    if (!confirm('Are you sure you want to delete this tracking?')) {
        return;
    }
    
    try {
        showLoading(true);
        const token = localStorage.getItem('auth_token');
        
        const response = await fetch(`${API_BASE_URL}/api/tracking/delete`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ id: trackingId })
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete tracking');
        }
        
        await loadDashboardData();
        showToast('Tracking deleted successfully', 'success');
    } catch (error) {
        console.error('Delete tracking error:', error);
        showToast('Failed to delete tracking', 'error');
    } finally {
        showLoading(false);
    }
}

// Helper functions
function getStatusClass(status) {
    const statusMap = {
        'pending': 'badge-pending',
        'processing': 'badge-processing',
        'completed': 'badge-completed',
        'failed': 'badge-failed'
    };
    return statusMap[status] || 'badge-pending';
}

function formatStatus(status) {
    const statusMap = {
        'pending': 'Pending',
        'processing': 'In Transit',
        'completed': 'Delivered',
        'failed': 'Failed'
    };
    return statusMap[status] || status;
}

function getCarrierDisplayName(brand) {
    const carriers = {
        'usps': 'USPS',
        'ups': 'UPS',
        'fedex': 'FedEx',
        'dhl': 'DHL',
        'amazon': 'Amazon'
    };
    return carriers[brand?.toLowerCase()] || brand || 'Unknown';
}

function getCarrierIcon(brand) {
    const icons = {
        'usps': 'fas fa-mail-bulk',
        'ups': 'fas fa-truck',
        'fedex': 'fas fa-shipping-fast',
        'dhl': 'fas fa-globe',
        'amazon': 'fab fa-amazon'
    };
    return icons[brand?.toLowerCase()] || 'fas fa-box';
}

function getCarrierColor(brand) {
    const colors = {
        'usps': 'bg-blue-600',
        'ups': 'bg-yellow-600',
        'fedex': 'bg-purple-600',
        'dhl': 'bg-red-600',
        'amazon': 'bg-orange-600'
    };
    return colors[brand?.toLowerCase()] || 'bg-gray-600';
}

// Show loading overlay
function showLoading(show) {
    if (show) {
        loadingOverlay?.classList.remove('hidden');
    } else {
        loadingOverlay?.classList.add('hidden');
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? 'fa-check-circle' : 
                 type === 'error' ? 'fa-exclamation-circle' : 
                 'fa-info-circle';
    
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Make functions globally available for onclick handlers
window.viewTrackingUrl = viewTrackingUrl;
window.editTracking = editTracking;
window.deleteTracking = deleteTracking;
