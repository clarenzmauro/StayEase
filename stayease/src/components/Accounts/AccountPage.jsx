import React, { useState, useEffect } from 'react';
import { auth, db } from '../../firebase/config';
import { collection, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import './AccountPage.css';

const AccountPage = () => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [favoriteDorms, setFavoriteDorms] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setUser(user);
      if (user) {
        const accountDoc = await getDoc(doc(db, 'accounts', user.uid));
        if (accountDoc.exists()) {
          const data = accountDoc.data();
          setUserData(data);
          setEditedData(data);

          // Fetch favorite dorms data
          if (data.favoriteDorms && data.favoriteDorms.length > 0) {
            const propertiesRef = collection(db, 'properties');
            const favoriteProperties = await Promise.all(
              data.favoriteDorms.map(async (propertyId) => {
                const propertyDoc = await getDoc(doc(propertiesRef, propertyId));
                return propertyDoc.exists() ? { id: propertyDoc.id, ...propertyDoc.data() } : null;
              })
            );
            setFavoriteDorms(favoriteProperties.filter(property => property !== null));
          }
        }
      } else {
        navigate('/'); // Redirect to homepage if not authenticated
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleEdit = () => {
    setEditMode(true);
    setEditedData({...userData});
  };

  const handleCancel = () => {
    setEditMode(false);
    setEditedData(userData);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const accountRef = doc(db, 'accounts', user.uid);
      await updateDoc(accountRef, editedData);
      setUserData(editedData);
      setEditMode(false);
    } catch (error) {
      console.error('Error updating account:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSocialChange = (platform, value) => {
    setEditedData(prev => ({
      ...prev,
      socials: {
        ...prev.socials,
        [platform]: value
      }
    }));
  };

  if (!user || !userData || !editedData) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="account-page">
      <div className="account-container">
        <div className="profile-header">
          <div className="profile-image-container">
            {user.photoURL ? (
              <img 
                src={user.photoURL} 
                alt="Profile" 
                className="profile-image"
              />
            ) : (
              <div className="profile-image-placeholder">
                {userData.username[0].toUpperCase()}
              </div>
            )}
          </div>
          <div className="profile-title">
            <h1>Account Details</h1>
            <div className="action-buttons">
              {editMode ? (
                <>
                  <button 
                    onClick={handleSave} 
                    className="save-button"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button 
                    onClick={handleCancel} 
                    className="cancel-button"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button onClick={handleEdit} className="edit-button">
                    Edit Profile
                  </button>
                  <button onClick={handleLogout} className="logout-button">
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="account-section">
          <h2>Profile Information</h2>
          <div className="info-group">
            <label>Username</label>
            {editMode ? (
              <input
                type="text"
                value={editedData.username}
                onChange={(e) => handleChange('username', e.target.value)}
              />
            ) : (
              <p>{userData.username}</p>
            )}
          </div>
          <div className="info-group">
            <label>Email</label>
            <p>{userData.email}</p>
          </div>
          <div className="info-group">
            <label>Contact Number</label>
            {editMode ? (
              <input
                type="tel"
                value={editedData.contactNumber}
                onChange={(e) => handleChange('contactNumber', e.target.value)}
                placeholder="Enter contact number"
              />
            ) : (
              <p>{userData.contactNumber || 'Not provided'}</p>
            )}
          </div>
          <div className="info-group">
            <label>Date Joined</label>
            <p>{userData.dateJoined?.toDate().toLocaleDateString() || 'Not available'}</p>
          </div>
          <div className="info-group">
            <label>Rating</label>
            <p>{userData.rating || '0'} ⭐</p>
          </div>
        </div>

        <div className="account-section">
          <h2>Social Media</h2>
          <div className="socials-list">
            {editMode ? (
              <div className="social-edit">
                <div className="social-input-group">
                  <label>Facebook</label>
                  <input
                    type="text"
                    value={editedData.socials.Facebook}
                    onChange={(e) => handleSocialChange('Facebook', e.target.value)}
                    placeholder="Enter Facebook profile URL"
                  />
                </div>
              </div>
            ) : (
              userData.socials.Facebook ? (
                <div className="social-item">
                  <span>Facebook: </span>
                  <a href={userData.socials.Facebook} target="_blank" rel="noopener noreferrer">
                    {userData.socials.Facebook}
                  </a>
                </div>
              ) : (
                <p>No social media accounts linked</p>
              )
            )}
          </div>
        </div>

        <div className="account-section">
          <h2>Property Interests</h2>
          <div className="interests-group">
            <div className="info-group">
              <label>Saved Properties</label>
              <p>{userData.itemsSaved?.length || 0} properties</p>
            </div>
            <div className="info-group">
              <label>Interested Properties</label>
              <p>{userData.itemsInterested?.length || 0} properties</p>
            </div>
          </div>
        </div>

        <div className="account-section">
          <h2>Other Information</h2>
          <div className="info-group">
            <label>Dashboard ID</label>
            <p>{userData.dashboardId || 'Not assigned'}</p>
          </div>
          <div className="info-group">
            <label>Conversation ID</label>
            <p>{userData.convoId || 'Not assigned'}</p>
          </div>
          <div className="info-group">
            <label>Account Type</label>
            <p>{userData.isOwner ? 'Property Owner' : 'Regular User'}</p>
          </div>
          {userData.comments?.length > 0 && (
            <div className="info-group">
              <label>Comments</label>
              <div className="comments-list">
                {userData.comments.map((comment, index) => (
                  comment && <p key={index}>{comment}</p>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="account-section">
          <h3>Favorite Dorms</h3>
          <div className="favorite-dorms-grid">
            {favoriteDorms.length > 0 ? (
              favoriteDorms.map((dorm) => (
                <div key={dorm.id} className="favorite-dorm-card" onClick={() => navigate(`/property/${dorm.id}`)}>
                  <img 
                    src={dorm.propertyPhotos[0]} 
                    alt={dorm.propertyName} 
                    className="favorite-dorm-image"
                  />
                  <div className="favorite-dorm-info">
                    <h4>{dorm.propertyName}</h4>
                    <p>{dorm.propertyLocation}</p>
                    <p>{dorm.propertyType}</p>
                    <p>₱{dorm.rent}/month</p>
                  </div>
                </div>
              ))
            ) : (
              <p>No favorite dorms yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountPage;
