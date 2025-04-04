import { useState, useEffect } from 'react';
import './FilterMenu.css';

interface FilterMenuProps {
  onFilterChange: (filters: {
    priceRange: { min: number; max: number };
    selectedTags: string[];
    selectedLocation: string;
    selectedPropertyType: string;
    sortBy: string;
  }) => void;
  isLoading: boolean;
  availableTags: string[];
  availableLocations: string[];
  properties: {
    propertyTags: string[];
    propertyPrice: number;
    propertyLocation: string;
    propertyType: string;
  }[];
}

export function FilterMenu({ onFilterChange, isLoading, availableTags, availableLocations, properties }: FilterMenuProps) {
  const MAX_PRICE = 1000000; // Define a maximum price constant
  const [priceRange, setPriceRange] = useState({ min: 0, max: MAX_PRICE });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>('');
  const [sortBy, setSortBy] = useState('most-popular');
  const [showAllTags, setShowAllTags] = useState(false);

  const propertyTypes = [
    'Dormitory',
    'Apartment',
    'Boarding House',
    'Student Housing'
  ];

  const visibleTags = showAllTags ? availableTags : availableTags.slice(0, 6);

  useEffect(() => {
    onFilterChange({
      priceRange,
      selectedTags,
      selectedLocation,
      selectedPropertyType,
      sortBy
    });
  }, [priceRange, selectedTags, selectedLocation, selectedPropertyType, sortBy]);

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const getTagCount = (tag: string): number => {
    // Start with all properties that have this tag
    let matchingProperties = properties.filter(property => 
      property.propertyTags && property.propertyTags.includes(tag)
    );

    // If there are any active filters (except tags), apply them
    if (priceRange.min > 0 || priceRange.max < MAX_PRICE || selectedLocation || selectedPropertyType) {
      matchingProperties = matchingProperties.filter(property => {
        const matchesPrice = property.propertyPrice >= (priceRange.min || 0) && 
                           property.propertyPrice <= (priceRange.max || MAX_PRICE);
        
        const matchesLocation = !selectedLocation || 
                              property.propertyLocation === selectedLocation;
        
        const matchesType = !selectedPropertyType || 
                          property.propertyType === selectedPropertyType;

        return matchesPrice && matchesLocation && matchesType;
      });
    }

    return matchingProperties.length;
  };

  if (isLoading) {
    return (
      <div className="filter-menu skeleton-menu" aria-busy="true" aria-label="Loading filters">
        <div className="skeleton-title skeleton-pulse" />
        
        {/* Sort Section */}
        <div className="skeleton-section">
          <div className="skeleton-heading skeleton-pulse" />
          <div className="skeleton-select skeleton-pulse" />
        </div>

        {/* Price Range Section */}
        <div className="skeleton-section">
          <div className="skeleton-heading skeleton-pulse" />
          <div className="skeleton-range">
            <div className="skeleton-range-input skeleton-pulse" />
            <div className="skeleton-range-separator skeleton-pulse" />
            <div className="skeleton-range-input skeleton-pulse" />
          </div>
        </div>

        {/* Tags Section */}
        <div className="skeleton-section">
          <div className="skeleton-heading skeleton-pulse" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton-tag skeleton-pulse" />
          ))}
        </div>

        {/* Location Section */}
        <div className="skeleton-section">
          <div className="skeleton-heading skeleton-pulse" />
          <div className="skeleton-select skeleton-pulse" />
        </div>

        {/* Property Type Section */}
        <div className="skeleton-section">
          <div className="skeleton-heading skeleton-pulse" />
          <div className="skeleton-select skeleton-pulse" />
        </div>

        {/* Reset Button */}
        <div className="skeleton-button skeleton-pulse" />
      </div>
    );
  }

  return (
    <div className="filter-menu">
      <h2>Filters</h2>
      
      {/* Add Sort Section */}
      <div className="sort-section">
        <h3>Sort</h3>
        <select 
          className="sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="most-popular">Most Popular</option>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
          <option value="top-rated">Top Rated</option>
        </select>
      </div>

      {/* Price Range */}
      <div className="filter-section">
        <h3>Price Range</h3>
        <div className="price-range">
          <input
            type="number"
            value={priceRange.min}
            onChange={e => {
              const value = e.target.value;
              setPriceRange(prev => ({
                ...prev,
                min: value === '' ? 0 : parseInt(value)
              }));
            }}
            placeholder="Min"
          />
          <span>to</span>
          <input
            type="number"
            value={priceRange.max}
            onChange={e => {
              const value = e.target.value;
              setPriceRange(prev => ({
                ...prev,
                max: value === '' ? MAX_PRICE : parseInt(value)
              }));
            }}
            placeholder="Max"
          />
        </div>
      </div>

      {/* Tags */}
      <div className="filter-section">
        <h3>Tags</h3>
        <div className="tags-grid">
          {visibleTags.map(tag => (
            <label key={tag} className="tag-checkbox">
              <input
                type="checkbox"
                name={tag}
                checked={selectedTags.includes(tag)}
                onChange={() => handleTagToggle(tag)}
              />
              <span className="checkmark"></span>
              {tag}
              <span className="count">{getTagCount(tag)}</span>
            </label>
          ))}
          {availableTags.length > 6 && (
            <div 
              className="more-tags-button"
              onClick={() => setShowAllTags(!showAllTags)}
            >
              More {showAllTags ? '▲' : '▼'}
            </div>
          )}
        </div>
      </div>

      {/* Location */}
      <div className="filter-section">
        <h3>Location</h3>
        <select
          className="location-select"
          value={selectedLocation}
          onChange={e => setSelectedLocation(e.target.value)}
        >
          <option value="">All Locations</option>
          {availableLocations.map(location => (
            <option key={location} value={location}>
              {location}
            </option>
          ))}
        </select>
      </div>

      {/* Property Type */}
      <div className="filter-section">
        <h3>Property Type</h3>
        <select
          className="type-select"
          value={selectedPropertyType}
          onChange={e => setSelectedPropertyType(e.target.value)}
        >
          <option value="">All Types</option>
          {propertyTypes.map(type => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {/* Reset Button */}
      <div className="filter-buttons">
        <button
          className="reset-button"
          onClick={() => {
            setPriceRange({ min: 0, max: MAX_PRICE });
            setSelectedTags([]);
            setSelectedLocation('');
            setSelectedPropertyType('');
            setSortBy('most-popular');
          }}
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
}