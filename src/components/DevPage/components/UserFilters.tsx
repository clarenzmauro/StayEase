import React, { memo } from 'react';
import type { UserFilters as UserFiltersType } from '../hooks/useUserData';

interface UserFiltersProps {
  filters: UserFiltersType;
  onSearchChange: (value: string) => void;
  onRoleFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onSortByChange: (value: string) => void;
  onSortDirectionChange: (value: 'asc' | 'desc') => void;
}

const UserFiltersComponent: React.FC<UserFiltersProps> = ({
  filters,
  onSearchChange,
  onRoleFilterChange,
  onStatusFilterChange,
  onSortByChange,
  onSortDirectionChange
}) => {
  return (
    <>
      <div className="search-bar">
        <i className="fas fa-search"></i>
        <input 
          type="text" 
          placeholder="Search users by email or name..." 
          value={filters.searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="filter-bar">
        <select 
          className="filter-select"
          value={filters.roleFilter}
          onChange={(e) => onRoleFilterChange(e.target.value)}
        >
          <option value="all">All Roles</option>
          <option value="user">User</option>
          <option value="owner">Owner</option>
          <option value="admin">Admin</option>
        </select>
        
        <select 
          className="filter-select"
          value={filters.statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="inactive">Inactive</option>
        </select>
        
        <select 
          className="filter-select"
          value={filters.sortBy}
          onChange={(e) => onSortByChange(e.target.value)}
        >
          <option value="createdAt">Sort by: Sign Up Date</option>
          <option value="lastLogin">Sort by: Last Login</option>
          <option value="email">Sort by: Email</option>
          <option value="displayName">Sort by: Name</option>
        </select>
        
        <div className="sort-direction-controls">
          <button 
            className={`sort-btn ${filters.sortDirection === 'asc' ? 'active' : ''}`}
            onClick={() => onSortDirectionChange('asc')}
            aria-label="Sort ascending"
          >
            <i className="fas fa-sort-amount-up-alt"></i>
          </button>
          <button 
            className={`sort-btn ${filters.sortDirection === 'desc' ? 'active' : ''}`}
            onClick={() => onSortDirectionChange('desc')}
            aria-label="Sort descending"
          >
            <i className="fas fa-sort-amount-down"></i>
          </button>
        </div>
      </div>
    </>
  );
};

// Use React.memo to prevent unnecessary re-renders
export const UserFilters = memo(UserFiltersComponent);
export default UserFilters; 