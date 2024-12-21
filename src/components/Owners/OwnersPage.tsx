import React from 'react';
import './OwnersPage.css';
import logoSvg from '../../assets/STAY.svg';

const OwnersPage: React.FC = () => {
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
  return (
    <div className="container">
      <header className="header">
        <div className="header-content">
          <img src={logoSvg} alt="Airbnb" className="logo" />
          <div className="nav-buttons">
            <button className="host-button">Airbnb your home</button>
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
              <img src="/placeholder.svg?height=150&width=150" alt="Profile" className="profile-image" />
              <button className="heart-badge">
                <svg viewBox="0 0 24 24" className="heart-icon">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </button>
            </div>
            <h1 className="profile-name">Paulino</h1>
            <p className="superhost-badge">Superhost</p>
            
            <div className="stats-container">
              <div className="stat-item">
                <div className="stat-value">421</div>
                <div className="stat-label">Reviews</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">4.95★</div>
                <div className="stat-label">Rating</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">7</div>
                <div className="stat-label">Years hosting</div>
              </div>
            </div>
          </div>

          <div className="info-card">
            <h2 className="info-title">Paulino's confirmed information</h2>
            <div className="confirmed-items">
              {['Identity', 'Email address', 'Phone number'].map(item => (
                <div key={item} className="confirmed-item">
                  <span className="check-icon">✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <button className="report-button">Report this profile</button>
        </div>

        <div className="about-section">
          <h2 className="about-title">About Paulino</h2>
          
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
            Hello there! I'm a marketing & advertising professional, entrepreneur and life explorer 
            who loves travel, music and design. Having lived in 6 different countries and travelled 
            to 32 countries my whole life, nothing excites me more than trying new things and 
            seeing new places. I can't wait to share my home with you which I've meticuously 
            curated and designed for your pleasure and comfort. Hope to see you soon :) Carpe awesome!
          </p>

        <section className="reviews-section">
        <div className="section-header">
          <h2>Paulino's reviews</h2>
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
          <h2>Paulino's listings</h2>
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
      </main>
    </div>
  );
};

export default OwnersPage;

