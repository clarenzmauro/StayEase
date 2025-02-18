import { useEffect, useState } from 'react';
import '../PropertyPage.css';
import './PropertyGallery.css';
import { getDoc } from 'firebase/firestore';
import { doc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { API_URL } from '../../../config';

interface Photo {
  pictureUrl: string;
  label: string;
}

interface PropertyGalleryProps {
  propertyPhotos: string[];
}

const PropertyGallery = ({ propertyPhotos }: PropertyGalleryProps) => {
  const [selectedImage, setSelectedImage] = useState<Photo | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [images, setImages] = useState<Photo[]>([]);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 75) {
      // Swipe left
      setCurrentIndex(prev => (prev + 1) % images.length);
    }

    if (touchEnd - touchStart > 75) {
      // Swipe right
      setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
    }
  };

  useEffect(() => {
    const fetchImages = async () => {
      const fetchedImages: Photo[] = [];
  
      for (const photoId of propertyPhotos) {
        try {
          // Fetch image from API
          const response = await fetch(`${API_URL}/api/property-photos/${photoId}/image`);
          
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

  const handleImageClick = (photo: Photo, index: number) => {
    setSelectedImage(photo);
    setCurrentIndex(index);
  };

  const handleClose = () => {
    setSelectedImage(null);
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    setSelectedImage(images[(currentIndex - 1 + images.length) % images.length]);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setSelectedImage(images[(currentIndex + 1) % images.length]);
  };

  return (
    <>
      {/* Desktop View */}
      <div className="property-images-grid desktop-view">
        {images.map((image, index) => (
          <div
            key={index}
            className={index === 0 ? 'main-image' : ''}
            onClick={() => handleImageClick(image, index)}
          >
            <img
              src={image.pictureUrl}
              alt={image.label}
              className="clickable-image"
            />
          </div>
        ))}
      </div>

      {/* Mobile Carousel View */}
      <div 
        className="mobile-carousel"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="carousel-image">
          <img
            src={images[currentIndex]?.pictureUrl}
            alt={images[currentIndex]?.label}
            onClick={() => handleImageClick(images[currentIndex], currentIndex)}
          />
        </div>
        <div className="carousel-indicators">
          {images.map((_, index) => (
            <span
              key={index}
              className={`indicator ${index === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(index)}
            />
          ))}
        </div>
      </div>

      {selectedImage && (
        <div className="image-overlay" onClick={handleClose}>
          <div className="image-overlay-content" onClick={(e) => e.stopPropagation()}>
            <div className="image-counter">
              {currentIndex + 1} / {images.length}
            </div>
            <div className="overlay-controls">
              <button className="overlay-control-button" onClick={handleClose}>
                ×
              </button>
            </div>
            <img src={selectedImage.pictureUrl} alt={selectedImage.label} />
            <button 
              className="overlay-control-button" 
              style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)' }}
              onClick={handlePrevious}
            >
              ‹
            </button>
            <button 
              className="overlay-control-button" 
              style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)' }}
              onClick={handleNext}
            >
              ›
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default PropertyGallery;