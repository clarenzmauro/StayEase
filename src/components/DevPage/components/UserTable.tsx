import React from 'react';
import { UserProfile } from '../../../services/UserManagementService';
import { useAuth } from '../../../context/AuthContext';
import { API_URL } from '../../../config';

interface UserTableProps {
  users: UserProfile[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onSelectUser: (user: UserProfile) => void;
  error?: string | null;
}

export const UserTable: React.FC<UserTableProps> = ({ 
  users, 
  loading, 
  hasMore, 
  onLoadMore, 
  onSelectUser,
  error
}) => {
  // Get current user for highlighting
  const { user: currentUser } = useAuth();
  
  // Format date for display
  const formatDate = (date: Date | null) => {
    if (!date) return 'Unknown';
    
    try {
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  // Function to get profile image URL
  const getProfileImageUrl = (user: UserProfile) => {
    // Check if it's a MongoDB-style photo ID
    if (user.photoURL && typeof user.photoURL === 'string' && !user.photoURL.startsWith('http')) {
      return `${API_URL}/api/user-photos/${user.photoURL}/image`;
    }
    
    // If it's a direct URL (Firebase style), use it directly
    return user.photoURL || '';
  };
  
  // Custom style for current user row
  const currentUserStyle = {
    backgroundColor: 'rgba(66, 133, 244, 0.1)',
    fontWeight: 'bold' as const,
    border: '1px solid rgba(66, 133, 244, 0.5)'
  };
  
  if (error) {
    return (
      <div className="user-table-error">
        <p>{error}</p>
      </div>
    );
  }
  
  if (users.length === 0 && !loading) {
    return (
      <div className="user-table-empty">
        <p>No users found in accounts collection. Make sure you have corresponding documents in the Firestore accounts collection.</p>
        <p><strong>Current user ID:</strong> {currentUser?.uid || 'No user logged in'}</p>
        <p><strong>Current user email:</strong> {currentUser?.email || 'N/A'}</p>
      </div>
    );
  }
  
  const getRoleClass = (role: string) => {
    switch (role) {
      case 'admin': return 'role-admin';
      case 'owner': return 'role-owner';
      default: return 'role-user';
    }
  };
  
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'active': return 'status-active';
      case 'suspended': return 'status-suspended';
      case 'inactive': return 'status-inactive';
      default: return '';
    }
  };
  
  return (
    <div className="user-table-container">
      <table className="user-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Date Joined</th>
            <th>Last Login</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr 
              key={user.id} 
              style={currentUser && user.id === currentUser.uid ? currentUserStyle : {}}
              onClick={() => onSelectUser(user)}
            >
              <td className="user-cell">
                <div className="user-avatar-name">
                  {user.photoURL ? (
                    <img 
                      src={getProfileImageUrl(user)} 
                      alt={user.displayName || 'User'} 
                      className="user-avatar"
                      onError={(e) => {
                        // Fallback if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parentNode = target.parentNode as HTMLElement;
                        const placeholderEl = parentNode.querySelector('.user-avatar-placeholder.hidden') as HTMLElement;
                        if (placeholderEl) {
                          placeholderEl.classList.remove('hidden');
                        }
                      }}
                    />
                  ) : (
                    <div className="user-avatar-placeholder">
                      {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="user-avatar-placeholder hidden">
                    {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span className="user-name">
                    {user.displayName || 'Unknown User'}
                    {currentUser && user.id === currentUser.uid && ' (You)'}
                  </span>
                </div>
              </td>
              <td>{user.email || 'No email'}</td>
              <td>
                <span className={`user-role ${getRoleClass(user.role || 'user')}`}>
                  {user.role || 'user'}
                </span>
              </td>
              <td>
                <span className={`user-status ${getStatusClass(user.status || 'active')}`}>
                  {user.status || 'active'}
                </span>
              </td>
              <td>{user.createdAt ? formatDate(user.createdAt.toDate()) : 'Unknown'}</td>
              <td>{user.lastLogin ? formatDate(user.lastLogin.toDate()) : 'Never'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {hasMore && (
        <div className="load-more-container">
          <button 
            className="load-more-button"
            onClick={onLoadMore}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
      
      {loading && users.length > 0 && (
        <div className="loading-more">
          <span>Loading more users...</span>
        </div>
      )}
    </div>
  );
};

export default UserTable; 