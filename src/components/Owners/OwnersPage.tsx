import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import './OwnersPage.css';
import logoSvg from '../../assets/STAY.svg';
import { deleteDoc, doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db } from '../../firebase/config';
import { supabase } from '../../supabase/supabase';

const SkeletonLoading: React.FC = () => {
  return (
    <div className="skeleton-container">
      {/* Profile Sidebar Skeleton */}
      <div className="profile-sidebar-skeleton">
        <div className="profile-card-skeleton">
          <div className="profile-image-skeleton skeleton" />
          <div className="text-skeleton name skeleton" />
          <div className="text-skeleton title skeleton" />
          <div className="stats-skeleton">
            <div className="stat-skeleton skeleton" />
            <div className="stat-skeleton skeleton" />
            <div className="stat-skeleton skeleton" />
          </div>
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="main-content-skeleton">
        <div className="about-skeleton-header skeleton" />
        <div className="about-skeleton-text skeleton" />
        
        <div className="reviews-skeleton-grid">
          <div className="review-skeleton skeleton" />
          <div className="review-skeleton skeleton" />
          <div className="review-skeleton skeleton" />
          <div className="review-skeleton skeleton" />
        </div>
      </div>
    </div>
  );
};

const OwnersPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const location = useLocation();
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [isFollowing, setIsFollowing] = useState(false);
    const [userExistingReview, setUserExistingReview] = useState<any>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const { normalDocumentId, encryptedDocumentId } = location.state || {}; // Accessing state
    const [ownerData, setOwnerData] = useState<any>(null);
    const [isDashboardOpen, setIsDashboardOpen] = useState(false);
    const [properties, setProperties] = useState<any[]>([]);
    const [isOwnerViewing, setIsOwnerViewing] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newReview, setNewReview] = useState({ content: '', rating: 0 });
    const [comments, setComments] = useState<any[]>([]);
    const [averageRating, setAverageRating] = useState<number>(0);
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
    const [isLoading, setIsLoading] = useState(true);

    const firstName = ownerData?.username ? ownerData.username.split(' ')[0] : 'Owner'; // Default to 'Owner' if username is not available

    const handleDeleteProperty = async (propertyId: string) => {
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

            const { data: files, error: listError } = await supabase.storage.from('properties').list(`${propertyId}`);
                if (listError) {
                    console.error("Error listing files:", listError);
                    alert("Error listing files: " + listError.message);
                    return;
                }

                // Prepare file paths for deletion
                const filePaths = files.map(file => `${propertyId}/${file.name}`);

                // Delete all files in the propertyId folder
                const { error } = await supabase.storage.from('properties').remove(filePaths);
                if (error) {
                    console.error("Error deleting files from Supabase:", error);
                    alert("Error deleting files from Supabase: " + error.message);
                } else {
                    alert("Property and associated folder deleted successfully!");
                }
            if (response.error) {
                console.error("Error deleting image from Supabase:", response.error);
                alert("Error deleting image from Supabase: " + response.error.message);
            } else {
                alert("Property and associated images deleted successfully!");
            }
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
              // Check if current user is following the owner
              checkIfFollowing(user.uid);
          } else {
              // User is signed out
              setCurrentUser(null);
              setIsFollowing(false);
          }
      });

      // Cleanup subscription on unmount
      return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchOwnerData = async () => {
      setIsLoading(true);
      const docRef = doc(db, 'accounts', normalDocumentId);
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const ownerData = docSnap.data();
          setOwnerData(ownerData);
          fetchComments(ownerData);
        } else {
          console.log('No such document!');
        }
        setIsLoading(false);
      });

      return () => unsubscribe();
    };

    fetchOwnerData();
  }, [normalDocumentId]);

    const fetchComments = async (ownerData: any) => {
      const commentsData = ownerData?.comments || {};
      const commentCounter = commentsData.commentCounter || 0;
      const fetchedComments = [];
      let totalRating = 0;
      let validRatingsCount = 0;

      for (let i = 0; i < commentCounter; i++) {
          const commentKey = `comment${i + 1}`;
          if (commentsData[commentKey]) {
              const commentData = {
                  content: commentsData[commentKey].commentContent,
                  user: commentsData[commentKey].commentUser,
                  username: commentsData[commentKey].commentUsername,
                  date: commentsData[commentKey].commentDate,
                  rating: commentsData[commentKey].commentRating,
                  commentKey: commentKey
              };
              
              if (currentUser && commentData.user === currentUser.uid) {
                  setUserExistingReview(commentData);
              }

              const rating = commentsData[commentKey].commentRating;
              if (typeof rating === 'number') {
                  totalRating += rating;
                  validRatingsCount++;
              }
              fetchedComments.push(commentData);
          }
      }

      const calculatedAverage = validRatingsCount > 0 ? (totalRating / validRatingsCount).toFixed(1) : 0;
      setAverageRating(Number(calculatedAverage));
      setComments(fetchedComments);
    };

    const handleDeleteReview = async () => {
        if (!currentUser || !userExistingReview) return;
        
        const confirmDelete = window.confirm("Are you sure you want to delete your review?");
        if (!confirmDelete) return;

        try {
            const docRef = doc(db, 'accounts', normalDocumentId);
            await updateDoc(docRef, {
                [`comments.${userExistingReview.commentKey}`]: null,
            });
            setUserExistingReview(null);
        } catch (error) {
            console.error("Error deleting review:", error);
            alert("Failed to delete review. Please try again.");
        }
    };

    const handleEditReview = () => {
        if (!userExistingReview) return;
        setNewReview({
            content: userExistingReview.content,
            rating: userExistingReview.rating
        });
        setIsEditMode(true);
        setIsModalOpen(true);
    };

    const handleCommentSubmit = async () => {
        if (!currentUser) {
            console.error("User is not logged in.");
            return;
        }

        const commentCounterRef = doc(db, 'accounts', normalDocumentId);
        const commentCounterSnap = await getDoc(commentCounterRef);
        const currentCounter = commentCounterSnap.exists() ? commentCounterSnap.data().comments.commentCounter : 0;

        const newCommentData = {
            commentContent: newReview.content,
            commentUser: currentUser.uid,
            commentUsername: currentUser.displayName || "Anonymous",
            commentDate: new Date().toISOString(),
            commentRating: newReview.rating,
        };

        try {
            if (isEditMode && userExistingReview) {
                // Update existing review
                await updateDoc(commentCounterRef, {
                    [`comments.${userExistingReview.commentKey}`]: newCommentData,
                });
            } else {
                // Create new review
                await updateDoc(commentCounterRef, {
                    [`comments.comment${currentCounter + 1}`]: newCommentData,
                    'comments.commentCounter': currentCounter + 1,
                });
            }
            setNewReview({ content: '', rating: 0 });
            setIsModalOpen(false);
            setIsEditMode(false);
        } catch (error) {
            console.error("Error submitting review:", error);
            alert("Failed to submit review. Please try again.");
        }
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

    const fetchProperties = async (dashboardId: string) => {
      const dashboardRef = doc(db, 'dashboards', dashboardId);
      const dashboardSnap = await getDoc(dashboardRef);
      console.log("Dashboard Id:", dashboardId);
      if (dashboardSnap.exists()) {
          const dashboardData = dashboardSnap.data();
          if (dashboardData?.listedDorms) {
              const propertiesPromises = dashboardData.listedDorms.map(id => getDoc(doc(db, 'properties', id)));
              const propertiesDocs = await Promise.all(propertiesPromises);
              const propertiesData = propertiesDocs.map(doc => ({ id: doc.id, ...doc.data() }));

              // Log the fetched properties
              console.log("Fetched Properties:", propertiesData);
              console.log("Dashboard Id:", dashboardId);

              setProperties(propertiesData);
          }
      } else {
          console.log('No such document!');
      }
  };

    useEffect(() => {
      if (encryptedDocumentId && id === encryptedDocumentId) {
          setIsOwnerViewing(true);
      }
    }, [id, encryptedDocumentId]);

      const handleDashboardClick = () => {
        setIsDashboardOpen(prevState => !prevState);
        if (!isDashboardOpen) {
          fetchProperties(ownerData.dashboardId); // Fetch properties only when opening the dashboard
      }
      };
      
  const handleModalOpen = () => {
    if (!currentUser) {
        alert("Please log in to leave a review");
        return;
    }
    if (userExistingReview) {
        alert("You already have a review. Please edit or delete your existing review first.");
        return;
    }
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (comments.length > 0 && currentUser) {
        const existingReview = comments.find(comment => comment.user === currentUser.uid);
        setUserExistingReview(existingReview || null);
    } else {
        setUserExistingReview(null);
    }
  }, [comments, currentUser]);

  const checkIfFollowing = async (userId: string) => {
    if (!normalDocumentId) return;
    
    try {
      const ownerDoc = await getDoc(doc(db, 'accounts', normalDocumentId));
      if (ownerDoc.exists()) {
        const followers = ownerDoc.data().followers || {};
        setIsFollowing(followers[userId] === true);
      }
    } catch (error) {
      console.error("Error checking follow status:", error);
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUser || !normalDocumentId) {
      alert("Please log in to follow owners");
      return;
    }

    if (currentUser.uid === normalDocumentId) {
      alert("You cannot follow yourself");
      return;
    }

    try {
      const ownerRef = doc(db, 'accounts', normalDocumentId);
      const ownerDoc = await getDoc(ownerRef);

      if (ownerDoc.exists()) {
        const currentFollowers = ownerDoc.data().followers || {};
        const currentFollowerCount = ownerDoc.data().followerCount || 0;

        if (isFollowing) {
          // Unfollow
          delete currentFollowers[currentUser.uid];
          await updateDoc(ownerRef, {
            followers: currentFollowers,
            followerCount: currentFollowerCount - 1
          });
          setIsFollowing(false);
        } else {
          // Follow
          currentFollowers[currentUser.uid] = true;
          await updateDoc(ownerRef, {
            followers: currentFollowers,
            followerCount: currentFollowerCount + 1
          });
          setIsFollowing(true);
        }
      }
    } catch (error) {
      console.error("Error updating follow status:", error);
      alert("Failed to update follow status. Please try again.");
    }
  };

  if (isLoading) {
    return <SkeletonLoading />;
  }

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
            {!isOwnerViewing && (
                <button 
                    className={`follow-button ${isFollowing ? 'following' : ''}`}
                    onClick={handleFollowToggle}
                >
                    {isFollowing ? 'Following' : 'Follow'}
                </button>
            )}
            <div className="stats-container">
              <div className="stat-item">
                <div className="stat-value">{ownerData?.followerCount}</div>
                <div className="stat-label">Followers</div>
              </div>

              <div className="stat-item">
                <div className="stat-value">{averageRating}★</div>
                <div className="stat-label">Rating</div>
              </div>

              <div className="stat-item">
                <div className="stat-value">{ownerData?.dateJoined ? 
                new Date(ownerData.dateJoined.seconds * 1000).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })
                  : 'N/A'}</div>
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
            <div className="dashboard-header">
              <h2 className="dashboard-title">Listed Property</h2>
              <button className="add-listing-button" onClick={() => navigate(`/owner-page/${normalDocumentId}/add-property`, { state: { normalDocumentId: normalDocumentId } })}>
                + Add New Listing
              </button>
            </div>
            <div className="image-section">
              {properties.map(property => (
              <div 
                key={property.id} 
                className="owner-dashboard-image-container" 
                onClick={() => window.open(`/property/${property.id}`, '_blank')}
              >
                <div className="owner-dashboard-property-info">
                  <div className="owner-dashboard-property-name">{property.propertyName}</div>
                  <div className="owner-dashboard-property-location">{property.propertyLocation}</div>
                  <div className="owner-dashboard-property-type">{property.propertyType}</div>
                  <div className="owner-dashboard-property-price">₱{(property.propertyPrice ?? property.rent ?? 0).toLocaleString()}/month</div>
                </div>
                <div className="owner-dashboard-actions">
                  <button className="edit-btn" onClick={(e) => { e.stopPropagation(); navigate(`/property/${property.id}/${normalDocumentId}/view-property`); }}>View</button>
                  <button className="delete-btn" onClick={(e) => { e.stopPropagation(); handleDeleteProperty(property.id); }}>🗑️</button>
                </div>
                <img 
                  src={property.propertyPhotos && property.propertyPhotos['photo0'] ? property.propertyPhotos['photo0'].pictureUrl : "/placeholder.svg?height=150&width=150"} 
                  alt={property.propertyPhotos && property.propertyPhotos['photo0'] ? property.propertyPhotos['photo0'].label : "Placeholder"} 
                  className="owner-dashboard-property-image" 
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
            <div className="reviews-header">
              <h2>{firstName}'s Reviews</h2>
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
              {!isOwnerViewing && !userExistingReview && (
                <div className="review-card empty-review" onClick={handleModalOpen}>
                  <p>Click here to leave a review!</p>
                </div>
              )}
              {comments.map((comment, index) => (
                <div key={index} className="review-card">
                  <p className="review-text">{comment.content}</p>
                  <div className="review-rating">
                    <span>Rating:</span>
                    <span>
                      {[...Array(5)].map((_, index) => (
                        <span key={index} className="star" style={{ color: index < comment.rating ? '#ffcc00' : '#ddd' }}>
                          ★
                        </span>
                      ))}
                    </span>
                  </div>
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
                  {currentUser && comment.user === currentUser.uid && (
                    <div className="review-actions">
                      <button onClick={() => handleEditReview()}>Edit</button>
                      <button onClick={() => handleDeleteReview()}>Delete</button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button className="show-more-button">Show more reviews</button>
          </section>
        </div>
        )}
      </main>

      {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>{isEditMode ? 'Edit Review' : 'Leave a Review'}</h3>
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