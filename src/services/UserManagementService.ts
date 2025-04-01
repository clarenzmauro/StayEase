import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc,
  Timestamp,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { 
  User as FirebaseUser,
  updateEmail,
  updatePassword,
  sendPasswordResetEmail,
  deleteUser,
  getAuth
} from 'firebase/auth';
import { db } from '../firebase/config';

// Types
export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: 'user' | 'owner' | 'admin';
  status: 'active' | 'suspended' | 'inactive';
  createdAt: Timestamp;
  lastLogin?: Timestamp;
  metadata?: {
    lastIpAddress?: string;
    lastDevice?: string;
    lastBrowser?: string;
    lastOs?: string;
  };
}

export interface UserActivity {
  id?: string;
  userId: string;
  action: string;
  timestamp: Timestamp;
  ipAddress?: string;
  device?: string;
  browser?: string;
  os?: string;
  details?: any;
}

export interface UserSearchParams {
  query?: string;
  role?: 'user' | 'owner' | 'admin' | 'all';
  status?: 'active' | 'suspended' | 'inactive' | 'all';
  sortBy?: 'createdAt' | 'lastLogin' | 'email' | 'displayName';
  sortDirection?: 'asc' | 'desc';
  lastVisible?: QueryDocumentSnapshot<any>;
  pageSize?: number;
}

export interface UserSearchResult {
  users: UserProfile[];
  lastVisible: QueryDocumentSnapshot<any> | null;
  hasMore: boolean;
}

// Service class
class UserManagementService {
  
  // Get users with filtering and pagination
  async getUsers(params: UserSearchParams): Promise<UserSearchResult> {
    try {
      console.log('Fetching users with exact params:', params);
      
      // First, directly fetch a single document to verify field structure
      try {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        
        if (currentUser) {
          const userDocRef = doc(db, 'accounts', currentUser.uid);
          const userSnapshot = await getDoc(userDocRef);
          
          if (userSnapshot.exists()) {
            console.log('Current user document exists in accounts collection:', 
              { id: userSnapshot.id, ...userSnapshot.data() });
          } else {
            console.warn('Current user document does NOT exist in accounts collection!');
          }
        } else {
          console.log('No current user to check');
        }
      } catch (error) {
        console.error('Error checking current user document:', error);
      }
      
      // Continue with normal collection query
      const pageSize = params.pageSize || 10;
      
      // Default to a simple query on accounts collection
      // This is more reliable than trying complex queries that might not match the data structure
      const userQuery = query(collection(db, 'accounts'));
      
      console.log('Executing simple collection query on accounts');
      const snapshot = await getDocs(userQuery);
      
      console.log(`Found ${snapshot.docs.length} raw user documents`);
      
      if (snapshot.empty) {
        console.log('No users found in accounts collection');
        return { users: [], lastVisible: null, hasMore: false };
      }
      
      // Map fields from account doc to UserProfile
      const users = snapshot.docs.map(doc => {
        const data = doc.data();
        
        // Handle different possible field names for profile image
        let photoURL = data.profilePicUrl;
        if (!photoURL) {
          // Try alternative field names that might contain the profile image
          photoURL = data.profilePic || data.photoURL || data.avatar || data.pictureUrl;
        }
        
        return {
          id: doc.id,
          email: data.email || '',
          displayName: data.username || data.displayName || '',
          photoURL: photoURL || '',
          role: data.isOwner ? 'owner' : 'user',
          status: 'active', // Default status
          createdAt: data.dateJoined || Timestamp.now(),
          lastLogin: data.lastLogin,
          metadata: {}
        } as UserProfile;
      });
      
      console.log(`Transformed ${users.length} users:`, users);
      
      // Apply client-side filtering and sorting
      let filteredUsers = [...users];
      
      // Apply role filter
      if (params.role && params.role !== 'all') {
        filteredUsers = filteredUsers.filter(user => user.role === params.role);
      }
      
      // Apply status filter
      if (params.status && params.status !== 'all') {
        filteredUsers = filteredUsers.filter(user => user.status === params.status);
      }
      
      // Apply search query
      if (params.query) {
        filteredUsers = filteredUsers.filter(user => 
          (user.email && user.email.toLowerCase().includes(params.query!.toLowerCase())) ||
          (user.displayName && user.displayName.toLowerCase().includes(params.query!.toLowerCase()))
        );
      }
      
      // Sort users
      filteredUsers.sort((a, b) => {
        const field = params.sortBy || 'createdAt';
        const direction = params.sortDirection === 'asc' ? 1 : -1;
        
        if (field === 'email') {
          return (a.email || '').localeCompare(b.email || '') * direction;
        }
        
        if (field === 'displayName') {
          return (a.displayName || '').localeCompare(b.displayName || '') * direction;
        }
        
        if (field === 'lastLogin') {
          const aTime = a.lastLogin ? a.lastLogin.toMillis() : 0;
          const bTime = b.lastLogin ? b.lastLogin.toMillis() : 0;
          return (aTime - bTime) * direction;
        }
        
        // Default to createdAt
        const aTime = a.createdAt ? a.createdAt.toMillis() : 0;
        const bTime = b.createdAt ? b.createdAt.toMillis() : 0;
        return (aTime - bTime) * direction;
      });
      
      console.log(`Returning ${filteredUsers.length} filtered users`);
      
      return {
        users: filteredUsers,
        lastVisible: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null,
        hasMore: snapshot.docs.length === pageSize
      };
    } catch (error) {
      console.error('Error fetching users from accounts collection:', error);
      return {
        users: [],
        lastVisible: null,
        hasMore: false
      };
    }
  }
  
