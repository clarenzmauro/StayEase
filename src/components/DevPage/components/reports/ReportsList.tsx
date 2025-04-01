import React, { useState, useEffect } from 'react';
import { ReportsFilter } from './ReportsFilter';
import { ReportListItem } from './ReportListItem';
import { ReportDetailPanel } from './ReportDetailPanel';
import { useReportData, ReportStatus } from '../../hooks/reports/useReportData';
import { useReportDetail } from '../../hooks/reports/useReportDetail';
import { FiAlertTriangle, FiLoader } from 'react-icons/fi';
import './ReportStyles.css';

interface ReportsListProps {
  staffMembers?: Array<{ id: string; name: string }>;
}

export const ReportsList: React.FC<ReportsListProps> = ({ staffMembers = [] }) => {
  const { 
    reports, 
    loading, 
    hasMore, 
    filters,
    error,
    setStatusFilter,
    setCategoryFilter,
    setDateFilter,
    setAssigneeFilter,
    setSearchQuery,
    loadMoreReports,
    updateReportStatus,
    assignReport,
    addComment
  } = useReportData();

  const {
    selectedReport,
    detailPanelOpen,
    loading: detailLoading,
    error: detailError,
    newComment,
    setNewComment,
    openDetailPanel,
    closeDetailPanel,
    updateSelectedReportStatus
  } = useReportDetail();

  // Reset all filters to their default values
  const handleClearFilters = () => {
    setStatusFilter('all');
    setCategoryFilter('all');
    setDateFilter('all');
    setAssigneeFilter('all');
    setSearchQuery('');
  };

  // Handle status change in the detail panel
  const handleStatusChange = async (status: ReportStatus) => {
    if (!selectedReport) return;
    
    updateSelectedReportStatus(status);
    try {
      await updateReportStatus(selectedReport.id, status);
    } catch (error) {
      console.error('Failed to update status:', error);
      // You would typically show an error toast here
    }
  };

  // Handle report assignment
  const handleAssign = async (userId: string, userName: string) => {
    if (!selectedReport) return;
    
    try {
      await assignReport(selectedReport.id, userId, userName);
    } catch (error) {
      console.error('Failed to assign report:', error);
      // You would typically show an error toast here
    }
  };

  // Handle adding a comment
  const handleAddComment = async (comment: string) => {
    if (!selectedReport) return;
    
    try {
      await addComment(selectedReport.id, comment);
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
      // You would typically show an error toast here
    }
  };

  return (
    <div className="reports-container">
      <ReportsFilter 
        filters={filters}
        onStatusChange={setStatusFilter}
        onCategoryChange={setCategoryFilter}
        onDateChange={setDateFilter}
        onAssigneeChange={setAssigneeFilter}
        onSearchChange={setSearchQuery}
        onClearFilters={handleClearFilters}
        staffMembers={staffMembers}
      />
      
      <div className="reports-list">
        {error && (
          <div className="reports-error">
            <FiAlertTriangle size={24} />
            <p>{error}</p>
          </div>
        )}
        
        {loading && reports.length === 0 ? (
          <div className="reports-loading">
            <FiLoader size={24} className="reports-spinner" />
            <p>Loading reports...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="reports-empty">
            <p>No reports found. Try adjusting your filters.</p>
          </div>
        ) : (
          <>
            {reports.map(report => (
              <ReportListItem 
                key={report.id} 
                report={report} 
                onClick={openDetailPanel}
              />
            ))}
            
            {hasMore && (
              <div className="reports-load-more">
                <button 
                  className="reports-load-more-button"
                  onClick={loadMoreReports}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
      
      {detailPanelOpen && selectedReport && (
        <ReportDetailPanel 
          report={selectedReport}
          onClose={closeDetailPanel}
          onStatusChange={handleStatusChange}
          onAssign={handleAssign}
          onAddComment={handleAddComment}
          newComment={newComment}
          setNewComment={setNewComment}
          loading={detailLoading}
          staffMembers={staffMembers}
        />
      )}
    </div>
  );
};