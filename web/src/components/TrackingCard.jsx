import { useState } from 'react'
import { getCarrierInfo, getStatusColor, formatTrackingNumber } from '../lib/carriers'
import BarcodeVisual from './BarcodeVisual'
import EditTrackingModal from './EditTrackingModal'
import './TrackingCard.css'

function TrackingCard({ tracking, onView, onEdit, onDelete }) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  const carrierInfo = getCarrierInfo(tracking.carrier?.name)
  const statusInfo = getStatusColor(tracking.status)
  const formattedNumber = formatTrackingNumber(tracking.trackingNumber)
  const description = tracking.metadata?.description || tracking.description || ''

  const handleSaveEdit = async (data) => {
    if (!onEdit) return
    
    setIsSaving(true)
    try {
      await onEdit(tracking.id, data)
      setIsEditModalOpen(false)
    } catch (error) {
      alert('Failed to update: ' + (error.message || 'Unknown error'))
      console.error('Update error:', error)
      throw error // Re-throw so modal can handle it
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="tracking-card" style={{ borderLeftColor: carrierInfo?.color }}>
      {/* Card Header - Carrier Logo + Status */}
      <div className="card-header">
        <div className="carrier-section">
          {carrierInfo && (
            <div 
              className="carrier-logo" 
              style={{ 
                backgroundColor: `${carrierInfo.color}15`,
                borderColor: `${carrierInfo.color}40`
              }}
            >
              <span className="carrier-emoji" style={{ fontSize: '20px' }}>{carrierInfo.logo}</span>
              <span className="carrier-name-text">{carrierInfo.displayName}</span>
            </div>
          )}
        </div>
        <div className={`status-badge status-${tracking.status}`}>
          <span className="status-icon">{statusInfo.icon}</span>
          <span className="status-text">{getStatusLabel(tracking.status)}</span>
        </div>
      </div>

      {/* Tracking Number - FIRST (Most Important Data) */}
      <div className="tracking-number-section">
        <BarcodeVisual trackingNumber={tracking.trackingNumber} height={40} />
        <div className="tracking-number-display">
          {formattedNumber}
        </div>
      </div>

      {/* Description - SECOND */}
      <div className="description-section">
        <div className="description-label">
          <i className="fas fa-tag"></i>
          Description
        </div>
        <div className="description-text">
          {description || (
            <span className="no-description">No description</span>
          )}
        </div>
      </div>

      {/* Date - THIRD */}
      <div className="date-section">
        {tracking.createdAt && (
          <div className="date-item">
            <i className="fas fa-calendar"></i>
            <span className="date-label">Added</span>
            <span className="date-value">{new Date(tracking.createdAt).toLocaleDateString()}</span>
          </div>
        )}
        {tracking.shipment?.expectedDeliveryDate && (
          <div className="date-item">
            <i className="fas fa-clock"></i>
            <span className="date-label">Expected</span>
            <span className="date-value">{new Date(tracking.shipment.expectedDeliveryDate).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button
          className="action-btn btn-primary"
          onClick={() => onView && onView(tracking.id)}
          title="View on carrier website"
        >
          <i className="fas fa-external-link-alt"></i>
          <span>Track</span>
        </button>
        <button
          className="action-btn btn-secondary"
          onClick={() => setIsEditModalOpen(true)}
          title="Edit tracking number and description"
        >
          <i className="fas fa-edit"></i>
          <span>Edit</span>
        </button>
        <button
          className="action-btn btn-danger"
          onClick={async () => {
            if (window.confirm('Are you sure you want to delete this tracking?')) {
              try {
                await onDelete(tracking.id)
              } catch (error) {
                alert('Failed to delete: ' + (error.message || 'Unknown error'))
                console.error('Delete error:', error)
              }
            }
          }}
          title="Delete tracking"
        >
          <i className="fas fa-trash"></i>
          <span>Delete</span>
        </button>
      </div>

      {/* Edit Modal */}
      <EditTrackingModal
        tracking={tracking}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveEdit}
        isSaving={isSaving}
      />
    </div>
  )
}

function getStatusLabel(status) {
  const labels = {
    pending: 'Pending',
    processing: 'In Transit',
    completed: 'Delivered',
    failed: 'Failed',
  };
  return labels[status] || status;
}

export default TrackingCard

