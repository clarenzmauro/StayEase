import { useState, useEffect } from 'react';
import './FilterMenu.css';

interface FilterMenuProps {
  onFilterChange: (filters: {
    priceRange: { min: number; max: number };
    selectedTags: string[];
    selectedLocation: string;
    selectedPropertyType: string;
    sortBy?: string;
  }) => void;
  isLoading: boolean;
}

export function FilterMenu({ onFilterChange, isLoading }: FilterMenuProps) {
  const [priceRange, setPriceRange] = useState({ min: 0, max: 50000 });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>('');
  const [sortBy, setSortBy] = useState('most-popular');
  const [showAllTags, setShowAllTags] = useState(false);

  const tags = [
    'Pet Friendly',
    'With Parking',
    'With Security',
    'Near School',
    'With WiFi',
    'Furnished',
    'With Kitchen',
    'Near Market',
    'Near Hospital',
    'With Air Conditioning',
    'With Generator',
    'Near Church'
  ];

  const locations = [
    'Alangilan',
    'Poblacion',
    'Gulod',
    'Kumintang',
    'Pallocan'
  ];

  const propertyTypes = [
    'Dormitory',
    'Apartment',
    'Boarding House',
    'Student Housing'
  ];

  const visibleTags = showAllTags ? tags : tags.slice(0, 6);

  useEffect(() => {
    onFilterChange({
      priceRange,
      selectedTags,
      selectedLocation,
      selectedPropertyType
    });
  }, [priceRange, selectedTags, selectedLocation, selectedPropertyType]);

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  if (isLoading) {
    return (
      <div className="filter-menu">
        <h2>Filters</h2>
        
        <div className="filter-section skeleton">
          <h3></h3>
          <div className="price-range">
            <input disabled />
            <span></span>
            <input disabled />
          </div>
        </div>

        <div className="filter-section skeleton">
          <h3></h3>
          <div className="tags-grid">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="tag-checkbox"></div>
            ))}
          </div>
        </div>

        <div className="filter-section skeleton">
          <h3></h3>
          <select disabled></select>
        </div>

        <div className="filter-section skeleton">
          <h3></h3>
          <select disabled></select>
        </div>

        <div className="filter-buttons skeleton">
          <button className="reset-button" disabled></button>
        </div>
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
          onChange={(e) => {
            setSortBy(e.target.value);
            onFilterChange({
              priceRange,
              selectedTags,
              selectedLocation,
              selectedPropertyType,
              sortBy: e.target.value
            });
          }}
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
                checked={selectedTags.includes(tag)}
                onChange={() => handleTagToggle(tag)}
              />
              {tag}
            </label>
          ))}
          <div 
            className="more-tags-button"
            onClick={() => setShowAllTags(!showAllTags)}
          >
            More {showAllTags ? '▲' : '▼'}
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="filter-section">
        <h3>Location</h3>
        <select
          value={selectedLocation}
          onChange={e => setSelectedLocation(e.target.value)}
        >
          <option value="">All Locations</option>
          {locations.map(location => (
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

      {/* Buttons */}
      <div className="filter-buttons">
        <button className="reset-button" onClick={() => {
          setPriceRange({ min: 0, max: 50000 });
          setSelectedTags([]);
          setSelectedLocation('');
          setSelectedPropertyType('');
        }}>
          Reset
        </button>
      </div>
    </div>
  );
}

export default FilterMenu;