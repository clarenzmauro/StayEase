import React, { useState, useEffect } from 'react';
import './HomePage.css';
import { ItemsContext } from './ItemsContext';
import { FilterMenu } from './FilterMenu';
import { Link } from 'react-router-dom';

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

  // TODO: Fetch properties from Firebase
  useEffect(() => {
    // Implement Firebase fetch here
    // For now, using dummy data
    setProperties([
      {
        id: 1,
        name: "Student Haven",
        location: "Alangilan",
        owner: "John Doe",
        price: 5000,
        type: "Dormitory",
        tags: ["With WiFi", "Near School"]
      },
      {
        id: 2,
        name: "Cozy Nest",
        location: "Poblacion",
        owner: "Jane Smith",
        price: 6000,
        type: "Apartment",
        tags: ["Furnished", "Pet Friendly"]
      },
      {
        id: 3,
        name: "Safe Haven",
        location: "Gulod",
        owner: "Alice Johnson",
        price: 4500,
        type: "Dormitory",
        tags: ["With Security", "Near School"]
      },
      {
        id: 4,
        name: "Sunny Apartments",
        location: "Kumintang",
        owner: "Bob Brown",
        price: 7000,
        type: "Apartment",
        tags: ["With Parking", "Near Mall"]
      },
      {
        id: 5,
        name: "Student Lodge",
        location: "Pallocan",
        owner: "Charlie Green",
        price: 5500,
        type: "Boarding House",
        tags: ["With WiFi", "Quiet Area"]
      },
      {
        id: 6,
        name: "Dormitory Life",
        location: "Alangilan",
        owner: "Diana Prince",
        price: 5000,
        type: "Dormitory",
        tags: ["Furnished", "With WiFi"]
      },
      {
        id: 7,
        name: "Comfort Stay",
        location: "Poblacion",
        owner: "Ethan Hunt",
        price: 8000,
        type: "Apartment",
        tags: ["Pet Friendly", "With Parking"]
      },
      {
        id: 8,
        name: "Peaceful Living",
        location: "Gulod",
        owner: "Fiona Apple",
        price: 6000,
        type: "Dormitory",
        tags: ["Near School", "Quiet Area"]
      },
      {
        id: 9,
        name: "Student Shelter",
        location: "Kumintang",
        owner: "George Clooney",
        price: 6500,
        type: "Boarding House",
        tags: ["With Security", "Near Mall"]
      },
      {
        id: 10,
        name: "Home Away From Home",
        location: "Pallocan",
        owner: "Hannah Montana",
        price: 7000,
        type: "Apartment",
        tags: ["Furnished", "With WiFi"]
      }
    ]);
  }, []);

  // Handle search functionality
  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();
    
    if (!query) {
      setFilteredProperties(properties);
      return;
    }

    const filtered = properties.filter(property => {
      // Search by location
      const locationMatch = property.location.toLowerCase().includes(query);
      
      // Search by tags
      const tagMatch = property.tags.some(tag => 
        tag.toLowerCase().includes(query)
      );
      
      // Search by property name
      const nameMatch = property.name.toLowerCase().includes(query);
      
      // Search by property type
      const typeMatch = property.type.toLowerCase().includes(query);
      
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

  useEffect(() => {
    const filtered = properties.filter(property => {
      const priceInRange = 
        property.price >= activeFilters.priceRange.min &&
        property.price <= activeFilters.priceRange.max;
      
      const matchesTags = 
        activeFilters.selectedTags.length === 0 ||
        activeFilters.selectedTags.every(tag => property.tags.includes(tag));
      
      const matchesLocation = 
        !activeFilters.selectedLocation ||
        property.location === activeFilters.selectedLocation;
      
      const matchesType = 
        !activeFilters.selectedPropertyType ||
        property.type === activeFilters.selectedPropertyType;

      return priceInRange && matchesTags && matchesLocation && matchesType;
    });
    setFilteredProperties(filtered);
  }, [activeFilters, properties]);

  const handleItemClick = (itemId) => {
    setSelectedItem(itemId);
    setIsItemDetailsOpen(true);
  };

  // TODO: Add a function for "Properties" and "People" located in the navbar

  // TODO: Add a function for "EN" located in the navbar

  // TODO: Add a function for user icon located in the navbar => AccountPage.jsx

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
              {/* Property image will be added here */}
              <div className="property-placeholder">
                <div className="property-info">
                  <div className="property-name">{item.name}</div>
                  <div className="property-location">{item.location}</div>
                  <div className="property-type">{item.type}</div>
                  <div className="property-price">₱{item.price.toLocaleString()}/month</div>
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
