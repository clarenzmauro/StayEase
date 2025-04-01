import React, { memo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { UserProfile, UserActivity } from '../../../services/UserManagementService';
import { Timestamp } from 'firebase/firestore';
import { UserRole, UserStatus } from '../hooks/useUserData';
import { API_URL } from '../../../config';

// Extend the UserActivity type if necessary
interface ActivityWithDisplay extends UserActivity {
  type?: string;  // Add optional type field for display
  details?: string;
  ipAddress?: string;
}

interface UserDetailPanelProps {
  user: UserProfile | null;
  activities: UserActivity[];
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onUpdateStatus: (userId: string, status: 'active' | 'suspended' | 'inactive') => void;
  onUpdateRole: (userId: string, role: 'user' | 'owner' | 'admin') => void;
  actionInProgress: boolean;
}

const UserDetailPanelComponent: React.FC<UserDetailPanelProps> = ({
  user,
  activities,
  isOpen,
  isLoading,
  error,
  onClose,
  onUpdateStatus,
  onUpdateRole,
  actionInProgress
}) => {
  if (!user || !isOpen) {
    return null;
  }

  // Format date for display
  const formatDate = (timestamp: Timestamp) => {
    try {
      return formatDistanceToNow(timestamp.toDate(), { addSuffix: true });
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  // Format raw date for full date/time display
  const formatFullDate = (timestamp: Timestamp) => {
    try {
      const date = timestamp.toDate();
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Get activity icon based on activity type
  const getActivityIcon = (activity: ActivityWithDisplay): string => {
    if (!activity.type) return 'circle'; // Default icon
    
    switch(activity.type) {
      case 'login': return 'sign-in-alt';
      case 'profile_update': return 'user-edit';
      case 'password_reset': return 'key';
      default: return 'circle';
    }
  };
  
  // Get activity title based on activity type
  const getActivityTitle = (activity: ActivityWithDisplay): string => {
    if (!activity.type) return 'Activity'; // Default title
    
    switch(activity.type) {
      case 'login': return 'User logged in';
      case 'profile_update': return 'Updated profile';
      case 'password_reset': return 'Reset password';
      default: return activity.type;
    }
  };

  // Function to get profile image URL, handling MongoDB IDs
  const getProfileImageUrl = (user: UserProfile) => {
    // Check if it's a MongoDB-style photo ID
    if (user.photoURL && typeof user.photoURL === 'string' && !user.photoURL.startsWith('http')) {
      return `${API_URL}/api/user-photos/${user.photoURL}/image`;
    }
    
    // If it's a direct URL (Firebase style), use it directly
    return user.photoURL || '';
  };

  // Simple date formatter function
  const formatRelativeTime = (timestamp: Timestamp): string => {
    if (!timestamp) return 'Unknown';
    
    try {
      const now = new Date();
      const date = timestamp.toDate();
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      
      if (diffSec < 60) return `${diffSec} seconds ago`;
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)} minutes ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
      if (diffSec < 604800) return `${Math.floor(diffSec / 86400)} days ago`;
      
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      return 'Invalid date';
    }
  };

  return (
    <div className={`user-detail-panel ${isOpen ? 'open' : ''}`}>
      <div className="panel-header">
        <h3>User Details</h3>
        <button className="close-button" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
      </div>
      
      {error && (
        <div className="panel-error">
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      )}
      
      <div className="panel-content">
        <div className="user-profile-header">
          <div className="user-avatar-container">
            {user.photoURL ? (
              <img 
                src={getProfileImageUrl(user)} 
                alt={user.displayName || 'User'} 
                className="user-avatar-large"
                onError={(e) => {
                  // Hide broken image and show placeholder instead
                  (e.target as HTMLImageElement).style.display = 'none';
                  const parent = (e.target as HTMLImageElement).parentNode as HTMLElement;
                  const placeholder = parent.querySelector('.user-avatar-placeholder') as HTMLElement;
                  if (placeholder) {
                    placeholder.style.display = 'flex';
                  }
                }}
              />
            ) : null}
            <div 
              className="user-avatar-placeholder" 
              style={{ display: user.photoURL ? 'none' : 'flex' }}
            >
              {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
            </div>
          </div>
          
          <div className="user-basic-info">
            <h2 className="user-name">{user.displayName || 'Unknown User'}</h2>
            <p className="user-email">{user.email}</p>
            <div className="user-badges">
              <span className={`user-role-badge role-${user.role}`}>
                {user.role}
              </span>
              <span className={`user-status-badge status-${user.status}`}>
                {user.status}
              </span>
            </div>
          </div>
        </div>
        
        <div className="user-actions">
          <div className="user-status-control">
            <label>Status:</label>
            <div className="status-buttons">
              <button 
                className={`status-btn ${user.status === 'active' ? 'active' : ''}`} 
                onClick={() => onUpdateStatus(user.id, 'active')}
                disabled={user.status === 'active' || actionInProgress}
              >
                Active
              </button>
              <button 
                className={`status-btn ${user.status === 'suspended' ? 'active' : ''}`}
                onClick={() => onUpdateStatus(user.id, 'suspended')}
                disabled={user.status === 'suspended' || actionInProgress}
              >
                Suspended
              </button>
              <button 
                className={`status-btn ${user.status === 'inactive' ? 'active' : ''}`}
                onClick={() => onUpdateStatus(user.id, 'inactive')}
                disabled={user.status === 'inactive' || actionInProgress}
              >
                Inactive
              </button>
            </div>
          </div>
          
          <div className="user-role-control">
            <label>Role:</label>
            <div className="role-buttons">
              <button 
                className={`role-btn ${user.role === 'user' ? 'active' : ''}`}
                onClick={() => onUpdateRole(user.id, 'user')}
                disabled={user.role === 'user' || actionInProgress}
              >
                User
              </button>
              <button 
                className={`role-btn ${user.role === 'owner' ? 'active' : ''}`}
                onClick={() => onUpdateRole(user.id, 'owner')}
                disabled={user.role === 'owner' || actionInProgress}
              >
                Owner
              </button>
              <button 
                className={`role-btn ${user.role === 'admin' ? 'active' : ''}`}
                onClick={() => onUpdateRole(user.id, 'admin')}
                disabled={user.role === 'admin' || actionInProgress}
              >
                Admin
              </button>
            </div>
          </div>
        </div>
        
        {actionInProgress && (
          <div className="action-progress">Updating user...</div>
        )}
        
        <div className="user-activity-section">
          <h4>Activity History</h4>
          
          {isLoading ? (
            <div className="activity-loading">Loading activity history...</div>
          ) : activities.length === 0 ? (
            <div className="no-activities">No activity recorded for this user</div>
          ) : (
            <div className="activity-timeline">
              {activities.map((activity, index) => {
                const typedActivity = activity as ActivityWithDisplay;
                return (
                  <div key={index} className="activity-item">
                    <div className="activity-time">
                      {activity.timestamp ? formatDate(activity.timestamp) : 'Unknown time'}
                    </div>
                    <div className="activity-icon">
                      <i className={`fas fa-${getActivityIcon(typedActivity)}`}></i>
                    </div>
                    <div className="activity-details">
                      <div className="activity-title">
                        {getActivityTitle(typedActivity)}
                      </div>
                      {typedActivity.details && (
                        <div className="activity-description">{typedActivity.details}</div>
                      )}
                      {typedActivity.ipAddress && (
                        <div className="activity-ip">IP: {typedActivity.ipAddress}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Use React.memo to prevent unnecessary re-renders
export const UserDetailPanel = memo(UserDetailPanelComponent);
export default UserDetailPanel; 