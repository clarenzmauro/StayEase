import { Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useEffect, useState } from 'react';
import logoSvg from '../../../assets/STAY.svg';
import '../PropertyPage.css';

const PropertyHeader = () => {
  const { user } = useAuth();
  const [profilePicUrl, setProfilePicUrl] = useState<string>('');

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

  return (
    <nav className="navbar">
      <Link to="/" className="logo">
        <img src={logoSvg} alt="StayEase Logo" />
      </Link>

      <div className="nav-right">
        <Link to={user ? "/account" : "/login"}>
          <img
            src={profilePicUrl}
            alt="User Profile"
            className="user-icon"
          />
        </Link>
      </div>
    </nav>
  );
};

export default PropertyHeader;
