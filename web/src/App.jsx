import { useState, useEffect } from 'react'
import api from './lib/api'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
    
    // Global message listener as fallback (in case Login component unmounts)
    const globalMessageHandler = (event) => {
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:5173',
        window.location.origin
      ];
      
      const isLocalhost = event.origin.includes('localhost') || event.origin.includes('127.0.0.1');
      const isValidOrigin = allowedOrigins.includes(event.origin) || isLocalhost;
      
      if (!isValidOrigin) {
        console.log('Global handler: Invalid origin', event.origin);
        return;
      }
      
      if (event.data && event.data.type === 'GOOGLE_AUTH_SUCCESS' && event.data.token) {
        console.log('🌐 Global handler: Received OAuth success from', event.origin);
        console.log('🌐 Global handler: Token received:', event.data.token ? 'Yes' : 'No');
        
        api.setToken(event.data.token);
        const storedToken = api.getToken();
        console.log('🌐 Global handler: Token stored:', storedToken ? 'Yes' : 'No');
        
        // Fetch session and update state
        console.log('🌐 Global handler: Fetching session...');
        api.getSession()
          .then(session => {
            console.log('🌐 Global handler: Session fetched', session);
            if (session && session.user) {
              console.log('🌐 Global handler: Setting user state...');
              setUser(session.user);
              console.log('🌐 Global handler: User state updated');
            } else {
              console.error('🌐 Global handler: No user in session:', session);
            }
          })
          .catch(err => {
            console.error('🌐 Global handler session error:', err);
            console.error('🌐 Global handler error details:', {
              message: err.message,
              stack: err.stack
            });
          });
      }
    };
    
    window.addEventListener('message', globalMessageHandler);
    
    // Close any OAuth popup windows if user is already logged in
    const closeOAuthPopups = () => {
      // If this IS a popup window (has opener), close it if we have a token
      if (window.opener !== null) {
        const token = api.getToken()
        if (token) {
          try {
            window.close()
          } catch (e) {
            // Ignore - popup might be blocked
          }
        }
      }
    }
    
    // Check after a short delay
    const timer = setTimeout(closeOAuthPopups, 1000)
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('message', globalMessageHandler);
    }
  }, []) // Remove user from deps to avoid re-adding listener

  const checkAuth = async () => {
    try {
      // Check for token in URL (fallback from OAuth redirect)
      const urlParams = new URLSearchParams(window.location.search)
      const tokenFromUrl = urlParams.get('token')
      
      if (tokenFromUrl) {
        api.setToken(tokenFromUrl)
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname)
      }

      const token = api.getToken()
      if (!token) {
        setLoading(false)
        return
      }

      const session = await api.getSession()
      if (session && session.user) {
        setUser(session.user)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      api.setToken(null)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = (userData) => {
    setUser(userData)
    // Close any OAuth popup windows
    // Try to close popups that might still be open
    try {
      // If this window is a popup, close it
      if (window.opener && window.name === 'Google Login') {
        window.close()
      }
    } catch (e) {
      // Ignore errors
    }
  }

  const handleLogout = async () => {
    await api.logout()
    setUser(null)
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="app">
      {user ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </div>
  )
}

export default App

