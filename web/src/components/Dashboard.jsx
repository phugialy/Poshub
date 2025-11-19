import { useState, useEffect } from 'react'
import api from '../lib/api'
import TrackingList from './TrackingList'
import AddTrackingForm from './AddTrackingForm'
import StatsCards from './StatsCards'
import Header from './Header'
import './Dashboard.css'

function Dashboard({ user, onLogout }) {
  const [trackings, setTrackings] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await api.getDashboard()
      
      if (data.trackingData) {
        setTrackings(data.trackingData)
      }
      
      if (data.stats) {
        setStats(data.stats)
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard')
      console.error('Dashboard load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTracking = async (trackingNumber, description, carrier) => {
    try {
      await api.addTracking(trackingNumber, description, carrier)
      await loadDashboard() // Reload to get updated list
    } catch (err) {
      throw err // Let AddTrackingForm handle the error
    }
  }

  const handleDeleteTracking = async (id) => {
    try {
      await api.deleteTracking(id)
      await loadDashboard() // Reload to get updated list
    } catch (err) {
      throw err // Let TrackingCard handle the error display
    }
  }

  const handleUpdateTracking = async (id, data) => {
    try {
      await api.updateTracking(id, data)
      await loadDashboard() // Reload to get updated list
    } catch (err) {
      // Re-throw so TrackingCard can handle the error display
      throw err
    }
  }

  return (
    <div className="dashboard">
      <Header user={user} onLogout={onLogout} />
      
      <div className="dashboard-content">
        <div className="container">
          <div className="welcome-banner">
            <h1>Welcome back, {user.name || user.email}!</h1>
            <p>Track and manage all your packages from one dashboard.</p>
          </div>

          <StatsCards stats={stats} />

          {error && (
            <div className="error-banner">
              <i className="fas fa-exclamation-circle"></i>
              {error}
            </div>
          )}

          <AddTrackingForm onAdd={handleAddTracking} />

          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading your packages...</p>
            </div>
          ) : (
            <TrackingList
              trackings={trackings}
              onDelete={handleDeleteTracking}
              onUpdate={handleUpdateTracking}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard

