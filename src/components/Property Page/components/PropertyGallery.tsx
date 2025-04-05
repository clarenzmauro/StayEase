import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_URL } from "../../../config";
import placeholderImage from "../../../assets/ImagePlaceholder.png";

interface Photo {
  pictureUrl: string;
  label: string;
  isPlaceholder?: boolean;
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
  const MAX_IMAGES = 5;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 75) {
      // Swipe left
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }

    if (touchEnd - touchStart > 75) {
      // Swipe right
      setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  };

  useEffect(() => {
    const fetchImages = async () => {
      const fetchedImages: Photo[] = [];

      for (const photoId of propertyPhotos) {
        try {
          // Fetch image from API
          const response = await fetch(
            `${API_URL}/api/property-photos/${photoId}/image`
          );

          if (!response.ok) {
            console.error("Error fetching image:", response.statusText);
            continue;
          }

          // Convert response to a blob
          const blob = await response.blob();
          const imageUrl = URL.createObjectURL(blob);

          fetchedImages.push({
            pictureUrl: imageUrl,
            label: `Photo ${photoId}`,
            isPlaceholder: false,
          });

          // Stop if we've reached the maximum number of images
          if (fetchedImages.length >= MAX_IMAGES) {
            break;
          }
        } catch (error) {
          console.error("Error fetching image:", error);
        }
      }

      // Fill remaining slots with placeholders up to MAX_IMAGES
      while (fetchedImages.length < MAX_IMAGES) {
        fetchedImages.push({
          pictureUrl: placeholderImage,
          label: "No image available",
          isPlaceholder: true,
        });
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
    setSelectedImage(
      images[(currentIndex - 1 + images.length) % images.length]
    );
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setSelectedImage(images[(currentIndex + 1) % images.length]);
  };

  const Carousel = () => {
    return (
      <></>
    );
  };

  return (
    <div>
      <div className="md:hidden w-full aspect-square overflow-hidden">
        <Carousel />
        {/* Replace with carousel */}
        <img
          src={images[currentIndex]?.pictureUrl}
          alt={images[currentIndex]?.label}
          className="w-full h-full object-cover relative"
        />

        <div className="absolute top-0 flex justify-between items-center w-full p-4 text-xl">
          <div className="w-10 h-10 bg-indigo-200 flex items-center justify-center rounded-full">
            <Link to="/">
              <i className="fa-solid fa-arrow-left text-transparent bg-indigo-500 bg-clip-text"></i>
            </Link>
          </div>

          <div className="flex gap-2">
            <div className="w-10 h-10 bg-indigo-200 flex items-center justify-center rounded-full">
              <i className="fa-solid fa-share text-transparent bg-indigo-500 bg-clip-text"></i>
            </div>
            <div className="w-10 h-10 bg-indigo-200 flex items-center justify-center rounded-full">
              <i className="fa-solid fa-message text-transparent bg-indigo-500 bg-clip-text"></i>
            </div>
            <div className="w-10 h-10 bg-indigo-200 flex items-center justify-center rounded-full">
              <i className="fa-solid fa-ellipsis-vertical text-transparent bg-indigo-500 bg-clip-text"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyGallery;

// Desktop View
// <div className="property-images-grid desktop-view">
//   {images.map((image, index) => (
//     <div
//       key={index}
//       className={`${index === 0 ? 'main-image' : ''} ${image.isPlaceholder ? 'placeholder-image' : ''}`}
//       onClick={() => !image.isPlaceholder && handleImageClick(image, index)}
//     >
//       <img
//         src={image.pictureUrl}
//         alt={image.label}
//         className={!image.isPlaceholder ? 'clickable-image' : ''}
//       />
//     </div>
//   ))}
// </div>

// Mobile Carousel View
// <div
//   className="mobile-carousel"
//   onTouchStart={handleTouchStart}
//   onTouchMove={handleTouchMove}
//   onTouchEnd={handleTouchEnd}
// >
//   <div className="carousel-image">
//     <img
//       src={images[currentIndex]?.pictureUrl}
//       alt={images[currentIndex]?.label}
//       onClick={() => !images[currentIndex]?.isPlaceholder &&
//         handleImageClick(images[currentIndex], currentIndex)}
//     />
//   </div>
//   <div className="carousel-indicators">
//     {images.map((_, index) => (
//       <span
//         key={index}
//         className={`indicator ${index === currentIndex ? 'active' : ''} ${images[index].isPlaceholder ? 'placeholder-indicator' : ''}`}
//         onClick={() => setCurrentIndex(index)}
//       />
//     ))}
//   </div>
// </div>

// {selectedImage && !selectedImage.isPlaceholder && (
//   <div className="image-overlay" onClick={handleClose}>
//     <div className="image-overlay-content" onClick={(e) => e.stopPropagation()}>
//       <div className="image-counter">
//         {currentIndex + 1} / {images.length}
//       </div>
//       <div className="overlay-controls">
//         <button className="overlay-control-button" onClick={handleClose}>
//           ×
//         </button>
//       </div>
//       <img src={selectedImage.pictureUrl} alt={selectedImage.label} />
//       <button
//         className="overlay-control-button"
//         style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)' }}
//         onClick={handlePrevious}
//       >
//         ‹
//       </button>
//       <button
//         className="overlay-control-button"
//         style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)' }}
//         onClick={handleNext}
//       >
//         ›
//       </button>
//     </div>
//   </div>
// )}
