import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { User } from 'firebase/auth';
import './RoadmapTab.css';

// Types
type ReportCategory = 'bug' | 'feature request' | 'other';
type ReportStatus = 'new' | 'in progress' | 'pending' | 'resolved';

interface Comment {
  id: string;
  text: string;
  author: string;
  dateCreated: Date;
}

interface Activity {
  id: string;
  action: string;
  userId: string;
  timestamp: Date;
}

interface Report {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  status: ReportStatus;
  assignee: string;
  dateCreated: Date;
  dateUpdated: Date;
  comments: Comment[];
  activities: Activity[];
  upvotes?: string[];
  subscribers?: string[];
}

interface RoadmapTabProps {
  user: User | null;
}

const RoadmapTab: React.FC<RoadmapTabProps> = () => {
  // State
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

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
          dateCreated: parseFirestoreDate(data.dateCreated),
          dateUpdated: parseFirestoreDate(data.dateUpdated),
          comments: (data.comments || []).map((comment: any) => ({
            ...comment,
            dateCreated: parseFirestoreDate(comment.dateCreated)
          })),
          activities: (data.activities || []).map((activity: any) => ({
            ...activity,
            timestamp: parseFirestoreDate(activity.timestamp)
          })),
          upvotes: data.upvotes || [],
          subscribers: data.subscribers || []
        } as Report;
      });
      
      setReports(reportsList);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper to parse Firestore dates consistently
  const parseFirestoreDate = (date: any): Date => {
    if (!date) return new Date();
    return date instanceof Timestamp ? date.toDate() : 
           typeof date.toDate === 'function' ? date.toDate() : 
           new Date(date);
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Filter reports based on search term and status filter
  const filterReports = () => {
    return reports.filter(report => {
      const matchesSearch = searchTerm === '' || 
        report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.description.toLowerCase().includes(searchTerm.toLowerCase());
        
      const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  };

  // Get reports for a specific column/status
  const getColumnReports = (columnStatus: string) => {
    return filterReports().filter(report => report.status === columnStatus);
  };

  // Format date for display
  const formatDate = (date: Date) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // View report details
  const handleViewReport = (report: Report) => {
    setSelectedReport(report);
  };

  // Close report details
  const handleCloseDetail = () => {
    setSelectedReport(null);
  };

  if (loading) {
    return <div className="roadmap-loading">Loading roadmap...</div>;
  }

  return (
    <div className="roadmap-tab">
      <div className="roadmap-header">
        <h2>Development Roadmap</h2>
        
        <div className="roadmap-filters">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="status-filter">
            <label>Filter by Status:</label>
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="new">Backlog</option>
              <option value="pending">Next Up</option>
              <option value="in progress">In Progress</option>
              <option value="resolved">Done</option>
            </select>
          </div>
        </div>
      </div>

      {selectedReport ? (
        <div className="roadmap-detail">
          <button className="back-button" onClick={handleCloseDetail}>
            &larr; Back to Roadmap
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
        </div>
      ) : (
        <div className="kanban-board">
          {/* Backlog column */}
          <div className="kanban-column backlog">
            <div className="column-header">
              <h3>Backlog</h3>
              <span className="counter">{getColumnReports('new').length}</span>
            </div>
            <div className="column-content">
              {getColumnReports('new').map(report => (
                <div 
                  key={report.id} 
                  className="kanban-card"
                  onClick={() => handleViewReport(report)}
                >
                  <div className="card-header">
                    <span className={`card-type ${report.category.replace(' ', '-')}`}>
                      {report.category}
                    </span>
                    <span className="upvote-count">
                      {report.upvotes?.length || 0} Upvotes
                    </span>
                  </div>
                  <h4>{report.title}</h4>
                </div>
              ))}
              {getColumnReports('new').length === 0 && (
                <div className="empty-column">No reports</div>
              )}
            </div>
          </div>
          
          {/* Next Up column */}
          <div className="kanban-column next-up">
            <div className="column-header">
              <h3>Next Up</h3>
              <span className="counter">{getColumnReports('pending').length}</span>
            </div>
            <div className="column-content">
              {getColumnReports('pending').map(report => (
                <div 
                  key={report.id} 
                  className="kanban-card"
                  onClick={() => handleViewReport(report)}
                >
                  <div className="card-header">
                    <span className={`card-type ${report.category.replace(' ', '-')}`}>
                      {report.category}
                    </span>
                    <span className="upvote-count">
                      {report.upvotes?.length || 0} Upvotes
                    </span>
                  </div>
                  <h4>{report.title}</h4>
                </div>
              ))}
              {getColumnReports('pending').length === 0 && (
                <div className="empty-column">No reports</div>
              )}
            </div>
          </div>
          
          {/* In Progress column */}
          <div className="kanban-column in-progress">
            <div className="column-header">
              <h3>In Progress</h3>
              <span className="counter">{getColumnReports('in progress').length}</span>
            </div>
            <div className="column-content">
              {getColumnReports('in progress').map(report => (
                <div 
                  key={report.id} 
                  className="kanban-card"
                  onClick={() => handleViewReport(report)}
                >
                  <div className="card-header">
                    <span className={`card-type ${report.category.replace(' ', '-')}`}>
                      {report.category}
                    </span>
                    <span className="upvote-count">
                      {report.upvotes?.length || 0} Upvotes
                    </span>
                  </div>
                  <h4>{report.title}</h4>
                </div>
              ))}
              {getColumnReports('in progress').length === 0 && (
                <div className="empty-column">No reports</div>
              )}
            </div>
          </div>
          
          {/* Completed column */}
          <div className="kanban-column completed">
            <div className="column-header">
              <h3>Completed</h3>
              <span className="counter">{getColumnReports('resolved').length}</span>
            </div>
            <div className="column-content">
              {getColumnReports('resolved').map(report => (
                <div 
                  key={report.id} 
                  className="kanban-card"
                  onClick={() => handleViewReport(report)}
                >
                  <div className="card-header">
                    <span className={`card-type ${report.category.replace(' ', '-')}`}>
                      {report.category}
                    </span>
                    <span className="upvote-count">
                      {report.upvotes?.length || 0} Upvotes
                    </span>
                  </div>
                  <h4>{report.title}</h4>
                </div>
              ))}
              {getColumnReports('resolved').length === 0 && (
                <div className="empty-column">No reports</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoadmapTab; 