  // Get a single user by ID
  async getUserById(userId: string): Promise<UserProfile | null> {
    try {
      console.log(`Fetching user with ID ${userId}`);
      const userDoc = await getDoc(doc(db, 'accounts', userId));
      
      if (!userDoc.exists()) {
        console.log(`User ${userId} not found`);
        return null;
      }
      
      const data = userDoc.data();
      console.log(`Found user ${userId}:`, data);
      
      // Map Firestore document to UserProfile structure
      return {
        id: userDoc.id,
        email: data.email || '',
        displayName: data.username || '',
        photoURL: data.profilePicUrl || '',
        role: data.role || 'user',
        status: data.status || 'active',
        createdAt: data.dateJoined || Timestamp.now(),
        lastLogin: data.lastLogin,
        metadata: {
          lastIpAddress: data.lastIpAddress,
          lastDevice: data.lastDevice,
          lastBrowser: data.lastBrowser,
          lastOs: data.lastOs
        }
      } as UserProfile;
    } catch (error) {
      console.error(`Error fetching user ${userId}:`, error);
      throw error;
    }
  }
  
  // Update user profile
  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      // Remove id from updates if present
      const { id, ...updateData } = updates;
      
      // Add audit timestamp
      const updatedAt = Timestamp.now();
      (updateData as any).updatedAt = updatedAt;
      
      const userRef = doc(db, 'accounts', userId);
      await updateDoc(userRef, updateData);
      
