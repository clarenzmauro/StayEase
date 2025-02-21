import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../../firebase/config';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import ChatModal from '../../Chat/ChatModal';
import './OwnerSection.css';

interface OwnerData {
  dateJoined: any;
  description: string;
  followerCount: number;
  profilePicUrl: string;
  username: string;
}

interface OwnerSectionProps {
  ownerId: string;
  onViewProfile: () => void;
  onMessage: () => void;
  allowChat: boolean;
}

const OwnerSection: React.FC<OwnerSectionProps> = ({
  ownerId,
  onViewProfile,
  onMessage,
  allowChat,
}) => {
  const [ownerData, setOwnerData] = useState<OwnerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showAuthOverlay, setShowAuthOverlay] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOwnerData = async () => {
      try {
        const ownerDoc = await getDoc(doc(db, 'accounts', ownerId));
        if (ownerDoc.exists()) {
          setOwnerData(ownerDoc.data() as OwnerData);
        }
      } catch (error) {
        console.error('Error fetching owner data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (ownerId) {
      fetchOwnerData();
    }
  }, [ownerId]);

  const handleMessageClick = () => {
    if (!auth.currentUser) {
      setShowAuthOverlay(true);
      return;
    }
    onMessage();
  };

  const handleGoogleAuth = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setIsSuccess(true);
      setTimeout(() => {
        setShowAuthOverlay(false);
        onMessage(); // Open chat after successful login
      }, 1500);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("An unknown error occurred");
      }
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setShowAuthOverlay(false);
    }
  };

  if (loading) {
    return <div className="owner-section">Loading owner information...</div>;
  }

  if (!ownerData) {
    return <div className="owner-section">Owner information not available</div>;
  }

  return (
    <div className="owner-section">
      <div className="owner-content">
        <div className="owner-image">
          <img 
            src={ownerData.profilePicUrl || '/default-profile.png'} 
            alt={`${ownerData.username}'s profile`} 
          />
        </div>
        <div className="owner-info">
          <h3>{ownerData.username}</h3>
          <div className="owner-stats">
            <span>{ownerData.followerCount} followers</span>
            <span>Joined {new Date(ownerData.dateJoined.toDate()).getFullYear()}</span>
          </div>
          <p className="owner-description">{ownerData.description || 'No description available'}</p>
          <div className="owner-buttons">
            <button className="view-profile-btn" onClick={onViewProfile}>
              View Profile
            </button>
            {allowChat && (
              <button className="message-btn" onClick={handleMessageClick}>
                Message
              </button>
            )}
          </div>
        </div>
      </div>
      {ownerData && (
        <ChatModal
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          recipientId={ownerId}
          recipientName={ownerData.username}
          recipientPhoto={ownerData.profilePicUrl || '/default-profile.png'}
          isMinimized={isMinimized}
          onMinimizedChange={setIsMinimized}
        />
      )}
      {showAuthOverlay && (
        <div className="auth-overlay" onClick={handleOverlayClick}>
          <div className="auth-modal">
            {isSuccess ? (
              <div className="success-message">
                Successfully logged in!
              </div>
            ) : (
              <>
                <button className="close-button" onClick={() => setShowAuthOverlay(false)} aria-label="Close">×</button>
                <h2>Login</h2>
                {error && <div className="error-message">{error}</div>}
                <button onClick={handleGoogleAuth} className="google-button">
                  Continue with Google
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerSection;
