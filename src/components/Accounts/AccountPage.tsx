import React, { useState, useEffect } from 'react';
import { auth, db } from '../../firebase/config';
import { collection, doc, getDoc, updateDoc, addDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import './AccountPage.css';

const AccountPage = () => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [itemsSaved, setFavoriteDorms] = useState([]);
  const [showOwnerOverlay, setShowOwnerOverlay] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
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
          if (data.itemsSaved && data.itemsSaved.length > 0) {
            const propertiesRef = collection(db, 'properties');
            const favoriteProperties = await Promise.all(
              data.itemsSaved.map(async (propertyId) => {
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

  const handleApplyAsOwner = () => {
    setShowOwnerOverlay(true);
  };

  const handleSubmitOwner = async () => {
    try {
      // Create a new document in the dashboards collection
    const dashboardRef = await addDoc(collection(db, 'dashboards'), {
      followers: [],
      listedDorms: [],
      ownerId: user.uid
    });

    // Update the user's account in the accounts collection
    const accountRef = doc(db, 'accounts', user.uid);
    await updateDoc(accountRef, {
      isOwner: true,
      dashboardId: dashboardRef.id
    });

    setUserData((prev) => ({ ...prev, isOwner: true, dashboardId: dashboardRef.id }));
    setShowOwnerOverlay(false);

    if (user) {
      const accountDoc = await getDoc(doc(db, 'accounts', user.uid));
      if (accountDoc.exists()) {
        const documentId = accountDoc.id;
        const key = new Date().getDate(); // Get the current day
        const encryptedId = caesarCipher(documentId, key);
        navigate(`/owner-page/${encryptedId}`, { state: { normalDocumentId: documentId, encryptedDocumentId: encryptedId } });
      }
    }
    } catch (error) {
      console.error('Error updating isOwner:', error);
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

  const caesarCipher = (text: string, key: number): string => {
    return text.split('').map(char => {
      const code = char.charCodeAt(0);

      if (code >= 65 && code <= 90) {
        return String.fromCharCode(((code - 65 + key) % 26) + 65);
      } else if (code >= 97 && code <= 122) {
        return String.fromCharCode(((code - 97 + key) % 26) + 97);
      }
      return char;
    }).join('');
  };

  const handleNavigateToOwnerPage = async () => {
    if (user) {
      const accountDoc = await getDoc(doc(db, 'accounts', user.uid));
      if (accountDoc.exists()) {
        const documentId = accountDoc.id;
        const key = new Date().getDate(); // Get the current day
        const encryptedId = caesarCipher(documentId, key);
        navigate(`/owner-page/${encryptedId}`, { state: { normalDocumentId: documentId, encryptedDocumentId: encryptedId } });
      }
    }
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
                  {userData && userData.isOwner === false ? (
      <button onClick={handleApplyAsOwner} className="apply-button">
        Apply as Owner
      </button>
    ) : userData && userData.isOwner === true ? (
      <button onClick={handleNavigateToOwnerPage} className="visit-button">
        Visit Owner Page
      </button>
    ) : null}

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
            <label>Account Type</label>
            <p>{userData.isOwner ? 'Property Owner' : 'Regular User'}</p>
          </div>
          <div className="info-group">
            <label>Date Joined</label>
            <p>{userData.dateJoined?.toDate().toLocaleDateString() || 'Not available'}</p>
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
                <div className="social-input-group">
                  <label>Instagram</label>
                  <input
                    type="text"
                    value={editedData.socials.Instagram}
                    onChange={(e) => handleSocialChange('Instagram', e.target.value)}
                    placeholder="Enter Instagram profile URL"
                  />
                </div>
                <div className="social-input-group">
                  <label>X</label>
                  <input
                    type="text"
                    value={editedData.socials.X}
                    onChange={(e) => handleSocialChange('X', e.target.value)}
                    placeholder="Enter X profile URL"
                  />
                </div>
              </div>
            ) : (
              <>
        {userData.socials.Facebook && (
          <div className="social-item">
            <span>Facebook: </span>
            <a href={userData.socials.Facebook} target="_blank" rel="noopener noreferrer">
              {userData.socials.Facebook}
            </a>
          </div>
        )}
        {userData.socials.Instagram && (
          <div className="social-item">
            <span>Instagram: </span>
            <a href={userData.socials.Instagram} target="_blank" rel="noopener noreferrer">
              {userData.socials.Instagram}
            </a>
          </div>
        )}
        {userData.socials.X && (
          <div className="social-item">
            <span>X: </span>
            <a href={userData.socials.X} target="_blank" rel="noopener noreferrer">
              {userData.socials.X}
            </a>
          </div>
        )}
        {(!userData.socials.Facebook && !userData.socials.Instagram && !userData.socials.X) && (
          <p>No social media accounts linked</p>
        )}
      </>
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
          <h2>Contacts</h2>
          <div className="info-group">
            <label>Dashboard ID</label>
            <p>{userData.dashboardId || 'Not assigned'}</p>
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
            {itemsSaved.length > 0 ? (
              itemsSaved.map((dorm) => (
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
        
        <div className="account-section">
          <h3>Interested Dorms</h3>
          <div className="favorite-dorms-grid">
            {itemsSaved.length > 0 ? (
              itemsSaved.map((dorm) => (
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
              <p>No interested dorms</p>
            )}
          </div>
        </div>
          
        {showOwnerOverlay && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Terms and Conditions for Becoming an Owner</h3>
              <p>
                {/* Placeholder text for terms and conditions */}
                By applying as an owner, you agree to the terms and conditions set forth by our platform. 
                Please ensure you understand your responsibilities and obligations as a property owner.
              </p>
              <label>
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={() => setAgreedToTerms(!agreedToTerms)}
                />
                I agree to the terms and conditions
              </label>
              <div>
                <button
                  onClick={handleSubmitOwner}
                  disabled={!agreedToTerms} // Disable if not checked
                >
                  Submit
                </button>
                <button onClick={() => setShowOwnerOverlay(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountPage;
