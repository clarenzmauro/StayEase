import { useEffect, useState } from 'react';
import '../PropertyPage.css';
import './PropertyGallery.css';
import { getDoc } from 'firebase/firestore';
import { doc } from 'firebase/firestore';
import { db } from '../../../firebase/config';

interface Photo {
  pictureUrl: string;
  label: string;
}

interface PropertyGalleryProps {
  propertyPhotos: string[];
}

const PropertyGallery = ({ propertyPhotos }: PropertyGalleryProps) => {
  const [selectedImage, setSelectedImage] = useState<Photo | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [images, setImages] = useState<Photo[]>([]);


  useEffect(() => {
    const fetchImages = async () => {
      const fetchedImages: Photo[] = [];
  
      for (const photoId of propertyPhotos) {
        try {
          // Fetch image from API
          const response = await fetch(`http://localhost:5000/api/property-photos/${photoId}/image`);
          
          if (!response.ok) {
            console.error('Error fetching image:', response.statusText);
            continue;
          }
  
          // Convert response to a blob
          const blob = await response.blob();
          const imageUrl = URL.createObjectURL(blob); // Create a URL from the blob
  
          fetchedImages.push({ pictureUrl: imageUrl, label: `Photo ${photoId}` }); // Use a default label
        } catch (error) {
          console.error('Error fetching image:', error);
        }
      }
  
      setImages(fetchedImages);
    };
  
    fetchImages();
  }, [propertyPhotos]);


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
        {images.map((image, index) => (
          <div
            key={index}
            className={index === 0 ? 'main-image' : ''}
            onClick={() => handleImageClick(image)}
          >
            <img
              src={image.pictureUrl}
              alt={image.label}
              className="clickable-image"
            />
          </div>
        ))}
      </div>

      {selectedImage && (
        <div className="image-overlay" onClick={handleClose}>
          <div className="image-overlay-content" onClick={e => e.stopPropagation()}>
            <div className="overlay-controls">
              <button 
                className="overlay-control-button zoom"
                onClick={handleZoom}
                aria-label={zoomLevel === 1 ? "Zoom in" : "Zoom out"}
              >
                {zoomLevel === 1 ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                    <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 0 0 1.48-5.34c-.47-2.78-2.79-5-5.59-5.34a6.505 6.505 0 0 0-7.27 7.27c.34 2.8 2.56 5.12 5.34 5.59a6.5 6.5 0 0 0 5.34-1.48l.27.28v.79l4.25 4.25c.41.41 1.08.41 1.49 0 .41-.41.41-1.08 0-1.49L15.5 14zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zm.5-7H9v2H7v1h2v2h1v-2h2V9h-2V7z"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                    <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 0 0 1.48-5.34c-.47-2.78-2.79-5-5.59-5.34a6.505 6.505 0 0 0-7.27 7.27c.34 2.8 2.56 5.12 5.34 5.59a6.5 6.5 0 0 0 5.34-1.48l.27.28v.79l4.25 4.25c.41.41 1.08.41 1.49 0 .41-.41.41-1.08 0-1.49L15.5 14zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zM7 9h5v1H7z"/>
                  </svg>
                )}
              </button>
              <button 
                className="overlay-control-button close"
                onClick={handleClose}
                aria-label="Close image"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
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