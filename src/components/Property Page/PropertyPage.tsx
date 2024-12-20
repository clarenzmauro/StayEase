import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, doc, addDoc, serverTimestamp, getDoc, getDocs, query, where, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { DocumentData } from 'firebase/firestore';
import './PropertyPage.css';

interface Property {
  id: string;
  propertyName: string;
  propertyLocation: string;
  propertyPhotos: string[];
  propertyDesc: string;
  propertySize: string;
  tags: string[];
  houseRules: string[];
  bedroomCount: number;
  bathroomCount: number;
  viewCount: number;
  rent: number;
  availability: any;
  maxOccupants: number;
  floorLevel: string | number;
  furnishing: string;
  deposit: number;
  leaseTerm: number;
  ownerId: string;
  petFriendly: boolean;
  furnished: string;
  comments: any[];
}

interface Comment {
  id: string;
  propertyId: string;
  userId: string;
  userEmail: string;
  content: string;
  commentDate: any;
  likesCounter?: number;
  dislikeCounter?: number;
  isReply?: boolean;
  replies?: any[];
}

const PropertyPage = () => {
  const { id } = useParams();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [userFavorites, setUserFavorites] = useState<string[]>([]);
  const [host, setHost] = useState<DocumentData | null>(null);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

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
          setProperty(propertyData);

          // Fetch host data using ownerId
          if (propertyData.ownerId) {
            const hostDoc = await getDoc(doc(db, 'accounts', propertyData.ownerId));
            if (hostDoc.exists()) {
              setHost(hostDoc.data());
            }
          }

          // Fetch comments
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
              likesCounter: data.likesCounter,
              dislikeCounter: data.dislikeCounter,
              isReply: data.isReply,
              replies: data.replies
            };
          });
          setComments(commentsData);
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
    if (!auth.currentUser || !id) return;

    const userRef = doc(db, 'users', auth.currentUser.uid);
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

  const handleCommentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
          likesCounter: data.likesCounter,
          dislikeCounter: data.dislikeCounter,
          isReply: data.isReply,
          replies: data.replies
        };
      });
      setComments(commentsData);
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!auth.currentUser || !id) return;

    try {
      // Delete the comment document
      const commentRef = doc(db, 'comments', commentId);
      await deleteDoc(commentRef);

      // Remove the comment from the comments array
      const updatedComments = comments.filter(comment => comment.id !== commentId);
      setComments(updatedComments);
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleSortComments = () => {
    const sortedComments = [...comments].sort((a, b) => {
      const dateA = (a.commentDate?.seconds || 0) * 1000;
      const dateB = (b.commentDate?.seconds || 0) * 1000;
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
    setComments(sortedComments);
    setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest');
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!property) {
    return <div className="error">Property not found</div>;
  }

  return (
    <div className="property-page">
      <div className="property-header">
        <h1 className="property-title">{property.propertyName}</h1>
        <div className="property-location">
          <span>{property.propertyLocation}</span>
          <button
            className={`favorite-button ${id && userFavorites.includes(id) ? 'favorited' : ''}`}
            onClick={handleFavoriteToggle}
          >
            {id && userFavorites.includes(id) ? '❤️' : '🤍'}
          </button>
        </div>
      </div>

      <div className="property-images-grid">
        {property.propertyPhotos?.slice(0, 5).map((photo, index) => (
          <img
            key={index}
            src={photo}
            alt={`Property view ${index + 1}`}
            className={index === 0 ? 'main-image' : ''}
          />
        ))}
      </div>

      <div className="property-content">
        <div className="property-info">
          <div className="host-section">
            <div className="host-info">
              <h2 className="host-name">Hosted by {host?.username || 'Host'}</h2>
              <div className="property-stats">
                <span>{property.bedroomCount} bedroom</span>
                <span>•</span>
                <span>{property.bathroomCount} bath</span>
                <span>•</span>
                <span>{property.viewCount} views</span>
              </div>
            </div>
          </div>

          <div className="property-details">
            <div className="section-title">About this place</div>
            <p>{property.propertyDesc}</p>
          </div>

          <div className="amenities-section">
            <div className="section-title">What this place offers</div>
            <div className="amenities-grid">
              {property.tags?.map((tag, index) => (
                <div key={index} className="amenity-item">
                  <span>✓</span>
                  <span>{tag}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="house-rules-section">
            <div className="section-title">House rules</div>
            <div className="amenities-grid">
              {property.houseRules?.map((rule, index) => (
                <div key={index} className="amenity-item">
                  <span>•</span>
                  <span>{rule}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="booking-card">
          <div className="price-info">
            <span className="price">₱{property.rent}</span>
            <span className="price-period">/month</span>
          </div>

          <div className="booking-dates">
            <div>Available from: {new Date(property.availability?.seconds * 1000).toLocaleDateString()}</div>
          </div>

          <div className="guests-input">
            <div>Maximum occupants: {property.maxOccupants}</div>
          </div>

          <div className="floor-level">
            <div>Floor Level: {property.floorLevel}</div>
          </div>

          <div className="furnishing">
            <div>Furnishing: {property.furnishing}</div>
          </div>

          <div className="pet-friendly">
            <div>Pet Friendly: {property.petFriendly && 'Yes'}</div>
          </div>

          <div className="property-size">
            <div>Property Size: {property.propertySize}</div>
          </div>

          <button className="interested-button">
            Interested
          </button>

          <div className="total-calculation">
            <div>Security Deposit: ₱{property.deposit}</div>
            <div>Lease Term: {property.leaseTerm} months</div>
          </div>
        </div>
      </div>

      <div className="comments-section">
        <div className="comments-header">
          <h2>Comments</h2>
          <button 
            className="sort-button" 
            onClick={handleSortComments}
          >
            Sort by {sortOrder === 'newest' ? 'Oldest' : 'Newest'} First
          </button>
        </div>
        <form onSubmit={handleCommentSubmit} className="comment-form">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            required
          />
          <button type="submit">Post Comment</button>
        </form>
        
        <div className="comments-list">
          {comments.map((comment) => (
            <div key={comment.id} className="comment">
              <div className="comment-header">
                <span className="comment-author">{comment.userEmail}</span>
                <span className="comment-date">
                  {comment.commentDate?.toDate().toLocaleDateString()}
                </span>
                <span className="comment-time">
                  {comment.commentDate?.toDate().toLocaleTimeString()}
                </span>
                {auth.currentUser && auth.currentUser.uid === comment.userId && (
                  <button 
                    className="delete-button" 
                    onClick={() => handleDeleteComment(comment.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
              <p className="comment-content">{comment.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PropertyPage;