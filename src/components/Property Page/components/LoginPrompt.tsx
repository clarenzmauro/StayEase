import '../PropertyPage.css';
import { auth } from '../../../firebase/config';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';

interface LoginPromptProps {
  show: boolean;
  onClose: () => void;
}

const LoginPrompt = ({ show, onClose }: LoginPromptProps) => {
  if (!show) return null;

  const handleGoogleAuth = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Create/update user document
      const userRef = doc(db, 'accounts', result.user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          email: result.user.email,
          username: result.user.displayName,
          profilePicUrl: result.user.photoURL,
          dateJoined: new Date(),
          followerCount: 0,
          followers: {},
          itemsSaved: [],
          viewedProperties: [],
          comments: {
            commentCounter: 0
          }
        });
      }
      
      onClose();
    } catch (error) {
      console.error("Error during Google authentication:", error);
      alert("Failed to sign in with Google. Please try again.");
    }
  };

  return (
    <div className="login-prompt-overlay">
      <div className="login-prompt-content">
        <button className="close-button" onClick={onClose}>×</button>
        <h3>Login</h3>
        <button className="google-auth-button" onClick={handleGoogleAuth}>
          <img src="https://authjs.dev/img/providers/google.svg" alt="Google" />
          <span>Continue with Google</span>
        </button>
      </div>
    </div>
  );
};

export default LoginPrompt;