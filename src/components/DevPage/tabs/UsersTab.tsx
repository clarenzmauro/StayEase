import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc, DocumentData } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import './UsersTab.css';

// Define types for user data
interface UserData {
  id: string;
  email: string;
  username?: string;
  displayName?: string;
  profilePicUrl?: string;
  role: 'user' | 'owner' | 'admin' | 'developer';
  status: 'active' | 'restricted';
  dateJoined: Date;
  lastLogin?: Date;
}

// Define keys that can be used for sorting
type SortableField = keyof UserData;

interface FeedbackMessage {
  message: string;
  type: 'success' | 'error';
}

const UsersTab: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState<SortableField>('username');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [feedbackMessage, setFeedbackMessage] = useState<FeedbackMessage | null>(null);

  // Fetch users from Firestore
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const usersCollection = collection(db, 'accounts');
        const usersSnapshot = await getDocs(usersCollection);
        
        const userData: UserData[] = usersSnapshot.docs.map(doc => {
          const data = doc.data();
          return mapDocumentDataToUser(doc.id, data);
        });
        
        setUsers(userData);
        setFilteredUsers(userData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching users:', error);
        setError('Failed to load users. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, []);

  // Helper function to map document data to UserData
  const mapDocumentDataToUser = (id: string, data: DocumentData): UserData => {
    return {
      id,
      email: data.email || '',
      username: data.username || '',
      displayName: data.displayName || data.username || '',
      profilePicUrl: data.profilePicUrl || '',
      role: (data.role || (data.isOwner ? 'owner' : 'user')) as UserData['role'],
      status: data.status || 'active',
      dateJoined: data.dateJoined ? new Date(data.dateJoined.toDate()) : new Date(),
      lastLogin: data.lastLogin ? new Date(data.lastLogin.toDate()) : undefined
    };
  };

  // Filter and sort users when filter criteria change
  useEffect(() => {
    let result = [...users];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(user => 
        user.email.toLowerCase().includes(query) || 
        user.username?.toLowerCase().includes(query) ||
        user.displayName?.toLowerCase().includes(query)
      );
    }
    
    // Apply role filter
    if (roleFilter !== 'all') {
      result = result.filter(user => user.role === roleFilter);
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(user => user.status === statusFilter);
    }
    
    // Apply sorting
    result.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      // Handle undefined values
      if (aValue === undefined && bValue === undefined) return 0;
      if (aValue === undefined) return sortDirection === 'asc' ? -1 : 1;
      if (bValue === undefined) return sortDirection === 'asc' ? 1 : -1;
      
      // Handle string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      // Handle date comparison
      if (aValue instanceof Date && bValue instanceof Date) {
        return sortDirection === 'asc' 
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }
      
      // Default comparison for other types
      return sortDirection === 'asc'
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });
    
    setFilteredUsers(result);
  }, [users, searchQuery, roleFilter, statusFilter, sortField, sortDirection]);

  // Handle sort column click
  const handleSort = (field: SortableField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Handle role change
  const handleRoleChange = async (userId: string, newRole: UserData['role']) => {
    try {
      const userRef = doc(db, 'accounts', userId);
      await updateDoc(userRef, { role: newRole });
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
      
      setFeedbackMessage({
        message: `User role updated to ${newRole}`,
        type: 'success'
      });
      
      // Clear message after 3 seconds
      setTimeout(() => setFeedbackMessage(null), 3000);
    } catch (error) {
      console.error('Error updating user role:', error);
      setFeedbackMessage({
        message: 'Failed to update user role',
        type: 'error'
      });
    }
  };

  // Toggle user access restriction
  const toggleUserAccess = async (userId: string, currentStatus: 'active' | 'restricted') => {
    const newStatus = currentStatus === 'active' ? 'restricted' : 'active';
    
    // Ask for confirmation when restricting a user
    if (newStatus === 'restricted') {
      const confirmRestrict = window.confirm(
        "This action will immediately prevent the user from accessing any part of StayEase. Are you sure you want to restrict this user?"
      );
      if (!confirmRestrict) return;
    }
    
    try {
      const userRef = doc(db, 'accounts', userId);
      await updateDoc(userRef, { status: newStatus });
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, status: newStatus } : user
      ));
      
      setFeedbackMessage({
        message: `User access ${newStatus === 'active' ? 'restored' : 'restricted'}`,
        type: 'success'
      });
      
      // Clear message after 3 seconds
      setTimeout(() => setFeedbackMessage(null), 3000);
    } catch (error) {
      console.error('Error updating user status:', error);
      setFeedbackMessage({
        message: 'Failed to update user access',
        type: 'error'
      });
    }
  };

  // Handle export data (placeholder)
  const handleExportData = () => {
    alert('Export data functionality will be implemented in the future.');
  };

  // Render loading state
  if (loading) {
    return <div className="users-tab-loading">Loading users data...</div>;
  }

  // Render error state
  if (error) {
    return <div className="users-tab-error">{error}</div>;
  }

  return (
    <div className="users-tab">
      <div className="users-header">
        <h2>Users Management</h2>
        <button 
          className="export-data-btn" 
          onClick={handleExportData}
        >
          Export Data
        </button>
      </div>
      
      <div className="users-filters">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search by email or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-group">
          <label>Role:</label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="user">User</option>
            <option value="owner">Owner</option>
            <option value="developer">Developer</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label>Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="restricted">Restricted</option>
          </select>
        </div>
      </div>
      
      {feedbackMessage && (
        <div className={`feedback-message ${feedbackMessage.type}`}>
          {feedbackMessage.message}
        </div>
      )}
      
      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('username')}>
                Username
                {sortField === 'username' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                  </span>
                )}
              </th>
              <th onClick={() => handleSort('email')}>
                Email
                {sortField === 'email' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                  </span>
                )}
              </th>
              <th onClick={() => handleSort('role')}>
                Role
                {sortField === 'role' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                  </span>
                )}
              </th>
              <th onClick={() => handleSort('status')}>
                Status
                {sortField === 'status' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                  </span>
                )}
              </th>
              <th onClick={() => handleSort('dateJoined')}>
                Joined Date
                {sortField === 'dateJoined' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                  </span>
                )}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="no-users-message">
                  No users found matching the search criteria.
                </td>
              </tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.id} className={user.status === 'restricted' ? 'user-restricted' : ''}>
                  <td className="user-name">
                    <div className="user-avatar-name">
                      {user.profilePicUrl ? (
                        <img src={user.profilePicUrl} alt="" className="user-avatar" />
                      ) : (
                        <div className="user-avatar-placeholder">
                          {(user.username || user.email).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span>{user.username || user.email.split('@')[0]}</span>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as UserData['role'])}
                      className={`role-select role-${user.role}`}
                    >
                      <option value="user">User</option>
                      <option value="owner">Owner</option>
                      <option value="developer">Developer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    <span className={`status-badge status-${user.status}`}>
                      {user.status}
                    </span>
                  </td>
                  <td>{user.dateJoined.toLocaleDateString()}</td>
                  <td>
                    <button
                      className={`restrict-btn ${user.status === 'restricted' ? 'unrestrict' : 'restrict'}`}
                      onClick={() => toggleUserAccess(user.id, user.status)}
                    >
                      {user.status === 'restricted' ? 'Unrestrict' : 'Restrict'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UsersTab; 