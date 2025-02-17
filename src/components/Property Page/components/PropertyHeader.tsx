import { Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useEffect, useState } from 'react';
import logoSvg from '../../../assets/STAY.svg';
import LoginPrompt from './LoginPrompt';
import '../PropertyPage.css';

const PropertyHeader = () => {
  const { user } = useAuth();
  const [profilePicUrl, setProfilePicUrl] = useState<string>('');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    const fetchProfilePic = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'accounts', user.uid));
          if (userDoc.exists()) {
            const picUrl = userDoc.data().profilePicUrl;
            if (picUrl) {
              setProfilePicUrl(picUrl);
            }
          }
        } catch (error) {
          console.error('Error fetching profile picture:', error);
        }
      }
    };

    fetchProfilePic();
  }, [user]);

  const handleProfileClick = () => {
    if (!user) {
      setShowLoginPrompt(true);
    }
  };

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="logo">
          <img src={logoSvg} alt="StayEase Logo" />
        </Link>

        <div className="nav-right">
          {user ? (
            <Link to="/account">
              <img
                src={profilePicUrl}
                alt="User Profile"
                className="user-icon"
              />
            </Link>
          ) : (
            <div onClick={handleProfileClick}>
              <img
                src={profilePicUrl || "/default-profile.png"}
                alt="User Profile"
                className="user-icon"
              />
            </div>
          )}
        </div>
      </nav>
      <LoginPrompt 
        show={showLoginPrompt} 
        onClose={() => setShowLoginPrompt(false)} 
      />
    </>
  );
};

export default PropertyHeader;
