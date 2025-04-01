import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Report, ReportStatus } from '../../hooks/reports/useReportData';
import { FiAlertCircle, FiCheckCircle, FiClock, FiTool } from 'react-icons/fi';
import './ReportStyles.css';

interface ReportListItemProps {
  report: Report;
  onClick: (report: Report) => void;
}

const statusConfig = {
  new: { color: 'blue', icon: FiAlertCircle, text: 'New' },
  in_progress: { color: 'orange', icon: FiTool, text: 'In Progress' },
  pending: { color: 'purple', icon: FiClock, text: 'Pending' },
  resolved: { color: 'green', icon: FiCheckCircle, text: 'Resolved' },
};

export const ReportListItem: React.FC<ReportListItemProps> = ({ report, onClick }) => {
  const status = statusConfig[report.status as keyof typeof statusConfig];
  
  const formattedDate = report.createdAt 
    ? formatDistanceToNow(new Date(report.createdAt.toDate()), { addSuffix: true })
    : 'Unknown date';

  return (
    <div 
      className="report-list-item"
      onClick={() => onClick(report)}
      data-testid={`report-item-${report.id}`}
    >
      <div className="report-list-item-content">
        <div className="report-list-item-header">
          <div className={`report-badge report-badge-${status.color}`}>
            <status.icon className="report-icon" />
            <span>{status.text}</span>
          </div>
          <div className="report-badge report-badge-teal">{report.category}</div>
          <span className="report-date">{formattedDate}</span>
        </div>
        
        <h3 className="report-title">{report.title}</h3>
        <p className="report-description">{report.description}</p>
        
        <div className="report-footer">
          {report.assignedToName ? (
            <div className="report-assignment">
              <div className="report-avatar">
                {report.assignedToName.charAt(0).toUpperCase()}
              </div>
              <span>Assigned to {report.assignedToName}</span>
            </div>
          ) : (
            <span className="report-unassigned">Unassigned</span>
          )}
          
          {report.comments && report.comments.length > 0 && (
            <span className="report-comments">
              {report.comments.length} comment{report.comments.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}; 