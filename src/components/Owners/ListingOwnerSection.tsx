import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import ChatModal from '../Chat/ChatModal';
import './ListingOwnerSection.css';

interface OwnerData {
  dateJoined: any;
  description: string;
  followerCount: number;
  profilePicUrl: string;
  username: string;
}

interface OwnerSectionProps {
  ownerId: string;
  onAllowChattingChange: (value: boolean) => void;
}

const ListingOwnerSection: React.FC<OwnerSectionProps> = ({
  ownerId,
  onAllowChattingChange,
}) => {
  const [ownerData, setOwnerData] = useState<OwnerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [allowChatting, setAllowChatting] = useState(false);

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
          <div className="owner-switch">
          <label className="switch">
              <input
                type="checkbox"
                checked={allowChatting}
                onChange={(e) => {
                    const newValue = e.target.checked;
                    setAllowChatting(newValue);
                    onAllowChattingChange(newValue); // Call the passed function
                  }}
              />
              <span className="slider"></span>
            </label>
            <span className="switch-label">Allow Chatting</span>
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
        />
      )}
    </div>
  );
};

export default ListingOwnerSection;
