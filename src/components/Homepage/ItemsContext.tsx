import { useState, useEffect } from 'react';
import './ItemsContext.css';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config.js';

interface ItemsContextProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string | null;
}

export function ItemsContext({ isOpen, onClose, itemId }: ItemsContextProps) {
  const [item, setItem] = useState<any>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    async function fetchProperty() {
      console.log('ItemsContext: Starting fetch...', { isOpen, itemId });
      if (!isOpen || !itemId) {
        console.log('ItemsContext: Fetch canceled - modal closed or no itemId');
        return;
      }

      try {
        console.log('ItemsContext: Getting properties collection...');
        const propertiesCollection = collection(db, 'properties');
        
        console.log('ItemsContext: Fetching documents...');
        const querySnapshot = await getDocs(propertiesCollection);
        
        console.log('ItemsContext: Number of documents found:', querySnapshot.size);
        const properties = querySnapshot.docs.map(doc => {
          console.log('Document data:', { id: doc.id, data: doc.data() });
          return {
            id: doc.id,
            ...doc.data()
          };
        });

        console.log('ItemsContext: All properties:', properties);
        console.log('ItemsContext: Looking for property with id:', itemId);
        
        const selectedProperty = properties.find(prop => prop.id === itemId);
        console.log('ItemsContext: Selected property:', selectedProperty);

        if (selectedProperty) {
          console.log('ItemsContext: Setting item state with selected property');
          setItem(selectedProperty);
          setCurrentImageIndex(0);
        } else {
          console.log('ItemsContext: No matching property found for id:', itemId);
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error('Error fetching property:', error);
          console.error('Error details:', {
            message: error.message,
            code: (error as any).code,
            stack: error.stack
          });
        }else {
          console.error('An unexpected error occurred:', error);
        }
      }
    }

    fetchProperty();
  }, [isOpen, itemId]);

  if (!isOpen || !item) return null;
  
  const imageUrl = item.propertyPhotos?.[`photo${currentImageIndex}`]?.pictureUrl;
  console.log('Image Data:', {
    item: item,
    propertyPhotos: item.propertyPhotos,
    currentIndex: currentImageIndex,
    imageUrl: imageUrl
  });

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % item.propertyPhotos.length);
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="item-details" onClick={(e) => e.stopPropagation()}>
        <div className="image-container">
          {item.verified && (
            <div className="verified-badge">
              <span className="icon">✓</span>
              <span>Verified</span>
            </div>
          )}

          {currentImageIndex > 0 && (
            <div className="previous-button" onClick={() => setCurrentImageIndex(prev => prev - 1)}>
              ‹
            </div>
          )}

          {currentImageIndex < item.propertyPhotos.length - 1 && (
            <div className="next-button" onClick={nextImage}>
              ›
            </div>
          )}

          <div className="image-dots">
            {item.propertyPhotos.map((_:any, index:any) => (
              <div
                key={index}
                className={`dot ${index === currentImageIndex ? 'active' : ''}`}
              />
            ))}
          </div>

          {/* Display the current photo */}
          <img 
            src={imageUrl || 'https://via.placeholder.com/400'} 
            alt={`${item.propertyName} - ${item.propertyPhotos[`photo${currentImageIndex}`]?.label || `Photo ${currentImageIndex + 1}`}`}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              console.error('Image failed to load:', imageUrl);
              console.error('Error event:', e);
            }}
          />
        </div>

        <div className="details-content">
          <div className="property-header">
            <div className="property-info">
              <div className="property-name">{item.propertyName}</div>
              <div className="property-location">{item.propertyLocation}</div>
              <div className="property-type">{item.propertyType}</div>
              <div className="property-price">₱{item.rent.toLocaleString()}/month</div>
            </div>
            <div className="rating">
              ★ {item.ratings?.overall || 'N/A'}
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