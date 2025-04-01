import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  setPersistence, 
  browserLocalPersistence 
} from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isSubscribed = true;

    const initializeAuth = async () => {
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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state changed:", user?.email);

      if (!isSubscribed) return;

      if (user) {
        try {
          console.log("User authenticated:", user.email);
          setUser(user);
          setError(null);

          const userDoc = await getDoc(doc(db, "accounts", user.uid));
          if (!userDoc.exists()) {
            console.log("Creating user document...");
            await createUserDocument(user);
          }
        } catch (error) {
          console.error("Error handling auth state change:", error);
          setError(error instanceof Error ? error.message : "Authentication failed");
        }
      } else {
        console.log("User signed out");
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, []);

  const createUserDocument = async (user: User) => {
    const accountRef = doc(db, "accounts", user.uid);
    const accountSnap = await getDoc(accountRef);

    if (!accountSnap.exists()) {
      const accountData = {
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
      };

      try {
        await setDoc(accountRef, accountData);
        console.log("User document created with Google profile data");
      } catch (error) {
        console.error("Error creating account document:", error);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}; 