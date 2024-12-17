import React, { useState, useEffect } from 'react';
import './ItemsContext.css';

const dummyData = [
  {
    id: 1,
    name: "Student Haven",
    location: "Alangilan",
    owner: "John Doe",
    price: 5000,
    type: "Dormitory",
    tags: ["With WiFi", "Near School"],
    images: ["image1.jpg", "image2.jpg", "image3.jpg", "image4.jpg", "image5.jpg"],
    verified: true
  },
  {
    id: 2,
    name: "Cozy Nest",
    location: "Poblacion",
    owner: "Jane Smith",
    price: 6000,
    type: "Apartment",
    tags: ["Furnished", "Pet Friendly"],
    images: ["image1.jpg", "image2.jpg", "image3.jpg", "image4.jpg", "image5.jpg"],
    verified: true
  },
  {
    id: 3,
    name: "Safe Haven",
    location: "Gulod",
    owner: "Alice Johnson",
    price: 4500,
    type: "Dormitory",
    tags: ["With Security", "Near School"],
    images: ["image1.jpg", "image2.jpg", "image3.jpg", "image4.jpg", "image5.jpg"],
    verified: true
  },
  {
    id: 4,
    name: "Sunny Apartments",
    location: "Kumintang",
    owner: "Bob Brown",
    price: 7000,
    type: "Apartment",
    tags: ["With Parking", "Near Mall"],
    images: ["image1.jpg", "image2.jpg", "image3.jpg", "image4.jpg", "image5.jpg"],
    verified: true
  },
  {
    id: 5,
    name: "Student Lodge",
    location: "Pallocan",
    owner: "Charlie Green",
    price: 5500,
    type: "Boarding House",
    tags: ["With WiFi", "Quiet Area"],
    images: ["image1.jpg", "image2.jpg", "image3.jpg", "image4.jpg", "image5.jpg"],
    verified: true
  },
  {
    id: 6,
    name: "Dormitory Life",
    location: "Alangilan",
    owner: "Diana Prince",
    price: 5000,
    type: "Dormitory",
    tags: ["Furnished", "With WiFi"],
    images: ["image1.jpg", "image2.jpg", "image3.jpg", "image4.jpg", "image5.jpg"],
    verified: true
  },
  {
    id: 7,
    name: "Comfort Stay",
    location: "Poblacion",
    owner: "Ethan Hunt",
    price: 8000,
    type: "Apartment",
    tags: ["Pet Friendly", "With Parking"],
    images: ["image1.jpg", "image2.jpg", "image3.jpg", "image4.jpg", "image5.jpg"],
    verified: true
  },
  {
    id: 8,
    name: "Peaceful Living",
    location: "Gulod",
    owner: "Fiona Apple",
    price: 6000,
    type: "Dormitory",
    tags: ["Near School", "Quiet Area"],
    images: ["image1.jpg", "image2.jpg", "image3.jpg", "image4.jpg", "image5.jpg"],
    verified: true
  },
  {
    id: 9,
    name: "Student Shelter",
    location: "Kumintang",
    owner: "George Clooney",
    price: 6500,
    type: "Boarding House",
    tags: ["With Security", "Near Mall"],
    images: ["image1.jpg", "image2.jpg", "image3.jpg", "image4.jpg", "image5.jpg"],
    verified: true
  },
  {
    id: 10,
    name: "Home Away From Home",
    location: "Pallocan",
    owner: "Hannah Montana",
    price: 7000,
    type: "Apartment",
    tags: ["Furnished", "With WiFi"],
    images: ["image1.jpg", "image2.jpg", "image3.jpg", "image4.jpg", "image5.jpg"],
    verified: true
  }
];

export function ItemsContext({ isOpen, onClose, itemId }) {
  const [item, setItem] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    // TODO: Fetch item data from Firebase
    // This is where you'll implement the Firebase fetch logic
    const fetchItemData = async () => {
      try {
        const selectedItem = dummyData.find(item => item.id === itemId);
        if (selectedItem) {
          setItem(selectedItem);
        }
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
              <div className="property-price">₱{item.price.toLocaleString()}/month</div>
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
