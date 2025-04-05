import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  setPersistence, 
  browserLocalPersistence 
} from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp, 
  onSnapshot, 
  Timestamp,
  FieldValue 
} from 'firebase/firestore';

// Define specific types for user statuses and roles
export type UserStatus = 'active' | 'restricted' | null;
export type UserRole = 'user' | 'owner' | 'admin' | null;

// Define the structure of account data in Firestore
export interface AccountData {
  chatMates: Record<string, unknown>;
  convoId: string;
  comments: {
    commentCounter: number;
  };
  contactNumber: string;
  dashboardId: string;
  dateJoined: Timestamp | FieldValue | null;
  description: string;
  email: string;
  followerCount: number;
  isOwner: boolean;
  role?: UserRole;
  itemsInterested: string[];
  itemsSaved: string[];
  profilePicUrl: string;
  rating: number;
  socials: {
    Facebook: string;
    Instagram: string;
    X: string;
  };
  testField: string;
  username: string;
  status: UserStatus;
}

interface AuthContextType {
  user: User | null;
  userStatus: UserStatus;
  userRole: UserRole;
  userDoc: AccountData | null;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userStatus: null,
  userRole: null,
  userDoc: null,
  loading: true,
  error: null
});

export const useAuth = (): AuthContextType => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userStatus, setUserStatus] = useState<UserStatus>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [userDoc, setUserDoc] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isSubscribed = true;

    const initializeAuth = async (): Promise<void> => {
      try {
        // Set persistence explicitly
        await setPersistence(auth, browserLocalPersistence);
        console.log("Persistence set to browserLocal");

        // Check for stored auth state
        const currentUser = auth.currentUser;
        console.log("Current user from auth:", currentUser?.email);

        if (currentUser && isSubscribed) {
          console.log("User already signed in:", currentUser.email);
          setUser(currentUser);
          
          // Fetch user status
          const userDocRef = doc(db, "accounts", currentUser.uid);
          const userDocSnapshot = await getDoc(userDocRef);
          
          if (userDocSnapshot.exists()) {
            const userData = userDocSnapshot.data() as AccountData;
            setUserStatus(userData.status || 'active');
            setUserRole(userData.role || 'user');
            setUserDoc(userData);
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        if (isSubscribed) {
          setError(error instanceof Error ? error.message : "Authentication failed");
        }
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };

    // Initialize auth immediately
    initializeAuth();

    // Set up auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("Auth state changed:", currentUser?.email);

      if (!isSubscribed) return;

      if (currentUser) {
        try {
          console.log("User authenticated:", currentUser.email);
          setUser(currentUser);
          setError(null);

          const userDocRef = doc(db, "accounts", currentUser.uid);
          const userDocSnapshot = await getDoc(userDocRef);
          
          if (!userDocSnapshot.exists()) {
            console.log("Creating user document...");
            await createUserDocument(currentUser);
            setUserStatus('active');
            setUserRole('user');
            
            // Fetch the newly created document
            const newUserDocSnapshot = await getDoc(userDocRef);
            const newUserData = newUserDocSnapshot.data() as AccountData;
            setUserDoc(newUserData);
          } else {
            const userData = userDocSnapshot.data() as AccountData;
            setUserStatus(userData.status || 'active');
            setUserRole(userData.role || 'user');
            setUserDoc(userData);
            
            // Setup a listener for real-time status updates
            const userStatusUnsubscribe = onSnapshot(userDocRef, (doc) => {
              if (doc.exists() && isSubscribed) {
                const updatedData = doc.data() as AccountData;
                setUserStatus(updatedData.status || 'active');
                setUserRole(updatedData.role || 'user');
                setUserDoc(updatedData);
              }
            });
            
            return () => {
              userStatusUnsubscribe();
            };
          }
        } catch (error) {
          console.error("Error handling auth state change:", error);
          setError(error instanceof Error ? error.message : "Authentication failed");
        }
      } else {
        console.log("User signed out");
        setUser(null);
        setUserStatus(null);
        setUserRole(null);
        setUserDoc(null);
      }
      
      setLoading(false);
    });

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, []);

  const createUserDocument = async (user: User): Promise<void> => {
    const accountRef = doc(db, "accounts", user.uid);
    const accountSnap = await getDoc(accountRef);

    if (!accountSnap.exists()) {
      const accountData: AccountData = {
        chatMates: {},
        convoId: "",
        comments: {
          commentCounter: 0,
        },
        contactNumber: "",
        dashboardId: "",
        dateJoined: serverTimestamp(),
        description: "",
        email: user.email || "",
        followerCount: 0,
        isOwner: false,
        role: 'user',
        itemsInterested: [],
        itemsSaved: [],
        profilePicUrl: user.photoURL || "",
        rating: 0,
        socials: {
          Facebook: "",
          Instagram: "",
          X: "",
        },
        testField: "",
        username: user.displayName || "",
        status: 'active', // Default status for new users
      };

      try {
        await setDoc(accountRef, accountData);
        console.log("User document created with Google profile data");
      } catch (error) {
        console.error("Error creating account document:", error);
        throw error;
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, userStatus, userRole, userDoc, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}; 