import React from 'react';
import { FiX, FiSend, FiClock, FiCheck, FiAlertCircle, FiTool, FiUser } from 'react-icons/fi';
import { formatDistanceToNow, format } from 'date-fns';
import { Report, ReportStatus, Comment } from '../../hooks/reports/useReportData';
import './ReportStyles.css';

interface ReportDetailPanelProps {
  report: Report | null;
  onClose: () => void;
  onStatusChange: (status: ReportStatus) => void;
  onAssign: (userId: string, userName: string) => void;
  onAddComment: (comment: string) => void;
  newComment: string;
  setNewComment: (comment: string) => void;
  loading: boolean;
  staffMembers?: Array<{ id: string; name: string }>;
}

const statusOptions = [
  { value: 'new', label: 'New', icon: FiAlertCircle, color: 'blue' },
  { value: 'in_progress', label: 'In Progress', icon: FiTool, color: 'orange' },
  { value: 'pending', label: 'Pending', icon: FiClock, color: 'purple' },
  { value: 'resolved', label: 'Resolved', icon: FiCheck, color: 'green' }
];

export const ReportDetailPanel: React.FC<ReportDetailPanelProps> = ({
  report,
  onClose,
  onStatusChange,
  onAssign,
  onAddComment,
  newComment,
  setNewComment,
  loading,
  staffMembers = []
}) => {
  if (!report) return null;
  
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onStatusChange(e.target.value as ReportStatus);
  };
  
  const handleAssign = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const userId = e.target.value;
    if (userId === '') return;
    
    const staff = staffMembers.find(s => s.id === userId);
    if (staff) {
      onAssign(staff.id, staff.name);
    }
  };
  
  const handleSubmitComment = () => {
    if (newComment.trim()) {
      onAddComment(newComment.trim());
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment();
    }
  };
  
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown date';
    const date = timestamp.toDate();
    return format(date, 'MMM d, yyyy h:mm a');
  };

  return (
    <div className="report-detail-panel" data-testid="report-detail-panel">
      <div className="report-detail-header">
        <h2>Report Details</h2>
        <button 
          className="report-detail-close" 
          onClick={onClose}
          aria-label="Close panel"
        >
          <FiX />
        </button>
      </div>
      
      <div>
        <h1 className="report-detail-title">{report.title}</h1>
        <div className="report-detail-meta">
          <div className={`report-badge report-badge-teal`}>{report.category}</div>
          <span className="report-date">
            Reported {formatDistanceToNow(report.createdAt.toDate(), { addSuffix: true })}
          </span>
        </div>
        <p className="report-detail-description">{report.description}</p>
      </div>
      
      <div className="report-divider"></div>
      
      <div>
        <h3 className="report-section-title">Status</h3>
        <select 
          className="report-select"
          value={report.status} 
          onChange={handleStatusChange}
          disabled={loading}
        >
          {statusOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      
      <div>
        <h3 className="report-section-title">Assignment</h3>
        <select 
          className="report-select"
          onChange={handleAssign}
          value={report.assignedTo || ''}
          disabled={loading}
        >
          <option value="">Unassigned</option>
          {staffMembers.map(staff => (
            <option key={staff.id} value={staff.id}>
              {staff.name}
            </option>
          ))}
        </select>
        
        {report.assignedToName && (
          <div className="report-assignment">
            <div className="report-avatar">
              {report.assignedToName.charAt(0).toUpperCase()}
            </div>
            <span>Currently assigned to {report.assignedToName}</span>
          </div>
        )}
      </div>
      
      <div className="report-divider"></div>
      
      <div>
        <h3 className="report-section-title">Comments ({report.comments?.length || 0})</h3>
        <div className="report-comment-list">
          {!report.comments || report.comments.length === 0 ? (
            <p className="report-no-comments">No comments yet</p>
          ) : (
            report.comments.map((comment: Comment, index: number) => (
              <div 
                key={comment.id || index} 
                className="report-comment"
              >
                <div className="report-comment-header">
                  <div className="report-comment-user">
                    <div className="report-comment-avatar">
                      {comment.userName.charAt(0).toUpperCase()}
                    </div>
                    <span><strong>{comment.userName}</strong></span>
                  </div>
                  <span className="report-comment-time">
                    {formatDate(comment.createdAt)}
                  </span>
                </div>
                <p className="report-comment-text">{comment.text}</p>
              </div>
            ))
          )}
        </div>
        
        <div>
          <textarea
            className="report-comment-input"
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
          />
          <div className="report-actions">
            <button
              className="report-button report-button-primary"
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || loading}
            >
              <FiSend size={16} />
              <span>Send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 