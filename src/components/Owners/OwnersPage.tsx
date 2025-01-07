import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import './OwnersPage.css';
import logoSvg from '../../assets/STAY.svg';
import { deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db } from '../../firebase/config';

const OwnersPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const location = useLocation();
    const [currentUser, setCurrentUser] = useState<any>(null);
    const { normalDocumentId, encryptedDocumentId } = location.state || {}; // Accessing state
    const [ownerData, setOwnerData] = useState<any>(null);
    const [isDashboardOpen, setIsDashboardOpen] = useState(false);
    const [properties, setProperties] = useState<any[]>([]);
    const [isOwnerViewing, setIsOwnerViewing] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newReview, setNewReview] = useState({ content: '', rating: 0 });
    const [comments, setComments] = useState<any[]>([]);
    const [setReviews] = useState<any[]>([
      // Sample reviews for demonstration
      {
          id: 1,
          text: "Great place!",
          author: "User1",
          date: "January 2023", 
          avatar: "/placeholder.svg?height=56&width=56"
      }
  ]);

    const firstName = ownerData?.username ? ownerData.username.split(' ')[0] : 'Owner'; // Default to 'Owner' if username is not available

    const handleDeleteProperty = async (propertyId: string) =>{
      const confirmDelete = window.confirm("Are you sure you want to delete this property?");;
      if(!confirmDelete) return;

      try {
        const userDocRef = doc(db, 'accounts', normalDocumentId);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()){
          const userData = userDocSnap.data();
          const dashboardId = userData.dashboardId;

          const dashboardRef = doc(db, 'dashboards', dashboardId);
          const dashboardDocSnap = await getDoc(dashboardRef);

          if (dashboardDocSnap.exists()){
            const dashboardData = dashboardDocSnap.data();
            const listedDorms = dashboardData.listedDorms || [];

            const updateDorms = listedDorms.filter((dormId:string) => dormId !== propertyId);
            await updateDoc(dashboardRef, { listedDorms: updateDorms});

            const propertyDocRef = doc(db, 'properties', propertyId);
            await deleteDoc(propertyDocRef);

            alert("Property deleted successfully!");
          } else{
            console.error("Dashboard not found");
          }
        } else {
          console.error("User not found");
        }
      } catch(error){
        console.error("Error deleting property: ", error);
      }
    }
    useEffect(() => {
      const auth = getAuth();
      const unsubscribe = onAuthStateChanged(auth, (user) => {
          if (user) {
              // User is signed in
              setCurrentUser({
                  uid: user.uid,
                  displayName: user.displayName,
                  email: user.email,
                  profilePic: user.photoURL
              });
          } else {
              // User is signed out
              setCurrentUser(null);
          }
      });
  
      // Cleanup subscription on unmount
      return () => unsubscribe();
  }, []);

    useEffect(() => {
        const fetchOwnerData = async () => {
            if (normalDocumentId) {
                const docRef = doc(db, 'accounts', normalDocumentId); // Assuming 'accounts' is the collection name
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    setOwnerData(docSnap.data()); // Store the document data in state
                    fetchDahsboardData(docSnap.data().dashboardId);
                    fetchComments(docSnap.data());
                } else {
                    console.log('No such document!');
                }
            }
        };

        fetchOwnerData();
    }, [normalDocumentId]);

    const fetchComments = async (ownerData: any) => {
      const commentsData = ownerData.comments || {};
      const commentCounter = commentsData.commentCounter || 0;
      const fetchedComments = [];

      for (let i = 0; i < commentCounter; i++) {
          const commentKey = `comment${i + 1}`;
          if (commentsData[commentKey]) {
              fetchedComments.push({
                  content: commentsData[commentKey].commentContent,
                  user: commentsData[commentKey].commentUser,
                  username: commentsData[commentKey].commentUsername,
                  date: commentsData[commentKey].commentDate,
                  rating: commentsData[commentKey].commentRating,
              });
          }
      }

      setComments(fetchedComments);
  };

  const handleCommentSubmit = async () => {
    if (!currentUser) {
      console.error("User is not logged in.");
      return; // Exit if no user is logged in
  }

    const commentCounterRef = doc(db, 'accounts', normalDocumentId);
    const commentCounterSnap = await getDoc(commentCounterRef);
    const currentCounter = commentCounterSnap.exists() ? commentCounterSnap.data().comments.commentCounter : 0;

    const newCommentData = {
        commentContent: newReview.content,
        commentUser: currentUser?.uid || "Unknown User", // Replace with actual user document ID from Google Auth
        commentUsername: currentUser?.displayName || "Anonymous", // Replace with actual username from Google Auth
        commentDate: new Date().toISOString(),
        commentRating: newReview.rating,
    };

    // Update the comments field in Firestore
    await updateDoc(commentCounterRef, {
        [`comments.comment${currentCounter + 1}`]: newCommentData,
        'comments.commentCounter': currentCounter + 1,
    });

    // Update local state
    setComments(prevComments => [
      ...prevComments,
      { ...newCommentData, date: new Date(newCommentData.commentDate).toLocaleDateString() }
  ]);
    setNewReview({ content: '', rating: 0 }); // Reset the new comment state
    setIsModalOpen(false); // Close the modal
};

    const fetchDahsboardData = async (dashboardId: string) => {
      const dashboardRef = doc(db, 'dashboards', dashboardId);
      const dashboardSnap = await getDoc(dashboardRef);

      if (dashboardSnap.exists()) {
        const dashboardData = dashboardSnap.data();
        if (dashboardData?.listedDorms) {
          fetchProperties(dashboardData.listedDorms);
        }
      }else{
        console.log('No such document!');
      }
    };

    const fetchProperties = async (dormIds: string[]) => {
      const propertiesPromises = dormIds.map(id => getDoc(doc(db,
        'properties', id)));
      const propertiesDocs = await Promise.all(propertiesPromises);
      const propertiesData = propertiesDocs.map(doc => ({ id: doc.id, ...doc.data() }));    
      setProperties(propertiesData);
    };

    useEffect(() => {
      if (encryptedDocumentId && id === encryptedDocumentId) {
          alert('Owner is viewing!');
          setIsOwnerViewing(true);
      }
    }, [id, encryptedDocumentId]);

      const listings = [
        {
          id: 1,
          title: "Alto Retro NY Inspired Greenbel...",
          type: "Loft",
          rating: 4.95,
          image: "/placeholder.svg?height=200&width=300"
        },
        {
          id: 2,
          title: "2BR | 2BA Main Villa @ The...",
          type: "Villa",
          rating: 5.0,
          image: "/placeholder.svg?height=200&width=300"
        },
        {
          id: 3,
          title: "2BR | 1BA Sunset Villa @ The...",
          type: "Villa",
          rating: 5.0,
          image: "/placeholder.svg?height=200&width=300"
        }
      ];

      const handleDashboardClick = () => {
        setIsDashboardOpen(prevState => !prevState);
      };
      
  return (
    <div className="container-owner">
      <header className="header">
        <div className="header-content">
          <div className="logo-container">
            <img src={logoSvg} alt="Stayverse" className="logo" />
          </div>
          <div className="nav-buttons">

            { isOwnerViewing && (
            <button className="host-button" onClick={handleDashboardClick}>
              {isDashboardOpen ? 'Profile' : 'Dashboard'}
            </button>
            )}
            <button className="globe-button">
              <svg viewBox="0 0 16 16" className="globe-icon">
                <path d="M8 0.5C12.1421 0.5 15.5 3.85786 15.5 8C15.5 12.1421 12.1421 15.5 8 15.5C3.85786 15.5 0.5 12.1421 0.5 8C0.5 3.85786 3.85786 0.5 8 0.5ZM8 1.5C4.41015 1.5 1.5 4.41015 1.5 8C1.5 11.5899 4.41015 14.5 8 14.5C11.5899 14.5 14.5 11.5899 14.5 8C14.5 4.41015 11.5899 1.5 8 1.5Z"/>
              </svg>
            </button>
            <button className="menu-button">
              <span className="menu-icon"></span>
              <div className="profile-icon"></div>
            </button>
          </div>
        </div>
      </header>

      <main className="main-content-owner">
        <div className="profile-sidebar">
          <div className="profile-card">
            <div className="profile-image-container">
              <img 
              src={ownerData?.profilePicUrl || "/placeholder.svg?height=150&width=150"} 
              alt="Profile" 
              className="profile-image" 
              />
            </div>

            <h1 className="profile-name">{ownerData?.username}</h1>
            <p className="superhost-badge">Property Owner</p>
            
            <div className="stats-container">
              <div className="stat-item">
                <div className="stat-value">{ownerData?.followerCount}</div>
                <div className="stat-label">Followers</div>
              </div>

              <div className="stat-item">
                <div className="stat-value">{ownerData?.rating}★</div>
                <div className="stat-label">Rating</div>
              </div>

              <div className="stat-item">
                <div className="stat-value">{ownerData?.dateJoined ?
                new Date(ownerData.dateJoined.seconds * 1000).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })
                  : 'N/A'}
                  </div>
                <div className="stat-label">Date Joined</div>
              </div>
            </div>
          </div>

          <div className="info-card">
            <h2 className="info-title">{firstName}'s confirmed information</h2>
            <div className="confirmed-items">
            {ownerData ? (
              [ownerData.email || "N/A", ownerData.contactNumber || "N/A", 
                ownerData.socials.Facebook || "N/A", ownerData.socials.Instagram || "N/A", 
                ownerData.socials.X || "N/A"].map((item, index) => (
                <div key={index} className="confirmed-item">
                    <span className="check-icon">✓</span>
                    <span>{item}</span>
                </div>
              ))
            ) : (
              <p>Loading confirmed information...</p>
            )}
            </div>
          </div>

          <button className="report-button">Report this profile</button>
        </div>

        {isDashboardOpen ? (
          <div id="dashboard-section" className="dashboard-layout">
            <div className="image-section">
              <div className="add-box" onClick={() => navigate(`/owner-page/${normalDocumentId}/add-property`, { state: { normalDocumentId: normalDocumentId } })}>
                <span>+</span>
              </div>
              {properties.map(property => (
              <div key={property.id} className="image-container" onClick={() => window.open(`/property/${property.id}`, '_blank')}>
                <div className="property-info">
                  <div className="property-name">{property.propertyName}</div>
                  <div className="property-location">{property.propertyLocation}</div>
                  <div className="property-type">{property.propertyType}</div>
                  <div className="property-price">₱{(property.propertyPrice ?? property.rent ?? 0).toLocaleString()}/month</div>
                </div>
                <div className="actions">
                  <button className="edit-btn" onClick={(e) => { e. stopPropagation(); navigate(`/property/${property.id}/dashboard`); }}>View</button>
                  <button className="delete-btn" onClick={(e) => { e.stopPropagation(); handleDeleteProperty(property.id); }}>  🗑️</button>
                </div>
                <img 
                src={property.propertyPhotos && property.propertyPhotos['photo0'] ? property.propertyPhotos['photo0'].pictureUrl : "/placeholder.svg?height=150&width=150"} 
                alt={property.propertyPhotos && property.propertyPhotos['photo0'] ? property.propertyPhotos['photo0'].label : "Placeholder"} 
                className="property-image" 
              />
              </div>
              ))}
            </div>
          </div>  
        ): (
          <div className="about-section-owner">
            <h2 className="about-title">About {firstName}</h2>

          <p className="bio">
            {ownerData?.description}
          </p>

          <section className="reviews-section">
            <div className="section-header">
              <h2>{firstName}'s reviews</h2>
              <div className="navigation-buttons">
                <button className="nav-button-owner" aria-label="Previous">
                  <span className="arrow left"></span>
                </button>
                <button className="nav-button-owner" aria-label="Next">
                  <span className="arrow right"></span>
                </button>
              </div>
            </div>

            <div className="reviews-grid">
            {!isOwnerViewing && (
                                    <div className="review-card empty-review" onClick={() => setIsModalOpen(true)}>
                                        <p>Click here to leave a review!</p>
                                    </div>
                                )}
               {comments.map((comment, index) => (
                                    <div key={index} className="review-card">
                                        <p className="review-text">{comment.content}</p>
                                        <div className="review-author">
                                        <img 
    src={currentUser?.profilePic || "/placeholder.svg?height=150&width=150"} 
    alt="Profile" 
    className="profile-image" 
/>
                                            <div className="author-info">
                                                <h3>{comment.username}</h3>
                                                <p>{new Date(comment.date).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
            </div>

            <button className="show-more-button">Show more reviews</button>
          </section>

          <section className="listings-section">
            <div className="section-header">
              <h2>{firstName}'s listings</h2>
              <div className="navigation-buttons">
                <button className="nav-button-owner" aria-label="Previous">
                  <span className="arrow left"></span>
                </button>
                <button className="nav-button-owner" aria-label="Next">
                  <span className="arrow right"></span>
                </button>
              </div>
            </div>

            <div className="listings-grid">
              {listings.map(listing => (
                <div key={listing.id} className="listing-card">
                  <img src={listing.image} alt={listing.title} className="listing-image" />
                  <div className="listing-info">
                    <div className="listing-header">
                  <span className="listing-type">{listing.type}</span>
                  <span className="listing-rating">★ {listing.rating}</span>
                </div>
                <h3 className="listing-title">{listing.title}</h3>
              </div>
            </div>
              ))}
            </div>
          </section>
        </div>
        )}
      </main>

      {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Leave a Review</h3>
                        <textarea
                            value={newReview.content}
                            onChange={(e) => setNewReview({ ...newReview, content: e.target.value })}
                            placeholder="Write your review here..."
                        />
                        <div className="rating">
                            <span>Rating: </span>
                            {[1, 2, 3, 4, 5].map(star => (
                                <span
                                    key={star}
                                    onClick={() => setNewReview({ ...newReview, rating: star })}
                                    style={{ cursor: 'pointer', color: newReview.rating >= star ? 'gold' : 'gray' }}
                                >
                                    ★
                                </span>
                            ))}
                        </div>
                        <button onClick={handleCommentSubmit}>Submit</button>
                        <button onClick={() => setIsModalOpen(false)}>Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OwnersPage;