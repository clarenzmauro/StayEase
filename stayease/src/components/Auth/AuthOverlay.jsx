import React, { useState, useEffect } from 'react';
import { auth, db } from '../../firebase/config';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup 
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import './AuthOverlay.css';

const AuthOverlay = ({ onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [onClose]);

  const createUserDocument = async (user) => {
    const accountRef = doc(db, 'accounts', user.uid);
    const accountSnap = await getDoc(accountRef);

    if (!accountSnap.exists()) {
      // Create new account document with default values
      const accountData = {
        chatMates: {},
        convoId: "",
        comments: [""],
        contactNumber: "",
        dashboardId: "",
        dateJoined: serverTimestamp(),
        email: user.email || "",
        isOwner: false,
        itemsInterested: [""],
        itemsSaved: [""],
        password: "",
        profilePicUrl: user.photoURL || "",
        rating: 0,
        socials: {
          Facebook: ""
        },
        testField: "",
        username: user.displayName || user.email?.split('@')[0] || ""
      };

      try {
        await setDoc(accountRef, accountData);
      } catch (error) {
        console.error("Error creating account document:", error);
      }
    }
  };

  const handleSuccess = () => {
    setIsSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    try {
      let userCredential;
      if (isLogin) {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      }
      await createUserDocument(userCredential.user);
      handleSuccess();
    } catch (error) {
      setError(error.message);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await createUserDocument(result.user);
      handleSuccess();
    } catch (error) {
      setError(error.message);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target.className === 'auth-overlay') {
      onClose();
    }
  };

  return (
    <div className="auth-overlay" onClick={handleOverlayClick}>
      <div className="auth-modal">
        {isSuccess ? (
          <div className="success-message">
            Successfully logged in!
          </div>
        ) : (
          <>
            <button className="close-button" onClick={onClose} aria-label="Close">×</button>
            <h2>Login</h2>
            {error && <div className="error-message">{error}</div>}

            <button onClick={handleGoogleAuth} className="google-button">
              Continue with Google
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthOverlay;
