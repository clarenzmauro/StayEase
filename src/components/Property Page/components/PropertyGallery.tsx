import '../PropertyPage.css';

interface Photo {
  pictureUrl: string;
  label: string;
}

interface PropertyGalleryProps {
  photos: {
    count: number;
    [key: string]: Photo | number; // Allow both Photo objects and count
  };
}

const PropertyGallery = ({ photos }: PropertyGalleryProps) => {
  return (
    <div className="property-images-grid">
      {Array.from({ length: photos.count }, (_, index) => {
        const photoKey = `photo${index}`;
        const photo = photos[photoKey];

        // Check if photo is of type Photo before accessing its properties
        if (typeof photo === 'object' && photo !== null) {
          return (
            <div key={photoKey} className={index === 0 ? 'main-image' : ''}>
              <img src={photo.pictureUrl} alt={photo.label} />
            </div>
          );
        }
        return null; // Return null if photo is not a valid Photo object
      })}
    </div>
  );
};

export default PropertyGallery;