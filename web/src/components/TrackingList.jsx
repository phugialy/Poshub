import { useState, useMemo, useEffect } from 'react'
import api from '../lib/api'
import TrackingCard from './TrackingCard'
import TrackingCardCompact from './TrackingCardCompact'
import TrackingCarousel from './TrackingCarousel'
import Pagination from './Pagination'
import './TrackingList.css'

function TrackingList({ trackings, onDelete, onUpdate }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCarrier, setFilterCarrier] = useState('')
  const [viewMode, setViewMode] = useState('pagination') // 'pagination' or 'carousel'
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 6

  const filteredTrackings = useMemo(() => {
    return trackings.filter(tracking => {
      const matchesSearch = tracking.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tracking.metadata?.description || tracking.description || '').toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = !filterStatus || tracking.status === filterStatus
      const matchesCarrier = !filterCarrier || tracking.carrier?.name === filterCarrier

      return matchesSearch && matchesStatus && matchesCarrier
    })
  }, [trackings, searchTerm, filterStatus, filterCarrier])

  // Pagination logic
  const totalPages = Math.ceil(filteredTrackings.length / itemsPerPage)
  const paginatedTrackings = useMemo(() => {
    if (viewMode === 'pagination') {
      const startIndex = (currentPage - 1) * itemsPerPage
      return filteredTrackings.slice(startIndex, startIndex + itemsPerPage)
    }
    return filteredTrackings
  }, [filteredTrackings, currentPage, itemsPerPage, viewMode])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterStatus, filterCarrier])

  const handleViewTracking = async (id) => {
    try {
      const data = await api.getTrackingUrl(id)
      if (data.url) {
        window.open(data.url, '_blank')
      }
    } catch (err) {
      alert('Failed to get tracking URL: ' + err.message)
    }
  }


  if (trackings.length === 0) {
    return (
      <div className="tracking-list-card">
        <div className="empty-state">
          <div className="empty-icon">
            <i className="fas fa-box-open"></i>
          </div>
          <h3>No packages yet</h3>
          <p>Add your first tracking number to get started!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="tracking-list-card">
      <div className="list-header">
        <h2>
          <i className="fas fa-list"></i>
          Your Packages
        </h2>
        <div className="header-right">
          <span className="tracking-count">{filteredTrackings.length} package{filteredTrackings.length !== 1 ? 's' : ''}</span>
          <div className="view-mode-toggle">
            <button
              className={`view-mode-btn ${viewMode === 'pagination' ? 'active' : ''}`}
              onClick={() => setViewMode('pagination')}
              title="Pagination view"
            >
              <i className="fas fa-th"></i>
              <span>Pages</span>
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'carousel' ? 'active' : ''}`}
              onClick={() => setViewMode('carousel')}
              title="Carousel view"
            >
              <i className="fas fa-images"></i>
              <span>Carousel</span>
            </button>
          </div>
        </div>
      </div>

      <div className="filters">
        <div className="search-bar">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search by tracking number or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">In Transit</option>
            <option value="completed">Delivered</option>
            <option value="failed">Failed</option>
          </select>
          <select
            value={filterCarrier}
            onChange={(e) => setFilterCarrier(e.target.value)}
          >
            <option value="">All Carriers</option>
            {[...new Set(trackings.map(t => t.carrier?.name).filter(Boolean))].map(carrier => (
              <option key={carrier} value={carrier}>{carrier}</option>
            ))}
          </select>
        </div>
      </div>

      {viewMode === 'carousel' ? (
        <TrackingCarousel
          trackings={filteredTrackings}
          onView={handleViewTracking}
          onEdit={async (id, data) => {
            await onUpdate(id, data)
          }}
          onDelete={onDelete}
        />
      ) : (
        <>
          <div className="tracking-items-grid">
            {paginatedTrackings.length === 0 ? (
              <div className="empty-state">
                <p>No packages match your filters</p>
              </div>
            ) : (
              paginatedTrackings.map(tracking => (
                <TrackingCardCompact
                  key={tracking.id}
                  tracking={tracking}
                  onView={handleViewTracking}
                  onEdit={async (id, data) => {
                    await onUpdate(id, data)
                  }}
                  onDelete={onDelete}
                />
              ))
            )}
          </div>
          
          {filteredTrackings.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={filteredTrackings.length}
            />
          )}
        </>
      )}
    </div>
  )
}

export default TrackingList

