import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, doc, addDoc, serverTimestamp, getDoc, getDocs, query, where, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { DocumentData } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';

import PropertyHeader from './components/PropertyHeader';
import PropertyGallery from './components/PropertyGallery';
import PropertyInfo from './components/PropertyInfo';
import BookingCard from './components/BookingCard';
import CommentSection from './components/CommentSection';
import LoginPrompt from './components/LoginPrompt';
import PropertySkeleton from './components/PropertySkeleton';
import OwnerSection from './components/OwnerSection';

import './PropertyPage.css';

interface Property {
  id: string;
  allowChat: boolean;
  allowViewing: boolean;
  bathroomCount: number;
  bedroomCount: number;
  comments: string[];
  count: number;
  dateAvailability: string;
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
  propertyDesc: string;
  propertyLifestyle: string;
  propertyLocation: string;
  propertyLocationGeo: any;
  propertyName: string;
  propertyPhotos: {
    [key: string]: {
      pictureUrl: string;
      label: string;
    } | number;
  };
  propertyPrice: number;
  propertySize: number;
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
}

const PropertyPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [userFavorites, setUserFavorites] = useState<string[]>([]);
  const [host, setHost] = useState<DocumentData | null>(null);
  const [dateSort, setDateSort] = useState<'newest' | 'oldest'>('newest');
  const [likeSort, setLikeSort] = useState<'mostLiked' | 'leastLiked'>('mostLiked');
  const [activeSortType, setActiveSortType] = useState<'date' | 'likes'>('date');
  const [visibleComments, setVisibleComments] = useState(4);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const COMMENTS_PER_PAGE = 4;

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
          
          const formattedPhotos = {
            count: propertyData.count, // Directly reference the count field
            ...propertyData.propertyPhotos // Spread the propertyPhotos map
          };

      setProperty({
        ...propertyData,
        propertyPhotos: formattedPhotos // Update the propertyPhotos structure
      });

          // Fetch host data using ownerId
          if (propertyData.ownerId) {
            const hostDoc = await getDoc(doc(db, 'accounts', propertyData.ownerId));
            if (hostDoc.exists()) {
              setHost(hostDoc.data());
            }
          }

          // Fetch comments and their replies
          const commentsQuery = query(collection(db, 'comments'), where('propertyId', '==', id));
          const commentsSnapshot = await getDocs(commentsQuery);

          // First, get all comments
          const commentsData = commentsSnapshot.docs.map(doc => ({
            id: doc.id,
            propertyId: doc.data().propertyId,
            userId: doc.data().userId,
            userEmail: doc.data().userEmail,
            content: doc.data().content,
            commentDate: doc.data().commentDate,
            likesCounter: doc.data().likesCounter,
            likedBy: doc.data().likedBy,
            dislikeCounter: doc.data().dislikeCounter,
            isReply: doc.data().isReply,
            replies: []
          })) as Comment[];

          // Then, fetch replies for each comment
          const repliesQuery = query(
            collection(db, 'comments'),
            where('propertyId', '==', id),
            where('isReply', '==', true)
          );
          const repliesSnapshot = await getDocs(repliesQuery);

          // Create a map of parent comments to their replies
          const repliesMap = new Map();
          repliesSnapshot.docs.forEach(doc => {
            const replyData = doc.data();
            const parentId = replyData.parentCommentId;
            if (parentId) {
              if (!repliesMap.has(parentId)) {
                repliesMap.set(parentId, []);
              }
              repliesMap.get(parentId).push({
                id: doc.id,
                propertyId: replyData.propertyId,
                userId: replyData.userId,
                userEmail: replyData.userEmail,
                content: replyData.content,
                commentDate: replyData.commentDate,
                likesCounter: replyData.likesCounter,
                likedBy: replyData.likedBy,
                dislikeCounter: replyData.dislikeCounter,
                isReply: replyData.isReply,
                replies: []
              });
            }
          });

          // Attach replies to their parent comments
          const commentsWithReplies = commentsData.map(comment => ({
            ...comment,
            replies: repliesMap.get(comment.id) || []
          }));

          setComments(commentsWithReplies);
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
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    // ... rest of the interested logic
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
          replies: data.replies || []
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

      // Only allow deletion if the user is the comment author
      if (commentData.userId !== user.uid) return;

      await deleteDoc(commentRef);

      // Update local state
      setComments(prevComments => prevComments.filter(comment => comment.id !== commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleDateSort = () => {
    setDateSort(prev => prev === 'newest' ? 'oldest' : 'newest');
    setActiveSortType('date');
    setComments(prevComments => {
      const sortedComments = [...prevComments];
      return sortedComments.sort((a, b) => {
        return dateSort === 'newest'
          ? a.commentDate?.seconds - b.commentDate?.seconds
          : b.commentDate?.seconds - a.commentDate?.seconds;
      });
    });
  };

  const handleLikeSort = () => {
    setLikeSort(prev => prev === 'mostLiked' ? 'leastLiked' : 'mostLiked');
    setActiveSortType('likes');
    setComments(prevComments => {
      const sortedComments = [...prevComments];
      return sortedComments.sort((a, b) => {
        return likeSort === 'mostLiked'
          ? (a.likesCounter || 0) - (b.likesCounter || 0)
          : (b.likesCounter || 0) - (a.likesCounter || 0);
      });
    });
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }

    try {
      const commentRef = doc(db, 'comments', commentId);
      const commentDoc = await getDoc(commentRef);

      if (!commentDoc.exists()) return;

      const commentData = commentDoc.data();
      const likedBy = commentData.likedBy || [];
      const hasLiked = likedBy.includes(user.uid);

      if (hasLiked) {
        // Unlike the comment
        await updateDoc(commentRef, {
          likesCounter: (commentData.likesCounter || 0) - 1,
          likedBy: arrayRemove(user.uid)
        });
      } else {
        // Like the comment
        await updateDoc(commentRef, {
          likesCounter: (commentData.likesCounter || 0) + 1,
          likedBy: arrayUnion(user.uid)
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
                ? (comment.likedBy || []).filter((id: string) => id !== user.uid)
                : [...(comment.likedBy || []), user.uid]
            };
          }
          return comment;
        })
      );
    } catch (error) {
      console.error('Error updating like:', error);
    }
  };

  const handleReplySubmit = async (commentId: string) => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }

    if (!replyContent.trim()) return;

    try {
      const replyData = {
        propertyId: id,
        userId: user.uid,
        userEmail: user.email,
        content: replyContent,
        commentDate: serverTimestamp(),
        likesCounter: 0,
        likedBy: [],
        isReply: true,
        parentCommentId: commentId
      };

      const replyRef = await addDoc(collection(db, 'comments'), replyData);
      const replyWithId = { ...replyData, id: replyRef.id };

      // Update local state
      setComments(prevComments =>
        prevComments.map(comment => {
          if (comment.id === commentId) {
            return {
              ...comment,
              replies: [...(comment.replies || []), replyWithId]
            };
          }
          return comment;
        })
      );

      setReplyContent('');
      setReplyingTo(null);
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

      const hasLiked = replyData.likedBy?.includes(user.uid);

      if (hasLiked) {
        // Unlike the reply
        await updateDoc(replyRef, {
          likesCounter: (replyData.likesCounter || 0) - 1,
          likedBy: arrayRemove(user.uid)
        });
      } else {
        // Like the reply
        await updateDoc(replyRef, {
          likesCounter: (replyData.likesCounter || 0) + 1,
          likedBy: arrayUnion(user.uid)
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
                      ? (reply.likedBy || []).filter((id: string) => id !== user.uid)
                      : [...(reply.likedBy || []), user.uid]
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

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleDateString();
      } else if (timestamp.seconds) {
        return new Date(timestamp.seconds * 1000).toLocaleDateString();
      }
      return '';
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  const handleLoadMoreComments = () => {
    setVisibleComments(prev => prev + COMMENTS_PER_PAGE);
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

  return (
    <div className="property-page">
      <PropertyHeader />

      {/* Favorite button */}
      <button
        onClick={handleFavoriteToggle}
        className={`favorite-button-property-page ${userFavorites.includes(id || '') ? 'favorited' : ''}`}
      >
        ❤
      </button>

      {property && (
        <>
          <div className="property-header">
            <h1 className="property-title">{property.propertyName}</h1>
          </div>
          <PropertyGallery photos={property.propertyPhotos} />
          <p className="property-location">{property.propertyLocation}</p>
        </>
      )}

      <div className="property-content">
        <PropertyInfo property={property} host={host} />

        <BookingCard
          property={property}
          onInterestedClick={handleInterestedClick}
        />
      </div>

      <CommentSection
        comments={comments}
        user={user}
        newComment={newComment}
        onCommentChange={(value) => setNewComment(value)}
        onCommentSubmit={handleCommentSubmit}
        onLikeComment={handleLikeComment}
        onDeleteComment={handleDeleteComment}
        onReplySubmit={handleReplySubmit}
        onReplyLike={handleReplyLike}
        onDeleteReply={handleDeleteReply}
      />
      {property && (
        <OwnerSection
          ownerId={property.ownerId}
          onViewProfile={() => navigate(`/profile/${property.ownerId}`)}
          onMessage={() => navigate(`/messages/${property.ownerId}`)}
        />
      )}
      <LoginPrompt
        show={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
      />
    </div>
  );
};

export default PropertyPage;