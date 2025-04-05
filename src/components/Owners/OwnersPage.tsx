import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import './OwnersPage.css';
import logoSvg from '../../assets/STAY.svg';
import placeholderHouse from '../../assets/ImagePlaceholder.png';
import { 
  deleteDoc, 
  doc, 
  getDoc, 
  getDocs,
  updateDoc, 
  onSnapshot, 
  arrayUnion, 
  runTransaction,
  collection
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db } from '../../firebase/config';
import { API_URL } from '../../config';
import emailLogo from '../../assets/email-logo.png';
import contactLogo from '../../assets/contact-logo.png';
import facebookLogo from '../../assets/facebook-logo.png';
import instagramLogo from '../../assets/instagram-logo.png';
import xLogo from '../../assets/x-logo.png';
import dateJoinedLogo from '../../assets/date-joined.png';

const SkeletonLoading: React.FC = (): JSX.Element => {
  return (
    <div className="skeleton-container">
      {/* Skeleton Navbar */}
      <div className="skeleton-navbar">
        <div className="skeleton-logo skeleton"></div>
        <div className="skeleton-buttons">
          <div className="skeleton-button skeleton"></div>
          <div className="skeleton-button skeleton"></div>
        </div>
      </div>
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

interface PropertyType {
  id: string;
  propertyName: string;
  propertyLocation: string;
  propertyPrice: number;
  propertyType: string;
  propertyTags: string[];
  owner?: string;
  datePosted?: { toMillis: () => number };
  viewCount?: number;
  interestedCount?: number;
  propertyPhotos?: { [key: string]: { pictureUrl: string } } | string[];
  isDisabled?: boolean;
  pictureUrl?: string;
}

interface OwnerData {
  comments?: {
    commentCounter?: number;
    [key: string]: any;
  };
  username?: string;
  profilePicUrl?: string;
  email?: string;
  contactNumber?: string;
  socials?: {
    Facebook?: string;
    Instagram?: string;
    X?: string;
  };
  dateJoined?: TimestampType;
  description?: string;
  dashboardId?: string;
  notifications?: any[];
  followerCount?: number;
  followers?: { [key: string]: boolean };
}

interface Notification {
  id: string;
  message: string;
  timestamp: number;
  read: boolean;
  type: string;
  propertyName: string;
  userName: string;
}

interface TimestampType {
  seconds: number;
  nanoseconds: number;
}

const OwnersPage: React.FC = (): JSX.Element => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { normalDocumentId, encryptedDocumentId } = location.state || {};

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [userExistingReview, setUserExistingReview] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [ownerData, setOwnerData] = useState<OwnerData | null>(null);
  const [isDashboardOpen, setIsDashboardOpen] = useState(true);
  const [properties, setProperties] = useState<any[]>([]);
  const [isOwnerViewing, setIsOwnerViewing] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [newReview, setNewReview] = useState({ content: '', rating: 0 });
  const [comments, setComments] = useState<any[]>([]);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // New state for notifications and overlay
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // New state for menu dropdown
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);

  const firstName = ownerData?.username ? ownerData.username.split(' ')[0] : 'Owner';

  // Toggle property disabled state
  const handleToggleDisabled = async (propertyId: string, currentState: boolean) => {
    try {
      const propertyRef = doc(db, 'properties', propertyId);
      await updateDoc(propertyRef, {
        isDisabled: !currentState
      });
    } catch (error) {
      console.error("Error toggling property state:", error);
      alert("Error updating property status. Please try again.");
    }
  };

  // Delete Property Function
  const handleDeleteProperty = async (propertyId: string) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this property?");
    if (!confirmDelete) return;

    try {
      // First get the property document to access propertyPhotos array
      const propertyDocRef = doc(db, 'properties', propertyId);
      const propertyDocSnap = await getDoc(propertyDocRef);

      if (!propertyDocSnap.exists()) {
        console.error("Property not found");
        return;
      }

      const propertyData = propertyDocSnap.data();
      const photoIds = propertyData.propertyPhotos || [];

      // Delete all associated photos from MongoDB if there are any
      if (photoIds.length > 0) {
        try {
          const response = await fetch(`${API_URL}/api/property-photos/bulk-delete`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ photoIds }),
          });

          if (!response.ok) {
            throw new Error('Failed to delete photos');
          }
        } catch (error) {
          console.error("Error deleting photos:", error);
          alert("Error deleting photos. Please try again.");
          return;
        }
      }

      // Remove property from all users' favorites and interests
      const accountsRef = collection(db, 'accounts');
      const accountsSnapshot = await getDocs(accountsRef);
      
      const updatePromises = accountsSnapshot.docs.map(async (accountDoc) => {
        const accountData = accountDoc.data();
        let needsUpdate = false;
        
        // Check and update favorites
        if (accountData.itemsSaved?.includes(propertyId)) {
          accountData.itemsSaved = accountData.itemsSaved.filter((id: string) => id !== propertyId);
          needsUpdate = true;
        }
        
        // Check and update interests
        if (accountData.itemsInterested?.includes(propertyId)) {
          accountData.itemsInterested = accountData.itemsInterested.filter((id: string) => id !== propertyId);
          needsUpdate = true;
        }
        
        // Only update if changes were made
        if (needsUpdate) {
          return updateDoc(doc(db, 'accounts', accountDoc.id), {
            itemsSaved: accountData.itemsSaved || [],
            itemsInterested: accountData.itemsInterested || []
          });
        }
      });

      // Wait for all user updates to complete
      await Promise.all(updatePromises.filter(Boolean));

      // Now proceed with deleting the property from Firebase
      const userDocRef = doc(db, 'accounts', normalDocumentId);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const dashboardId = userData.dashboardId;

        const dashboardRef = doc(db, 'dashboards', dashboardId);
        const dashboardDocSnap = await getDoc(dashboardRef);

        if (dashboardDocSnap.exists()) {
          const dashboardData = dashboardDocSnap.data();
          const listedDorms = dashboardData.listedDorms || [];

          const updateDorms = listedDorms.filter((dormId: string) => dormId !== propertyId);
          await updateDoc(dashboardRef, { listedDorms: updateDorms });

          // Delete the property document
          await deleteDoc(propertyDocRef);
          alert("Property deleted successfully!");
        } else {
          console.error("Dashboard not found");
        }
      } else {
        console.error("User not found");
      }
    } catch (error) {
      console.error("Error deleting property: ", error);
      alert("Error deleting property. Please try again.");
    }
  };

  // Fetch comments & Calculate Average rating
  const fetchComments = async (ownerData: OwnerData) => {
    const commentsData = ownerData?.comments || {};
    const commentCounter = commentsData.commentCounter || 0;
    let totalRating = 0;
    let validRatingsCount = 0;
  
    const fetchedComments = await Promise.all(
      Array.from({ length: commentCounter }, async (_, i) => {
        const commentKey = `comment${i + 1}`;
        if (!commentsData[commentKey]) return null;
  
        const commentData = {
          content: commentsData[commentKey].commentContent,
          user: commentsData[commentKey].commentUser,
          username: commentsData[commentKey].commentUsername,
          date: commentsData[commentKey].commentDate,
          rating: commentsData[commentKey].commentRating,
          commentKey: commentKey,
          pictureUrl: "/placeholder.svg?height=150&width=150", // Default placeholder
        };
  
        if (currentUser && commentData.user === currentUser.uid) {
          setUserExistingReview(commentData);
        }
  
        const rating = commentsData[commentKey].commentRating;
        if (typeof rating === "number") {
          totalRating += rating;
          validRatingsCount++;
        }
  
        // Fetch the profile picture for each user
        try {
          const pictureUrl = await fetchUserProfilePicture(commentData.user);
          return { ...commentData, pictureUrl }; // Return updated commentData
        } catch (error) {
          console.error(`Error fetching profile picture for user ${commentData.user}:`, error);
          return commentData; // Return without pictureUrl if error
        }
      })
    );
  
    // Filter out null values
    const validComments = fetchedComments.filter((comment) => comment !== null);
  
    const calculatedAverage = validRatingsCount > 0 ? (totalRating / validRatingsCount).toFixed(1) : 0;
    setAverageRating(Number(calculatedAverage));
    setComments(validComments);
  };
  
  

  const fetchUserProfilePicture = async (userId: string) => {
    if (!userId) return "/placeholder.svg?height=150&width=150";
  
    try {
      const userDoc = await getDoc(doc(db, "accounts", userId));
      if (userDoc.exists()) {
        return userDoc.data().profilePicUrl || "/placeholder.svg?height=150&width=150";
      }
    } catch (error) {
      console.error(`Error fetching profile picture for user ${userId}:`, error);
    }
  
    return "/placeholder.svg?height=150&width=150"; // Default placeholder
  };
  
  // Delete & Edit Review Functions
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
    setIsReviewModalOpen(true);
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
      setIsReviewModalOpen(false);
      setIsEditMode(false);
    } catch (error) {
      console.error("Error submitting review:", error);
      alert("Failed to submit review. Please try again.");
    }
  };

  // Auth and Owner Data Listener
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

    // Cleanup on unmount
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
          // Update notifications from owner document
          setNotifications(ownerData.notifications || []);
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

  useEffect(() => {
    if (encryptedDocumentId && id === encryptedDocumentId) {
      setIsOwnerViewing(true);
    }
  }, [id, encryptedDocumentId]);

  useEffect(() => {
    if (!ownerData?.dashboardId) return;

    // Set up real-time listener for the dashboard document
    const dashboardRef = doc(db, 'dashboards', ownerData.dashboardId);
    let propertyUnsubscribes: (() => void)[] = [];

    // Listen to dashboard changes
    const dashboardUnsubscribe = onSnapshot(dashboardRef, (dashboardSnap) => {
      if (dashboardSnap.exists()) {
        const dashboardData = dashboardSnap.data();
        const listedDorms = dashboardData.listedDorms || [];

        // Clean up any existing property listeners
        propertyUnsubscribes.forEach(unsubscribe => unsubscribe());
        propertyUnsubscribes = [];

        // First, update properties state to match listedDorms
        setProperties(prevProperties => {
          // Keep only properties that are still in listedDorms
          const updatedProperties = prevProperties.filter(prop => 
            listedDorms.includes(prop.id)
          );
          return updatedProperties;
        });

        // Set up listeners for each property
        listedDorms.forEach((propertyId: string) => {
          const propertyRef = doc(db, 'properties', propertyId);
          const unsubscribe = onSnapshot(propertyRef, (propertySnap) => {
            if (propertySnap.exists()) {
              const propertyData = propertySnap.data();
              setProperties(prevProperties => {
                const otherProperties = prevProperties.filter(p => p.id !== propertyId);
                return [...otherProperties, { id: propertyId, ...propertyData }];
              });
            } else {
              // If property doesn't exist anymore, update the dashboard
              const currentListedDorms = dashboardData.listedDorms || [];
              const updatedDorms = currentListedDorms.filter((id: string) => id !== propertyId);
              updateDoc(dashboardRef, { listedDorms: updatedDorms }).catch(error => {
                console.error("Error updating dashboard after property deletion:", error);
              });
            }
          }, (error) => {
            console.error("Error listening to property:", error);
          });
          
          propertyUnsubscribes.push(unsubscribe);
        });
      }
    }, (error) => {
      console.error("Error listening to dashboard:", error);
    });

    // Cleanup function
    return () => {
      dashboardUnsubscribe();
      propertyUnsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [ownerData?.dashboardId]);

  const handleDashboardClick = () => {
    setIsDashboardOpen(prevState => !prevState);
  };

  // Follow & Notification Functions
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

  const addNotification = (message: string, type: string = 'info', propertyName: string = '', userName: string = '') => {
    const newNotification: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message,
      timestamp: Date.now(),
      read: false,
      type,
      propertyName,
      userName
    };
    setNotifications(prev => [newNotification, ...prev]);
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
      
      // Use a transaction to ensure atomic updates
      await runTransaction(db, async (transaction) => {
        const ownerDoc = await transaction.get(ownerRef);
        
        if (!ownerDoc.exists()) {
          throw new Error("Owner document does not exist!");
        }

        const data = ownerDoc.data();
        const currentFollowers = data.followers || {};
        let newFollowerCount = (data.followerCount || 0);

        if (isFollowing) {
          // Unfollow logic
          if (currentFollowers[currentUser.uid]) {
            delete currentFollowers[currentUser.uid];
            newFollowerCount = Math.max(0, newFollowerCount - 1); // Ensure count never goes below 0
          }

          transaction.update(ownerRef, {
            followers: currentFollowers,
            followerCount: newFollowerCount
          });

          setIsFollowing(false);
        } else {
          // Follow logic
          if (!currentFollowers[currentUser.uid]) {
            currentFollowers[currentUser.uid] = true;
            newFollowerCount += 1;

            const newNotification = {
              id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              type: 'follow',
              message: `${currentUser.displayName || 'Someone'} followed you.`,
              timestamp: Date.now(),
              read: false,
              propertyName: '',
              userName: currentUser.displayName || 'Anonymous'
            };

            transaction.update(ownerRef, {
              followers: currentFollowers,
              followerCount: newFollowerCount,
              notifications: arrayUnion(newNotification)
            }); 

            setIsFollowing(true);
            addNotification(`You are now following ${ownerData?.username || 'this owner'}!`);
          }
        }
      });
    } catch (error) {
      console.error("Error updating follow status:", error);
      alert("Failed to update follow status. Please try again.");
    }
  };

  // Function to mark notifications as read
  const markNotificationsAsRead = async () => {
    if (!normalDocumentId) return;
    
    try {
      const userRef = doc(db, 'accounts', normalDocumentId);
      await updateDoc(userRef, {
        'notifications': notifications.map(notif => ({
          ...notif,
          read: true
        }))
      });
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  // Function to clear all notifications
  const clearAllNotifications = async () => {
    if (!normalDocumentId) return;
    
    try {
      const userRef = doc(db, 'accounts', normalDocumentId);
      await updateDoc(userRef, {
        'notifications': []
      });
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  // Update unread count when notifications change
  useEffect(() => {
    const unreadNotifications = notifications.filter(notif => !notif.read);
    setUnreadCount(unreadNotifications.length);
  }, [notifications]);

  const NotificationBell = () => (
    <div 
      className="notification-icon" 
      onClick={() => {
        setShowNotifications(!showNotifications);
        if (!showNotifications) {
          markNotificationsAsRead();
        }
      }}
    >
      🔔
      {unreadCount > 0 && (
        <span className="notification-badge">{unreadCount}</span>
      )}
    </div>
  );

  const NotificationDropdown = () => {
    const navigate = useNavigate();

    const handleNotificationClick = async (notification: any) => {
      // Mark notification as read
      if (!notification.read && normalDocumentId) {
        const ownerRef = doc(db, 'accounts', normalDocumentId);
        try {
          const updatedNotifications = notifications.map(n => 
            n.id === notification.id ? { ...n, read: true } : n
          );
          
          await updateDoc(ownerRef, {
            notifications: updatedNotifications
          });
          
          setNotifications(updatedNotifications);
        } catch (error) {
          console.error("Error marking notification as read:", error);
        }
      }

      // Navigate based on notification type
      if (notification.type === 'interested' && notification.propertyId) {
        navigate(`/property/${notification.propertyId}`);
      } else if (notification.type === 'follow' && notification.userId) {
        navigate(`/account/${notification.userId}`);
      }
    };

    // Sort notifications by timestamp in descending order (newest first)
    const sortedNotifications = [...notifications].sort((a, b) => {
      const timeA = a.timestamp || 0;
      const timeB = b.timestamp || 0;
      return timeB - timeA;
    });

    if (!showNotifications) return null;

    return (
      <div className="notifications-dropdown">
        <div className="notifications-header">
          <h3>Notifications</h3>
          {notifications.length > 0 && (
            <button 
              className="clear-notifications"
              onClick={clearAllNotifications}
            >
              Clear all
            </button>
          )}
        </div>
        <div className="notifications-list">
          {sortedNotifications.length === 0 ? (
            <div key="no-notifications" className="no-notifications">
              No notifications
            </div>
          ) : (
            sortedNotifications.map((notification, index) => (
              <div 
                key={notification.id || `notification-${index}-${Date.now()}`}
                className={`notification-item ${!notification.read ? 'unread' : ''}`}
                onClick={() => handleNotificationClick(notification)}
                style={{ cursor: 'pointer' }}
              >
                <p>{notification.message}</p>
                {notification.type === 'interested' && (
                  <small className="notification-property">
                    Property: {notification.propertyName}
                  </small>
                )}
                {notification.type === 'follow' && (
                  <small className="notification-property">
                    User: {notification.userName}
                  </small>
                )}
                <small className="notification-time">
                  {notification.timestamp ? new Date(notification.timestamp).toLocaleString() : ''}
                </small>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // ------------------------------
  // EXPRESS INTEREST FUNCTION (for non-owners)
  // ------------------------------
  // const handleExpressInterest = async () => {
  //   if (!currentUser || !normalDocumentId) {
  //     alert("Please log in to express interest");
  //     return;
  //   }
  //   try {
  //     const ownerRef = doc(db, 'accounts', normalDocumentId);
  //     const newNotification = {
  //       type: 'interest',
  //       message: `${currentUser.displayName || 'Someone'} is interested in your property.`,
  //       date: new Date().toISOString(),
  //       read: false,
  //     };
  //     await updateDoc(ownerRef, {
  //       notifications: arrayUnion(newNotification)
  //     });
  //     alert("Your interest has been sent!");
  //   } catch (error) {
  //     console.error("Error expressing interest:", error);
  //     alert("Failed to express interest. Please try again.");
  //   }
  // };

  // ------------------------------
  // GET PROPERTY IMAGE URL
  // ------------------------------
  const getImageUrl = (property: PropertyType, index = 0): string => {
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

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleLogoClick = () => {
    navigate('/');
  };

  const formatDate = (timestamp: TimestampType | undefined) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  if (isLoading) {
    return <SkeletonLoading />;
  }

  return (
    <div className="container-owner">
      <header className="header">
        <div className="header-content">
          <div className="logo-container" onClick={handleLogoClick}>
            <img src={logoSvg} alt="Stayverse" className="logo" />
          </div>
          <div className="nav-buttons">
            {isOwnerViewing && <NotificationBell />}
            <div className="menu-button" onClick={() => setShowMenuDropdown(!showMenuDropdown)}>
              <div className="menu-icon">
                <span></span>
                <span></span>
                <span></span>
              </div>
              {showMenuDropdown && (
                <div className="menu-dropdown">
                  {isOwnerViewing && (
                    <button onClick={handleDashboardClick}>
                      {isDashboardOpen ? 'View Profile' : 'View Dashboard'}
                    </button>
                  )}
                  <button onClick={handleLogout}>Logout</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Notification overlay */}
      <NotificationDropdown />

      <main className="main-content-owner">
        <div className={`profile-sidebar ${isDashboardOpen ? 'dashboard-open' : ''}`}>
          <div className="profile-card">
            <div className="profile-image-container">
              <img 
                src={ownerData?.profilePicUrl || "/placeholder.svg?height=150&width=150"} 
                alt="Profile" 
                className="profile-image" 
              />
            </div>
            <h1 className="profile-name">{ownerData?.username}</h1>
            <p className="superhost-badge">Property Owner</p> {/* Move this under the name */}
            {/* Moved follow button here */}
            {!isOwnerViewing && (
              <>
                <button 
                  className={`follow-button ${isFollowing ? 'following' : ''}`}
                  onClick={handleFollowToggle}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
                {/* Express Interest button for non-owners
                <button className="interest-button" onClick={handleExpressInterest}>
                  I'm interested in your property
                </button> */}
              </>
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
            </div>
          </div>
          <div className={`info-card ${isDashboardOpen ? 'hidden' : ''}`}>
            <h2 className="info-title">{firstName}'s confirmed information</h2>
            <div className="confirmed-items">
              {ownerData ? (
                <>
                  <div className="confirmed-item">
                    <img src={emailLogo} alt="Email" className="info-icon" />
                    <span>{ownerData.email || "N/A"}</span>
                  </div>
                  <div className="confirmed-item">
                    <img src={contactLogo} alt="Contact" className="info-icon" />
                    <span>{ownerData.contactNumber || "N/A"}</span>
                  </div>
                  <div className="confirmed-item">
                    <img src={facebookLogo} alt="Facebook" className="info-icon" />
                    <span>{ownerData.socials?.Facebook || "N/A"}</span>
                  </div>
                  <div className="confirmed-item">
                    <img src={instagramLogo} alt="Instagram" className="info-icon" />
                    <span>{ownerData.socials?.Instagram || "N/A"}</span>
                  </div>
                  <div className="confirmed-item">
                    <img src={xLogo} alt="X" className="info-icon" />
                    <span>{ownerData.socials?.X || "N/A"}</span>
                  </div>
                  <div className="confirmed-item">
                    <img src={dateJoinedLogo} alt="Date Joined" className="info-icon" />
                    <span>{ownerData.dateJoined ? formatDate(ownerData.dateJoined) : 'N/A'}</span>
                  </div>
                </>
              ) : (
                <p>Loading confirmed information...</p>
              )}
            </div>
          </div>
        </div>

        {isDashboardOpen ? (
          <div id="dashboard-section" className="dashboard-layout">
            <div className="dashboard-header">
              <h2 className="dashboard-title">Listed Property</h2>
              <button 
                className="add-listing-button" 
                onClick={() => navigate(`/owner-page/${normalDocumentId}/add-property`, { state: { normalDocumentId } })}
              >
                + Add New Listing
              </button>
            </div>
            
            <div className="owner-image-section">
              {properties.map(property => (
                <div key={property.id}>
                  <div className="owner-dashboard-image-container">
                    <div 
                      className={`owner-dashboard-property-info ${property.isDisabled ? 'disabled' : ''}`}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(`/property/${property.id}`, { state: { isOwner: true } });
                      }}
                    >
                      <div className="owner-dashboard-property-name">{property.propertyName}</div>
                      <div className="owner-dashboard-property-location">{property.propertyLocation}</div>
                      <div className="owner-dashboard-property-type">{property.propertyType}</div>
                      <div className="owner-dashboard-property-price">
                        ₱{(property.propertyPrice ?? property.rent ?? 0).toLocaleString()}/month
                      </div>
                    </div>
                    <div className="owner-dashboard-actions">
                      <button 
                        className="edit-btn" 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          navigate(`/property/${property.id}/edit-property`);
                        }}
                      >
                        Edit
                      </button>
                      <button 
                        className="delete-btn" 
                        onClick={(e) => { e.stopPropagation(); handleDeleteProperty(property.id); }}
                      >
                        🗑️
                      </button>
                      <button 
                        className="toggle-disabled-btn" 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          handleToggleDisabled(property.id, property.isDisabled);
                        }}
                      >
                        {property.isDisabled ? 'Enable' : 'Disable'}
                      </button>
                    </div>
                    <img 
                      src={getImageUrl(property, 0)} 
                      onError={(e) => {
                        e.currentTarget.src = placeholderHouse;
                        e.currentTarget.onerror = null;
                      }}
                      alt={property.propertyPhotos && property.propertyPhotos['photo0'] ? property.propertyPhotos['photo0'].label : "Placeholder"} 
                      className="owner-dashboard-property-image" 
                    />
                  </div>
                  <div className="property-interest-section">
                    <span className="interest-count">
                      {property.interestedCount || 0} Interested Applicant{(property.interestedCount === 1) ? '' : 's'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="about-section-owner">
            <h2 className="about-title">About {firstName}</h2>
            <p className="bio">{ownerData?.description}</p>

            <section className="reviews-section">
              <div className="reviews-header">
                <h2>{firstName}'s Reviews</h2>
                {!isOwnerViewing && !userExistingReview && (
                  <button 
                    className="add-review-button"
                    onClick={() => {
                      if (!currentUser) {
                        alert("Please log in to leave a review");
                        return;
                      }
                      if (userExistingReview) {
                        alert("You already have a review. Please edit or delete your existing review first.");
                        return;
                      }
                      setIsReviewModalOpen(true);
                    }}
                  >
                    + Add Review
                  </button>
                )}
              </div>

              <div className="reviews-grid">
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
                        src={comment.pictureUrl} 
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
                        <button className="edit-btn" onClick={handleEditReview}>Edit</button>
                        <button className="delete-btn" onClick={handleDeleteReview}>Delete</button>
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

      {isReviewModalOpen && (
        <div className="modal-overlay-review">
          <div className="modal-content-review">
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
            <div className="button-group">
              <button onClick={handleCommentSubmit}>Submit</button>
              <button onClick={() => setIsReviewModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnersPage;
