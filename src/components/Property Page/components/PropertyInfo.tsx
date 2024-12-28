import '../PropertyPage.css';
interface PropertyInfoProps {
  property: {
    bedroomCount: number;
    bathroomCount: number;
    viewCount: number;
    propertyDesc: string;
    propertyTags?: string[];
    houseRules?: string[];
  };
  host: {
    username?: string;
  } | null;
}

const PropertyInfo = ({ property, host }: PropertyInfoProps) => {
  return (
    <div className="property-info">
      <div className="host-section">
        <div className="host-info">
          <h2 className="host-name">Hosted by {host?.username || 'Host'}</h2>
          <div className="property-stats">
            <span>{property.bedroomCount} bedroom</span>
            <span>•</span>
            <span>{property.bathroomCount} bath</span>
            <span>•</span>
            <span>{property.viewCount} views</span>
          </div>
        </div>
      </div>

      <div className="property-details">
        <div className="section-title">About this place</div>
        <p>{property.propertyDesc}</p>
      </div>

      <div className="amenities-section">
        <div className="section-title">What this place offers</div>
        <div className="amenities-grid">
          {property.propertyTags?.map((tag, index) => (
            <div key={`tag-${index}`} className="amenity-item">
              <span>✓</span>
              <span>{tag}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="house-rules-section">
        <div className="section-title">House rules</div>
        <div className="amenities-grid">
          {property.houseRules?.map((rule, index) => (
            <div key={`rule-${index}`} className="amenity-item">
              <span>•</span>
              <span>{rule}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PropertyInfo;
