import React, { useState, useEffect } from 'react';
import './HomePage.css';
import ItemsContext from './ItemsContext';
import { FilterMenu } from './FilterMenu';
import { Link } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config.js';

export function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [isItemDetailsOpen, setIsItemDetailsOpen] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [activeFilters, setActiveFilters] = useState({
    priceRange: { min: 0, max: 50000 },
    selectedTags: [],
    selectedLocation: '',
    selectedPropertyType: ''
  });

  // Set up real-time listener for properties
  useEffect(() => {
    console.log('Setting up real-time listener for properties...');
    const propertiesCollection = collection(db, 'properties');
    
    // Create real-time listener
    const unsubscribe = onSnapshot(propertiesCollection, (snapshot) => {
      console.log('Received database update:', snapshot.size, 'properties');
      const propertiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('Updated properties data:', propertiesData);
      
      setProperties(propertiesData);
      setFilteredProperties(propertiesData);
    }, (error) => {
      console.error('Error in real-time listener:', error);
    });

    // Cleanup listener on component unmount
    return () => {
      console.log('Cleaning up real-time listener...');
      unsubscribe();
    };
  }, []); // Empty dependency array means this only runs once on mount

  // Filter properties based on search and filters
  useEffect(() => {
    let filtered = [...properties];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(property =>
        property.propertyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        property.propertyLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        property.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        property.propertyType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        property.owner.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply price range filter
    filtered = filtered.filter(property =>
      property.rent >= activeFilters.priceRange.min &&
      property.rent <= activeFilters.priceRange.max
    );

    // Apply location filter
    if (activeFilters.selectedLocation) {
      filtered = filtered.filter(property =>
        property.propertyLocation === activeFilters.selectedLocation
      );
    }

    // Apply property type filter
    if (activeFilters.selectedPropertyType) {
      filtered = filtered.filter(property =>
        property.propertyType === activeFilters.selectedPropertyType
      );
    }

    // Apply tags filter
    if (activeFilters.selectedTags.length > 0) {
      filtered = filtered.filter(property =>
        activeFilters.selectedTags.every(tag => property.tags.includes(tag))
      );
    }

    setFilteredProperties(filtered);
  }, [properties, searchQuery, activeFilters]);

  // Handle search functionality
  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();
    
    if (!query) {
      setFilteredProperties(properties);
      return;
    }

    const filtered = properties.filter(property => {
      // Search by location
      const locationMatch = property.propertyLocation.toLowerCase().includes(query);
      
      // Search by tags
      const tagMatch = property.tags.some(tag => 
        tag.toLowerCase().includes(query)
      );
      
      // Search by property name
      const nameMatch = property.propertyName.toLowerCase().includes(query);
      
      // Search by property type
      const typeMatch = property.propertyType.toLowerCase().includes(query);
      
      // Search by owner name
      const ownerMatch = property.owner.toLowerCase().includes(query);

      return locationMatch || tagMatch || nameMatch || typeMatch || ownerMatch;
    });

    setFilteredProperties(filtered);
  }, [searchQuery, properties]);

  // Handle filter application
  const handleApplyFilters = (filters) => {
    setActiveFilters(filters);
  };

  const handleItemClick = (itemId) => {
    console.log('HomePage: Item clicked with id:', itemId);
    setSelectedItem(itemId);
    setIsItemDetailsOpen(true);
  };

  return (
    <div className="homepage-container">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="logo">
          <Link to="/" onClick={() => {
            setSearchQuery('');
            setActiveFilters({
              priceRange: { min: 0, max: 50000 },
              selectedTags: [],
              selectedLocation: '',
              selectedPropertyType: ''
            });
          }} style={{ textDecoration: 'none', color: 'inherit' }}>
            StayEase
          </Link>
        </div>
        
        <div className="nav-links">
          <span>Properties</span>
          <span>People</span>
        </div>

        <div className="nav-right">
          <span className="language-switch">EN</span>
          <div className="user-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="#333333"/>
            </svg>
          </div>
        </div>
      </nav>

      {/* Search Section */}
      <div className="search-section">
        <input
          type="text"
          className="search-bar"
          placeholder="Search by location, tags, property name, type, or owner..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button 
          className="filter-button"
          onClick={() => setIsFilterMenuOpen(true)}
        >
          Filter
        </button>
      </div>

      {/* Properties Grid */}
      <div className="properties-grid">
        {filteredProperties.length === 0 ? (
          <div className="no-results">
            No properties found matching your search criteria
          </div>
        ) : (
          filteredProperties.map((item) => (
            <div 
              key={item.id} 
              className="property-card"
              onClick={() => handleItemClick(item.id)}
            >
              <div className="property-placeholder">
                <div className="property-info">
                  <div className="property-name">{item.propertyName}</div>
                  <div className="property-location">{item.propertyLocation}</div>
                  <div className="property-type">{item.propertyType}</div>
                  <div className="property-price">₱{item.rent.toLocaleString()}/month</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Item Details Overlay */}
      <ItemsContext
        isOpen={isItemDetailsOpen}
        onClose={() => setIsItemDetailsOpen(false)}
        itemId={selectedItem}
      />

      {/* Filter Menu */}
      <FilterMenu
        isOpen={isFilterMenuOpen}
        onClose={() => setIsFilterMenuOpen(false)}
        onApplyFilters={handleApplyFilters}
      />
    </div>
  );
}

export default HomePage;
