import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { collection, doc, addDoc, serverTimestamp, getDoc, getDocs, query, where, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { DocumentData } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

import PropertyHeader from './components/PropertyHeader';
import PropertyGallery from './components/PropertyGallery';
import PropertyInfo from './components/PropertyInfo';
import BookingCard from './components/BookingCard';
import CommentSection from './components/CommentSection';
import LoginPrompt from './components/LoginPrompt';
import PropertySkeleton from './components/PropertySkeleton';
import OwnerSection from './components/OwnerSection';
import PropertyMap from './components/PropertyMap';
import ChatModal from '../Chat/ChatModal';
import ShowApplicants from './components/ShowApplicants';

import './PropertyPage.css';
import ApplicantDetails from './ApplicantDetails';

interface Property {
  id: string;
  allowChat: boolean;
  allowViewing: boolean;
  bathroomCount: number;
  bedroomCount: number;
  comments: string[];
  count: number;
  dateAvailability: { seconds: number };
  datePosted: string;
  floorLevel: string | number;
  furnishingStatus: string;
  houseRules: string[];
  interestedApplicants: string[];
  interestedCount: number;
  isVerified: boolean;
  leaseTerm: number;
  maxOccupants: number;
  ownerId: string;
  propertyLifestyle: string;
  propertyLocation: string;
  propertyLocationGeo: any;
  propertyName: string;
  propertyPhotos: string[];
  propertyPrice: number;
  propertyTags: string[];
  propertyType: string;
  securityDeposit: number;
  viewCount: number;
}

interface Comment {
  id: string;
  propertyId: string;
  userId: string;
  userEmail: string;
  content: string;
  commentDate: any;
  likesCounter: number;
  likedBy: string[];
  dislikeCounter?: number;
  isReply?: boolean;
  replies?: any[];
  parentCommentId?: string;
}

const PropertyPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [userFavorites, setUserFavorites] = useState<string[]>([]);
  const [host, setHost] = useState<DocumentData | null>(null);
  const [dateSort, ] = useState<'newest' | 'oldest'>('newest');
  const [likeSort, ] = useState<'mostLiked' | 'leastLiked'>('mostLiked');
  const [activeSortType, ] = useState<'date' | 'likes'>('date');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [allowChat, setAllowChat] = useState(false);
  const [editChecker, setEditChecker] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [showApplicants, setShowApplicants] = useState(false);

  useEffect(() => {
    const state = location.state as { isOwner?: boolean; ownerId?: string } | null;
    if (state?.isOwner) {
      setIsOwner(true);
    }
  }, [location]);

  useEffect(() => {
    // Log the current pathname to identify which URL is used
    console.log('Current URL:', location.pathname);
    if (location.pathname.includes('/property/') && location.pathname.includes('/view-property') && !editChecker) {
      setEditChecker(true);
    }
  }, [location, editChecker]);

  useEffect(() => {
    console.log(editChecker);
  });

  useEffect(() => {
    const fetchPropertyData = async () => {
      try {
        if (!id) {
          console.error('Property ID is undefined');
          setLoading(false);
          return;
        }

        const propertyDoc = await getDoc(doc(db, 'properties', id));
        if (propertyDoc.exists()) {
          const propertyData = { id: propertyDoc.id, ...propertyDoc.data() } as Property;
          
          setAllowChat(propertyData.allowChat);
          const propertyPhotosArray = propertyData.propertyPhotos || []; // Assuming this is now an array

      setProperty({
        ...propertyData,
        propertyPhotos: propertyPhotosArray // Update the propertyPhotos structure
      });

          // Fetch host data using ownerId
          if (propertyData.ownerId) {
            const hostDoc = await getDoc(doc(db, 'accounts', propertyData.ownerId));
            if (hostDoc.exists()) {
              setHost(hostDoc.data());
            }
          }

          // Fetch all comments for this property (both parent comments and replies)
          const commentsQuery = query(collection(db, 'comments'), where('propertyId', '==', id));
          const commentsSnapshot = await getDocs(commentsQuery);

          // Separate parent comments and replies
          const parentComments: Comment[] = [];
          const repliesMap = new Map<string, Comment[]>();

          commentsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const comment = {
              id: doc.id,
              propertyId: data.propertyId,
              userId: data.userId,
              userEmail: data.userEmail,
              content: data.content,
              commentDate: data.commentDate,
              likesCounter: data.likesCounter || 0,
              likedBy: data.likedBy || [],
              dislikeCounter: data.dislikeCounter || 0,
              isReply: data.isReply || false,
              replies: [],
              parentCommentId: data.parentCommentId
            };

            if (data.parentCommentId) {
              // This is a reply
              if (!repliesMap.has(data.parentCommentId)) {
                repliesMap.set(data.parentCommentId, []);
              }
              repliesMap.get(data.parentCommentId)?.push(comment);
            } else {
              // This is a parent comment
              parentComments.push(comment);
            }
          });

          // Attach replies to their parent comments and sort them by date
          const commentsWithReplies = parentComments.map(comment => ({
            ...comment,
            replies: (repliesMap.get(comment.id) || []).sort((a, b) => {
              const dateA = a.commentDate?.seconds || 0;
              const dateB = b.commentDate?.seconds || 0;
              return dateA - dateB;
            })
          }));

          // Sort parent comments by date
          const sortedComments = commentsWithReplies.sort((a, b) => {
            const dateA = a.commentDate?.seconds || 0;
            const dateB = b.commentDate?.seconds || 0;
            return dateB - dateA; // newest first
          });

          setComments(sortedComments);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching property:', error);
        setLoading(false);
      }
    };

    fetchPropertyData();
  }, [id]);

  useEffect(() => {
    // Fetch user favorites
    if (auth.currentUser) {
      const userDoc = doc(db, 'users', auth.currentUser.uid);
      getDoc(userDoc).then((docSnap) => {
        if (docSnap.exists() && docSnap.data().favorites) {
          setUserFavorites(docSnap.data().favorites);
        }
      });
    }
  }, []);

  const handleFavoriteToggle = async () => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    if (!auth.currentUser || !id) return;   

    const userRef = doc(db, 'accounts', auth.currentUser.uid);
    const isFavorited = userFavorites.includes(id);

    try {
      await updateDoc(userRef, {
        favorites: isFavorited ? arrayRemove(id) : arrayUnion(id)
      });
      setUserFavorites((prev) =>
        isFavorited ? prev.filter((fav) => fav !== id) : [...prev, id]
      );
    } catch (error) {
      console.error('Error updating favorites:', error);
    }
  };

  const handleInterestedClick = async () => {
    if (!auth.currentUser) {
      setShowLoginPrompt(true);
      return;
    }

    if (!auth.currentUser || !id || !property) return;

    try {
      const propertyRef = doc(db, 'properties', id);
      const userRef = doc(db, 'accounts', auth.currentUser.uid);
      const ownerRef = doc(db, 'accounts', property.ownerId);
      
      // Get current property data to check current interest status
      const propertyDoc = await getDoc(propertyRef);
      if (!propertyDoc.exists()) return;
      
      const propertyData = propertyDoc.data();
      const isCurrentlyInterested = propertyData.interestedApplicants?.includes(auth.currentUser.uid);
      const currentCount = propertyData.interestedCount || 0;

      if (!isCurrentlyInterested) {
        // Create notification for the owner
        const userName = auth.currentUser?.displayName || 'Anonymous';
        const newNotification = {
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'interested',
          message: `${userName} is interested in ${property.propertyName}`,
          timestamp: Date.now(),
          read: false,
          propertyId: id,
          propertyName: property.propertyName,
          userId: auth.currentUser.uid,
          userName
        };

        // Update owner's notifications
        await updateDoc(ownerRef, {
          notifications: arrayUnion(newNotification)
        });
      }

      // Toggle interest status and update count
      await updateDoc(propertyRef, {
        interestedApplicants: isCurrentlyInterested 
          ? arrayRemove(auth.currentUser.uid)
          : arrayUnion(auth.currentUser.uid),
        interestedCount: isCurrentlyInterested 
          ? Math.max(0, currentCount - 1) // Ensure count never goes below 0
          : currentCount + 1
      });

      // Update user's itemsInterested
      await updateDoc(userRef, {
        itemsInterested: isCurrentlyInterested 
          ? arrayRemove(id)
          : arrayUnion(id)
      });

      // Update local state
      setProperty(prev => {
        if (!prev) return null;
        const currentApplicants = prev.interestedApplicants || [];
        const newCount = isCurrentlyInterested 
          ? Math.max(0, (prev.interestedCount || 0) - 1)
          : (prev.interestedCount || 0) + 1;
        
        return {
          ...prev,
          interestedApplicants: isCurrentlyInterested
            ? currentApplicants.filter(uid => uid !== auth.currentUser?.uid)
            : auth.currentUser?.uid 
              ? [...currentApplicants, auth.currentUser.uid]
              : currentApplicants,
          interestedCount: newCount
        };
      });
    } catch (error) {
      console.error('Error updating interested status:', error);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    if (!auth.currentUser || !newComment.trim() || !id) return;

    try {
      // First add the comment document
      const commentRef = collection(db, 'comments');
      const newCommentDoc = await addDoc(commentRef, {
        propertyId: id,
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        content: newComment,
        commentDate: serverTimestamp()
      });

      // Update the property document to include the new comment ID
      const propertyRef = doc(db, 'properties', id);
      await updateDoc(propertyRef, {
        comments: arrayUnion(newCommentDoc.id)
      });

      setNewComment('');

      // Refresh comments
      const commentsQuery = query(collection(db, 'comments'), where('propertyId', '==', id));
      const commentsSnapshot = await getDocs(commentsQuery);
      const commentsData: Comment[] = commentsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          propertyId: data.propertyId,
          userId: data.userId,
          userEmail: data.userEmail,
          content: data.content,
          commentDate: data.commentDate || data.timestamp,
          likesCounter: data.likesCounter || 0,
          likedBy: data.likedBy || [],
          dislikeCounter: data.dislikeCounter || 0,
          isReply: data.isReply || false,
          replies: data.replies || [],
          parentCommentId: data.parentCommentId
        };
      });

      // Sort comments to maintain current sort order
      const sortedComments = activeSortType === 'date'
        ? commentsData.sort((a, b) => {
          return dateSort === 'newest'
            ? a.commentDate?.seconds - b.commentDate?.seconds
            : b.commentDate?.seconds - a.commentDate?.seconds;
        })
        : commentsData.sort((a, b) => {
          return likeSort === 'mostLiked'
            ? (a.likesCounter || 0) - (b.likesCounter || 0)
            : (b.likesCounter || 0) - (a.likesCounter || 0);
        });

      setComments(sortedComments);
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;

    try {
      const commentRef = doc(db, 'comments', commentId);
      const commentDoc = await getDoc(commentRef);

      if (!commentDoc.exists()) return;

      const commentData = commentDoc.data();

      // Only allow deletion if the user owns this comment
      if (!user || commentData.userId !== user.uid) return;

      await deleteDoc(commentRef);

      // Update local state
      setComments(prevComments => prevComments.filter(comment => comment.id !== commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const caesarCipher = (text: string, key: number): string => {
    if (!text || typeof text !== 'string') {
      return '';
    }
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

  const handleLikeComment = async (commentId: string) => {
    if (!user) {
      handleLoginPrompt();
      return;
    }

    try {
      const commentRef = doc(db, 'comments', commentId);
      const commentDoc = await getDoc(commentRef);

      if (!commentDoc.exists()) return;

      const commentData = commentDoc.data();
      const likedBy = commentData.likedBy || [];
      const hasLiked = user && likedBy.includes(user.uid);

      if (hasLiked) {
        // Unlike the comment
        await updateDoc(commentRef, {
          likesCounter: (commentData.likesCounter || 0) - 1,
          likedBy: arrayRemove(user!.uid)
        });
      } else {
        // Like the comment
        await updateDoc(commentRef, {
          likesCounter: (commentData.likesCounter || 0) + 1,
          likedBy: arrayUnion(user!.uid)
        });
      }

      // Update local state
      setComments(prevComments =>
        prevComments.map(comment => {
          if (comment.id === commentId) {
            return {
              ...comment,
              likesCounter: hasLiked ? (comment.likesCounter || 0) - 1 : (comment.likesCounter || 0) + 1,
              likedBy: hasLiked
                ? (comment.likedBy || []).filter((id: string) => id !== user!.uid)
                : [...(comment.likedBy || []), user!.uid]
            };
          }
          return comment;
        })
      );
    } catch (error) {
      console.error('Error updating like:', error);
    }
  };

  const handleReplySubmit = async (commentId: string, content: string) => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    if (!auth.currentUser || !content.trim() || !id) return;

    try {
      const replyData = {
        propertyId: id,
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        content: content,
        commentDate: serverTimestamp(),
        likesCounter: 0,
        likedBy: [],
        dislikeCounter: 0,
        isReply: true,
        parentCommentId: commentId
      };

      const replyRef = await addDoc(collection(db, 'comments'), replyData);

      // Update local state
      setComments(prevComments =>
        prevComments.map(comment => {
          if (comment.id === commentId) {
            return {
              ...comment,
              replies: [...(comment.replies || []), {
                ...replyData,
                id: replyRef.id,
                commentDate: { seconds: Date.now() / 1000 } // Temporary timestamp for immediate display
              }]
            };
          }
          return comment;
        })
      );
    } catch (error) {
      console.error('Error adding reply:', error);
    }
  };

  const handleReplyLike = async (commentId: string, replyId: string) => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }

    try {
      const replyRef = doc(db, 'comments', replyId);
      const replyDoc = await getDoc(replyRef);
      const replyData = replyDoc.data();

      if (!replyData) return;

      const hasLiked = user && replyData.likedBy?.includes(user.uid);

      if (hasLiked) {
        // Unlike the reply
        await updateDoc(replyRef, {
          likesCounter: (replyData.likesCounter || 0) - 1,
          likedBy: arrayRemove(user!.uid)
        });
      } else {
        // Like the reply
        await updateDoc(replyRef, {
          likesCounter: (replyData.likesCounter || 0) + 1,
          likedBy: arrayUnion(user!.uid)
        });
      }

      // Update local state
      setComments(prevComments =>
        prevComments.map(comment => {
          if (comment.id === commentId) {
            return {
              ...comment,
              replies: comment.replies?.map(reply => {
                if (reply.id === replyId) {
                  return {
                    ...reply,
                    likesCounter: hasLiked ? (reply.likesCounter || 0) - 1 : (reply.likesCounter || 0) + 1,
                    likedBy: hasLiked
                      ? (reply.likedBy || []).filter((id: string) => id !== user!.uid)
                      : [...(reply.likedBy || []), user!.uid]
                  };
                }
                return reply;
              })
            };
          }
          return comment;
        })
      );
    } catch (error) {
      console.error('Error updating reply like:', error);
    }
  };

  const handleDeleteReply = async (commentId: string, replyId: string) => {
    if (!user) return;

    try {
      // Delete the reply document
      await deleteDoc(doc(db, 'comments', replyId));

      // Update local state
      setComments(prevComments =>
        prevComments.map(comment => {
          if (comment.id === commentId) {
            return {
              ...comment,
              replies: comment.replies?.filter(reply => reply.id !== replyId) || []
            };
          }
          return comment;
        })
      );
    } catch (error) {
      console.error('Error deleting reply:', error);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setShowLoginPrompt(false);
    } catch (error) {
      console.error('Error signing in with Google:', error);
    }
  };

  const handleLoginPrompt = () => {
    handleGoogleSignIn();
  };

  if (loading) {
    return (
      <div className="property-page">
        <PropertySkeleton />
      </div>
    );
  }

  if (!property) {
    return <div>Property not found</div>;
  }

  
  const key = new Date().getDate();
  const normalDocumentId = property?.ownerId || '';
  const encryptedDocumentId = normalDocumentId ? caesarCipher(normalDocumentId, key) : '';

  return (
    <div className="property-page">
      {editChecker ? (
        <>
        <PropertyHeader />

        {property && (
        <>
          <div className="property-header">
            <h1 className="property-title">{property.propertyName}</h1>
          </div>
          <PropertyGallery propertyPhotos={property.propertyPhotos} />
          <p className="property-location">{property.propertyLocation}</p>

          <div className="host-info">
          <h2 className="host-name">Hosted by {host?.username || 'Host'}</h2>
          <div className="property-stats">
            <span>{property.viewCount} views</span>
            <span>•</span>
            <span>{property.interestedCount} interested</span>
            <span>•</span>
          </div>
          </div>

          {/* New Edit Property button */}
  <button className="edit-property-button" onClick={() => {navigate(`/property/${id}/edit-property`)}}>
    Edit Property
  </button>

          <section>
            <h2>Interested Applicants</h2>
            {property.interestedApplicants && property.interestedApplicants.length > 0 ? (
      <ul className="interested-applicants-list">
        {property.interestedApplicants.map((applicantId) => (
          <li key={applicantId} className="applicant-item">
            <ApplicantDetails applicantId={applicantId} />
          </li>
        ))}
      </ul>
    ) : (
      <p>No interested applicants for this property</p>
    )}
          </section>
        </>

      )}
        </>

      ) : (
        <>

      <PropertyHeader />

      {/* Favorite button */}
      <button
        onClick={handleFavoriteToggle}
        className={`favorite-button-property-page ${userFavorites.includes(id || '') ? 'favorited' : ''}`}
      >
        
      </button>

      {isOwner && (
        <div className="edit-property-button-container">
          <button 
            className="edit-property-button"
            onClick={() => navigate(`/property/${id}/edit-property`)}
          >
            Edit Property
          </button>
          
        <button 
          className="view-applicants-button" 
          onClick={() => setShowApplicants(!showApplicants)}
        >
          {showApplicants ? 'Hide Applicants' : 'View Applicants'}
        </button>
        </div>
      )}

      {property && (
        <>

          <div className="property-header">
            <h1 className="property-title">{property.propertyName}</h1>
          </div>
          <PropertyGallery propertyPhotos={property.propertyPhotos} />
          <p className="property-location">{property.propertyLocation}</p>
        </>

      )}

      <div className="property-content">
        <PropertyInfo property={property} host={host} />

        <BookingCard
          property={{
            propertyPrice: property.propertyPrice,
            dateAvailability: property.dateAvailability,
            maxOccupants: property.maxOccupants,
            floorLevel: property.floorLevel,
            furnishingStatus: property.furnishingStatus,
            propertyLifestyle: property.propertyLifestyle,
            propertyType: property.propertyType,
            securityDeposit: property.securityDeposit,
            leaseTerm: property.leaseTerm,
            allowViewing: property.allowViewing,
            interestedApplicants: property.interestedApplicants
          }}
          onInterestedClick={handleInterestedClick}
          isInterested={property.interestedApplicants?.includes(auth.currentUser?.uid || '') || false}
        />
      </div>

      {property && (
        <ShowApplicants
          show={showApplicants}
          onClose={() => setShowApplicants(false)}
          interestedApplicants={property.interestedApplicants}
        />
      )}

      <CommentSection
        comments={comments}
        user={user}
        newComment={newComment}
        onCommentChange={(value) => setNewComment(value)}
        onCommentSubmit={handleCommentSubmit}
        onLikeComment={handleLikeComment}
        onDeleteComment={handleDeleteComment}
        onReplySubmit={(commentId, content) => handleReplySubmit(commentId, content)}
        onReplyLike={handleReplyLike}
        onDeleteReply={handleDeleteReply}
      />
      <PropertyMap locationGeo={property.propertyLocationGeo} />
      {property && (
        <OwnerSection
          ownerId={property.ownerId}
          onViewProfile={() => navigate(`/owner-page/${normalDocumentId}`, { state: { normalDocumentId: normalDocumentId, encryptedDocumentId: encryptedDocumentId } })}
          onMessage={() => setIsChatModalOpen(true)}
          allowChat={allowChat}
        />
      )}
      <LoginPrompt
        show={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
      />
      {property && host && (
        <ChatModal
          isOpen={isChatModalOpen}
          onClose={() => setIsChatModalOpen(false)}
          recipientId={property.ownerId}
          recipientName={host.username || 'Host'}
          recipientPhoto={host.photoURL || ''}
          isMinimized={isChatMinimized}
          onMinimizedChange={setIsChatMinimized}
        />
      )}
      </>

    )}
    </div>
    
  );
};

export default PropertyPage;
