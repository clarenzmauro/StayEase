import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  where,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { formatDistanceToNow } from 'date-fns';

interface PropertyType {
  id: string;
  propertyName: string;
  propertyLocation: string;
  propertyPrice: number;
  propertyType: string;
  propertyTags: string[];
  owner?: string;
  ownerName?: string;
  datePosted: Timestamp;
  viewCount?: number;
  interestedCount?: number;
  status: 'active' | 'pending' | 'flagged' | 'inactive';
  propertyPhotos?: { [key: string]: { pictureUrl: string } } | string[];
}

export const PropertiesTab: React.FC = () => {
  // State
  const [properties, setProperties] = useState<PropertyType[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<PropertyType | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch properties
  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true);
      
      try {
        // Build query based on filters
        let propertiesQuery = query(
          collection(db, 'properties'),
          orderBy('datePosted', 'desc'),
          limit(10)
        );
        
        // Apply status filter if not 'all'
        if (statusFilter !== 'all') {
          propertiesQuery = query(
            propertiesQuery,
            where('status', '==', statusFilter)
          );
        }
        
        // Apply type filter if not 'all'
        if (typeFilter !== 'all') {
          propertiesQuery = query(
            propertiesQuery,
            where('propertyType', '==', typeFilter)
          );
        }
        
        const snapshot = await getDocs(propertiesQuery);
        
        if (snapshot.empty) {
          setProperties([]);
          setHasMore(false);
        } else {
          const fetchedProperties = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            status: doc.data().status || 'active' // Default status if not present
          })) as PropertyType[];
          
          // Apply search filter client-side
          const filteredProperties = searchQuery 
            ? fetchedProperties.filter(property => 
                property.propertyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                property.propertyLocation.toLowerCase().includes(searchQuery.toLowerCase()))
            : fetchedProperties;
          
          setProperties(filteredProperties);
          setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
          setHasMore(snapshot.docs.length === 10);
        }
      } catch (error) {
        console.error("Error fetching properties:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProperties();
  }, [statusFilter, typeFilter, searchQuery]);

  // Load more properties
  const loadMoreProperties = async () => {
    if (!lastVisible) return;
    
    setLoading(true);
    
    try {
      let morePropertiesQuery = query(
        collection(db, 'properties'),
        orderBy('datePosted', 'desc'),
        startAfter(lastVisible),
        limit(10)
      );
      
      // Apply status filter if not 'all'
      if (statusFilter !== 'all') {
        morePropertiesQuery = query(
          morePropertiesQuery,
          where('status', '==', statusFilter)
        );
      }
      
      // Apply type filter if not 'all'
      if (typeFilter !== 'all') {
        morePropertiesQuery = query(
          morePropertiesQuery,
          where('propertyType', '==', typeFilter)
        );
      }
      
      const snapshot = await getDocs(morePropertiesQuery);
      
      if (snapshot.empty) {
        setHasMore(false);
      } else {
        const moreProperties = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          status: doc.data().status || 'active' // Default status if not present
        })) as PropertyType[];
        
        // Apply search filter client-side
        const filteredMoreProperties = searchQuery 
          ? moreProperties.filter(property => 
              property.propertyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
              property.propertyLocation.toLowerCase().includes(searchQuery.toLowerCase()))
          : moreProperties;
        
        setProperties(prevProperties => [...prevProperties, ...filteredMoreProperties]);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === 10);
      }
    } catch (error) {
      console.error("Error loading more properties:", error);
    } finally {
      setLoading(false);
    }
  };

  // Update property status
  const updatePropertyStatus = async (propertyId: string, newStatus: 'active' | 'pending' | 'flagged' | 'inactive') => {
    try {
      const propertyRef = doc(db, 'properties', propertyId);
      await updateDoc(propertyRef, {
        status: newStatus,
        updatedAt: Timestamp.now()
      });
      
      // Update local state if detail panel is open
      if (selectedProperty && selectedProperty.id === propertyId) {
        setSelectedProperty({
          ...selectedProperty,
          status: newStatus
        });
      }
      
      // Update property in the list
      setProperties(prevProperties => 
        prevProperties.map(property => 
          property.id === propertyId 
            ? { ...property, status: newStatus } 
            : property
        )
      );
    } catch (error) {
      console.error("Error updating property status:", error);
    }
  };

  // Delete property
  const deleteProperty = async (propertyId: string) => {
    if (!confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      return;
    }
    
    try {
      const propertyRef = doc(db, 'properties', propertyId);
      await deleteDoc(propertyRef);
      
      // Close detail panel if open
      if (selectedProperty && selectedProperty.id === propertyId) {
        setDetailPanelOpen(false);
        setSelectedProperty(null);
      }
      
      // Remove property from the list
      setProperties(prevProperties => 
        prevProperties.filter(property => property.id !== propertyId)
      );
    } catch (error) {
      console.error("Error deleting property:", error);
    }
  };

  // Open detail panel for a property
  const openDetailPanel = (property: PropertyType) => {
    setSelectedProperty(property);
    setDetailPanelOpen(true);
  };

  // Close detail panel
  const closeDetailPanel = () => {
    setDetailPanelOpen(false);
    setSelectedProperty(null);
  };

  // Format date for display
  const formatDate = (timestamp: Timestamp) => {
    try {
      return formatDistanceToNow(timestamp.toDate(), { addSuffix: true });
    } catch (error) {
      return 'Invalid date';
    }
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

  // Get image URL from property
  const getImageUrl = (property: PropertyType, index: number = 0) => {
    if (!property.propertyPhotos) return "";

    // Handle MongoDB-style photos (array of strings)
    if (Array.isArray(property.propertyPhotos)) {
      const photoId = property.propertyPhotos[index];
      return photoId ? `/api/property-photos/${photoId}/image` : "";
    }

    // Handle Firebase-style photos (object with pictureUrl)
    const photoKeys = Object.keys(property.propertyPhotos).filter((key) =>
      key.startsWith("photo")
    );
    const photoKey = photoKeys[index];
    return property.propertyPhotos[photoKey]?.pictureUrl || "";
  };

  // Format price for display
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="properties-tab">
      <div className="tab-header">
        <h2 className="tab-title">Property Management</h2>
        <div className="tab-actions">
          <button className="btn btn-secondary">
            <i className="fas fa-download"></i> Export Properties
          </button>
        </div>
      </div>

      <div className="search-bar">
        <i className="fas fa-search"></i>
        <input 
          type="text" 
          placeholder="Search properties by name or location..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="filter-bar">
        <select 
          className="filter-select" 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="flagged">Flagged</option>
          <option value="inactive">Inactive</option>
        </select>

        <select 
          className="filter-select" 
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">All Types</option>
          <option value="apartment">Apartment</option>
          <option value="house">House</option>
          <option value="condo">Condo</option>
          <option value="villa">Villa</option>
        </select>
      </div>

      {loading && properties.length === 0 ? (
        <div className="loading-indicator">Loading properties...</div>
      ) : properties.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-home fa-3x"></i>
          <p>No properties found matching your criteria.</p>
        </div>
      ) : (
        <>
          <div className="properties-grid">
            {properties.map(property => (
              <div 
                key={property.id} 
                className="property-card"
                onClick={() => openDetailPanel(property)}
              >
                <div className="property-image">
                  <img 
                    src={getImageUrl(property)} 
                    alt={property.propertyName} 
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=No+Image';
                    }}
                  />
                  <span className={getStatusBadgeClass(property.status)}>
                    {property.status}
                  </span>
                </div>
                <div className="property-content">
                  <h3 className="property-title">{property.propertyName}</h3>
                  <p className="property-location">
                    <i className="fas fa-map-marker-alt"></i> {property.propertyLocation}
                  </p>
                  <p className="property-price">{formatPrice(property.propertyPrice)}</p>
                  <div className="property-meta">
                    <span className="property-type">{property.propertyType}</span>
                    <span className="property-date">{formatDate(property.datePosted)}</span>
                  </div>
                  <div className="property-stats">
                    {property.viewCount !== undefined && (
                      <span className="stat-item">
                        <i className="fas fa-eye"></i> {property.viewCount}
                      </span>
                    )}
                    {property.interestedCount !== undefined && (
                      <span className="stat-item">
                        <i className="fas fa-heart"></i> {property.interestedCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="load-more">
              <button 
                className="btn btn-secondary"
                onClick={loadMoreProperties}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Detail Panel */}
      <div className={`detail-panel ${detailPanelOpen ? 'open' : ''}`}>
        {selectedProperty && (
          <>
            <div className="detail-panel-header">
              <h3>Property Details</h3>
              <button 
                className="detail-panel-close"
                onClick={closeDetailPanel}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="property-detail-content">
              <div className="property-detail-images">
                <img 
                  src={getImageUrl(selectedProperty)} 
                  alt={selectedProperty.propertyName} 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=No+Image';
                  }}
                />
                {/* Could add image gallery controls here */}
              </div>

              <div className="property-detail-header">
                <h2>{selectedProperty.propertyName}</h2>
                <span className={getStatusBadgeClass(selectedProperty.status)}>
                  {selectedProperty.status}
                </span>
              </div>

              <div className="property-detail-meta">
                <div className="meta-item">
                  <span className="meta-label">Location:</span>
                  <span className="meta-value">{selectedProperty.propertyLocation}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Price:</span>
                  <span className="meta-value">{formatPrice(selectedProperty.propertyPrice)}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Type:</span>
                  <span className="meta-value">{selectedProperty.propertyType}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Posted:</span>
                  <span className="meta-value">{formatDate(selectedProperty.datePosted)}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Owner:</span>
                  <span className="meta-value">{selectedProperty.ownerName || 'Unknown'}</span>
                </div>
              </div>

              <div className="property-detail-tags">
                <h4>Tags</h4>
                <div className="tags-list">
                  {selectedProperty.propertyTags && selectedProperty.propertyTags.map((tag, index) => (
                    <span key={index} className="tag-badge">{tag}</span>
                  ))}
                </div>
              </div>

              <div className="property-detail-stats">
                <h4>Statistics</h4>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">{selectedProperty.viewCount || 0}</div>
                    <div className="stat-label">Views</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{selectedProperty.interestedCount || 0}</div>
                    <div className="stat-label">Interested</div>
                  </div>
                </div>
              </div>

              <div className="property-detail-actions">
                <div className="action-group">
                  <h4>Status</h4>
                  <div className="action-buttons">
                    <button 
                      className={`btn ${selectedProperty.status === 'active' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => updatePropertyStatus(selectedProperty.id, 'active')}
                    >
                      Active
                    </button>
                    <button 
                      className={`btn ${selectedProperty.status === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => updatePropertyStatus(selectedProperty.id, 'pending')}
                    >
                      Pending
                    </button>
                    <button 
                      className={`btn ${selectedProperty.status === 'flagged' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => updatePropertyStatus(selectedProperty.id, 'flagged')}
                    >
                      Flagged
                    </button>
                    <button 
                      className={`btn ${selectedProperty.status === 'inactive' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => updatePropertyStatus(selectedProperty.id, 'inactive')}
                    >
                      Inactive
                    </button>
                  </div>
                </div>

                <div className="action-group">
                  <h4>Actions</h4>
                  <div className="action-buttons">
                    <button className="btn btn-secondary">
                      <i className="fas fa-edit"></i> Edit
                    </button>
                    <button 
                      className="btn btn-danger"
                      onClick={() => deleteProperty(selectedProperty.id)}
                    >
                      <i className="fas fa-trash"></i> Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PropertiesTab;
