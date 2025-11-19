/**
 * Compact Tracking Card Component
 * Optimized for displaying many cards in list/carousel views
 */

import { useState } from 'react'
import { getCarrierInfo, getStatusColor, formatTrackingNumber } from '../lib/carriers'
import BarcodeVisual from './BarcodeVisual'
import EditTrackingModal from './EditTrackingModal'
import './TrackingCardCompact.css'

function TrackingCardCompact({ tracking, onView, onEdit, onDelete }) {
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
      throw error
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="tracking-card-compact" style={{ borderLeftColor: carrierInfo?.color }}>
      {/* Compact Header: Carrier + Status */}
      <div className="compact-header">
        <div className="compact-carrier">
          {carrierInfo && (
            <div 
              className="compact-carrier-logo" 
              style={{ backgroundColor: `${carrierInfo.color}15` }}
            >
              <span className="carrier-emoji-small">{carrierInfo.logo}</span>
              <span className="carrier-name-compact">{carrierInfo.displayName}</span>
            </div>
          )}
        </div>
        <div className={`compact-status status-${tracking.status}`}>
          <span className="status-icon-small">{statusInfo.icon}</span>
          <span className="status-text-small">{getStatusLabel(tracking.status)}</span>
        </div>
      </div>

      {/* Compact Barcode + Number */}
      <div className="compact-barcode-section">
        <BarcodeVisual trackingNumber={tracking.trackingNumber} height={30} />
        <div className="compact-tracking-number">
          {formattedNumber}
        </div>
      </div>

      {/* Compact Info Row */}
      <div className="compact-info-row">
        <div className="compact-description">
          {description || <span className="no-desc-compact">No description</span>}
        </div>
        {tracking.createdAt && (
          <div className="compact-date">
            <i className="fas fa-calendar"></i>
            {new Date(tracking.createdAt).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Compact Actions */}
      <div className="compact-actions">
        <button
          className="compact-btn btn-track"
          onClick={() => onView && onView(tracking.id)}
          title="Track on carrier website"
        >
          <i className="fas fa-external-link-alt"></i>
        </button>
        <button
          className="compact-btn btn-edit"
          onClick={() => setIsEditModalOpen(true)}
          title="Edit"
        >
          <i className="fas fa-edit"></i>
        </button>
        <button
          className="compact-btn btn-delete"
          onClick={async () => {
            if (window.confirm('Delete this tracking?')) {
              try {
                await onDelete(tracking.id)
              } catch (error) {
                alert('Failed to delete: ' + (error.message || 'Unknown error'))
              }
            }
          }}
          title="Delete"
        >
          <i className="fas fa-trash"></i>
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

export default TrackingCardCompact

