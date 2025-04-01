import React, { useCallback } from 'react';
import { Property, PropertyStatus, usePropertyData, usePropertyDetail } from './hooks/properties';
import { PropertyFilters, PropertyTable, PropertyDetailPanel } from './components/properties';

export const PropertiesTab: React.FC = () => {
  // Use our custom hooks for property data management
  const {
    properties,
    loading,
    hasMore,
    filters,
    setStatusFilter,
    setTypeFilter,
    setSearchQuery,
    loadMoreProperties,
    updatePropertyStatus,
    deleteProperty,
    error: dataError
  } = usePropertyData();
  
  // Use our custom hook for property detail management
  const {
    selectedProperty,
    detailPanelOpen,
    loading: detailLoading,
    error: detailError,
    openDetailPanel,
    closeDetailPanel,
    updateSelectedPropertyStatus
  } = usePropertyDetail();
  
  // Handler for selecting a property
  const handleSelectProperty = useCallback((property: Property) => {
    openDetailPanel(property);
  }, [openDetailPanel]);
  
  // Handler for updating a property's status
  const handleUpdateStatus = useCallback(async (propertyId: string, newStatus: PropertyStatus) => {
    try {
      await updatePropertyStatus(propertyId, newStatus);
      if (selectedProperty && selectedProperty.id === propertyId) {
        updateSelectedPropertyStatus(newStatus);
      }
    } catch (error) {
      console.error('Error updating property status:', error);
    }
  }, [updatePropertyStatus, selectedProperty, updateSelectedPropertyStatus]);
  
  // Handler for deleting a property
  const handleDeleteProperty = useCallback(async (propertyId: string) => {
    try {
      await deleteProperty(propertyId);
    } catch (error) {
      console.error('Error deleting property:', error);
    }
  }, [deleteProperty]);

  return (
    <div className="properties-tab">
      <div className="tab-header">
        <h2 className="tab-title">Property Management</h2>
        <div className="tab-actions">
          <button 
            className="btn btn-primary"
            onClick={() => window.open('/admin/properties/add', '_blank')}
          >
            <i className="fas fa-plus"></i> Add Property
          </button>
          <button className="btn btn-secondary">
            <i className="fas fa-download"></i> Export Data
          </button>
        </div>
      </div>
      
      {/* Search and Filters */}
      <PropertyFilters 
        filters={filters}
        onSearchChange={setSearchQuery}
        onStatusFilterChange={setStatusFilter}
        onTypeFilterChange={setTypeFilter}
      />
      
      {/* Error notification for data loading, if any */}
      {dataError && (
        <div className="error-notification">
          <i className="fas fa-exclamation-circle"></i> {dataError}
        </div>
      )}
      
      {/* Properties Table/Grid */}
      <PropertyTable 
        properties={properties}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={loadMoreProperties}
        onSelectProperty={handleSelectProperty}
        error={dataError}
      />
      
      {/* Property Detail Panel */}
      <PropertyDetailPanel 
        property={selectedProperty}
        isOpen={detailPanelOpen}
        isLoading={detailLoading}
        error={detailError}
        onClose={closeDetailPanel}
        onUpdateStatus={handleUpdateStatus}
        onDelete={handleDeleteProperty}
      />
    </div>
  );
};

export default PropertiesTab;
