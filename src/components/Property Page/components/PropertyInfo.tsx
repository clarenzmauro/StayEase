import '../PropertyPage.css';
import { useState } from 'react';

interface PropertyInfoProps {
  property: {
    bedroomCount: number;
    bathroomCount: number;
    viewCount: number;
    propertyTags?: string[];
    houseRules?: string[];
    propertyName?: string;
    propertyLocation?: string;
    propertyPhotos?: string[];
    interestedCount?: number;
    ownerId?: string;
  };
  host: {
    username?: string;
  } | null;
}

const PropertyInfo = ({ property, host }: PropertyInfoProps) => {
  const [visibleAmenities, ] = useState(6);
  const [isExpanded, setIsExpanded] = useState(false);

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

      <div className="amenities-section">
        <div className="section-title">What this place offers</div>
        <div className="amenities-grid">
          {property.propertyTags?.slice(0, isExpanded ? property.propertyTags.length : visibleAmenities).map((tag, index) => (
            <div key={`tag-${index}`} className="amenity-item">
              <span>✓</span>
              <span>{tag}</span>
            </div>
          ))}
        </div>
        {property.propertyTags && property.propertyTags.length > visibleAmenities && (
          <button className="show-more-button" onClick={() => setIsExpanded(prev => !prev)}>
            {isExpanded ? 'Show Less' : 'Show More'}
          </button>
        )}
      </div>

      <h2 className="rules-section">House rules</h2>
      <ul className="house-rules-list">
        {property.houseRules?.map((rule, index) => (
          <li key={`rule-${index}`} className="rule-item">
            <span className="rule-icon">!</span>
            {rule}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PropertyInfo;
