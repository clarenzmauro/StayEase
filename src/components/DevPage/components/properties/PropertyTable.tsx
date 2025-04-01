import React, { memo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Property } from '../../hooks/properties/usePropertyData';
import { Timestamp } from 'firebase/firestore';

interface PropertyTableProps {
  properties: Property[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onSelectProperty: (property: Property) => void;
  error: string | null;
}

const PropertyTableComponent: React.FC<PropertyTableProps> = ({
  properties,
  loading,
  hasMore,
  onLoadMore,
  onSelectProperty,
  error
}) => {
  // Format date for display
  const formatDate = (timestamp: Timestamp) => {
    try {
      return formatDistanceToNow(timestamp.toDate(), { addSuffix: true });
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Format price for display
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(price);
  };

  // Get status badge class
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active': return 'status-badge status-active';
      case 'pending': return 'status-badge status-pending';
      case 'flagged': return 'status-badge status-flagged';
      case 'inactive': return 'status-badge status-inactive';
      default: return 'status-badge';
    }
  };

  // Get first image URL
  const getImageUrl = (property: Property) => {
    if (!property.propertyPhotos) return '';

    // Handle MongoDB-style photos (array of strings)
    if (Array.isArray(property.propertyPhotos)) {
      return property.propertyPhotos[0] 
        ? `${process.env.REACT_APP_API_URL || ''}/api/property-photos/${property.propertyPhotos[0]}/image`
        : '';
    }

    // Handle Firebase-style photos (object with pictureUrl)
    const photoKeys = Object.keys(property.propertyPhotos).filter(key => key.startsWith('photo'));
    if (photoKeys.length === 0) return '';
    return property.propertyPhotos[photoKeys[0]]?.pictureUrl || '';
  };

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="properties-container">
      {loading && properties.length === 0 && (
        <div className="loading-indicator">Loading properties...</div>
      )}
      
      {!loading && properties.length === 0 && (
        <div className="empty-state">No properties found matching your criteria</div>
      )}
      
      {properties.length > 0 && (
        <div className="properties-grid">
          {properties.map(property => (
            <div 
              key={property.id} 
              className="property-card" 
              onClick={() => onSelectProperty(property)}
            >
              <div className="property-image">
                {getImageUrl(property) ? (
                  <img src={getImageUrl(property)} alt={property.propertyName} />
                ) : (
                  <div className="no-image">No Image</div>
                )}
                <span className={getStatusBadgeClass(property.status)}>
                  {property.status}
                </span>
              </div>
              
              <div className="property-details">
                <h3 className="property-name">{property.propertyName}</h3>
                <p className="property-location">{property.propertyLocation}</p>
                <p className="property-price">{formatPrice(property.propertyPrice)}</p>
                <div className="property-meta">
                  <span className="property-type">{property.propertyType}</span>
                  <span className="property-date">Listed {formatDate(property.datePosted)}</span>
                </div>
                <div className="property-stats">
                  {property.viewCount !== undefined && (
                    <span className="view-count">
                      <i className="fas fa-eye"></i> {property.viewCount}
                    </span>
                  )}
                  {property.interestedCount !== undefined && (
                    <span className="interested-count">
                      <i className="fas fa-heart"></i> {property.interestedCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {loading && properties.length > 0 && (
        <div className="loading-more">Loading more properties...</div>
      )}
      
      {!loading && hasMore && (
        <button 
          className="load-more-btn"
          onClick={onLoadMore}
        >
          Load More Properties
        </button>
      )}
    </div>
  );
};

// Use React.memo to prevent unnecessary re-renders
export const PropertyTable = memo(PropertyTableComponent);
export default PropertyTable; 