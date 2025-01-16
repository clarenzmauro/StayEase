import { useState } from 'react';
import '../PropertyPage.css';
import './PropertyGallery.css';

interface Photo {
  pictureUrl: string;
  label: string;
}

interface PropertyGalleryProps {
  photos: {
    count: number;
    [key: string]: Photo | number;
  };
}

const PropertyGallery = ({ photos }: PropertyGalleryProps) => {
  const [selectedImage, setSelectedImage] = useState<Photo | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  const handleImageClick = (photo: Photo) => {
    setSelectedImage(photo);
    setZoomLevel(1);
  };

  const handleClose = () => {
    setSelectedImage(null);
    setZoomLevel(1);
  };

  const handleZoom = () => {
    setZoomLevel(prev => prev === 1 ? 1.5 : 1);
  };

  return (
    <>
      <div className="property-images-grid">
        {Array.from({ length: photos.count }, (_, index) => {
          const photoKey = `photo${index}`;
          const photo = photos[photoKey];

          if (typeof photo === 'object' && photo !== null) {
            return (
              <div 
                key={photoKey} 
                className={index === 0 ? 'main-image' : ''}
                onClick={() => handleImageClick(photo)}
              >
                <img 
                  src={photo.pictureUrl} 
                  alt={photo.label} 
                  className="clickable-image"
                />
              </div>
            );
          }
          return null;
        })}
      </div>

      {selectedImage && (
        <div className="image-overlay" onClick={handleClose}>
          <div className="image-overlay-content" onClick={e => e.stopPropagation()}>
            <div className="overlay-controls">
              <button 
                className="overlay-control-button"
                onClick={handleZoom}
              >
                {zoomLevel === 1 ? '🔍' : '🔍-'}
              </button>
              <button 
                className="overlay-control-button"
                onClick={handleClose}
              >
                ✕
              </button>
            </div>
            <img 
              src={selectedImage.pictureUrl} 
              alt={selectedImage.label} 
              style={{ transform: `scale(${zoomLevel})` }}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default PropertyGallery;