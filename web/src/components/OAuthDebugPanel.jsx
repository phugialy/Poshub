/**
 * OAuth Debug Panel
 * Shows OAuth flow status for debugging
 */

import { useState, useEffect } from 'react'
import './OAuthDebugPanel.css'

function OAuthDebugPanel() {
  const [status, setStatus] = useState('idle')
  const [logs, setLogs] = useState([])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const updateStatus = () => {
      const currentStatus = localStorage.getItem('oauth_status') || 'idle'
      setStatus(currentStatus)
      
      try {
        const debugLogs = JSON.parse(localStorage.getItem('oauth_debug') || '[]')
        setLogs(debugLogs)
      } catch (e) {
        console.error('Error parsing debug logs:', e)
      }
    }

    // Check status every 500ms
    const interval = setInterval(updateStatus, 500)
    updateStatus() // Initial check

    return () => clearInterval(interval)
  }, [])

  const clearLogs = () => {
    localStorage.setItem('oauth_debug', '[]')
    localStorage.setItem('oauth_status', 'idle')
    setLogs([])
    setStatus('idle')
  }

  if (!isOpen) {
    return (
      <button
        className="oauth-debug-toggle"
        onClick={() => setIsOpen(true)}
        title="Show OAuth Debug Panel"
      >
        <i className="fas fa-bug"></i>
      </button>
    )
  }

  return (
    <div className="oauth-debug-panel">
      <div className="debug-header">
        <h3>OAuth Debug Panel</h3>
        <button className="debug-close" onClick={() => setIsOpen(false)}>
          <i className="fas fa-times"></i>
        </button>
      </div>
      
      <div className="debug-status">
        <strong>Status:</strong> <span className={`status-${status}`}>{status}</span>
      </div>
      
      <div className="debug-logs">
        <div className="debug-logs-header">
          <strong>Event Log:</strong>
          <button className="debug-clear" onClick={clearLogs}>
            Clear
          </button>
        </div>
        <div className="debug-logs-content">
          {logs.length === 0 ? (
            <div className="no-logs">No events yet</div>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} className="debug-log-entry">
                <span className="log-time">{new Date(log.time).toLocaleTimeString()}</span>
                <span className="log-event">{log.event}</span>
                {log.origin && <span className="log-detail">Origin: {log.origin}</span>}
                {log.targetOrigin && <span className="log-detail">Target: {log.targetOrigin}</span>}
              </div>
            ))
          )}
        </div>
      </div>
      
      <div className="debug-info">
        <strong>Token in localStorage:</strong>{' '}
        {localStorage.getItem('auth_token') ? '✅ Yes' : '❌ No'}
      </div>
    </div>
  )
}

export default OAuthDebugPanel

