import React from 'react';
import { ReportFilters } from '../../hooks/reports/useReportData';
import { FiSearch, FiFilter, FiX } from 'react-icons/fi';
import './ReportStyles.css';

interface ReportsFilterProps {
  filters: ReportFilters;
  onStatusChange: (status: string) => void;
  onCategoryChange: (category: string) => void;
  onDateChange: (date: string) => void;
  onAssigneeChange: (assignee: string) => void;
  onSearchChange: (search: string) => void;
  onClearFilters: () => void;
  staffMembers?: Array<{ id: string; name: string }>;
}

export const ReportsFilter: React.FC<ReportsFilterProps> = ({
  filters,
  onStatusChange,
  onCategoryChange,
  onDateChange,
  onAssigneeChange,
  onSearchChange,
  onClearFilters,
  staffMembers = []
}) => {
  const hasActiveFilters = 
    filters.statusFilter !== 'all' || 
    filters.categoryFilter !== 'all' || 
    filters.dateFilter !== 'all' || 
    filters.assigneeFilter !== 'all' || 
    filters.searchQuery !== '';

  return (
    <div className="reports-filter">
      <div className="reports-filter-search">
        <div className="reports-search-icon">
          <FiSearch />
        </div>
        <input 
          type="text"
          placeholder="Search reports..."
          value={filters.searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="reports-search-input"
        />
        {filters.searchQuery && (
          <button 
            className="reports-search-clear" 
            onClick={() => onSearchChange('')}
          >
            <FiX />
          </button>
        )}
      </div>
      
      <div className="reports-filter-controls">
        <div className="reports-filter-item">
          <label className="reports-filter-label">Status</label>
          <select 
            value={filters.statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="reports-filter-select"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="in_progress">In Progress</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        
        <div className="reports-filter-item">
          <label className="reports-filter-label">Category</label>
          <select 
            value={filters.categoryFilter}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="reports-filter-select"
          >
            <option value="all">All Categories</option>
            <option value="bug">Bug</option>
            <option value="feature_request">Feature Request</option>
            <option value="enhancement">Enhancement</option>
            <option value="payment">Payment</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        <div className="reports-filter-item">
          <label className="reports-filter-label">Date</label>
          <select 
            value={filters.dateFilter}
            onChange={(e) => onDateChange(e.target.value)}
            className="reports-filter-select"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="thisWeek">This Week</option>
            <option value="thisMonth">This Month</option>
          </select>
        </div>
        
        <div className="reports-filter-item">
          <label className="reports-filter-label">Assignee</label>
          <select 
            value={filters.assigneeFilter}
            onChange={(e) => onAssigneeChange(e.target.value)}
            className="reports-filter-select"
          >
            <option value="all">All Assignees</option>
            <option value="unassigned">Unassigned</option>
            {staffMembers.map(staff => (
              <option key={staff.id} value={staff.id}>
                {staff.name}
              </option>
            ))}
          </select>
        </div>
        
        {hasActiveFilters && (
          <button 
            className="reports-filter-clear"
            onClick={onClearFilters}
          >
            <FiX /> Clear Filters
          </button>
        )}
      </div>
    </div>
  );
}; 