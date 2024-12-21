import '../PropertyPage.css';

interface PropertyGalleryProps {
  photos: string[];
}

const PropertyGallery = ({ photos }: PropertyGalleryProps) => {
  return (
    <div className="property-images-grid">
      {photos.map((photo, index) => (
        <div key={`photo-${index}`} className={index === 0 ? 'main-image' : ''}>
          <img src={photo} alt={`Property ${index + 1}`} />
        </div>
      ))}
    </div>
  );
};

export default PropertyGallery;
