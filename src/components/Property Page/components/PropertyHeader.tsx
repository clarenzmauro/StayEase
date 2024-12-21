import { Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import logoSvg from '../../../assets/STAY.svg';
import userIcon from '../../../assets/user.png';
import '../PropertyPage.css';

const PropertyHeader = () => {
  const { user } = useAuth();

  return (
    <nav className="navbar">
      <Link to="/" className="logo">
        <img src={logoSvg} alt="StayEase Logo" />
      </Link>

      <div className="nav-right">
        <Link to={user ? "/profile" : "/login"}>
          <img
            src={userIcon}
            alt="User Profile"
            className="user-icon"
          />
        </Link>
      </div>
    </nav>
  );
};

export default PropertyHeader;
