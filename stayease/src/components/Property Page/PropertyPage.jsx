import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, doc, addDoc, serverTimestamp, getDoc, getDocs, query, where, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import './PropertyPage.css';

const PropertyPage = () => {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [userFavorites, setUserFavorites] = useState([]);
  const [host, setHost] = useState(null);

  useEffect(() => {
    const fetchPropertyData = async () => {
      try {
        const propertyDoc = await getDoc(doc(db, 'properties', id));
        if (propertyDoc.exists()) {
          const propertyData = { id: propertyDoc.id, ...propertyDoc.data() };
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
          const commentsData = commentsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
          }));
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
    if (!auth.currentUser) return;

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

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!auth.currentUser || !newComment.trim()) return;

    try {
      const commentRef = collection(db, 'comments');
      await addDoc(commentRef, {
        propertyId: id,
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        content: newComment,
        timestamp: serverTimestamp()
      });
      setNewComment('');
      // Refresh comments
      const commentsQuery = query(collection(db, 'comments'), where('propertyId', '==', id));
      const commentsSnapshot = await getDocs(commentsQuery);
      const commentsData = commentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setComments(commentsData);
    } catch (error) {
      console.error('Error adding comment:', error);
    }
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
            className={`favorite-button ${userFavorites.includes(id) ? 'favorited' : ''}`}
            onClick={handleFavoriteToggle}
          >
            {userFavorites.includes(id) ? '❤️' : '🤍'}
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
                <span>{property.maxOccupants} guests</span>
                <span>•</span>
                <span>{property.bedroomCount} bedroom</span>
                <span>•</span>
                <span>{property.bathroomCount} bath</span>
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
              {property.billInclusions?.map((inclusion, index) => (
                <div key={index} className="amenity-item">
                  <span>✓</span>
                  <span>{inclusion}</span>
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

          <button className="interested-button">
            Interested
          </button>

          <div className="total-calculation">
            <div>Security Deposit: ₱{property.deposit}</div>
            <div>Lease Term: {property.leaseTerm} months</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyPage;
