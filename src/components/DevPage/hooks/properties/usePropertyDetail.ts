import { useState, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../firebase/config';
import { Property, PropertyStatus } from './usePropertyData';

interface UsePropertyDetailReturn {
  selectedProperty: Property | null;
  detailPanelOpen: boolean;
  loading: boolean;
  error: string | null;
  openDetailPanel: (property: Property) => Promise<void>;
  closeDetailPanel: () => void;
  updateSelectedPropertyStatus: (status: PropertyStatus) => void;
}

export function usePropertyDetail(): UsePropertyDetailReturn {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Open detail panel for a property
  const openDetailPanel = useCallback(async (property: Property) => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch complete property data
      const propertyRef = doc(db, 'properties', property.id);
      const propertyDoc = await getDoc(propertyRef);
      
      if (propertyDoc.exists()) {
        const propertyData = {
          id: propertyDoc.id,
          ...propertyDoc.data()
        } as Property;
        
        setSelectedProperty(propertyData);
        setDetailPanelOpen(true);
      } else {
        setError("Property not found. It may have been deleted.");
      }
    } catch (error) {
      console.error("Error fetching property details:", error);
      setError("Failed to load property details. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Close detail panel
  const closeDetailPanel = useCallback(() => {
    setDetailPanelOpen(false);
    setSelectedProperty(null);
  }, []);
  
  // Update selected property status (local state only)
  const updateSelectedPropertyStatus = useCallback((status: PropertyStatus) => {
    if (selectedProperty) {
      setSelectedProperty({
        ...selectedProperty,
        status: status
      });
    }
  }, [selectedProperty]);

  return {
    selectedProperty,
    detailPanelOpen,
    loading,
    error,
    openDetailPanel,
    closeDetailPanel,
    updateSelectedPropertyStatus
  };
} 