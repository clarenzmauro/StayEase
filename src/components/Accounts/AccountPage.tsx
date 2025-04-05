import { useState, useEffect } from 'react';
import { auth, db } from '../../firebase/config';
import { collection, doc, getDoc, updateDoc, addDoc } from 'firebase/firestore';
import { useNavigate, useParams } from 'react-router-dom';
import './AccountPage.css';
import { User } from 'firebase/auth';
import { DocumentData } from 'firebase/firestore';
import { API_URL } from '../../config';

interface PropertyType {
  id: string;
  propertyName: string;
  propertyLocation: string;
  propertyPrice: number;
  propertyType: string;
  propertyTags: string[];
  owner?: string;
  datePosted?: {
    toMillis: () => number;
  };
  viewCount?: number;
  interestedCount?: number;
  propertyPhotos?: { [key: string]: { pictureUrl: string } } | string[];
  applicationStatus?: 'pending' | 'accepted' | 'denied';
  appliedAt?: number;
  [key: string]: any;
}

const AccountPage = () => {
  const { userId } = useParams(); // Get userId from URL
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<DocumentData | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState<DocumentData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [itemsSaved, setFavoriteDorms] = useState<PropertyType[]>([]);
  const [itemsInterested, setInterestedDorms] = useState<PropertyType[]>([]);
  const [showOwnerOverlay, setShowOwnerOverlay] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false); // New dropdown state
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const targetUserId = userId || auth.currentUser?.uid;
        
        if (!targetUserId) {
          console.error('No user ID available');
          navigate('/');
          return;
        }

        const accountDoc = await getDoc(doc(db, 'accounts', targetUserId));
        if (accountDoc.exists()) {
          const data = accountDoc.data();
          setUserData(data);
          setEditedData(data);

          // Only set these if viewing own profile
          if (!userId || userId === auth.currentUser?.uid) {
            if (data.itemsSaved && data.itemsSaved.length > 0) {
              // Fetch full property data for each saved item
              const savedPropertiesPromises = data.itemsSaved.map(async (propertyId: string) => {
                const propertyDoc = await getDoc(doc(db, 'properties', propertyId));
                if (propertyDoc.exists()) {
                  return { id: propertyDoc.id, ...propertyDoc.data() } as PropertyType;
                }
                return null;
              });
              
              const savedProperties = await Promise.all(savedPropertiesPromises);
              setFavoriteDorms(savedProperties.filter((prop): prop is PropertyType => prop !== null));
            }
            if (data.itemsInterested && data.itemsInterested.length > 0) {
              // Fetch full property data for each interested item
              const interestedPropertiesPromises = data.itemsInterested.map(async (propertyId: string) => {
                const propertyDoc = await getDoc(doc(db, 'properties', propertyId));
                if (propertyDoc.exists()) {
                  return { id: propertyDoc.id, ...propertyDoc.data() } as PropertyType;
                }
                return null;
              });
              
              const interestedProperties = await Promise.all(interestedPropertiesPromises);
              setInterestedDorms(interestedProperties.filter((prop): prop is PropertyType => prop !== null));
            }
          }
        } else {
          console.error('User document not found');
          navigate('/');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    // Set current user for auth state
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      fetchUserData();
    });

    return () => unsubscribe();
  }, [userId, navigate]); // Re-run when userId changes

  // Only show edit controls if viewing own profile
  const isOwnProfile = !userId || userId === auth.currentUser?.uid;

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
    if (!user) {
      console.error("User is not logged in.");
      return;
    }
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
    if (!user) {
      console.error('User is not logged in.');
      return;
    }

    if (!editedData) {
      console.error('Edited data is null.');
      return;
    }

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

  const handleChange = (field: any, value: any) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSocialChange = (platform: any, value: any) => {
    setEditedData(prev => ({
      ...prev,
      socials: {
        ...(prev?.socials || {}),
        [platform]: value,
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

  const getImageUrl = (property: PropertyType, index: number = 0) => {
    if (!property.propertyPhotos) return '';

    // Handle MongoDB-style photos (array of strings)
    if (Array.isArray(property.propertyPhotos)) {
      const photoId = property.propertyPhotos[index];
      return `${API_URL}/api/property-photos/${photoId}/image`;
    }

    // Handle Firebase-style photos (object with pictureUrl)
    const photoKeys = Object.keys(property.propertyPhotos).filter(key => key.startsWith('photo'));
    const photoKey = photoKeys[index];
    return property.propertyPhotos[photoKey]?.pictureUrl || '';
  };

  const handleLogoClick = () => {
    navigate('/');
  };

  const renderTooltip = (text: string) => (
    <span className="tooltip-text">{text}</span>
  );

  if (!user || !userData || !editedData) {
    return (
      <div className="account-page">
        <div className="skeleton-navbar">
          <div className="skeleton-logo skeleton"></div>
          <div className="skeleton-buttons">
            <div className="skeleton-button skeleton"></div>
            <div className="skeleton-button skeleton"></div>
          </div>
        </div>
        <div className="skeleton-container">
          <div className="skeleton-header">
            <div className="skeleton-title skeleton"></div>
            <div className="skeleton-buttons">
              <div className="skeleton-button skeleton"></div>
              <div className="skeleton-button skeleton"></div>
            </div>
          </div>

          <div className="skeleton-section">
            <div className="skeleton-profile">
              <div className="skeleton-image skeleton"></div>
              <div className="skeleton-info">
                <div className="skeleton-field skeleton long"></div>
                <div className="skeleton-field skeleton medium"></div>
                <div className="skeleton-field skeleton long"></div>
                <div className="skeleton-field skeleton short"></div>
                <div className="skeleton-field skeleton medium"></div>
              </div>
            </div>
          </div>

          <div className="skeleton-section">
            <div className="skeleton-section-header skeleton"></div>
            <div className="skeleton-info">
              <div className="skeleton-field skeleton long"></div>
              <div className="skeleton-field skeleton medium"></div>
              <div className="skeleton-field skeleton short"></div>
            </div>
          </div>

          <div className="skeleton-section">
            <div className="skeleton-section-header skeleton"></div>
            <div className="skeleton-grid">
              {[1, 2, 3].map((index) => (
                <div key={index} className="skeleton-card">
                  <div className="skeleton-card-image skeleton"></div>
                  <div className="skeleton-card-content">
                    <div className="skeleton-card-title skeleton"></div>
                    <div className="skeleton-card-text skeleton"></div>
                    <div className="skeleton-card-text skeleton"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="account-page">
      <nav className="navbar">
        <div className="navbar-logo" onClick={handleLogoClick}>
          <img src="/src/assets/STAY.svg" alt="StayEase Logo" />
        </div>
        <div className="navbar-buttons">
          {isOwnProfile && (
            <>
              {editMode ? (
                <>
                  <div className="tooltip-container">
                    <button 
                      onClick={handleSave} 
                      className="save-button"
                      disabled={isSaving}
                    >
                      <img src="/src/assets/save.png" alt="Save" className="button-icon" />
                    </button>
                    {renderTooltip('Save Changes')}
                  </div>
                  <div className="tooltip-container">
                    <button 
                      onClick={handleCancel} 
                      className="cancel-button"
                    >
                      <img src="/src/assets/cancel.png" alt="Cancel" className="button-icon" />
                    </button>
                    {renderTooltip('Cancel')}
                  </div>
                </>
              ) : (
                <>
                  {/* Show the separate Visit/Apply button outside the dropdown */}
                  {!editMode && (
                    <>
                      {userData &&
                        (userData.isOwner ? (
                          <div className="tooltip-container">
                            <button onClick={handleNavigateToOwnerPage} className="visit-button">
                              <img src="/src/assets/owners.png" alt="Visit Owner Page" className="button-icon" />
                            </button>
                            <span className="tooltip-text">Visit Owner Page</span>
                          </div>
                        ) : (
                          <div className="tooltip-container">
                            <button onClick={handleApplyAsOwner} className="apply-button">
                              <img src="/src/assets/apply.png" alt="Apply as Owner" className="button-icon" />
                            </button>
                            <span className="tooltip-text">Apply as Owner</span>
                          </div>
                        ))}
                      {/* Burger dropdown for Edit Profile and Logout only */}
                      <div 
                        className="menu-button" 
                        onClick={() => setShowAccountMenu(!showAccountMenu)}
                      >
                        <div className="menu-icon">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      </div>
                      {showAccountMenu && (
                        <div className="menu-dropdown">
                          <button onClick={handleEdit}>Edit Profile</button>
                          <button onClick={handleLogout}>Logout</button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </nav>
      <div className="account-container">
        <div className="profile-header">
          <div className="profile-title">
            <h1>Account Details</h1>
          </div>
        </div>

        <div className="account-section">
          <h2>Profile Information</h2>
          <div className="profile-info-container">
            <div className="profile-image-section">
              <div className="profile-image-container">
                {user && user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt="Profile" 
                    className="profile-image"
                  />
                ) : (
                  <div className="profile-image-placeholder">
                    {userData && userData.username[0].toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            
            <div className="profile-details-section">
              <div className="info-group">
                <label>Username</label>
                {isOwnProfile && editMode ? (
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
                {isOwnProfile && editMode ? (
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
          </div>
        </div>

        <div className="account-section">
          <h2>Social Media</h2>
          <div className="socials-list">
            {isOwnProfile && editMode ? (
              <div className="social-edit">
                {Object.entries(editedData.socials || {}).map(([platform, url]) => (
                  <div key={`social-edit-${platform}`} className="social-input-group">
                    <label>{platform}</label>
                    <input
                      type="text"
                      value={url as string}
                      onChange={(e) => handleSocialChange(platform, e.target.value)}
                      placeholder={`Enter your ${platform} URL`}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <>
                {Object.entries(userData?.socials || {}).map(([platform, url]) => (
                  url && (
                    <div key={`social-view-${platform}`} className="social-item">
                      <span className="social-platform">{platform}</span>
                      <a href={url as string} target="_blank" rel="noopener noreferrer">
                        {url as string}
                      </a>
                    </div>
                  )
                ))}
                {(!userData?.socials?.Facebook && !userData?.socials?.Instagram && !userData?.socials?.X) && (
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
                {userData.comments.map((comment: string, index: number) => (
                  <div key={`comment-${index}-${comment.substring(0, 10)}`} className="comment-item">
                    <p>{comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {isOwnProfile && (
          <div className="account-section">
            <h3>Favorite Dorms</h3>
            <div className="favorite-dorms-grid">
              {itemsSaved.length > 0 ? (
                itemsSaved.map((dorm:any) => (
                  <div key={dorm.id} className="favorite-dorm-card" onClick={() => navigate(`/property/${dorm.id}`)}>
                    <img 
                      src={getImageUrl(dorm, 0)} 
                      alt={dorm.propertyName} 
                      className="favorite-dorm-image"
                    />
                    <div className="favorite-dorm-info">
                      <h4 key={`${dorm.id}-name`}>{dorm.propertyName}</h4>
                      <p key={`${dorm.id}-location`}>{dorm.propertyLocation}</p>
                      <p key={`${dorm.id}-type`}>{dorm.propertyType}</p>
                      <p key={`${dorm.id}-rent`}>₱{dorm.propertyPrice}/month</p>
                    </div>
                  </div>
                ))
              ) : (
                <p>No favorite dorms yet</p>
              )}
            </div>
          </div>
        )}
        
        {isOwnProfile && (
          <div className="account-section">
            <h3>Interested Dorms</h3>
            <div className="favorite-dorms-grid">
              {itemsInterested.length > 0 ? (
                itemsInterested.map((dorm:any) => (
                  <div key={dorm.id} className="favorite-dorm-card" onClick={() => navigate(`/property/${dorm.id}`)}>
                    <img 
                      src={getImageUrl(dorm, 0)} 
                      alt={dorm.propertyName} 
                      className="favorite-dorm-image"
                    />
                    <div className="favorite-dorm-info">
                      <h4 key={`${dorm.id}-name`}>{dorm.propertyName}</h4>
                      <p key={`${dorm.id}-location`}>{dorm.propertyLocation}</p>
                      <p key={`${dorm.id}-type`}>{dorm.propertyType}</p>
                      <p key={`${dorm.id}-rent`}>₱{dorm.propertyPrice}/month</p>
                      <div className={`application-status ${dorm.applicationStatus || 'pending'}`}>
                        {dorm.applicationStatus ? dorm.applicationStatus.charAt(0).toUpperCase() + dorm.applicationStatus.slice(1) : 'Pending'}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p>No interested dorms</p>
              )}
            </div>
          </div>
        )}
          
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
