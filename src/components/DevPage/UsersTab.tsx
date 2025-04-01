import React, { useCallback, useEffect } from 'react';
import { UserProfile } from '../../services/UserManagementService';
import { useUserData, useUserDetail } from './hooks';
import { UserFilters, UserTable, UserDetailPanel } from './components';

export const UsersTab: React.FC = () => {
  // Use our custom hooks
  const {
    users,
    loading,
    hasMore,
    filters,
    setRoleFilter,
    setStatusFilter, 
    setSearchQuery,
    setSortBy,
    setSortDirection,
    loadMoreUsers,
    updateUserStatus,
    updateUserRole,
    error: userDataError,
    getAllUsers
  } = useUserData();
  
  // Use user detail hook
  const {
    selectedUser,
    userActivities,
    detailPanelOpen,
    activityLoading,
    actionInProgress,
    error: detailError,
    openDetailPanel,
    closeDetailPanel,
    fetchUserActivities,
    updateSelectedUserStatus,
    updateSelectedUserRole
  } = useUserDetail();
  
  // Make sure we load all users when component mounts
  useEffect(() => {
    console.log('UsersTab mounted - making sure all users are loaded');
    getAllUsers();
  }, [getAllUsers]);
  
  // Log when users are loaded
  useEffect(() => {
    if (users.length > 0) {
      console.log(`${users.length} users loaded from Firestore accounts collection`);
    }
  }, [users.length]);
  
  // Callback for when user status is updated
  const handleUpdateStatus = useCallback(async (userId: string, newStatus: 'active' | 'suspended' | 'inactive') => {
    await updateUserStatus(userId, newStatus);
    if (selectedUser && selectedUser.id === userId) {
      updateSelectedUserStatus(newStatus);
      fetchUserActivities(userId);
    }
  }, [selectedUser, updateUserStatus, updateSelectedUserStatus, fetchUserActivities]);
  
  // Callback for when user role is updated
  const handleUpdateRole = useCallback(async (userId: string, newRole: 'user' | 'owner' | 'admin') => {
    await updateUserRole(userId, newRole);
    if (selectedUser && selectedUser.id === userId) {
      updateSelectedUserRole(newRole);
      fetchUserActivities(userId);
    }
  }, [selectedUser, updateUserRole, updateSelectedUserRole, fetchUserActivities]);
  
  // Handler for selecting a user
  const handleSelectUser = useCallback((user: UserProfile) => {
    openDetailPanel(user);
  }, [openDetailPanel]);

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
      
      {/* Search and Filters */}
      <UserFilters 
        filters={filters}
        onSearchChange={setSearchQuery}
        onRoleFilterChange={setRoleFilter}
        onStatusFilterChange={setStatusFilter}
        onSortByChange={setSortBy}
        onSortDirectionChange={setSortDirection}
      />
      
      {/* Error notification for data loading, if any */}
      {userDataError && (
        <div className="error-notification">
          <i className="fas fa-exclamation-circle"></i> {userDataError}
        </div>
      )}
      
      {/* Display loading state */}
      {loading && users.length === 0 && (
        <div className="loading-indicator">
          <i className="fas fa-spinner fa-spin"></i> Loading users from accounts collection...
        </div>
      )}
      
      {/* Display empty state */}
      {!loading && users.length === 0 && !userDataError && (
        <div className="empty-state">
          <p>No users found in accounts collection. Try adding users to your Firebase Authentication and ensure they have corresponding documents in Firestore.</p>
        </div>
      )}
      
      {/* Users Table */}
      <UserTable 
        users={users}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={loadMoreUsers}
        onSelectUser={handleSelectUser}
        error={userDataError}
      />
      
      {/* User Detail Panel */}
      <UserDetailPanel 
        user={selectedUser}
        activities={userActivities}
        isOpen={detailPanelOpen}
        isLoading={activityLoading}
        actionInProgress={actionInProgress}
        error={detailError}
        onClose={closeDetailPanel}
        onUpdateStatus={handleUpdateStatus}
        onUpdateRole={handleUpdateRole}
      />
    </div>
  );
};

export default UsersTab;
