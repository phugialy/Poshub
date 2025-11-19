/**
 * PostalHub API Client
 * Handles all API communication with the backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  /**
   * Get stored authentication token
   */
  getToken() {
    return localStorage.getItem('auth_token');
  }

  /**
   * Store authentication token
   */
  setToken(token) {
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  /**
   * Make API request with authentication
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getToken();

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        if (response.ok) {
          return { success: true };
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  // ==================== AUTH METHODS ====================

  /**
   * Login with email and password
   */
  async login(email, password) {
    const response = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.token) {
      this.setToken(response.token);
    }

    return response;
  }

  /**
   * Register new user
   */
  async register(email, password, name) {
    const response = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });

    if (response.token) {
      this.setToken(response.token);
    }

    return response;
  }

  /**
   * Get current session/user
   */
  async getSession() {
    return await this.request('/api/auth/session');
  }

  /**
   * Logout user
   */
  async logout() {
    try {
      await this.request('/api/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.setToken(null);
    }
  }

  /**
   * Initiate Google OAuth
   */
  getGoogleAuthUrl() {
    return `${this.baseURL}/api/auth/google`;
  }

  // ==================== TRACKING METHODS ====================

  /**
   * Add new tracking number (with auto carrier detection)
   */
  async addTracking(trackingNumber, description = '', carrier = null) {
    const body = { trackingNumber, description };
    if (carrier) {
      body.brand = carrier;
    }

    return await this.request('/api/tracking/add', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * Get all tracking requests for current user
   */
  async getTrackingList() {
    return await this.request('/api/tracking/requests');
  }

  /**
   * Get specific tracking request
   */
  async getTracking(id) {
    return await this.request(`/api/tracking/requests/${id}`);
  }

  /**
   * Update tracking request
   */
  async updateTracking(id, data) {
    return await this.request('/api/tracking/update', {
      method: 'PUT',
      body: JSON.stringify({
        id,
        ...data,
      }),
    });
  }

  /**
   * Delete tracking request
   */
  async deleteTracking(id) {
    return await this.request('/api/tracking/delete', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });
  }

  /**
   * Get tracking URL for carrier
   */
  async getTrackingUrl(id) {
    return await this.request(`/api/tracking/${id}/url`);
  }

  /**
   * Get available carriers
   */
  async getCarriers() {
    return await this.request('/api/tracking/carriers');
  }

  // ==================== USER METHODS ====================

  /**
   * Get user dashboard data
   */
  async getDashboard() {
    return await this.request('/api/user/dashboard');
  }

  /**
   * Get user profile
   */
  async getProfile() {
    return await this.request('/api/user/profile');
  }

  /**
   * Update user profile
   */
  async updateProfile(data) {
    return await this.request('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
}

export default new ApiClient();

