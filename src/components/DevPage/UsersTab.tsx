import React, { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import userManagementService, { 
  UserProfile, 
  UserActivity, 
  UserSearchParams 
} from '../../services/UserManagementService';
import { Timestamp } from 'firebase/firestore';

// Using types from UserManagementService

export const UsersTab: React.FC = () => {
  // State
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [activityLoading, setActivityLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);

  // Fetch users with the service
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    
    try {
      const searchParams: UserSearchParams = {
        query: searchQuery,
        role: roleFilter !== 'all' ? roleFilter as any : undefined,
        status: statusFilter !== 'all' ? statusFilter as any : undefined,
        sortBy: sortBy as any,
        sortDirection: sortDirection,
        lastVisible: lastVisible,
        pageSize: 10
      };
      
      const result = await userManagementService.getUsers(searchParams);
      
      setUsers(result.users);
      setLastVisible(result.lastVisible);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  }, [roleFilter, statusFilter, searchQuery, sortBy, sortDirection, lastVisible]);
  
  // Fetch users on filter change
  useEffect(() => {
    setLastVisible(null); // Reset pagination when filters change
    fetchUsers();
  }, [fetchUsers]);

  // Load more users
  const loadMoreUsers = async () => {
    if (!lastVisible || loading) return;
    
    try {
      const searchParams: UserSearchParams = {
        query: searchQuery,
        role: roleFilter !== 'all' ? roleFilter as any : undefined,
        status: statusFilter !== 'all' ? statusFilter as any : undefined,
        sortBy: sortBy as any,
        sortDirection: sortDirection,
        lastVisible: lastVisible,
        pageSize: 10
      };
      
      const result = await userManagementService.getUsers(searchParams);
      
      if (result.users.length === 0) {
        setHasMore(false);
      } else {
        setUsers(prevUsers => [...prevUsers, ...result.users]);
        setLastVisible(result.lastVisible);
        setHasMore(result.hasMore);
      }
    } catch (error) {
      console.error("Error loading more users:", error);
    }
  };

  // Update user status
  const updateUserStatus = async (userId: string, newStatus: 'active' | 'suspended' | 'inactive') => {
    if (actionInProgress) return;
    
    setActionInProgress(true);
    try {
      await userManagementService.updateUserStatus(userId, newStatus);
      
      // Update local state if detail panel is open
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser({
          ...selectedUser,
          status: newStatus
        });
      }
      
      // Update user in the list
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, status: newStatus } 
            : user
        )
      );
      
      // Refresh user activities if detail panel is open
      if (selectedUser && selectedUser.id === userId) {
        fetchUserActivities(userId);
      }
    } catch (error) {
      console.error("Error updating user status:", error);
    } finally {
      setActionInProgress(false);
    }
  };

  // Update user role
  const updateUserRole = async (userId: string, newRole: 'user' | 'owner' | 'admin') => {
    if (actionInProgress) return;
    
    setActionInProgress(true);
    try {
      await userManagementService.updateUserRole(userId, newRole);
      
      // Update local state if detail panel is open
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser({
          ...selectedUser,
          role: newRole
        });
      }
      
      // Update user in the list
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, role: newRole } 
            : user
        )
      );
      
      // Refresh user activities if detail panel is open
      if (selectedUser && selectedUser.id === userId) {
        fetchUserActivities(userId);
      }
    } catch (error) {
      console.error("Error updating user role:", error);
    } finally {
      setActionInProgress(false);
    }
  };

  // Fetch user activities
  const fetchUserActivities = async (userId: string) => {
    setActivityLoading(true);
    try {
      const activities = await userManagementService.getUserActivityHistory(userId);
      setUserActivities(activities);
    } catch (error) {
      console.error("Error fetching user activities:", error);
    } finally {
      setActivityLoading(false);
    }
  };
  
  // Open detail panel for a user
  const openDetailPanel = async (user: UserProfile) => {
    try {
      // Fetch complete user data
      const userData = await userManagementService.getUserById(user.id);
      
      if (userData) {
        setSelectedUser(userData);
        setDetailPanelOpen(true);
        
        // Fetch user activities
        fetchUserActivities(user.id);
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  };

  // Close detail panel
  const closeDetailPanel = () => {
    setDetailPanelOpen(false);
    setSelectedUser(null);
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
      case 'active': return 'status-badge status-active';
      case 'suspended': return 'status-badge status-suspended';
      case 'inactive': return 'status-badge status-inactive';
      default: return 'status-badge';
    }
  };

  // Get role badge class
  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin': return 'role-badge role-admin';
      case 'owner': return 'role-badge role-owner';
      case 'user': return 'role-badge role-user';
      default: return 'role-badge';
    }
  };

  return (
    <div className="users-tab">
      <div className="tab-header">
        <h2 className="tab-title">User Management</h2>
        <div className="tab-actions">
          <button className="btn btn-secondary">
            <i className="fas fa-download"></i> Export Users
          </button>
        </div>
      </div>

      <div className="search-bar">
        <i className="fas fa-search"></i>
        <input 
          type="text" 
          placeholder="Search users by email or name..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="filter-bar">
        <select 
          className="filter-select" 
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="all">All Roles</option>
          <option value="user">User</option>
          <option value="owner">Owner</option>
          <option value="admin">Admin</option>
        </select>

        <select 
          className="filter-select" 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="inactive">Inactive</option>
        </select>
        
        <select 
          className="filter-select" 
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="createdAt">Sort by: Registration</option>
          <option value="lastLogin">Sort by: Last Login</option>
          <option value="displayName">Sort by: Name</option>
          <option value="email">Sort by: Email</option>
        </select>
        
        <div className="sort-direction-controls">
          <button 
            className={`sort-btn ${sortDirection === 'asc' ? 'active' : ''}`}
            onClick={() => setSortDirection('asc')}
            title="Sort Ascending"
          >
            <i className="fas fa-sort-amount-up-alt"></i>
          </button>
          <button 
            className={`sort-btn ${sortDirection === 'desc' ? 'active' : ''}`}
            onClick={() => setSortDirection('desc')}
            title="Sort Descending"
          >
            <i className="fas fa-sort-amount-down"></i>
          </button>
        </div>
      </div>

      {loading && users.length === 0 ? (
        <div className="loading-indicator">Loading users...</div>
      ) : users.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-users fa-3x"></i>
          <p>No users found matching your criteria.</p>
        </div>
      ) : (
        <>
          <div className="users-list">
            {users.map(user => (
              <div 
                key={user.id} 
                className="item-card user-card"
                onClick={() => openDetailPanel(user)}
              >
                <div className="user-header">
                  <div className="user-avatar">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName || 'User'} />
                    ) : (
                      <div className="avatar-placeholder">
                        {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                  </div>
                  <div className="user-info">
                    <h3 className="user-name">{user.displayName || 'Unnamed User'}</h3>
                    <p className="user-email">{user.email}</p>
                  </div>
                </div>
                <div className="user-meta">
                  <span className={getStatusBadgeClass(user.status)}>
                    {user.status}
                  </span>
                  <span className={getRoleBadgeClass(user.role)}>
                    {user.role}
                  </span>
                </div>
                <div className="user-dates">
                  <div className="date-item">
                    <span className="date-label">Joined:</span>
                    <span className="date-value">{formatDate(user.createdAt)}</span>
                  </div>
                  {user.lastLogin && (
                    <div className="date-item">
                      <span className="date-label">Last login:</span>
                      <span className="date-value">{formatDate(user.lastLogin)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="load-more">
              <button 
                className="btn btn-secondary"
                onClick={loadMoreUsers}
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
        {selectedUser && (
          <>
            <div className="detail-panel-header">
              <h3>User Details</h3>
              <button 
                className="detail-panel-close"
                onClick={closeDetailPanel}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="user-detail-content">
              <div className="user-detail-header">
                <div className="user-detail-avatar">
                  {selectedUser.photoURL ? (
                    <img src={selectedUser.photoURL} alt={selectedUser.displayName || 'User'} />
                  ) : (
                    <div className="avatar-placeholder large">
                      {selectedUser.displayName ? selectedUser.displayName.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                </div>
                <div className="user-detail-info">
                  <h2>{selectedUser.displayName || 'Unnamed User'}</h2>
                  <p className="user-detail-email">{selectedUser.email}</p>
                  <div className="user-detail-meta">
                    <span className={getStatusBadgeClass(selectedUser.status)}>
                      {selectedUser.status}
                    </span>
                    <span className={getRoleBadgeClass(selectedUser.role)}>
                      {selectedUser.role}
                    </span>
                  </div>
                </div>
              </div>

              <div className="user-detail-dates">
                <div className="date-item">
                  <span className="date-label">Joined:</span>
                  <span className="date-value">{formatDate(selectedUser.createdAt)}</span>
                </div>
                {selectedUser.lastLogin && (
                  <div className="date-item">
                    <span className="date-label">Last login:</span>
                    <span className="date-value">{formatDate(selectedUser.lastLogin)}</span>
                  </div>
                )}
              </div>

              <div className="user-detail-actions">
                <div className="action-group">
                  <h4>Status</h4>
                  <div className="action-buttons">
                    <button 
                      className={`btn ${selectedUser.status === 'active' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => updateUserStatus(selectedUser.id, 'active')}
                    >
                      Active
                    </button>
                    <button 
                      className={`btn ${selectedUser.status === 'suspended' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => updateUserStatus(selectedUser.id, 'suspended')}
                    >
                      Suspend
                    </button>
                    <button 
                      className={`btn ${selectedUser.status === 'inactive' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => updateUserStatus(selectedUser.id, 'inactive')}
                    >
                      Inactive
                    </button>
                  </div>
                </div>

                <div className="action-group">
                  <h4>Role</h4>
                  <div className="action-buttons">
                    <button 
                      className={`btn ${selectedUser.role === 'user' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => updateUserRole(selectedUser.id, 'user')}
                    >
                      User
                    </button>
                    <button 
                      className={`btn ${selectedUser.role === 'owner' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => updateUserRole(selectedUser.id, 'owner')}
                    >
                      Owner
                    </button>
                    <button 
                      className={`btn ${selectedUser.role === 'admin' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => updateUserRole(selectedUser.id, 'admin')}
                    >
                      Admin
                    </button>
                  </div>
                </div>

                <div className="action-group">
                  <h4>Account Actions</h4>
                  <div className="action-buttons">
                    <button 
                      className="btn btn-secondary"
                      onClick={() => {
                        if (window.confirm(`Send password reset email to ${selectedUser.email}?`)) {
                          userManagementService.sendPasswordReset(selectedUser.email)
                            .then(() => alert('Password reset email sent'))
                            .catch(error => alert(`Error: ${error.message}`));
                        }
                      }}
                      disabled={actionInProgress}
                    >
                      Reset Password
                    </button>
                    <button 
                      className="btn btn-danger"
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete ${selectedUser.email}? This action cannot be undone.`)) {
                          // In a real implementation, you would call userManagementService.deleteUserAccount
                          // For now, we'll just show a confirmation
                          alert('Account deletion would happen here');
                        }
                      }}
                      disabled={actionInProgress}
                    >
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>

              <div className="user-detail-activity">
                <h4>Recent Activity</h4>
                
                {activityLoading ? (
                  <div className="loading-indicator">Loading activity...</div>
                ) : userActivities.length === 0 ? (
                  <div className="empty-activity">No recent activity recorded.</div>
                ) : (
                  <div className="activity-list">
                    {userActivities.map((activity, index) => (
                      <div key={index} className="activity-item">
                        <div className="activity-icon">
                          <i className="fas fa-history"></i>
                        </div>
                        <div className="activity-content">
                          <div className="activity-action">{activity.action.replace(/_/g, ' ')}</div>
                          <div className="activity-time">{formatDate(activity.timestamp)}</div>
                          <div className="activity-device">
                            {activity.browser} / {activity.os}
                          </div>
                          {activity.ipAddress && (
                            <div className="activity-ip">
                              IP: {activity.ipAddress}
                            </div>
                          )}
                          {activity.details && (
                            <div className="activity-details">
                              {typeof activity.details === 'object' ? JSON.stringify(activity.details) : activity.details}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="activity-actions">
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => fetchUserActivities(selectedUser.id)}
                    disabled={activityLoading}
                  >
                    <i className="fas fa-sync"></i> Refresh Activity
                  </button>
                  
                  <button 
                    className="btn btn-secondary"
                    onClick={() => userManagementService.checkForSuspiciousActivity(selectedUser.id)}
                  >
                    <i className="fas fa-shield-alt"></i> Check for Suspicious Activity
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UsersTab;
