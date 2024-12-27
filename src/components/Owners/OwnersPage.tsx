import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import './OwnersPage.css';
import logoSvg from '../../assets/STAY.svg';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';


const OwnersPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const location = useLocation();
    const { normalDocumentId, encryptedDocumentId } = location.state || {}; // Accessing state
    const [ownerData, setOwnerData] = useState<any>(null);
    const [isDashboardOpen, setIsDashboardOpen] = useState(false);
    const [properties, setProperties] = useState<any[]>([]);
    const firstName = ownerData?.username ? ownerData.username.split(' ')[0] : 'Owner'; // Default to 'Owner' if username is not available

    useEffect(() => {
        const fetchOwnerData = async () => {
            if (normalDocumentId) {
                const docRef = doc(db, 'accounts', normalDocumentId); // Assuming 'accounts' is the collection name
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    setOwnerData(docSnap.data()); // Store the document data in state
                    fetchDahsboardData(docSnap.data().dashboardId);
                } else {
                    console.log('No such document!');
                }
            }
        };

        fetchOwnerData();
    }, [normalDocumentId]);

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
      }
    }, [id, encryptedDocumentId]);

    const reviews = [
        {
          id: 1,
          text: "...BEAUTIFUL UNIT. The host was very accomodating ang proactive...",
          author: "Jam",
          date: "December 2024",
          avatar: "/placeholder.svg?height=56&width=56"
        },
        {
          id: 2,
          text: "...Paulina was a lovely and responsive host! The apartment was gorgeous, super clean and had great amenities. Although I only stayed one night I would definitely return!...",
          author: "Alphonsus Ezekiel",
          date: "December 2024",
          avatar: "/placeholder.svg?height=56&width=56"
        }
      ];

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
    <div className="container">
      <header className="header">
        <div className="header-content">
          <img src={logoSvg} alt="Airbnb" className="logo" />
          <div className="nav-buttons">
            <button className="host-button" onClick={handleDashboardClick}>
              {isDashboardOpen ? 'Profile' : 'Dashboard'}
            </button>
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

      <main className="main-content">
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
              <div className="add-box">
                <span>+</span>
              </div>
              {properties.map(property => (
              <div key={property.id} className="image-container" onClick={() => window.open(`/property/${property.id}`, '_blank')}>
                <img 
                src={property.propertyPhotos[0] || "/placeholder.svg?height=150&width=150"} 
                alt={property.title} 
                className="property-image" 
                />
                <div className="property-info">
                  <div className="property-name">{property.propertyName}</div>
                  <div className="property-location">{property.propertyLocation}</div>
                  <div className="property-type">{property.propertyType}</div>
                  <div className="property-price">₱{property.rent.toLocaleString()}/month</div>
                </div>
                <div className="actions">
                  <button className="edit-btn" onClick={(e) => { e.stopPropagation(); /* Add edit functionality */ }}>✏️</button>
                  <button className="delete-btn" onClick={(e) => { e.stopPropagation(); /* Add delete functionality */ }}>🗑️</button>
                </div>
              </div>
              ))}
            </div>
          </div>  
        ): (
          <div className="about-section">
            <h2 className="about-title">About {firstName}</h2>
          
            <div className="details-grid">
              <div className="detail-item">
                <span className="detail-icon work"></span>
                <div>
                  <div className="detail-label">My work:</div>
                  <div className="detail-value">Hotelier</div>
                </div>
              </div>
              <div className="detail-item">
                <span className="detail-icon time"></span>
                <div>
                  <div className="detail-label">I spend too much time:</div>
                  <div className="detail-value">Listening to music</div>
              </div>
            </div>

            <div className="detail-item">
              <span className="detail-icon birth"></span>
              <div>
                <div className="detail-label">Born in the 80s</div>
              </div>
            </div>
            <div className="detail-item">
              <span className="detail-icon education"></span>
              <div>
                <div className="detail-label">Where I went to school:</div>
                <div className="detail-value">Goldsmiths, London, UK</div>
              </div>
            </div>

            <div className="detail-item">
              <span className="detail-icon fun"></span>
              <div>
                <div className="detail-label">Fun fact:</div>
                <div className="detail-value">I'm a fire dancer!</div>
              </div>
            </div>

            <div className="detail-item">
              <span className="detail-icon music"></span>
              <div>
                <div className="detail-label">Favorite song in high school:</div>
                <div className="detail-value">Freebird, Lynyrd Skynyrd</div>
              </div>
            </div>

            <div className="detail-item">
              <span className="detail-icon heart"></span>
              <div>
                <div className="detail-label">I'm obsessed with:</div>
                <div className="detail-value">Design & music</div>
              </div>
            </div>

            <div className="detail-item">
              <span className="detail-icon language"></span>
              <div>
                <div className="detail-label">Speaks</div>
                <div className="detail-value">English, Filipino, and Spanish</div>
              </div>
            </div>
          </div>

          <p className="bio">
            {ownerData?.description}
          </p>

          <section className="reviews-section">
            <div className="section-header">
              <h2>{firstName}'s reviews</h2>
              <div className="navigation-buttons">
                <button className="nav-button" aria-label="Previous">
                  <span className="arrow left"></span>
                </button>
                <button className="nav-button" aria-label="Next">
                  <span className="arrow right"></span>
                </button>
              </div>
            </div>

            <div className="reviews-grid">
              {reviews.map(review => (
                <div key={review.id} className="review-card">
                  <p className="review-text">{review.text}</p>
                  <div className="review-author">
                    <img src={review.avatar} alt={review.author} className="author-avatar" />
                    <div className="author-info">
                      <h3>{review.author}</h3>
                      <p>{review.date}</p>
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
                <button className="nav-button" aria-label="Previous">
                  <span className="arrow left"></span>
                </button>
                <button className="nav-button" aria-label="Next">
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
    </div>
  );
};

export default OwnersPage;