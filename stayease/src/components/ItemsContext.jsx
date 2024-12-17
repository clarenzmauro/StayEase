import React, { useState, useEffect } from 'react';
import './ItemsContext.css';

export function ItemsContext({ isOpen, onClose, itemId }) {
  const [item, setItem] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    // TODO: Fetch item data from Firebase
    // This is where you'll implement the Firebase fetch logic
    const fetchItemData = async () => {
      try {
        // Implement Firebase fetch here
        // For now, using dummy data
        setItem({
          name: "Sample Dormitory",
          location: "Batangas City",
          owner: "John Doe",
          price: "₱5,000/month",
          rating: 4.9,
          images: ["image1.jpg", "image2.jpg", "image3.jpg", "image4.jpg", "image5.jpg"],
          verified: true
        });
        // Reset the current image index to 0 when new item data is fetched
        setCurrentImageIndex(0);
      } catch (error) {
        console.error("Error fetching item data:", error);
      }
    };

    if (isOpen && itemId) {
      fetchItemData();
    }
  }, [isOpen, itemId]);

  if (!isOpen || !item) return null;

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % item.images.length);
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="item-details" onClick={(e) => e.stopPropagation()}>
        <div className="image-container">
          <div className="verified-badge">
            <span className="icon">✓</span>
            <span>Verified</span>
          </div>
          
          <div className="favorite-button">
            ♡
          </div>

          <div className="previous-button" onClick={() => setCurrentImageIndex((prev) => Math.max(prev - 1, 0))} style={{ display: currentImageIndex > 0 ? 'flex' : 'none' }}>
            ‹
          </div>

          <div className="next-button" onClick={nextImage} style={{ display: item.images.length > 1 ? 'flex' : 'none' }}>
            ›
          </div>

          <div className="image-dots">
            {item.images.map((_, index) => (
              <div
                key={index}
                className={`dot ${index === currentImageIndex ? 'active' : ''}`}
              />
            ))}
          </div>

          {/* Placeholder for the main photo */}
          <div style={{ 
            width: '100%', 
            height: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#666'
          }}>
            Photo {currentImageIndex + 1}
          </div>
        </div>

        <div className="details-content">
          <div className="property-header">
            <div className="property-info">
              <div className="property-name">{item.name}</div>
              <div className="property-location">{item.location}</div>
              <div className="property-owner">Owner: {item.owner}</div>
              <div className="property-price">{item.price}</div>
            </div>
            <div className="rating">
              ★ {item.rating}
            </div>
          </div>
        </div>

        <button className="close-button" onClick={onClose}>
          ×
        </button>
      </div>
    </div>
  );
}

export default ItemsContext;
