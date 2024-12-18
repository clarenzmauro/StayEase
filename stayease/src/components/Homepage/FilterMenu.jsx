import React, { useState } from 'react';
import './FilterMenu.css';

export function FilterMenu({ isOpen, onClose, onApplyFilters }) {
  const [priceRange, setPriceRange] = useState({ min: 0, max: 50000 });
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedPropertyType, setSelectedPropertyType] = useState('');

  const tags = [
    'Pet Friendly',
    'With Parking',
    'With Security',
    'Near School',
    'With WiFi',
    'Furnished'
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

  const handleTagToggle = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleApply = () => {
    onApplyFilters({
      priceRange,
      selectedTags,
      selectedLocation,
      selectedPropertyType
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="filter-menu-overlay" onClick={onClose}>
      <div className="filter-menu" onClick={e => e.stopPropagation()}>
        <h2>Filters</h2>
        
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
            {tags.map(tag => (
              <label key={tag} className="tag-checkbox">
                <input
                  type="checkbox"
                  checked={selectedTags.includes(tag)}
                  onChange={() => handleTagToggle(tag)}
                />
                {tag}
              </label>
            ))}
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
          <button className="apply-button" onClick={handleApply}>
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}

export default FilterMenu;
