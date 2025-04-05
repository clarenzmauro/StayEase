import React, { useState, useEffect, useCallback } from 'react';
import { 
  collection,
  doc, 
  deleteDoc, 
  updateDoc,
  onSnapshot,
  Timestamp,
  DocumentData 
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useNavigate } from 'react-router-dom';
import './PropertiesTab.css';
import { API_URL } from '../../../config';

// Define property type to match HomePage.tsx with improved type safety
interface Property {
  id: string;
  propertyName: string;
  propertyLocation: string;
  propertyPrice: number;
  propertyType: string;
  propertyTags: string[];
  propertyPhotos?: PropertyPhotos;
  owner?: string;
  dateAdded?: Date;
  status: 'available' | 'occupied' | 'maintenance';
  isHidden?: boolean;
  viewCount?: number;
  interestedCount?: number;
  description?: string;
  datePosted?: Timestamp;
}

// Type for property photos with both supported formats
type PropertyPhotos = { [key: string]: { pictureUrl: string } } | string[];

interface FeedbackMessage {
  message: string;
  type: 'success' | 'error';
}

const PropertiesTab: React.FC = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [feedbackMessage, setFeedbackMessage] = useState<FeedbackMessage | null>(null);

  // Show temporary feedback message
  const showFeedback = useCallback((message: string, type: 'success' | 'error') => {
    setFeedbackMessage({ message, type });
    setTimeout(() => setFeedbackMessage(null), 3000);
  }, []);

  // Fetch properties from Firestore using real-time listener like in HomePage.tsx
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        const propertiesCollection = collection(db, 'properties');
        
        // Use onSnapshot for real-time updates like in HomePage.tsx
        const unsubscribe = onSnapshot(
          propertiesCollection,
          (snapshot) => {
            console.log("Received database update:", snapshot.size, "properties");
            const propertyData: Property[] = snapshot.docs.map(doc => {
              const data = doc.data();
              return mapDocumentDataToProperty(doc.id, data);
            });
            
            console.log("Updated properties data:", propertyData);
            setProperties(propertyData);
            setFilteredProperties(propertyData);
            setLoading(false);
          },
          (error) => {
            console.error('Error fetching properties:', error);
            setError('Failed to load properties. Please try again later.');
            setLoading(false);
          }
        );
        
        // Cleanup function
        return () => unsubscribe();
      } catch (error) {
        console.error('Error setting up properties listener:', error);
        setError('Failed to load properties. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchProperties();
  }, []);

  // Helper function to map document data to Property type
  const mapDocumentDataToProperty = (id: string, data: DocumentData): Property => {
    return {
      id,
      propertyName: data.propertyName || 'Untitled Property',
      propertyLocation: data.propertyLocation || '',
      propertyPrice: data.propertyPrice || 0,
      propertyType: data.propertyType || '',
      propertyTags: data.propertyTags || [],
      propertyPhotos: data.propertyPhotos || {},
      owner: data.owner || '',
      isHidden: !!data.isHidden,
      dateAdded: data.datePosted ? new Date(data.datePosted.toDate()) : new Date(),
      status: data.status || 'available',
      viewCount: data.viewCount || 0,
      interestedCount: data.interestedCount || 0,
      description: data.description || '',
      datePosted: data.datePosted,
    };
  };

  // Filter properties when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProperties(properties);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = properties.filter(property => 
      property.propertyName.toLowerCase().includes(query) ||
      property.description?.toLowerCase().includes(query) ||
      property.propertyLocation.toLowerCase().includes(query)
    );
    
    setFilteredProperties(filtered);
  }, [properties, searchQuery]);

  // Navigate to property page
  const handlePropertyClick = useCallback((propertyId: string) => {
    navigate(`/property/${propertyId}`);
  }, [navigate]);

  // Handle property removal
  const handleRemoveProperty = useCallback((e: React.MouseEvent, property: Property) => {
    e.stopPropagation(); // Prevent navigation when clicking the remove button
    setPropertyToDelete(property);
    setShowConfirmDialog(true);
  }, []);

  // Confirm property deletion
  const confirmDeleteProperty = useCallback(async () => {
    if (!propertyToDelete) return;
    
    try {
      await deleteDoc(doc(db, 'properties', propertyToDelete.id));
      
      // No need to update local state as the onSnapshot listener will handle it
      
      showFeedback(`Property "${propertyToDelete.propertyName}" has been removed.`, 'success');
    } catch (error) {
      console.error('Error removing property:', error);
      showFeedback('Failed to remove property. Please try again.', 'error');
    }
    
    // Reset dialog state
    setShowConfirmDialog(false);
    setPropertyToDelete(null);
  }, [propertyToDelete, showFeedback]);

  // Cancel deletion
  const cancelDeleteProperty = () => {
    setShowConfirmDialog(false);
    setPropertyToDelete(null);
  };

  // Toggle property visibility
  const togglePropertyVisibility = useCallback(async (e: React.MouseEvent, property: Property) => {
    e.stopPropagation(); // Prevent navigation when clicking the toggle button
    try {
      await updateDoc(doc(db, 'properties', property.id), { 
        isHidden: !property.isHidden 
      });
      
      // No need to update local state as the onSnapshot listener will handle it
      
      showFeedback(
        `Property "${property.propertyName}" has been ${!property.isHidden ? 'hidden from' : 'made visible to'} users.`,
        'success'
      );
    } catch (error) {
      console.error('Error updating property visibility:', error);
      showFeedback('Failed to update property visibility. Please try again.', 'error');
    }
  }, [showFeedback]);

  // Export property data (placeholder)
  const handleExportProperty = useCallback((e: React.MouseEvent, property?: Property) => {
    e.stopPropagation(); // Prevent navigation when clicking the export button
    alert(`Export ${property ? `for property "${property.propertyName}"` : 'all properties'} functionality will be implemented in the future.`);
  }, []);

  // Get image URL for a property
  const getImageUrl = useCallback((property: Property, index: number = 0): string => {
    // This function uses API_URL from config, which defaults the server port to 3000, to fetch images.
    if (!property.propertyPhotos) return "";

    // Handle MongoDB-style photos (array of strings)
    if (Array.isArray(property.propertyPhotos)) {
      const photoId = property.propertyPhotos[index];
      return photoId ? `${API_URL}/api/property-photos/${photoId}/image` : "";
    }

    // Handle Firebase-style photos (object with pictureUrl)
    const photoKeys = Object.keys(property.propertyPhotos).filter(key => 
      key.startsWith("photo")
    );
    
    if (photoKeys.length === 0) return "";
    
    const photoKey = photoKeys[index] || photoKeys[0];
    return property.propertyPhotos[photoKey]?.pictureUrl || "";
  }, []);

  // Render loading state
  if (loading) {
    return <div className="properties-tab-loading">Loading properties data...</div>;
  }

  // Render error state
  if (error) {
    return <div className="properties-tab-error">{error}</div>;
  }

  return (
    <div className="properties-tab">
      <div className="properties-header">
        <h2>Properties Management</h2>
        <div className="actions-container">
          <button 
            className="export-data-btn" 
            onClick={(e) => handleExportProperty(e)}
          >
            Export All Properties
          </button>
          <div className="view-toggle">
            <button 
              className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              Grid
            </button>
            <button 
              className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              Table
            </button>
          </div>
        </div>
      </div>
      
      <div className="search-container">
        <input
          type="text"
          placeholder="Search properties by title, description or address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>
      
      {feedbackMessage && (
        <div className={`feedback-message ${feedbackMessage.type}`}>
          {feedbackMessage.message}
        </div>
      )}
      
      {filteredProperties.length === 0 ? (
        <div className="no-properties">
          No properties found matching the search criteria.
        </div>
      ) : viewMode === 'grid' ? (
        <div className="properties-grid">
          {filteredProperties.map(property => (
            <div 
              key={property.id} 
              className={`property-card ${property.isHidden ? 'hidden-property' : ''}`}
              onClick={() => handlePropertyClick(property.id)}
            >
              <div className="property-image">
                {getImageUrl(property) ? (
                  <img src={getImageUrl(property)} alt={property.propertyName} />
                ) : (
                  <div className="no-image">No Image</div>
                )}
                {property.isHidden && (
                  <div className="hidden-badge">Hidden</div>
                )}
              </div>
              
              <div className="property-content">
                <h3 className="property-title">{property.propertyName}</h3>
                <p className="property-address">{property.propertyLocation}</p>
                <p className="property-price">₱{property.propertyPrice.toLocaleString()}</p>
                <p className="property-description">
                  {property.description && property.description.length > 100
                    ? `${property.description.substring(0, 100)}...`
                    : property.description}
                </p>
                
                <div className="property-details">
                  <span className={`property-status status-${property.status}`}>
                    {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                  </span>
                  <span className="property-date">
                    Added: {property.dateAdded?.toLocaleDateString()}
                  </span>
                </div>
                
                <div className="property-actions">
                  <button 
                    className={`visibility-btn ${property.isHidden ? 'show-btn' : 'hide-btn'}`}
                    onClick={(e) => togglePropertyVisibility(e, property)}
                  >
                    {property.isHidden ? 'Show Property' : 'Hide Property'}
                  </button>
                  <button 
                    className="remove-btn"
                    onClick={(e) => handleRemoveProperty(e, property)}
                  >
                    Remove Property
                  </button>
                  <button 
                    className="export-btn"
                    onClick={(e) => handleExportProperty(e, property)}
                  >
                    Export
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="properties-table-container">
          <table className="properties-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Address</th>
                <th>Price</th>
                <th>Status</th>
                <th>Date Added</th>
                <th>Visibility</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProperties.map(property => (
                <tr 
                  key={property.id} 
                  className={property.isHidden ? 'hidden-property-row' : ''}
                  onClick={() => handlePropertyClick(property.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>{property.propertyName}</td>
                  <td>{property.propertyLocation}</td>
                  <td>₱{property.propertyPrice.toLocaleString()}</td>
                  <td>
                    <span className={`status-badge status-${property.status}`}>
                      {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                    </span>
                  </td>
                  <td>{property.dateAdded?.toLocaleDateString()}</td>
                  <td>
                    <span className={`visibility-badge ${property.isHidden ? 'hidden' : 'visible'}`}>
                      {property.isHidden ? 'Hidden' : 'Visible'}
                    </span>
                  </td>
                  <td className="action-buttons">
                    <button 
                      className={`visibility-btn-small ${property.isHidden ? 'show-btn' : 'hide-btn'}`}
                      onClick={(e) => togglePropertyVisibility(e, property)}
                    >
                      {property.isHidden ? 'Show' : 'Hide'}
                    </button>
                    <button 
                      className="remove-btn-small"
                      onClick={(e) => handleRemoveProperty(e, property)}
                    >
                      Remove
                    </button>
                    <button 
                      className="export-btn-small"
                      onClick={(e) => handleExportProperty(e, property)}
                    >
                      Export
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {showConfirmDialog && propertyToDelete && (
        <div className="confirm-dialog-overlay">
          <div className="confirm-dialog">
            <h3>Confirm Removal</h3>
            <p>Are you sure you want to remove the property "{propertyToDelete.propertyName}"?</p>
            <p className="warning">This action cannot be undone.</p>
            <div className="dialog-buttons">
              <button 
                className="cancel-btn"
                onClick={cancelDeleteProperty}
              >
                Cancel
              </button>
              <button 
                className="confirm-btn"
                onClick={confirmDeleteProperty}
              >
                Remove Property
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertiesTab; 