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
      const pageSize = params.pageSize || 10;
      
      // Start building the query
      let userQuery = query(
        collection(db, 'accounts'),
        orderBy(params.sortBy || 'createdAt', params.sortDirection || 'desc')
      );
      
      // Apply role filter if specified and not 'all'
      if (params.role && params.role !== 'all') {
        userQuery = query(userQuery, where('role', '==', params.role));
      }
      
      // Apply status filter if specified and not 'all'
      if (params.status && params.status !== 'all') {
        userQuery = query(userQuery, where('status', '==', params.status));
      }
      
      // Apply pagination
      if (params.lastVisible) {
        userQuery = query(userQuery, startAfter(params.lastVisible), limit(pageSize));
      } else {
        userQuery = query(userQuery, limit(pageSize));
      }
      
      const snapshot = await getDocs(userQuery);
      
      // Get the users
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserProfile[];
      
      // Filter by search query if provided (client-side filtering)
      const filteredUsers = params.query 
        ? users.filter(user => 
            user.email.toLowerCase().includes(params.query!.toLowerCase()) ||
            (user.displayName && user.displayName.toLowerCase().includes(params.query!.toLowerCase()))
          )
        : users;
      
      return {
        users: filteredUsers,
        lastVisible: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null,
        hasMore: snapshot.docs.length === pageSize
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }
  
  // Get a single user by ID
  async getUserById(userId: string): Promise<UserProfile | null> {
    try {
      const userDoc = await getDoc(doc(db, 'accounts', userId));
      
      if (!userDoc.exists()) {
        return null;
      }
      
      return {
        id: userDoc.id,
        ...userDoc.data()
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
      // Ensure limit is a number
      const pageLimit = typeof limitParam === 'number' ? limitParam : parseInt(String(limitParam), 10) || 20;
      
      const activitiesQuery = query(
        collection(db, 'user_activities'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(pageLimit)
      );
      
      const snapshot = await getDocs(activitiesQuery);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserActivity[];
    } catch (error) {
      console.error(`Error fetching activity history for user ${userId}:`, error);
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
