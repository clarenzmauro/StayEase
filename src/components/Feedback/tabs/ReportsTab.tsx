import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, doc, updateDoc, arrayUnion, arrayRemove, getDoc, addDoc, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { User } from 'firebase/auth';
import './ReportsTab.css';

// Types
interface Comment {
  id: string;
  text: string;
  author: string;
  dateCreated: Date | Timestamp;
}

interface Activity {
  id: string;
  action: string;
  userId: string;
  timestamp: Date | Timestamp;
}

type ReportCategory = 'bug' | 'feature request' | 'other';
type ReportStatus = 'new' | 'in progress' | 'pending' | 'resolved';

interface Report {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  status: ReportStatus;
  assignee: string;
  dateCreated: Date | Timestamp;
  dateUpdated: Date | Timestamp;
  comments: Comment[];
  activities: Activity[];
  upvotes?: string[];
  subscribers?: string[];
}

interface UserInfo {
  id: string;
  displayName?: string;
  email?: string;
}

interface ReportsTabProps {
  user: User | null;
}

const ReportsTab: React.FC<ReportsTabProps> = ({ user }) => {
  // State
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [newReport, setNewReport] = useState({
    title: '',
    description: '',
    category: 'bug' as ReportCategory
  });
  const [newComment, setNewComment] = useState('');
  const [formVisible, setFormVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userCache, setUserCache] = useState<Record<string, UserInfo>>({});
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'upvotes' | 'recent' | 'comments'>('upvotes');

  // Filtered reports based on search criteria
  const filteredReports = useMemo(() => {
    return reports
      .filter(report => {
        const matchesSearch = !searchQuery || 
          report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          report.description.toLowerCase().includes(searchQuery.toLowerCase());
          
        const matchesCategory = categoryFilter === 'all' || report.category === categoryFilter;
        const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
        
        return matchesSearch && matchesCategory && matchesStatus;
      })
      .sort((a, b) => {
        if (sortOrder === 'upvotes') {
          return (b.upvotes?.length || 0) - (a.upvotes?.length || 0);
        } else if (sortOrder === 'recent') {
          const dateA = a.dateUpdated instanceof Date ? a.dateUpdated : a.dateUpdated.toDate();
          const dateB = b.dateUpdated instanceof Date ? b.dateUpdated : b.dateUpdated.toDate();
          return dateB.getTime() - dateA.getTime();
        } else {
          return (b.comments?.length || 0) - (a.comments?.length || 0);
        }
      });
  }, [reports, searchQuery, categoryFilter, statusFilter, sortOrder]);

  // Fetch reports from Firestore
  const fetchReports = async () => {
    try {
      setLoading(true);
      const reportsCollection = collection(db, 'reports');
      const reportsQuery = query(reportsCollection, orderBy('dateCreated', 'desc'));
      const reportsSnapshot = await getDocs(reportsQuery);
      
      const reportsList = reportsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || '',
          description: data.description || '',
          category: data.category || 'bug',
          status: data.status || 'new',
          assignee: data.assignee || '',
          dateCreated: data.dateCreated instanceof Timestamp ? 
            data.dateCreated : new Date(data.dateCreated),
          dateUpdated: data.dateUpdated instanceof Timestamp ? 
            data.dateUpdated : new Date(data.dateUpdated),
          comments: (data.comments || []).map((comment: any) => ({
            ...comment,
            dateCreated: comment.dateCreated instanceof Timestamp ? 
              comment.dateCreated : new Date(comment.dateCreated)
          })),
          activities: (data.activities || []).map((activity: any) => ({
            ...activity,
            timestamp: activity.timestamp instanceof Timestamp ? 
              activity.timestamp : new Date(activity.timestamp)
          })),
          upvotes: data.upvotes || [],
          subscribers: data.subscribers || []
        } as Report;
      });
      
      setReports(reportsList);
      
      // Collect all unique user IDs from reports
      const userIds = new Set<string>();
      
      reportsList.forEach(report => {
        report.comments.forEach(comment => {
          if (comment.author) userIds.add(comment.author);
        });
        report.activities.forEach(activity => {
          if (activity.userId) userIds.add(activity.userId);
        });
      });
      
      await fetchUserInfo(Array.from(userIds));
    } catch (error) {
      console.error('Error fetching reports:', error);
      showError('Failed to load reports. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch user information for all user IDs
  const fetchUserInfo = async (userIds: string[]) => {
    if (!userIds.length) return;
    
    try {
      // Filter out IDs we already have in cache
      const idsToFetch = userIds.filter(id => !userCache[id]);
      if (!idsToFetch.length) return;
      
      const usersCollection = collection(db, 'accounts');
      const usersSnapshot = await getDocs(usersCollection);
      
      const newUserCache = { ...userCache };
      
      usersSnapshot.docs.forEach(doc => {
        const userData = doc.data();
        if (idsToFetch.includes(doc.id)) {
          newUserCache[doc.id] = {
            id: doc.id,
            displayName: userData.displayName || userData.username || '',
            email: userData.email || ''
          };
        }
      });
      
      // For any users not found, store their ID as a fallback
      idsToFetch.forEach(id => {
        if (!newUserCache[id]) {
          newUserCache[id] = { id, displayName: '', email: '' };
        }
      });
      
      setUserCache(newUserCache);
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Show error message with auto-dismiss
  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 3000);
  };

  // Add activity record to a report
  const addActivity = (reportId: string, action: string) => {
    if (!user) return;
    
    const now = new Date();
    const newActivity = {
      id: `a${Date.now()}`,
      action,
      userId: user.uid,
      timestamp: now
    };
    
    try {
      const reportRef = doc(db, 'reports', reportId);
      updateDoc(reportRef, {
        activities: arrayUnion(newActivity),
        dateUpdated: now
      });
      
      // Update local state
      updateLocalReport(reportId, report => ({
        ...report,
        activities: [...(report.activities || []), newActivity],
        dateUpdated: now
      }));
    } catch (error) {
      console.error('Error adding activity:', error);
    }
  };

  // Handle upvote toggle
  const handleUpvote = async (reportId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user) {
      showError('Please log in to upvote reports');
      return;
    }
    
    try {
      const reportRef = doc(db, 'reports', reportId);
      const reportSnap = await getDoc(reportRef);
      
      if (reportSnap.exists()) {
        const reportData = reportSnap.data();
        const upvotes = reportData.upvotes || [];
        const now = new Date();
        const hasUpvoted = upvotes.includes(user.uid);
        
        // Toggle upvote
        await updateDoc(reportRef, {
          upvotes: hasUpvoted ? arrayRemove(user.uid) : arrayUnion(user.uid),
          dateUpdated: now
        });
        
        // Update local state
        updateLocalReport(reportId, report => ({
          ...report,
          upvotes: hasUpvoted 
            ? report.upvotes?.filter(id => id !== user.uid) || []
            : [...(report.upvotes || []), user.uid],
          dateUpdated: now
        }));
        
        // Add activity
        addActivity(reportId, hasUpvoted ? 'removed their upvote' : 'upvoted this report');
      }
    } catch (error) {
      console.error('Error updating upvote:', error);
      showError('Failed to update upvote. Please try again.');
    }
  };

  // Handle subscription toggle
  const handleSubscribe = async (reportId: string) => {
    if (!user) {
      showError('Please log in to subscribe to reports');
      return;
    }
    
    try {
      const reportRef = doc(db, 'reports', reportId);
      const reportSnap = await getDoc(reportRef);
      
      if (reportSnap.exists()) {
        const reportData = reportSnap.data();
        const subscribers = reportData.subscribers || [];
        const now = new Date();
        const isSubscribed = subscribers.includes(user.uid);
        
        // Toggle subscription
        await updateDoc(reportRef, {
          subscribers: isSubscribed ? arrayRemove(user.uid) : arrayUnion(user.uid),
          dateUpdated: now
        });
        
        // Update local state
        updateLocalReport(reportId, report => ({
          ...report,
          subscribers: isSubscribed 
            ? report.subscribers?.filter(id => id !== user.uid) || []
            : [...(report.subscribers || []), user.uid],
          dateUpdated: now
        }));
        
        // Add activity
        addActivity(reportId, isSubscribed 
          ? 'unsubscribed from this report' 
          : 'subscribed to this report');
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
      showError('Failed to update subscription. Please try again.');
    }
  };

  // Handle adding a comment
  const handleAddComment = async (reportId: string) => {
    if (!user) {
      showError('Please log in to add comments');
      return;
    }
    
    if (!newComment.trim()) {
      showError('Comment cannot be empty');
      return;
    }
    
    try {
      const now = new Date();
      const commentId = `c${Date.now()}`;
      
      const newCommentObj = {
        id: commentId,
        text: newComment.trim(),
        author: user.uid,
        dateCreated: now
      };
      
      // Update in Firestore
      const reportRef = doc(db, 'reports', reportId);
      await updateDoc(reportRef, {
        comments: arrayUnion(newCommentObj),
        dateUpdated: now
      });
      
      // Update local state
      updateLocalReport(reportId, report => ({
        ...report,
        comments: [...(report.comments || []), newCommentObj],
        dateUpdated: now
      }));
      
      // Add activity
      addActivity(reportId, 'added a comment');
      
      // Clear comment form
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
      showError('Failed to add comment. Please try again.');
    }
  };

  // Update a report in local state
  const updateLocalReport = (reportId: string, updateFn: (report: Report) => Report) => {
    setReports(prevReports => {
      return prevReports.map(report => {
        if (report.id === reportId) {
          return updateFn(report);
        }
        return report;
      });
    });
  };

  // Handle form submission for new report
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      showError('Please log in to submit reports');
      return;
    }
    
    if (!newReport.title.trim() || !newReport.description.trim()) {
      showError('Title and description are required');
      return;
    }
    
    try {
      const now = new Date();
      
      const reportData = {
        title: newReport.title.trim(),
        description: newReport.description.trim(),
        category: newReport.category,
        status: 'new' as ReportStatus,
        assignee: '',
        dateCreated: now,
        dateUpdated: now,
        comments: [],
        activities: [{
          id: `a${Date.now()}`,
          action: 'created this report',
          userId: user.uid,
          timestamp: now
        }],
        upvotes: [],
        subscribers: [user.uid]
      };
      
      // Add to Firestore
      const docRef = await addDoc(collection(db, 'reports'), reportData);
      
      // Update local state
      setReports(prevReports => [
        {
          id: docRef.id,
          ...reportData
        },
        ...prevReports
      ]);
      
      // Reset form
      setNewReport({
        title: '',
        description: '',
        category: 'bug'
      });
      setFormVisible(false);
    } catch (error) {
      console.error('Error submitting report:', error);
      showError('Failed to submit report. Please try again.');
    }
  };

  // Format date for display
  const formatDate = (timestamp: Date | Timestamp) => {
    const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Get user display name from cache
  const getUserDisplayName = (userId: string) => {
    const user = userCache[userId];
    if (!user) return userId;
    return user.displayName || user.email || userId;
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setSortOrder('upvotes');
  };

  if (loading) {
    return <div className="reports-loading">Loading reports...</div>;
  }

  return (
    <div className="reports-tab">
      {error && <div className="error-message">{error}</div>}
      
      <div className="reports-header">
        <h2>Bug Reports &amp; Feature Requests</h2>
        <button className="create-report-btn" onClick={() => setFormVisible(!formVisible)}>
          {formVisible ? 'Cancel' : 'Create New Report'}
        </button>
      </div>
      
      {formVisible && (
        <div className="report-form-container">
          <form className="report-form" onSubmit={handleSubmitReport}>
            <div className="form-group">
              <label htmlFor="title">Title:</label>
              <input
                type="text"
                id="title"
                name="title"
                value={newReport.title}
                onChange={(e) => setNewReport({...newReport, title: e.target.value})}
                placeholder="Brief title describing the issue or feature"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="category">Category:</label>
              <select
                id="category"
                name="category"
                value={newReport.category}
                onChange={(e) => setNewReport({...newReport, category: e.target.value as ReportCategory})}
              >
                <option value="bug">Bug</option>
                <option value="feature request">Feature Request</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="description">Description:</label>
              <textarea
                id="description"
                name="description"
                value={newReport.description}
                onChange={(e) => setNewReport({...newReport, description: e.target.value})}
                placeholder="Detailed description of the bug or feature request"
                required
              ></textarea>
            </div>
            
            <button type="submit">Submit Report</button>
          </form>
        </div>
      )}
      
      {selectedReport ? (
        <div className="report-detail">
          <button className="back-button" onClick={() => setSelectedReport(null)}>
            Back to Reports
          </button>
          
          <div className="report-detail-header">
            <span className={`report-type ${selectedReport.category.replace(' ', '-')}`}>
              {selectedReport.category}
            </span>
            <span className={`report-status ${selectedReport.status.replace(' ', '-')}`}>
              {selectedReport.status}
            </span>
          </div>
          
          <h3>{selectedReport.title}</h3>
          
          <div className="report-meta">
            <span>Assignee: {selectedReport.assignee || 'Unassigned'}</span>
            <span>Created: {formatDate(selectedReport.dateCreated)}</span>
            <span>Updated: {formatDate(selectedReport.dateUpdated)}</span>
            <span>Upvotes: {selectedReport.upvotes?.length || 0}</span>
          </div>
          
          <div className="report-description">
            <h4>Description:</h4>
            <p>{selectedReport.description}</p>
          </div>
          
          <div className="report-actions">
            <button 
              className={selectedReport.upvotes?.includes(user?.uid || '') ? 'voted' : ''}
              onClick={() => handleUpvote(selectedReport.id)}
              disabled={!user}
            >
              {selectedReport.upvotes?.includes(user?.uid || '') ? 'Upvoted' : 'Upvote'} 
              ({selectedReport.upvotes?.length || 0})
            </button>
            
            <button 
              className={selectedReport.subscribers?.includes(user?.uid || '') ? 'subscribed' : ''}
              onClick={() => handleSubscribe(selectedReport.id)}
              disabled={!user}
            >
              {selectedReport.subscribers?.includes(user?.uid || '') ? 'Subscribed' : 'Subscribe'}
            </button>
          </div>
          
          <div className="comments-section">
            <h4>Comments ({selectedReport.comments.length})</h4>
            
            {selectedReport.comments.length > 0 ? (
              <div className="comments-list">
                {selectedReport.comments.map((comment) => (
                  <div key={comment.id} className="comment-item">
                    <div className="comment-header">
                      <span className="comment-author">{getUserDisplayName(comment.author)}</span>
                      <span className="comment-date">{formatDate(comment.dateCreated)}</span>
                    </div>
                    <p className="comment-text">{comment.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-comments">No comments yet</div>
            )}
            
            <div className="add-comment">
              <textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={!user}
              ></textarea>
              <button 
                className="add-comment-btn"
                onClick={() => handleAddComment(selectedReport.id)}
                disabled={!user || !newComment.trim()}
              >
                Add Comment
              </button>
            </div>
          </div>
          
          <div className="activity-feed">
            <h4>Activity</h4>
            <ul>
              {selectedReport.activities.map((activity) => (
                <li key={activity.id}>
                  <span className="activity-user">{getUserDisplayName(activity.userId)}</span> 
                  {activity.action} - 
                  <span className="activity-date">{formatDate(activity.timestamp)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <>
          <div className="reports-filters">
            <div className="search-container">
              <input
                type="text"
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            
            <div className="filter-group">
              <label>Category:</label>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="all">All Categories</option>
                <option value="bug">Bugs</option>
                <option value="feature request">Feature Requests</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div className="filter-group">
              <label>Status:</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All Statuses</option>
                <option value="new">New</option>
                <option value="in progress">In Progress</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            
            <div className="filter-group">
              <label>Sort By:</label>
              <select 
                value={sortOrder} 
                onChange={(e) => setSortOrder(e.target.value as 'upvotes' | 'recent' | 'comments')}
              >
                <option value="upvotes">Most Upvotes</option>
                <option value="recent">Recently Updated</option>
                <option value="comments">Most Comments</option>
              </select>
            </div>
            
            <button 
              className="clear-filters-btn" 
              onClick={resetFilters}
              disabled={!searchQuery && categoryFilter === 'all' && statusFilter === 'all' && sortOrder === 'upvotes'}
            >
              Clear Filters
            </button>
          </div>
          
          {filteredReports.length > 0 ? (
            <div className="reports-list">
              {filteredReports.map((report) => (
                <div 
                  key={report.id}
                  className={`report-item status-${report.status.replace(' ', '-')}`}
                  onClick={() => setSelectedReport(report)}
                >
                  <div className="report-item-header">
                    <span className={`report-type ${report.category.replace(' ', '-')}`}>
                      {report.category}
                    </span>
                    <span className={`report-status ${report.status.replace(' ', '-')}`}>
                      {report.status}
                    </span>
                  </div>
                  
                  <h3>{report.title}</h3>
                  
                  <div className="report-item-meta">
                    <span>Updated: {formatDate(report.dateUpdated)}</span>
                    <span className="comment-count">{report.comments.length} comments</span>
                  </div>
                  
                  <button 
                    className={`upvote-button ${report.upvotes?.includes(user?.uid || '') ? 'voted' : ''}`}
                    onClick={(e) => handleUpvote(report.id, e)}
                    disabled={!user}
                  >
                    {report.upvotes?.includes(user?.uid || '') ? 'Upvoted' : 'Upvote'} 
                    ({report.upvotes?.length || 0})
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-reports">
              No reports found matching your filters.
              {(searchQuery || categoryFilter !== 'all' || statusFilter !== 'all') && (
                <button className="text-button" onClick={resetFilters}>Clear filters</button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReportsTab; 