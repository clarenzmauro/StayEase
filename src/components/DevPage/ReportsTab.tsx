import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs, 
  doc, 
  updateDoc, 
  Timestamp,
  where,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { formatDistanceToNow } from 'date-fns';

// Types
interface Comment {
  id: string;
  text: string;
  userId: string;
  userName: string;
  createdAt: Timestamp;
  attachments?: string[];
}

interface UserReport {
  id: string;
  title: string;
  description: string;
  status: 'new' | 'in_progress' | 'resolved';
  category: 'bug' | 'feature_request' | 'enhancement' | 'payment' | 'other';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  userId: string;
  userName: string;
  assignedTo?: string;
  assignedToName?: string;
  comments: Comment[];
}

export const ReportsTab: React.FC = () => {
  // State
  const [reports, setReports] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [selectedReport, setSelectedReport] = useState<UserReport | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');

  // Fetch reports with real-time updates
  useEffect(() => {
    setLoading(true);
    
    // Build query based on filters
    let reportsQuery = query(
      collection(db, 'reports'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    
    // Apply status filter if not 'all'
    if (statusFilter !== 'all') {
      reportsQuery = query(
        reportsQuery,
        where('status', '==', statusFilter)
      );
    }
    
    // Apply category filter if not 'all'
    if (categoryFilter !== 'all') {
      reportsQuery = query(
        reportsQuery,
        where('category', '==', categoryFilter)
      );
    }
    
    // Set up real-time listener
    const unsubscribe = onSnapshot(reportsQuery, (snapshot) => {
      if (snapshot.empty) {
        setReports([]);
        setHasMore(false);
      } else {
        const fetchedReports = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as UserReport[];
        
        // Apply search filter client-side
        const filteredReports = searchQuery 
          ? fetchedReports.filter(report => 
              report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              report.description.toLowerCase().includes(searchQuery.toLowerCase()))
          : fetchedReports;
        
        setReports(filteredReports);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === 10);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching reports:", error);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [statusFilter, categoryFilter, dateFilter, searchQuery, assigneeFilter]);

  // Load more reports
  const loadMoreReports = async () => {
    if (!lastVisible) return;
    
    setLoading(true);
    
    try {
      let moreReportsQuery = query(
        collection(db, 'reports'),
        orderBy('createdAt', 'desc'),
        startAfter(lastVisible),
        limit(10)
      );
      
      // Apply status filter if not 'all'
      if (statusFilter !== 'all') {
        moreReportsQuery = query(
          moreReportsQuery,
          where('status', '==', statusFilter)
        );
      }
      
      // Apply category filter if not 'all'
      if (categoryFilter !== 'all') {
        moreReportsQuery = query(
          moreReportsQuery,
          where('category', '==', categoryFilter)
        );
      }
      
      const snapshot = await getDocs(moreReportsQuery);
      
      if (snapshot.empty) {
        setHasMore(false);
      } else {
        const moreReports = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as UserReport[];
        
        // Apply search filter client-side
        const filteredMoreReports = searchQuery 
          ? moreReports.filter(report => 
              report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              report.description.toLowerCase().includes(searchQuery.toLowerCase()))
          : moreReports;
        
        setReports(prevReports => [...prevReports, ...filteredMoreReports]);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === 10);
      }
    } catch (error) {
      console.error("Error loading more reports:", error);
    } finally {
      setLoading(false);
    }
  };

  // Update report status
  const updateReportStatus = async (reportId: string, newStatus: 'new' | 'in_progress' | 'resolved') => {
    try {
      const reportRef = doc(db, 'reports', reportId);
      await updateDoc(reportRef, {
        status: newStatus,
        updatedAt: Timestamp.now()
      });
      
      // Update local state if detail panel is open
      if (selectedReport && selectedReport.id === reportId) {
        setSelectedReport({
          ...selectedReport,
          status: newStatus,
          updatedAt: Timestamp.now()
        });
      }
    } catch (error) {
      console.error("Error updating report status:", error);
    }
  };

  // Add comment to report
  const addComment = async () => {
    if (!selectedReport || !newComment.trim()) return;
    
    try {
      const reportRef = doc(db, 'reports', selectedReport.id);
      
      const newCommentObj: Comment = {
        id: Math.random().toString(36).substring(2, 15),
        text: newComment,
        userId: 'admin', // Replace with actual user ID
        userName: 'Admin User', // Replace with actual user name
        createdAt: Timestamp.now()
      };
      
      const updatedComments = [...selectedReport.comments, newCommentObj];
      
      await updateDoc(reportRef, {
        comments: updatedComments,
        updatedAt: Timestamp.now()
      });
      
      // Update local state
      setSelectedReport({
        ...selectedReport,
        comments: updatedComments,
        updatedAt: Timestamp.now()
      });
      
      setNewComment('');
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  // Assign report to user
  const assignReport = async (reportId: string, userId: string, userName: string) => {
    try {
      const reportRef = doc(db, 'reports', reportId);
      await updateDoc(reportRef, {
        assignedTo: userId,
        assignedToName: userName,
        updatedAt: Timestamp.now()
      });
      
      // Update local state if detail panel is open
      if (selectedReport && selectedReport.id === reportId) {
        setSelectedReport({
          ...selectedReport,
          assignedTo: userId,
          assignedToName: userName,
          updatedAt: Timestamp.now()
        });
      }
    } catch (error) {
      console.error("Error assigning report:", error);
    }
  };

  // Open detail panel for a report
  const openDetailPanel = (report: UserReport) => {
    setSelectedReport(report);
    setDetailPanelOpen(true);
  };

  // Close detail panel
  const closeDetailPanel = () => {
    setDetailPanelOpen(false);
    setSelectedReport(null);
  };

  // Format date for display
  const formatDate = (timestamp: Timestamp) => {
    try {
      return formatDistanceToNow(timestamp.toDate(), { addSuffix: true });
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Get status badge class
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'new': return 'status-badge status-new';
      case 'in_progress': return 'status-badge status-in-progress';
      case 'resolved': return 'status-badge status-resolved';
      default: return 'status-badge';
    }
  };

  // Get category label
  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'bug': return 'Bug';
      case 'feature_request': return 'Feature Request';
      case 'enhancement': return 'Enhancement';
      case 'payment': return 'Payment Issue';
      case 'other': return 'Other';
      default: return category;
    }
  };

  return (
    <div className="reports-tab">
      <div className="tab-header">
        <h2 className="tab-title">User Reports</h2>
        <div className="tab-actions">
          <button className="btn btn-primary">
            <i className="fas fa-plus"></i> New Report
          </button>
        </div>
      </div>

      <div className="search-bar">
        <i className="fas fa-search"></i>
        <input 
          type="text" 
          placeholder="Search reports..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="filter-bar">
        <select 
          className="filter-select" 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="new">New</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>

        <select 
          className="filter-select" 
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">All Categories</option>
          <option value="bug">Bug</option>
          <option value="feature_request">Feature Request</option>
          <option value="enhancement">Enhancement</option>
          <option value="payment">Payment Issue</option>
          <option value="other">Other</option>
        </select>

        <select 
          className="filter-select" 
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>

        <select 
          className="filter-select" 
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
        >
          <option value="all">All Assignees</option>
          <option value="unassigned">Unassigned</option>
          <option value="me">Assigned to Me</option>
        </select>
      </div>

      {loading && reports.length === 0 ? (
        <div className="loading-indicator">Loading reports...</div>
      ) : reports.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-clipboard-list fa-3x"></i>
          <p>No reports found matching your criteria.</p>
        </div>
      ) : (
        <>
          <div className="reports-list">
            {reports.map(report => (
              <div 
                key={report.id} 
                className="item-card report-card"
                onClick={() => openDetailPanel(report)}
              >
                <div className="report-header">
                  <h3 className="report-title">{report.title}</h3>
                  <span className={getStatusBadgeClass(report.status)}>
                    {report.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="report-category">
                  {getCategoryLabel(report.category)}
                </div>
                <p className="report-description">{report.description.substring(0, 100)}...</p>
                <div className="report-meta">
                  <span className="report-date">
                    <i className="far fa-clock"></i> {formatDate(report.createdAt)}
                  </span>
                  <span className="report-user">
                    <i className="far fa-user"></i> {report.userName}
                  </span>
                  {report.assignedToName && (
                    <span className="report-assignee">
                      <i className="fas fa-user-check"></i> {report.assignedToName}
                    </span>
                  )}
                  <span className="report-comments">
                    <i className="far fa-comment"></i> {report.comments.length}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="load-more">
              <button 
                className="btn btn-secondary"
                onClick={loadMoreReports}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Detail Panel */}
      <div className={`detail-panel ${detailPanelOpen ? 'open' : ''}`}>
        {selectedReport && (
          <>
            <div className="detail-panel-header">
              <h3>Report Details</h3>
              <button 
                className="detail-panel-close"
                onClick={closeDetailPanel}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="report-detail-content">
              <div className="report-detail-title">
                <h2>{selectedReport.title}</h2>
                <span className={getStatusBadgeClass(selectedReport.status)}>
                  {selectedReport.status.replace('_', ' ')}
                </span>
              </div>

              <div className="report-detail-meta">
                <div className="meta-item">
                  <span className="meta-label">Reported by:</span>
                  <span className="meta-value">{selectedReport.userName}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Date:</span>
                  <span className="meta-value">{formatDate(selectedReport.createdAt)}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Category:</span>
                  <span className="meta-value">{getCategoryLabel(selectedReport.category)}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Assigned to:</span>
                  <span className="meta-value">
                    {selectedReport.assignedToName || 'Unassigned'}
                  </span>
                </div>
              </div>

              <div className="report-detail-description">
                <h4>Description</h4>
                <p>{selectedReport.description}</p>
              </div>

              <div className="report-detail-actions">
                <div className="status-actions">
                  <button 
                    className={`btn ${selectedReport.status === 'new' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => updateReportStatus(selectedReport.id, 'new')}
                  >
                    Mark as New
                  </button>
                  <button 
                    className={`btn ${selectedReport.status === 'in_progress' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => updateReportStatus(selectedReport.id, 'in_progress')}
                  >
                    Mark In Progress
                  </button>
                  <button 
                    className={`btn ${selectedReport.status === 'resolved' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => updateReportStatus(selectedReport.id, 'resolved')}
                  >
                    Mark Resolved
                  </button>
                </div>

                <div className="assign-action">
                  <select 
                    onChange={(e) => {
                      const [userId, userName] = e.target.value.split('|');
                      assignReport(selectedReport.id, userId, userName);
                    }}
                    value={selectedReport.assignedTo ? `${selectedReport.assignedTo}|${selectedReport.assignedToName}` : ''}
                  >
                    <option value="">Unassigned</option>
                    <option value="admin|Admin User">Admin User</option>
                    {/* Add more users here */}
                  </select>
                </div>
              </div>

              <div className="report-detail-comments">
                <h4>Comments ({selectedReport.comments.length})</h4>
                
                {selectedReport.comments.length === 0 ? (
                  <div className="empty-comments">No comments yet.</div>
                ) : (
                  <div className="comments-list">
                    {selectedReport.comments.map(comment => (
                      <div key={comment.id} className="comment-item">
                        <div className="comment-header">
                          <span className="comment-user">{comment.userName}</span>
                          <span className="comment-date">{formatDate(comment.createdAt)}</span>
                        </div>
                        <div className="comment-text">{comment.text}</div>
                        {comment.attachments && comment.attachments.length > 0 && (
                          <div className="comment-attachments">
                            {comment.attachments.map(attachment => (
                              <a 
                                key={attachment} 
                                href={attachment} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="attachment-link"
                              >
                                <i className="fas fa-paperclip"></i> Attachment
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="add-comment">
                  <textarea 
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  ></textarea>
                  <div className="comment-actions">
                    <button 
                      className="btn btn-secondary"
                      onClick={() => setNewComment('')}
                    >
                      Cancel
                    </button>
                    <button 
                      className="btn btn-primary"
                      onClick={addComment}
                      disabled={!newComment.trim()}
                    >
                      Add Comment
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ReportsTab;
