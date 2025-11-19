/**
 * Edit Tracking Modal Component
 * Clean, focused edit interface for tracking number and description
 */

import { useState, useEffect } from 'react'
import './EditTrackingModal.css'

function EditTrackingModal({ tracking, isOpen, onClose, onSave, isSaving }) {
  const [trackingNumber, setTrackingNumber] = useState(tracking?.trackingNumber || '')
  const [description, setDescription] = useState(tracking?.metadata?.description || tracking?.description || '')

  useEffect(() => {
    if (isOpen) {
      setTrackingNumber(tracking?.trackingNumber || '')
      setDescription(tracking?.metadata?.description || tracking?.description || '')
    }
  }, [isOpen, tracking])

  const handleSave = async () => {
    if (!trackingNumber.trim()) {
      alert('Tracking number cannot be empty')
      return
    }

    await onSave({
      trackingNumber: trackingNumber.trim(),
      description: description.trim()
    })
  }

  const handleCancel = () => {
    setTrackingNumber(tracking?.trackingNumber || '')
    setDescription(tracking?.metadata?.description || tracking?.description || '')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Tracking</h3>
          <button className="modal-close" onClick={handleCancel}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="tracking-number">
              <i className="fas fa-barcode"></i>
              Tracking Number <span className="required">*</span>
            </label>
            <input
              id="tracking-number"
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Enter tracking number"
              className="form-input"
              autoFocus
              disabled={isSaving}
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">
              <i className="fas fa-tag"></i>
              Description
            </label>
            <input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description (optional)"
              className="form-input"
              disabled={isSaving}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Saving...
              </>
            ) : (
              <>
                <i className="fas fa-check"></i> Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default EditTrackingModal

