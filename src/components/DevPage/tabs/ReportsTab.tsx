import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, where, addDoc, doc, updateDoc, Timestamp, orderBy, DocumentData } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import './ReportsTab.css';

// Core type definitions
interface Comment {
  id: string;
  text: string;
  author: string;
  dateCreated: Date | Timestamp;
}

interface Report {
  id: string;
  title: string;
  description: string;
  status: 'new' | 'in progress' | 'pending' | 'resolved';
  category: 'bug' | 'feature request' | 'other';
  assignee: string;
  dateCreated: Date | Timestamp;
  dateUpdated: Date | Timestamp;
  comments: Comment[];
}

interface UserData {
  id: string;
  email: string;
  username?: string;
  displayName?: string;
  role: 'user' | 'owner' | 'admin' | 'developer';
}

// Union type for form field names
type ReportFormField = 'title' | 'description' | 'category' | 'assignee';
type FilterField = 'searchQuery' | 'statusFilter' | 'categoryFilter' | 'dateFilter' | 'assigneeFilter';

// State interface
interface ReportsState {
  reports: Report[];
  filteredReports: Report[];
  searchQuery: string;
  statusFilter: string;
  categoryFilter: string;
  dateFilter: string;
  assigneeFilter: string;
  selectedReport: Report | null;
  isModalOpen: boolean;
  newComment: string;
  developers: UserData[];
  loading: boolean;
  isCreateModalOpen: boolean;
  newReport: {
    title: string;
    description: string;
    category: 'bug' | 'feature request' | 'other';
    assignee: string;
  };
  error: string | null;
}

// Initial state
const initialState: ReportsState = {
  reports: [],
  filteredReports: [],
  searchQuery: '',
  statusFilter: 'all',
  categoryFilter: 'all',
  dateFilter: 'all time',
  assigneeFilter: 'all',
  selectedReport: null,
  isModalOpen: false,
  newComment: '',
  developers: [],
  loading: true,
  isCreateModalOpen: false,
  newReport: {
    title: '',
    description: '',
    category: 'bug',
    assignee: '',
  },
  error: null
};