      // Log this action
      await this.logUserActivity({
        userId,
        action: 'profile_updated',
        timestamp: Timestamp.now(),
        details: { fields: Object.keys(updateData) }
      });
    } catch (error) {
      console.error(`Error updating user ${userId}:`, error);
      throw error;
    }
  }
  
  // Update user email
  async updateUserEmail(user: FirebaseUser, newEmail: string): Promise<void> {
    try {
      // Update in Firebase Auth
      await updateEmail(user, newEmail);
      
      // Update in Firestore
      const userRef = doc(db, 'accounts', user.uid);
      await updateDoc(userRef, { 
        email: newEmail,
        updatedAt: Timestamp.now()
      });
      
      // Log this action
      await this.logUserActivity({
        userId: user.uid,
        action: 'email_updated',
        timestamp: Timestamp.now(),
        details: { newEmail }
      });
    } catch (error) {
      console.error(`Error updating email for user ${user.uid}:`, error);
      throw error;
    }
  }
  
  // Update user password
  async updateUserPassword(user: FirebaseUser, newPassword: string): Promise<void> {
    try {
      await updatePassword(user, newPassword);
      
      // Log this action (don't include the password in the log)
      await this.logUserActivity({
        userId: user.uid,
        action: 'password_updated',
        timestamp: Timestamp.now()
      });
    } catch (error) {
      console.error(`Error updating password for user ${user.uid}:`, error);
      throw error;
    }
  }
  
  // Send password reset email
  async sendPasswordReset(email: string): Promise<void> {
    try {
      const auth = getAuth();
      await sendPasswordResetEmail(auth, email);
      
      // We don't have the userId here, so we can't log this to user activity
      // But we could log it to a general admin activity log
    } catch (error) {
      console.error(`Error sending password reset for ${email}:`, error);
      throw error;
    }
  }
  
  // Change user status (active, suspended, inactive)
  async updateUserStatus(userId: string, status: 'active' | 'suspended' | 'inactive'): Promise<void> {
    try {
      const userRef = doc(db, 'accounts', userId);
      await updateDoc(userRef, { 
        status,
        updatedAt: Timestamp.now()
      });
      
      // Log this action
      await this.logUserActivity({
        userId,
        action: `status_changed_to_${status}`,
        timestamp: Timestamp.now()
      });
    } catch (error) {
      console.error(`Error updating status for user ${userId}:`, error);
      throw error;
    }
  }
  
  // Change user role
  async updateUserRole(userId: string, role: 'user' | 'owner' | 'admin'): Promise<void> {
    try {
      const userRef = doc(db, 'accounts', userId);
      await updateDoc(userRef, { 
        role,
        updatedAt: Timestamp.now()
      });
      
      // Log this action
      await this.logUserActivity({
        userId,
        action: `role_changed_to_${role}`,
        timestamp: Timestamp.now()
      });
    } catch (error) {
      console.error(`Error updating role for user ${userId}:`, error);
      throw error;
    }
  }
  
  // Delete user
  async deleteUserAccount(user: FirebaseUser): Promise<void> {
    try {
      // First, log this action before the user is deleted
      await this.logUserActivity({
        userId: user.uid,
        action: 'account_deleted',
        timestamp: Timestamp.now()
      });
      
      // Delete from Firestore
      const userRef = doc(db, 'accounts', user.uid);
      await deleteDoc(userRef);
      
      // Delete from Firebase Auth
      await deleteUser(user);
    } catch (error) {
      console.error(`Error deleting user ${user.uid}:`, error);
      throw error;
    }
  }
  
  // Log user activity
  async logUserActivity(activity: UserActivity): Promise<string> {
    try {
      // Add client metadata if available
      if (typeof window !== 'undefined') {
        activity.browser = this.getBrowserInfo();
        activity.os = this.getOSInfo();
        activity.ipAddress = await this.getIpAddress();
      }
      
      const activityRef = await addDoc(collection(db, 'user_activities'), {
        ...activity,
        timestamp: activity.timestamp || Timestamp.now()
      });
      
      return activityRef.id;
    } catch (error) {
      console.error('Error logging user activity:', error);
      // Don't throw here, just log the error and continue
      return '';
    }
  }
  
  // Get user activity history
  async getUserActivityHistory(userId: string, limitParam = 20): Promise<UserActivity[]> {
    try {
      console.log(`Fetching activity history for user ${userId}`);
      
      // Check if the activities collection exists
      const activitiesQuery = query(
        collection(db, 'user_activities'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitParam)
      );
      
      const snapshot = await getDocs(activitiesQuery);
      console.log(`Found ${snapshot.docs.length} activity records`);
      
      if (snapshot.empty) {
        console.log('No activity records found');
        // Return empty array if no activities found
        return [];
      }
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserActivity[];
    } catch (error) {
      console.error(`Error fetching activity history for user ${userId}:`, error);
      // Return empty array instead of failing completely
      return [];
    }
  }
  
  // Check for suspicious activity
  async checkForSuspiciousActivity(userId: string): Promise<boolean> {
    try {
      // Get recent activities
      const recentActivities = await this.getUserActivityHistory(userId, 10);
      
      if (recentActivities.length < 2) {
        return false;
      }
      
      // Check for multiple IP addresses
      const uniqueIps = new Set(recentActivities.map(a => a.ipAddress).filter(Boolean));
      
      // Check for rapid location changes
      // This is a simplified example - in a real system, you would use IP geolocation
      if (uniqueIps.size > 3) {
        // Log suspicious activity
        await this.logUserActivity({
          userId,
          action: 'suspicious_activity_detected',
          timestamp: Timestamp.now(),
          details: { reason: 'multiple_ips', ipCount: uniqueIps.size }
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Error checking for suspicious activity for user ${userId}:`, error);
      return false;
    }
  }
  
  // Helper methods for client metadata
  private getBrowserInfo(): string {
    const userAgent = navigator.userAgent;
    
    if (userAgent.includes('Firefox')) {
      return 'Firefox';
    } else if (userAgent.includes('Chrome')) {
      return 'Chrome';
    } else if (userAgent.includes('Safari')) {
      return 'Safari';
    } else if (userAgent.includes('Edge')) {
      return 'Edge';
    } else if (userAgent.includes('MSIE') || userAgent.includes('Trident/')) {
      return 'Internet Explorer';
    } else {
      return 'Unknown';
    }
  }
  
  private getOSInfo(): string {
    const userAgent = navigator.userAgent;
    
    if (userAgent.includes('Windows')) {
      return 'Windows';
    } else if (userAgent.includes('Mac OS')) {
      return 'MacOS';
    } else if (userAgent.includes('Linux')) {
      return 'Linux';
    } else if (userAgent.includes('Android')) {
      return 'Android';
    } else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      return 'iOS';
    } else {
      return 'Unknown';
    }
  }
  
  private async getIpAddress(): Promise<string> {
    try {
      // Use a public API to get the IP address
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('Error getting IP address:', error);
      return 'unknown';
    }
  }
}

// Export singleton instance
export const userManagementService = new UserManagementService();
export default userManagementService;
