import React, { memo } from 'react';
import { PropertyFilters as PropertyFiltersType } from '../../hooks/properties/usePropertyData';

interface PropertyFiltersProps {
  filters: PropertyFiltersType;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onTypeFilterChange: (value: string) => void;
}

const PropertyFiltersComponent: React.FC<PropertyFiltersProps> = ({
  filters,
  onSearchChange,
  onStatusFilterChange,
  onTypeFilterChange
}) => {
  return (
    <>
      <div className="search-bar">
        <i className="fas fa-search"></i>
        <input 
          type="text" 
          placeholder="Search properties by name or location..." 
          value={filters.searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="filter-bar">
        <select 
          className="filter-select"
          value={filters.statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="flagged">Flagged</option>
          <option value="inactive">Inactive</option>
        </select>
        
        <select 
          className="filter-select"
          value={filters.typeFilter}
          onChange={(e) => onTypeFilterChange(e.target.value)}
        >
          <option value="all">All Property Types</option>
          <option value="apartment">Apartment</option>
          <option value="house">House</option>
          <option value="condo">Condo</option>
          <option value="villa">Villa</option>
          <option value="land">Land</option>
          <option value="commercial">Commercial</option>
          <option value="other">Other</option>
        </select>
      </div>
    </>
  );
};

// Use React.memo to prevent unnecessary re-renders
export const PropertyFilters = memo(PropertyFiltersComponent);
export default PropertyFilters; 