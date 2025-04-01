import { useState, useEffect, useCallback } from 'react';
import userManagementService, { 
  UserProfile, 
  UserSearchParams 
} from '../../../services/UserManagementService';
import useDebounce from './useDebounce';
import { collection, getDocs, limit, query, addDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { Timestamp } from 'firebase/firestore';
import { auth } from '../../../firebase/config';

export type UserRole = 'user' | 'owner' | 'admin';
export type UserStatus = 'active' | 'suspended' | 'inactive';
export type SortByField = 'createdAt' | 'lastLogin' | 'email' | 'displayName';

export interface UserFilters {
  roleFilter: string;
  statusFilter: string;
  searchQuery: string;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

interface UseUserDataProps {
  initialFilters?: Partial<UserFilters>;
}

interface UseUserDataReturn {
  users: UserProfile[];
  loading: boolean;
  hasMore: boolean;
  filters: UserFilters;
  setRoleFilter: (role: string) => void;
  setStatusFilter: (status: string) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sortBy: string) => void;
  setSortDirection: (direction: 'asc' | 'desc') => void;
  loadMoreUsers: () => Promise<void>;
  updateUserStatus: (userId: string, newStatus: UserStatus) => Promise<void>;
  updateUserRole: (userId: string, newRole: UserRole) => Promise<void>;
  getAllUsers: () => Promise<void>;
  addCurrentUserToList: () => Promise<void>;
  error: string | null;
}

export function useUserData({ initialFilters = {} }: UseUserDataProps = {}): UseUserDataReturn {
  // State for users and pagination
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  
  // State for filters and sorting
  const [roleFilter, setRoleFilter] = useState<string>(initialFilters.roleFilter || 'all');
  const [statusFilter, setStatusFilter] = useState<string>(initialFilters.statusFilter || 'all');
  const [searchQuery, setSearchQuery] = useState(initialFilters.searchQuery || '');
  const [sortBy, setSortBy] = useState<string>(initialFilters.sortBy || 'createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
    initialFilters.sortDirection || 'desc'
  );
  
  // Debounce the search query to prevent excessive API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  
  // Prepare search params based on filters
  const prepareSearchParams = useCallback((): UserSearchParams => {
    // Adjust sortBy field name based on actual field names in the database
    let actualSortBy = sortBy;
    if (sortBy === 'displayName') {
      // In Firestore, the field is called username, not displayName
      actualSortBy = 'username';
    } else if (sortBy === 'createdAt') {
      // In Firestore, the field is called dateJoined, not createdAt
      actualSortBy = 'dateJoined';
    }
    
    return {
      query: debouncedSearchQuery,
      role: roleFilter !== 'all' ? roleFilter as UserRole : undefined,
      status: statusFilter !== 'all' ? statusFilter as UserStatus : undefined,
      sortBy: actualSortBy as SortByField,
      sortDirection: sortDirection,
      lastVisible: lastVisible,
      pageSize: 10
    };
  }, [debouncedSearchQuery, roleFilter, statusFilter, sortBy, sortDirection, lastVisible]);
  
  // Fetch users based on current filters
  const fetchUsers = useCallback(async () => {
    // Prevent multiple simultaneous fetches
    if (loading) {
      console.log('Skip fetching - already loading');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const searchParams = prepareSearchParams();
      console.log('Executing userManagementService.getUsers with params', searchParams);
      
      const result = await userManagementService.getUsers(searchParams);
      console.log('Result from userManagementService:', result);
      
      if (result.users.length > 0) {
        console.log(`Setting ${result.users.length} users in state`);
        setUsers(result.users);
        setLastVisible(result.lastVisible);
        setHasMore(result.hasMore);
      } else {
        console.log('No users returned from service');
        setUsers([]);
        setLastVisible(null);
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setError("Failed to load users. Please try again.");
      // Clear users on error
      setUsers([]);
      setLastVisible(null);
      setHasMore(false);
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  }, [prepareSearchParams, loading]);
  
  // Load more users (pagination)
  const loadMoreUsers = async () => {
    if (!lastVisible || loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const searchParams = prepareSearchParams();
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
      setError("Failed to load more users. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  // Update user status
  const updateUserStatus = async (userId: string, newStatus: UserStatus) => {
    if (actionInProgress) return;
    
    setActionInProgress(true);
    setError(null);
    
    try {
      await userManagementService.updateUserStatus(userId, newStatus);
      
      // Update user in the list
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, status: newStatus } 
            : user
        )
      );
    } catch (error) {
      console.error("Error updating user status:", error);
      setError("Failed to update user status. Please try again.");
    } finally {
      setActionInProgress(false);
    }
  };
  
  // Update user role
  const updateUserRole = async (userId: string, newRole: UserRole) => {
    if (actionInProgress) return;
    
    setActionInProgress(true);
    setError(null);
    
    try {
      await userManagementService.updateUserRole(userId, newRole);
      
      // Update user in the list
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, role: newRole } 
            : user
        )
      );
    } catch (error) {
      console.error("Error updating user role:", error);
      setError("Failed to update user role. Please try again.");
    } finally {
      setActionInProgress(false);
    }
  };
  
  // Reset lastVisible and fetch users when filters change
  useEffect(() => {
    // First mount should use getAllUsers instead of the filtered fetch
    if (debouncedSearchQuery === '' && roleFilter === 'all' && statusFilter === 'all') {
      console.log('Initial load - using getAllUsers for best results');
      getAllUsers();
      return;
    }
    
    // Only run when filters actually change
    console.log('Filter changed, fetching users with:',
      { debouncedSearchQuery, roleFilter, statusFilter, sortBy, sortDirection });
    
    setLastVisible(null);
    fetchUsers();
    
    // Remove fetchUsers from dependency array since it would cause unnecessary re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchQuery, roleFilter, statusFilter, sortBy, sortDirection]);
  
  // Add a separate useEffect to check the accounts collection
  useEffect(() => {
    console.log('Checking if accounts collection exists in Firestore');
    const checkCollection = async () => {
      try {
        const testQuery = query(collection(db, 'accounts'), limit(1));
        const snapshot = await getDocs(testQuery);
        console.log(`Accounts collection exists: ${!snapshot.empty}`, 
          snapshot.empty ? 'Collection is empty (no user records)' : 
          `Found ${snapshot.docs.length} user record(s)`);
        
        if (snapshot.empty) {
          console.warn('The accounts collection exists but has no documents. ' +
            'Please make sure you have created users in Firebase Authentication ' +
            'and they have corresponding documents in the accounts collection.');
        }
      } catch (err) {
        console.error('Error checking accounts collection:', err);
      }
    };
    checkCollection();
  }, []);
  
  // Function to bypass all filters and directly get all users
  const getAllUsers = useCallback(async () => {
    setLoading(true);
    try {
      console.log("Directly fetching all users from accounts collection");
      
      const allUsersQuery = query(collection(db, 'accounts'));
      const snapshot = await getDocs(allUsersQuery);
      
      console.log(`Found ${snapshot.docs.length} user documents in total`);
      
      if (snapshot.empty) {
        console.warn("Accounts collection is empty! No users found.");
        setUsers([]);
        return;
      }
      
      // Map directly to UserProfile without filtering
      const allUsers = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          email: data.email || '',
          displayName: data.username || '',
          photoURL: data.profilePicUrl || '',
          role: data.isOwner ? 'owner' : 'user',
          status: 'active',
          createdAt: data.dateJoined || Timestamp.now(),
          lastLogin: data.lastLogin || null,
          metadata: {}
        } as UserProfile;
      });
      
      console.log(`Successfully mapped ${allUsers.length} users:`, 
        allUsers.map(u => ({ id: u.id, name: u.displayName, email: u.email })));
      
      setUsers(allUsers);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(false); // Since we fetched all users
    } catch (error) {
      console.error("Error in getAllUsers:", error);
      setError("Failed to load users. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Add a useEffect to use getAllUsers as a fallback if regular fetch returns empty
  useEffect(() => {
    if (!loading && users.length === 0) {
      console.log("Regular fetch returned no users, trying direct fetch of all users");
      getAllUsers();
    }
  }, [loading, users.length, getAllUsers]);
  
  // Add a separate useEffect to check for the current user's document in Firestore
  useEffect(() => {
    const checkCurrentUserDocument = async () => {
      try {
        const currentUser = auth.currentUser;
        
        if (currentUser) {
          console.log("Checking if the current user document exists in accounts collection");
          const userDocRef = doc(db, 'accounts', currentUser.uid);
          const userSnapshot = await getDoc(userDocRef);
          
          if (userSnapshot.exists()) {
            console.log("Current user document exists:", { 
              id: userSnapshot.id, 
              ...userSnapshot.data() 
            });
          } else {
            console.warn("Current user document does NOT exist in accounts collection!");
          }
        } else {
          console.log("No current user to check");
        }
      } catch (error) {
        console.error("Error checking current user document:", error);
      }
    };
    
    // Only run this check once
    checkCurrentUserDocument();
  }, []);
  
  // Add a function to manually add the current user to the list
  const addCurrentUserToList = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log("No current user to add");
      return;
    }
    
    console.log(`Manually adding current user (${currentUser.email}) to the list`);
    
    try {
      const userDocRef = doc(db, 'accounts', currentUser.uid);
      const userSnapshot = await getDoc(userDocRef);
      
      if (userSnapshot.exists()) {
        const userData = userSnapshot.data();
        console.log("Current user data:", userData);
        
        // Create a UserProfile for the current user
        const userProfile: UserProfile = {
          id: currentUser.uid,
          email: userData.email || currentUser.email || '',
          displayName: userData.username || currentUser.displayName || '',
          photoURL: userData.profilePicUrl || currentUser.photoURL || '',
          role: userData.isOwner ? 'owner' : 'user',
          status: 'active',
          createdAt: userData.dateJoined || Timestamp.now(),
          lastLogin: userData.lastLogin || null,
          metadata: {}
        };
        
        // Add this user to the users list if not already there
        setUsers(prevUsers => {
          const existingUser = prevUsers.find(u => u.id === currentUser.uid);
          if (existingUser) {
            console.log("Current user already in list");
            return prevUsers;
          }
          console.log("Adding current user to list");
          return [...prevUsers, userProfile];
        });
        
        console.log("Current user added successfully");
      } else {
        console.error("Current user document doesn't exist in accounts collection");
      }
    } catch (error) {
      console.error("Error adding current user:", error);
    }
  }, []);
  
  return {
    users,
    loading,
    hasMore,
    filters: {
      roleFilter,
      statusFilter,
      searchQuery,
      sortBy,
      sortDirection
    },
    setRoleFilter,
    setStatusFilter,
    setSearchQuery,
    setSortBy,
    setSortDirection,
    loadMoreUsers,
    updateUserStatus,
    updateUserRole,
    getAllUsers,
    addCurrentUserToList,
    error
  };
} 