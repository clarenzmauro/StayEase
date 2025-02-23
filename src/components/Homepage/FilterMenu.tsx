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
}

export function FilterMenu({ onFilterChange, isLoading, availableTags, availableLocations }: FilterMenuProps) {
  const [priceRange, setPriceRange] = useState({ min: 0, max: 10000 });
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
            onChange={e => setPriceRange(prev => ({ ...prev, min: parseInt(e.target.value) }))}
            placeholder="Min"
          />
          <span>to</span>
          <input
            type="number"
            value={priceRange.max}
            onChange={e => setPriceRange(prev => ({ ...prev, max: parseInt(e.target.value) }))}
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
              <span className="count">0</span>
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
            setPriceRange({ min: 0, max: 1000000 });
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