const ReportsTab: React.FC = () => {
  const [state, setState] = useState<ReportsState>(initialState);

  // Helper functions
  const showError = useCallback((message: string) => {
    setState(prev => ({ ...prev, error: message }));
    setTimeout(() => setState(prev => ({ ...prev, error: null })), 3000);
  }, []);

  const formatDate = useCallback((date: Date | Timestamp) => {
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }, []);

  const formatDateForCSV = useCallback((date: Date | Timestamp) => {
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    return d.toISOString().split('T')[0];
  }, []);

  const getDeveloperName = useCallback((developerId: string) => {
    const developer = state.developers.find(dev => dev.id === developerId);
    return developer ? (developer.displayName || developer.username || developer.email) : 'Unassigned';
  }, [state.developers]);

  const renderStatusBadge = useCallback((status: Report['status']) => {
    const statusClass = status.replace(/\s+/g, '-');
    return <span className={`status-badge ${statusClass}`}>{status}</span>;
  }, []);

  // Core data fetching
  const fetchReports = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      const reportsCollection = collection(db, 'reports');
      const reportsQuery = query(reportsCollection, orderBy('dateCreated', 'desc'));
      const reportsSnapshot = await getDocs(reportsQuery);
      
      const reportsData: Report[] = reportsSnapshot.docs.map(doc => {
        const data = doc.data();
        return mapDocumentDataToReport(doc.id, data);
      });
      
      setState(prev => ({ 
        ...prev, 
        reports: reportsData, 
        filteredReports: reportsData,
        loading: false
      }));
    } catch (error) {
      console.error('Error fetching reports:', error);
      showError('Failed to load reports. Please try again later.');
    }
  }, [showError]);

  // Helper function to map document data to Report type
  const mapDocumentDataToReport = (id: string, data: DocumentData): Report => {
    return {
      id,
      title: data.title || '',
      description: data.description || '',
      status: data.status || 'new',
      category: data.category || 'bug',
      assignee: data.assignee || '',
      dateCreated: data.dateCreated instanceof Timestamp ? 
        data.dateCreated : new Date(data.dateCreated),
      dateUpdated: data.dateUpdated instanceof Timestamp ? 
        data.dateUpdated : new Date(data.dateUpdated),
      comments: (data.comments || []).map((comment: any) => ({
        ...comment,
        dateCreated: comment.dateCreated instanceof Timestamp ? 
          comment.dateCreated : new Date(comment.dateCreated)
      }))
    };
  };

  const fetchDevelopers = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      const usersCollection = collection(db, 'accounts');
      const developerQuery = query(usersCollection, where('role', '==', 'developer'));
      const developersSnapshot = await getDocs(developerQuery);
      
      const developersData: UserData[] = developersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          email: data.email || '',
          username: data.username || '',
          displayName: data.displayName || data.username || '',
          role: data.role as UserData['role']
        };
      });
      
      // Add default developer if none exist
      if (developersData.length === 0) {
        developersData.push({
          id: 'dev1',
          email: 'dev1@stayease.com',
          username: 'DevUser',
          displayName: 'Default Developer',
          role: 'developer'
        });
      }
      
      setState(prev => ({ 
        ...prev, 
        developers: developersData,
        newReport: {
          ...prev.newReport,
          assignee: developersData.length > 0 ? developersData[0].id : '',
        },
        loading: false
      }));
      
      // Now fetch the reports
      fetchReports();
    } catch (error) {
      console.error('Error fetching developers:', error);
      showError('Failed to load developers. Please try again later.');
    }
  }, [fetchReports, showError]);

  // Event handlers
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setState(prev => ({ ...prev, [name as FilterField]: value }));
  }, []);
  
  const handleNewReportChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setState(prev => ({ 
      ...prev, 
      newReport: { ...prev.newReport, [name as ReportFormField]: value } 
    }));
  }, []);

  const handleReportClick = useCallback((report: Report) => {
    setState(prev => ({ ...prev, selectedReport: report, isModalOpen: true }));
  }, []);

  const handleStatusChange = useCallback(async (status: Report['status']) => {
    if (!state.selectedReport) return;
    
    try {
      const reportRef = doc(db, 'reports', state.selectedReport.id);
      const dateUpdated = new Date();
      
      await updateDoc(reportRef, { status, dateUpdated });
      
      const updatedReport = { ...state.selectedReport, status, dateUpdated };
      
      setState(prev => ({
        ...prev,
        reports: prev.reports.map(report => 
          report.id === updatedReport.id ? updatedReport : report
        ),
        selectedReport: updatedReport
      }));
    } catch (error) {
      console.error('Error updating report status:', error);
      showError('Failed to update report status. Please try again.');
    }
  }, [state.selectedReport, showError]);

  const handleAssigneeChange = useCallback(async (assignee: string) => {
    if (!state.selectedReport) return;
    
    try {
      const reportRef = doc(db, 'reports', state.selectedReport.id);
      const dateUpdated = new Date();
      
      await updateDoc(reportRef, { assignee, dateUpdated });
      
      const updatedReport = { ...state.selectedReport, assignee, dateUpdated };
      
      setState(prev => ({
        ...prev,
        reports: prev.reports.map(report => 
          report.id === updatedReport.id ? updatedReport : report
        ),
        selectedReport: updatedReport
      }));
    } catch (error) {
      console.error('Error updating report assignee:', error);
      showError('Failed to update assignee. Please try again.');
    }
  }, [state.selectedReport, showError]);

  const handleAddComment = useCallback(async () => {
    if (!state.selectedReport || !state.newComment.trim()) return;
    
    try {
      const authorId = state.developers.length > 0 ? state.developers[0].id : 'unknown';
      
      const newCommentObj: Comment = {
        id: `c${Date.now()}`,
        text: state.newComment,
        author: authorId,
        dateCreated: new Date(),
      };
      
      const updatedComments = [...state.selectedReport.comments, newCommentObj];
      const dateUpdated = new Date();
      
      const reportRef = doc(db, 'reports', state.selectedReport.id);
      await updateDoc(reportRef, { comments: updatedComments, dateUpdated });
      
      const updatedReport = {
        ...state.selectedReport,
        comments: updatedComments,
        dateUpdated,
      };
      
      setState(prev => ({
        ...prev,
        reports: prev.reports.map(report => 
          report.id === updatedReport.id ? updatedReport : report
        ),
        selectedReport: updatedReport,
        newComment: ''
      }));
    } catch (error) {
      console.error('Error adding comment:', error);
      showError('Failed to add comment. Please try again.');
    }
  }, [state.developers, state.newComment, state.selectedReport, showError]);

  const closeModal = useCallback(() => {
    setState(prev => ({ ...prev, isModalOpen: false, selectedReport: null }));
  }, []);
  
  const toggleCreateModal = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      isCreateModalOpen: !prev.isCreateModalOpen,
      newReport: {
        title: '',
        description: '',
        category: 'bug',
        assignee: prev.developers.length > 0 ? prev.developers[0].id : '',
      } 
    }));
  }, []);

  const handleCreateReport = useCallback(async () => {
    if (!state.newReport.title.trim() || !state.newReport.description.trim()) {
      showError('Please provide both title and description for the report.');
      return;
    }
    
    try {
      const now = new Date();
      
      const newReportData = {
        title: state.newReport.title,
        description: state.newReport.description,
        status: 'new' as const,
        category: state.newReport.category,
        assignee: state.newReport.assignee,
        dateCreated: now,
        dateUpdated: now,
        comments: []
      };
      
      const docRef = await addDoc(collection(db, 'reports'), newReportData);
      
      const newReport: Report = {
        id: docRef.id,
        ...newReportData
      };
      
      setState(prev => ({
        ...prev,
        reports: [newReport, ...prev.reports],
        filteredReports: [newReport, ...prev.filteredReports],
        isCreateModalOpen: false,
        newReport: {
          title: '',
          description: '',
          category: 'bug',
          assignee: prev.developers.length > 0 ? prev.developers[0].id : '',
        }
      }));
    } catch (error) {
      console.error('Error creating report:', error);
      showError('Failed to create report. Please try again.');
    }
  }, [state.newReport, showError]);

  const handleExportReports = useCallback(() => {
    let csvContent = 'ID,Title,Description,Status,Category,Assignee,Created Date,Updated Date,Comments\n';
    
    state.reports.forEach(report => {
      const createdDate = formatDateForCSV(report.dateCreated);
      const updatedDate = formatDateForCSV(report.dateUpdated);
      const assigneeName = getDeveloperName(report.assignee);
      const commentsCount = report.comments.length;
      
      const escapedTitle = `"${report.title.replace(/"/g, '""')}"`;
      const escapedDescription = `"${report.description.replace(/"/g, '""')}"`;
      
      csvContent += `${report.id},${escapedTitle},${escapedDescription},${report.status},${report.category},${assigneeName},${createdDate},${updatedDate},${commentsCount}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `stayease-reports-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [state.reports, formatDateForCSV, getDeveloperName]);

  // Side effects
  useEffect(() => {
    fetchDevelopers();
  }, [fetchDevelopers]);

  // Filter reports when any filter changes
  useEffect(() => {
    let filtered = [...state.reports];
    
    // Apply search query filter
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      filtered = filtered.filter(report => 
        report.title.toLowerCase().includes(query) ||
        report.description.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    if (state.statusFilter !== 'all') {
      filtered = filtered.filter(report => report.status === state.statusFilter);
    }
    
    // Apply category filter
    if (state.categoryFilter !== 'all') {
      filtered = filtered.filter(report => report.category === state.categoryFilter);
    }
    
    // Apply date filter
    if (state.dateFilter !== 'all time') {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const thisWeekStart = new Date(today);
      thisWeekStart.setDate(today.getDate() - today.getDay());
      
      const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      
      filtered = filtered.filter(report => {
        const reportDate = new Date(report.dateCreated instanceof Timestamp ? 
          report.dateCreated.toDate() : report.dateCreated);
        
        switch (state.dateFilter) {
          case 'today':
            return reportDate.toDateString() === today.toDateString();
          case 'yesterday':
            return reportDate.toDateString() === yesterday.toDateString();
          case 'this week':
            return reportDate >= thisWeekStart;
          case 'this month':
            return reportDate >= thisMonthStart;
          default:
            return true;
        }
      });
    }
    
    // Apply assignee filter
    if (state.assigneeFilter !== 'all') {
      filtered = filtered.filter(report => report.assignee === state.assigneeFilter);
    }
    
    setState(prev => ({ ...prev, filteredReports: filtered }));
  }, [
    state.reports, 
    state.searchQuery, 
    state.statusFilter, 
    state.categoryFilter, 
    state.dateFilter, 
    state.assigneeFilter
  ]);

  // Show loading state
  if (state.loading) {
    return <div className="reports-tab-loading">Loading reports data...</div>;
  }

  // Render components
  const renderFilters = () => (
    <div className="reports-filters">
      <div className="search-container">
        <input
          type="text"
          name="searchQuery"
          placeholder="Search reports..."
          value={state.searchQuery}
          onChange={handleInputChange}
          className="search-input"
        />
      </div>
      
      <div className="filter-group">
        <label>Status</label>
        <select name="statusFilter" value={state.statusFilter} onChange={handleInputChange}>
          <option value="all">All Statuses</option>
          <option value="new">New</option>
          <option value="in progress">In Progress</option>
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>
      
      <div className="filter-group">
        <label>Category</label>
        <select name="categoryFilter" value={state.categoryFilter} onChange={handleInputChange}>
          <option value="all">All Categories</option>
          <option value="bug">Bug</option>
          <option value="feature request">Feature Request</option>
          <option value="other">Other</option>
        </select>
      </div>
      
      <div className="filter-group">
        <label>Date</label>
        <select name="dateFilter" value={state.dateFilter} onChange={handleInputChange}>
          <option value="all time">All Time</option>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="this week">This Week</option>
          <option value="this month">This Month</option>
        </select>
      </div>
      
      <div className="filter-group">
        <label>Assignee</label>
        <select name="assigneeFilter" value={state.assigneeFilter} onChange={handleInputChange}>
          <option value="all">All Assignees</option>
          {state.developers.map(dev => (
            <option key={dev.id} value={dev.id}>
              {dev.displayName || dev.username || dev.email}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  const renderReportsList = () => (
    <div className="reports-list">
      {state.filteredReports.length === 0 ? (
        <div className="no-reports">No reports match your filters.</div>
      ) : (
        state.filteredReports.map(report => (
          <div 
            key={report.id} 
            className={`report-item status-${report.status.replace(/\s+/g, '-')}`}
            onClick={() => handleReportClick(report)}
          >
            <div className="report-title">{report.title}</div>
            <div className="report-description">{report.description}</div>
            <div className="report-meta">
              <span>Created: {formatDate(report.dateCreated)}</span>
              <span>Updated: {formatDate(report.dateUpdated)}</span>
              <span>Assignee: {getDeveloperName(report.assignee)}</span>
            </div>
            <div className="report-status">
              <span>Category: <b>{report.category}</b></span>
              {renderStatusBadge(report.status)}
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderCreateModal = () => state.isCreateModalOpen && (
    <div className="report-modal-overlay" onClick={toggleCreateModal}>
      <div className="report-modal create-report-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create New Report</h3>
          <button className="close-modal" onClick={toggleCreateModal}>×</button>
        </div>
        
        <div className="modal-content">
          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input
              type="text"
              id="title"
              name="title"
              value={state.newReport.title}
              onChange={handleNewReportChange}
              placeholder="Enter report title"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={state.newReport.description}
              onChange={handleNewReportChange}
              placeholder="Describe the bug or feature request"
              rows={5}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              value={state.newReport.category}
              onChange={handleNewReportChange}
            >
              <option value="bug">Bug</option>
              <option value="feature request">Feature Request</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="assignee">Assignee</label>
            <select
              id="assignee"
              name="assignee"
              value={state.newReport.assignee}
              onChange={handleNewReportChange}
            >
              {state.developers.map(dev => (
                <option key={dev.id} value={dev.id}>
                  {dev.displayName || dev.username || dev.email}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-actions">
            <button className="cancel-btn" onClick={toggleCreateModal}>Cancel</button>
            <button 
              className="create-btn" 
              onClick={handleCreateReport}
              disabled={!state.newReport.title.trim() || !state.newReport.description.trim()}
            >
              Create Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDetailModal = () => state.isModalOpen && state.selectedReport && (
    <div className="report-modal-overlay" onClick={closeModal}>
      <div className="report-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{state.selectedReport.title}</h3>
          <button className="close-modal" onClick={closeModal}>×</button>
        </div>
        
        <div className="modal-content">
          <div className="report-details">
            <div className="report-description-full">{state.selectedReport.description}</div>
            
            <div className="report-detail-item">
              <span className="detail-label">Created:</span>
              <span className="detail-value">{formatDate(state.selectedReport.dateCreated)}</span>
            </div>
            
            <div className="report-detail-item">
              <span className="detail-label">Updated:</span>
              <span className="detail-value">{formatDate(state.selectedReport.dateUpdated)}</span>
            </div>
            
            <div className="report-detail-item">
              <span className="detail-label">Category:</span>
              <span className="detail-value">{state.selectedReport.category}</span>
            </div>
          </div>
          
          <div className="report-actions-panel">
            <div className="action-group">
              <label>Status</label>
              <select 
                value={state.selectedReport.status} 
                onChange={e => handleStatusChange(e.target.value as Report['status'])}
              >
                <option value="new">New</option>
                <option value="in progress">In Progress</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            
            <div className="action-group">
              <label>Assignee</label>
              <select 
                value={state.selectedReport.assignee} 
                onChange={e => handleAssigneeChange(e.target.value)}
              >
                {state.developers.map(dev => (
                  <option key={dev.id} value={dev.id}>
                    {dev.displayName || dev.username || dev.email}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="report-comments-section">
            <h4>Comments ({state.selectedReport.comments.length})</h4>
            
            <div className="comments-list">
              {state.selectedReport.comments.length === 0 ? (
                <div className="no-comments">No comments yet.</div>
              ) : (
                state.selectedReport.comments.map(comment => (
                  <div key={comment.id} className="comment-item">
                    <div className="comment-header">
                      <span className="comment-author">{getDeveloperName(comment.author)}</span>
                      <span className="comment-date">{formatDate(comment.dateCreated)}</span>
                    </div>
                    <div className="comment-text">{comment.text}</div>
                  </div>
                ))
              )}
            </div>
            
            <div className="add-comment">
              <textarea
                name="newComment"
                placeholder="Add a comment..."
                value={state.newComment}
                onChange={handleInputChange}
                rows={3}
              />
              <button
                className="add-comment-btn"
                onClick={handleAddComment}
                disabled={!state.newComment.trim()}
              >
                Add Comment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="reports-tab">
      {state.error && <div className="error-message">{state.error}</div>}
      
      <div className="reports-header">
        <h2>Reports</h2>
        <div className="reports-actions">
          <button className="create-report-btn" onClick={toggleCreateModal}>Create Report</button>
          <button 
            className="export-reports-btn" 
            onClick={handleExportReports}
            disabled={state.reports.length === 0}
          >
            Export Reports
          </button>
        </div>
      </div>
      
      {renderFilters()}
      {renderReportsList()}
      {renderCreateModal()}
      {renderDetailModal()}
    </div>
  );
};

export default ReportsTab; 