import { useState, useEffect, useCallback } from 'react';
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
import { db } from '../../../../firebase/config';
import { useDebounce } from '../useDebounce';

export type PropertyStatus = 'active' | 'pending' | 'flagged' | 'inactive';
export type PropertyType = 'apartment' | 'house' | 'condo' | 'villa' | 'land' | 'commercial' | 'other';

export interface Property {
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
  status: PropertyStatus;
  propertyPhotos?: { [key: string]: { pictureUrl: string } } | string[];
}

export interface PropertyFilters {
  statusFilter: string;
  typeFilter: string;
  searchQuery: string;
}

interface UsePropertyDataReturn {
  properties: Property[];
  loading: boolean;
  hasMore: boolean;
  filters: PropertyFilters;
  setStatusFilter: (status: string) => void;
  setTypeFilter: (type: string) => void;
  setSearchQuery: (query: string) => void;
  loadMoreProperties: () => Promise<void>;
  updatePropertyStatus: (propertyId: string, newStatus: PropertyStatus) => Promise<void>;
  deleteProperty: (propertyId: string) => Promise<boolean>;
  error: string | null;
}

export function usePropertyData(initialFilters?: Partial<PropertyFilters>): UsePropertyDataReturn {
  // State for properties and pagination
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for filters
  const [statusFilter, setStatusFilter] = useState<string>(initialFilters?.statusFilter || 'all');
  const [typeFilter, setTypeFilter] = useState<string>(initialFilters?.typeFilter || 'all');
  const [searchQuery, setSearchQuery] = useState(initialFilters?.searchQuery || '');
  
  // Debounce search query to prevent excessive API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  
  // Fetch properties based on current filters
  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setError(null);
    
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
          collection(db, 'properties'),
          where('status', '==', statusFilter),
          orderBy('datePosted', 'desc'),
          limit(10)
        );
      }
      
      // Apply type filter if not 'all'
      if (typeFilter !== 'all') {
        propertiesQuery = query(
          collection(db, 'properties'),
          where('propertyType', '==', typeFilter),
          orderBy('datePosted', 'desc'),
          limit(10)
        );
      }
      
      // Apply both filters if both are not 'all'
      if (statusFilter !== 'all' && typeFilter !== 'all') {
        propertiesQuery = query(
          collection(db, 'properties'),
          where('status', '==', statusFilter),
          where('propertyType', '==', typeFilter),
          orderBy('datePosted', 'desc'),
          limit(10)
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
        })) as Property[];
        
        // Apply search filter client-side
        const filteredProperties = debouncedSearchQuery 
          ? fetchedProperties.filter(property => 
              property.propertyName.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
              property.propertyLocation.toLowerCase().includes(debouncedSearchQuery.toLowerCase()))
          : fetchedProperties;
        
        setProperties(filteredProperties);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === 10);
      }
    } catch (error) {
      console.error("Error fetching properties:", error);
      setError("Failed to load properties. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, debouncedSearchQuery]);
  
  // Load more properties
  const loadMoreProperties = async () => {
    if (!lastVisible || loading) return;
    
    setLoading(true);
    setError(null);
    
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
          collection(db, 'properties'),
          where('status', '==', statusFilter),
          orderBy('datePosted', 'desc'),
          startAfter(lastVisible),
          limit(10)
        );
      }
      
      // Apply type filter if not 'all'
      if (typeFilter !== 'all') {
        morePropertiesQuery = query(
          collection(db, 'properties'),
          where('propertyType', '==', typeFilter),
          orderBy('datePosted', 'desc'),
          startAfter(lastVisible),
          limit(10)
        );
      }
      
      // Apply both filters if both are not 'all'
      if (statusFilter !== 'all' && typeFilter !== 'all') {
        morePropertiesQuery = query(
          collection(db, 'properties'),
          where('status', '==', statusFilter),
          where('propertyType', '==', typeFilter),
          orderBy('datePosted', 'desc'),
          startAfter(lastVisible),
          limit(10)
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
        })) as Property[];
        
        // Apply search filter client-side
        const filteredMoreProperties = debouncedSearchQuery 
          ? moreProperties.filter(property => 
              property.propertyName.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
              property.propertyLocation.toLowerCase().includes(debouncedSearchQuery.toLowerCase()))
          : moreProperties;
        
        setProperties(prevProperties => [...prevProperties, ...filteredMoreProperties]);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === 10);
      }
    } catch (error) {
      console.error("Error loading more properties:", error);
      setError("Failed to load more properties. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  // Update property status
  const updatePropertyStatus = async (propertyId: string, newStatus: PropertyStatus) => {
    setError(null);
    
    try {
      const propertyRef = doc(db, 'properties', propertyId);
      await updateDoc(propertyRef, {
        status: newStatus,
        updatedAt: Timestamp.now()
      });
      
      // Update property in the list
      setProperties(prevProperties => 
        prevProperties.map(property => 
          property.id === propertyId 
            ? { ...property, status: newStatus } 
            : property
        )
      );
      
      return;
    } catch (error) {
      console.error("Error updating property status:", error);
      setError("Failed to update property status. Please try again.");
      throw error;
    }
  };
  
  // Delete property
  const deleteProperty = async (propertyId: string): Promise<boolean> => {
    setError(null);
    
    try {
      const propertyRef = doc(db, 'properties', propertyId);
      await deleteDoc(propertyRef);
      
      // Remove property from the list
      setProperties(prevProperties => 
        prevProperties.filter(property => property.id !== propertyId)
      );
      
      return true;
    } catch (error) {
      console.error("Error deleting property:", error);
      setError("Failed to delete property. Please try again.");
      return false;
    }
  };
  
  // Fetch properties when filters change
  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);
  
  return {
    properties,
    loading,
    hasMore,
    filters: {
      statusFilter,
      typeFilter,
      searchQuery
    },
    setStatusFilter,
    setTypeFilter,
    setSearchQuery,
    loadMoreProperties,
    updatePropertyStatus,
    deleteProperty,
    error
  };
} 