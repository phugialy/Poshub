import { useState } from 'react'
import api from '../lib/api'
import OAuthDebugPanel from './OAuthDebugPanel'
import './Login.css'

function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      let response
      if (isRegister) {
        response = await api.register(email, password, name)
      } else {
        response = await api.login(email, password)
      }

      if (response.user) {
        onLogin(response.user)
      } else if (response.token) {
        // If we got a token, fetch user session
        const session = await api.getSession()
        if (session && session.user) {
          onLogin(session.user)
        }
      }
    } catch (err) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    // Clear previous debug logs
    localStorage.setItem('oauth_debug', '[]');
    localStorage.setItem('oauth_status', 'starting');
    
    const googleUrl = api.getGoogleAuthUrl()
    console.log('🚀 Opening OAuth popup:', googleUrl);
    
    // Open popup for OAuth
    const popup = window.open(
      googleUrl,
      'Google Login',
      'width=500,height=600,scrollbars=yes,resizable=yes'
    )
    
    if (!popup) {
      setError('Popup blocked. Please allow popups for this site.');
      return;
    }

    // Fallback: Check if popup is closed (in case message doesn't work)
    let checkPopup = null;

    // Listen for postMessage from popup
    const messageHandler = (event) => {
      // Verify origin in development (localhost) and production
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:5173',
        window.location.origin
      ];
      
      // In development, be more lenient with localhost
      const isLocalhost = event.origin.includes('localhost') || event.origin.includes('127.0.0.1');
      const isValidOrigin = allowedOrigins.includes(event.origin) || isLocalhost;
      
      // Log ALL messages for debugging
      console.log('📨 Message received:', {
        origin: event.origin,
        currentOrigin: window.location.origin,
        allowedOrigins: allowedOrigins,
        isLocalhost: isLocalhost,
        isValid: isValidOrigin,
        data: event.data
      });
      
      if (!isValidOrigin) {
        console.warn('⚠️ Rejected message from unauthorized origin:', event.origin);
        console.warn('Allowed origins:', allowedOrigins);
        console.warn('Current origin:', window.location.origin);
        return;
      }
      
      console.log('✅ Message origin validated:', event.origin);
      
      if (event.data && event.data.type === 'GOOGLE_AUTH_SUCCESS') {
        console.log('✅ Received OAuth success message from:', event.origin);
        console.log('📦 Message data:', event.data);
        
        // Update status
        localStorage.setItem('oauth_status', 'message_received');
        
        // Store the token
        if (event.data.token) {
          api.setToken(event.data.token)
          console.log('✅ Token stored in localStorage');
          localStorage.setItem('oauth_status', 'token_stored');
          
          // Verify token was stored
          const storedToken = api.getToken();
          if (!storedToken) {
            console.error('❌ Token storage failed!');
            localStorage.setItem('oauth_status', 'token_storage_failed');
            setError('Authentication failed: Token storage error')
            return;
          }
          console.log('✅ Token verified in localStorage');
        } else {
          console.error('❌ No token in OAuth message');
          localStorage.setItem('oauth_status', 'no_token_in_message');
          setError('Authentication failed: No token received')
          return;
        }
        
        // Remove listener and cleanup
        window.removeEventListener('message', messageHandler)
        if (checkPopup) {
          clearInterval(checkPopup)
        }
        
        // Fetch user session and update state
        console.log('🔄 Fetching user session...');
        localStorage.setItem('oauth_status', 'fetching_session');
        
        api.getSession()
          .then(session => {
            console.log('📋 Session response:', session);
            localStorage.setItem('oauth_status', 'session_fetched');
            
            if (session && session.user) {
              console.log('✅ User data:', session.user);
              console.log('🚀 Calling onLogin...');
              localStorage.setItem('oauth_status', 'calling_onlogin');
              onLogin(session.user)
              localStorage.setItem('oauth_status', 'success');
              console.log('✅ onLogin called successfully');
            } else {
              console.error('❌ Session fetch returned no user:', session);
              localStorage.setItem('oauth_status', 'no_user_in_session');
              setError('Failed to get user session')
            }
          })
          .catch(err => {
            console.error('❌ Session fetch error:', err);
            console.error('❌ Error details:', {
              message: err.message,
              stack: err.stack,
              response: err.response
            });
            localStorage.setItem('oauth_status', 'session_error: ' + err.message);
            setError('Authentication failed: ' + (err.message || 'Unknown error'))
          })
      }
    }

    // Add message listener
    window.addEventListener('message', messageHandler)
    console.log('👂 Added message listener for OAuth callback')
    
    // Debug: Log all messages (for troubleshooting)
    const debugMessageHandler = (event) => {
      console.log('📨 All messages received:', {
        origin: event.origin,
        data: event.data,
        source: event.source === window ? 'self' : 'external'
      });
    };
    window.addEventListener('message', debugMessageHandler)
    
    // Cleanup debug listener when done
    setTimeout(() => {
      window.removeEventListener('message', debugMessageHandler)
    }, 60000) // Remove after 1 minute

    // Fallback: Check if popup is closed (in case message doesn't work)
    checkPopup = setInterval(() => {
      try {
        if (popup.closed) {
          console.log('Popup closed detected by interval check');
          clearInterval(checkPopup)
          window.removeEventListener('message', messageHandler)
          
          // Wait a moment for any pending postMessage
          setTimeout(() => {
            // Check if we got a token (might have been set by postMessage)
            const token = api.getToken()
            console.log('Token check after popup closed:', token ? 'Token found' : 'No token');
            
            if (token) {
              console.log('Fetching session with token from localStorage...');
              api.getSession()
                .then(session => {
                  console.log('Session from fallback check:', session);
                  if (session && session.user) {
                    console.log('Login successful via fallback!');
                    onLogin(session.user)
                  } else {
                    console.error('Session fetch returned no user:', session);
                  }
                })
                .catch(err => {
                  console.error('Session fetch error in fallback:', err)
                  setError('Failed to authenticate: ' + (err.message || 'Unknown error'))
                })
            } else {
              console.warn('No token found after popup closed - OAuth may have failed');
              setError('Authentication failed: No token received. Please try again.')
            }
          }, 500) // Give postMessage time to arrive
        }
      } catch (e) {
        // Cross-origin error, popup might have redirected
        console.error('Popup check error:', e)
      }
    }, 500)

    // Cleanup after 5 minutes (timeout)
    setTimeout(() => {
      clearInterval(checkPopup)
      window.removeEventListener('message', messageHandler)
      if (popup && !popup.closed) {
        popup.close()
      }
    }, 5 * 60 * 1000)
  }

  return (
    <div className="login-container">
      <OAuthDebugPanel />
      <div className="login-card">
        <div className="login-header">
          <div className="logo">
            <i className="fas fa-box"></i>
          </div>
          <h1>PostalHub</h1>
          <p>Track all your packages in one place</p>
        </div>

        {error && (
          <div className="error-message">
            <i className="fas fa-exclamation-circle"></i>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          {isRegister && (
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              minLength={6}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Loading...' : isRegister ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div className="divider">
          <span>OR</span>
        </div>

        <button
          type="button"
          className="btn btn-google"
          onClick={handleGoogleLogin}
        >
          <i className="fab fa-google"></i>
          Continue with Google
        </button>

        <div className="login-footer">
          <p>
            {isRegister ? 'Already have an account? ' : "Don't have an account? "}
            <button
              type="button"
              className="link-button"
              onClick={() => {
                setIsRegister(!isRegister)
                setError('')
              }}
            >
              {isRegister ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login

