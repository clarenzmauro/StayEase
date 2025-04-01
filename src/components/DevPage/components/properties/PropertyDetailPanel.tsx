import React, { memo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Property, PropertyStatus } from '../../hooks/properties/usePropertyData';
import { Timestamp } from 'firebase/firestore';

interface PropertyDetailPanelProps {
  property: Property | null;
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onUpdateStatus: (propertyId: string, newStatus: PropertyStatus) => Promise<void>;
  onDelete: (propertyId: string) => Promise<void>;
}

const PropertyDetailPanelComponent: React.FC<PropertyDetailPanelProps> = ({
  property,
  isOpen,
  isLoading,
  error,
  onClose,
  onUpdateStatus,
  onDelete
}) => {
  if (!property || !isOpen) {
    return null;
  }

  // Format date for display
  const formatDate = (timestamp: Timestamp) => {
    try {
      return formatDistanceToNow(timestamp.toDate(), { addSuffix: true });
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  // Format raw date for full date/time display
  const formatFullDate = (timestamp: Timestamp) => {
    try {
      const date = timestamp.toDate();
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
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
  
  // Get all image URLs
  const getImageUrls = (property: Property) => {
    if (!property.propertyPhotos) return [];

    // Handle MongoDB-style photos (array of strings)
    if (Array.isArray(property.propertyPhotos)) {
      return property.propertyPhotos.map(photoId => 
        `${process.env.REACT_APP_API_URL || ''}/api/property-photos/${photoId}/image`
      );
    }

    // Handle Firebase-style photos (object with pictureUrl)
    const photoKeys = Object.keys(property.propertyPhotos).filter(key => key.startsWith('photo'));
    return photoKeys.map(key => property.propertyPhotos[key]?.pictureUrl || '').filter(url => url);
  };

  // Handle status update
  const handleStatusUpdate = async (newStatus: PropertyStatus) => {
    try {
      await onUpdateStatus(property.id, newStatus);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };
  
  // Handle delete property
  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${property.propertyName}? This action cannot be undone.`)) {
      try {
        await onDelete(property.id);
        onClose(); // Close the panel after deletion
      } catch (error) {
        console.error('Error deleting property:', error);
      }
    }
  };

  const imageUrls = getImageUrls(property);

  return (
    <div className={`detail-panel ${isOpen ? 'open' : ''}`}>
      <div className="detail-panel-header">
        <h3>Property Details</h3>
        <button 
          className="detail-panel-close" 
          onClick={onClose}
          aria-label="Close panel"
        >
          <i className="fas fa-times"></i>
        </button>
      </div>
      
      {error && (
        <div className="detail-panel-error">{error}</div>
      )}
      
      {isLoading ? (
        <div className="detail-panel-loading">Loading property details...</div>
      ) : (
        <div className="detail-panel-content">
          <div className="property-images">
            {imageUrls.length > 0 ? (
              <div className="image-gallery">
                {imageUrls.map((url, index) => (
                  <div key={index} className="gallery-image">
                    <img src={url} alt={`${property.propertyName} - Image ${index + 1}`} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-images">No images available</div>
            )}
          </div>
          
          <div className="property-info-section">
            <div className="property-header">
              <h2>{property.propertyName}</h2>
              <div className="property-price">{formatPrice(property.propertyPrice)}</div>
            </div>
            
            <div className="property-location">{property.propertyLocation}</div>
            
            <div className="property-meta">
              <div className="property-type">
                <strong>Type:</strong> {property.propertyType}
              </div>
              
              <div className="property-status">
                <strong>Status:</strong> {property.status}
              </div>
              
              <div className="property-owner">
                <strong>Owner:</strong> {property.ownerName || 'Unknown'}
              </div>
              
              <div className="property-date">
                <strong>Listed:</strong> {formatFullDate(property.datePosted)}
              </div>
            </div>
            
            <div className="property-tags">
              {property.propertyTags.map((tag, index) => (
                <span key={index} className="property-tag">{tag}</span>
              ))}
            </div>
            
            <div className="property-stats">
              <div className="stat-item">
                <i className="fas fa-eye"></i>
                <span>{property.viewCount || 0} Views</span>
              </div>
              
              <div className="stat-item">
                <i className="fas fa-heart"></i>
                <span>{property.interestedCount || 0} Interested</span>
              </div>
            </div>
          </div>
          
          <div className="property-actions">
            <div className="action-group">
              <h4>Status</h4>
              <div className="status-buttons">
                <button 
                  className={`status-btn ${property.status === 'active' ? 'active' : ''}`}
                  onClick={() => handleStatusUpdate('active')}
                  disabled={property.status === 'active'}
                >
                  Active
                </button>
                
                <button 
                  className={`status-btn ${property.status === 'pending' ? 'active' : ''}`}
                  onClick={() => handleStatusUpdate('pending')}
                  disabled={property.status === 'pending'}
                >
                  Pending
                </button>
                
                <button 
                  className={`status-btn ${property.status === 'flagged' ? 'active' : ''}`}
                  onClick={() => handleStatusUpdate('flagged')}
                  disabled={property.status === 'flagged'}
                >
                  Flagged
                </button>
                
                <button 
                  className={`status-btn ${property.status === 'inactive' ? 'active' : ''}`}
                  onClick={() => handleStatusUpdate('inactive')}
                  disabled={property.status === 'inactive'}
                >
                  Inactive
                </button>
              </div>
            </div>
            
            <div className="action-group">
              <h4>Actions</h4>
              <div className="action-buttons">
                <button 
                  className="btn btn-primary"
                  onClick={() => window.open(`/property/${property.id}`, '_blank')}
                >
                  <i className="fas fa-external-link-alt"></i> View Live
                </button>
                
                <button 
                  className="btn btn-secondary"
                  onClick={() => window.open(`/admin/properties/edit/${property.id}`, '_blank')}
                >
                  <i className="fas fa-edit"></i> Edit Property
                </button>
                
                <button 
                  className="btn btn-danger"
                  onClick={handleDelete}
                >
                  <i className="fas fa-trash"></i> Delete Property
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Use React.memo to prevent unnecessary re-renders
export const PropertyDetailPanel = memo(PropertyDetailPanelComponent);
export default PropertyDetailPanel; 