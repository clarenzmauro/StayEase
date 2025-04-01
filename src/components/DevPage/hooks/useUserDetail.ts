import { useState, useCallback } from 'react';
import userManagementService, { 
  UserProfile, 
  UserActivity
} from '../../../services/UserManagementService';
import { UserRole, UserStatus } from './useUserData';

interface UseUserDetailReturn {
  selectedUser: UserProfile | null;
  userActivities: UserActivity[];
  detailPanelOpen: boolean;
  activityLoading: boolean;
  actionInProgress: boolean;
  error: string | null;
  openDetailPanel: (user: UserProfile) => Promise<void>;
  closeDetailPanel: () => void;
  fetchUserActivities: (userId: string) => Promise<void>;
  updateSelectedUserStatus: (status: UserStatus) => void;
  updateSelectedUserRole: (role: UserRole) => void;
}

export function useUserDetail(): UseUserDetailReturn {
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user activities
  const fetchUserActivities = useCallback(async (userId: string) => {
    setActivityLoading(true);
    setError(null);
    
    try {
      const activities = await userManagementService.getUserActivityHistory(userId);
      setUserActivities(activities);
    } catch (error) {
      console.error("Error fetching user activities:", error);
      setError("Failed to load user activities. Please try again.");
    } finally {
      setActivityLoading(false);
    }
  }, []);
  
  // Open detail panel for a user
  const openDetailPanel = useCallback(async (user: UserProfile) => {
    setError(null);
    
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
      setError("Failed to load user details. Please try again.");
    }
  }, [fetchUserActivities]);

  // Close detail panel
  const closeDetailPanel = useCallback(() => {
    setDetailPanelOpen(false);
    setSelectedUser(null);
    setUserActivities([]);
  }, []);
  
  // Update selected user status (local state only)
  const updateSelectedUserStatus = useCallback((status: UserStatus) => {
    if (selectedUser) {
      setSelectedUser({
        ...selectedUser,
        status: status
      });
    }
  }, [selectedUser]);
  
  // Update selected user role (local state only)
  const updateSelectedUserRole = useCallback((role: UserRole) => {
    if (selectedUser) {
      setSelectedUser({
        ...selectedUser,
        role: role
      });
    }
  }, [selectedUser]);

  return {
    selectedUser,
    userActivities,
    detailPanelOpen,
    activityLoading,
    actionInProgress,
    error,
    openDetailPanel,
    closeDetailPanel,
    fetchUserActivities,
    updateSelectedUserStatus,
    updateSelectedUserRole
  };
} 