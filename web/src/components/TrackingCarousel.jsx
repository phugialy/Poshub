/**
 * Tracking Carousel Component
 * Infinite loop carousel for tracking cards
 */

import { useState, useEffect, useRef } from 'react'
import TrackingCardCompact from './TrackingCardCompact'
import './TrackingCarousel.css'

function TrackingCarousel({ trackings, onView, onEdit, onDelete }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(false)
  const carouselRef = useRef(null)
  const autoPlayIntervalRef = useRef(null)

  // Auto-play functionality
  useEffect(() => {
    if (isAutoPlaying && trackings.length > 1) {
      autoPlayIntervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % trackings.length)
      }, 3000) // Change card every 3 seconds
    } else {
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current)
      }
    }

    return () => {
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current)
      }
    }
  }, [isAutoPlaying, trackings.length])

  // Scroll to current card
  useEffect(() => {
    if (carouselRef.current) {
      const cardWidth = carouselRef.current.offsetWidth
      carouselRef.current.scrollTo({
        left: currentIndex * cardWidth,
        behavior: 'smooth'
      })
    }
  }, [currentIndex])

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + trackings.length) % trackings.length)
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % trackings.length)
  }

  const handleDotClick = (index) => {
    setCurrentIndex(index)
  }

  if (trackings.length === 0) {
    return (
      <div className="carousel-empty">
        <p>No packages to display</p>
      </div>
    )
  }

  return (
    <div className="tracking-carousel-container">
      <div className="carousel-header">
        <div className="carousel-title">
          <i className="fas fa-images"></i>
          Carousel View
        </div>
        <div className="carousel-controls-top">
          <button
            className={`carousel-toggle ${isAutoPlaying ? 'active' : ''}`}
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            title={isAutoPlaying ? 'Pause auto-play' : 'Start auto-play'}
          >
            <i className={`fas ${isAutoPlaying ? 'fa-pause' : 'fa-play'}`}></i>
          </button>
          <span className="carousel-counter">
            {currentIndex + 1} / {trackings.length}
          </span>
        </div>
      </div>

      <div className="carousel-wrapper">
        <button
          className="carousel-nav-btn carousel-nav-prev"
          onClick={handlePrevious}
          title="Previous"
        >
          <i className="fas fa-chevron-left"></i>
        </button>

        <div className="carousel-track" ref={carouselRef}>
          {trackings.map((tracking, index) => (
            <div key={tracking.id} className="carousel-card-wrapper">
              <TrackingCardCompact
                tracking={tracking}
                onView={onView}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </div>
          ))}
        </div>

        <button
          className="carousel-nav-btn carousel-nav-next"
          onClick={handleNext}
          title="Next"
        >
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>

      <div className="carousel-dots">
        {trackings.map((_, index) => (
          <button
            key={index}
            className={`carousel-dot ${currentIndex === index ? 'active' : ''}`}
            onClick={() => handleDotClick(index)}
            title={`Go to card ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

export default TrackingCarousel

