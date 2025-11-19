import { useState, useEffect } from 'react'
import api from '../lib/api'
import './AddTrackingForm.css'

function AddTrackingForm({ onAdd }) {
  const [trackingNumber, setTrackingNumber] = useState('')
  const [description, setDescription] = useState('')
  const [carrier, setCarrier] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [carriers, setCarriers] = useState([])

  useEffect(() => {
    // Load available carriers
    api.getCarriers().then(data => {
      if (data.carriers) {
        setCarriers(data.carriers)
      }
    }).catch(err => {
      console.error('Failed to load carriers:', err)
    })
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      await onAdd(
        trackingNumber.trim(),
        description.trim(),
        carrier || null
      )
      
      setSuccess('Tracking added successfully!')
      setTrackingNumber('')
      setDescription('')
      setCarrier('')
    } catch (err) {
      setError(err.message || 'Failed to add tracking')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="add-tracking-card">
      <div className="card-header">
        <h2>
          <i className="fas fa-plus-circle"></i>
          Add New Tracking
        </h2>
      </div>

      {error && (
        <div className="alert alert-error">
          <i className="fas fa-exclamation-circle"></i>
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <i className="fas fa-check-circle"></i>
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="tracking-form">
        <div className="form-row">
          <div className="form-group form-group-large">
            <label htmlFor="tracking-number">
              <i className="fas fa-barcode"></i>
              Tracking Number
            </label>
            <input
              id="tracking-number"
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Enter tracking number (auto-detect carrier)"
              required
            />
            <p className="form-hint">We'll automatically detect the carrier</p>
          </div>

          <div className="form-group">
            <label htmlFor="carrier">
              <i className="fas fa-truck"></i>
              Carrier (Optional)
            </label>
            <select
              id="carrier"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
            >
              <option value="">Auto-detect</option>
              {carriers.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="description">
            <i className="fas fa-tag"></i>
            Description (Optional)
          </label>
          <input
            id="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Amazon order, Birthday gift"
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || !trackingNumber.trim()}
        >
          {loading ? (
            <>
              <div className="spinner-small"></div>
              Adding...
            </>
          ) : (
            <>
              <i className="fas fa-search"></i>
              Track Package
            </>
          )}
        </button>
      </form>
    </div>
  )
}

export default AddTrackingForm

