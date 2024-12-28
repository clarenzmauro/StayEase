import { useState, useEffect } from 'react';
import './HomePage.css';
import ItemsContext from './ItemsContext.jsx';
import { FilterMenu } from './FilterMenu.jsx';
import { Link, useNavigate } from 'react-router-dom';
import { collection, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config.js';
import { auth } from '../../firebase/config';
import { GoogleAuthProvider, signInWithPopup, User as FirebaseUser } from 'firebase/auth';
import logoSvg from '../../assets/STAY.svg';

interface FilterType {
  priceRange: { min: number; max: number };
  selectedTags: string[];
  selectedLocation: string;
  selectedPropertyType: string;
}

export function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  // const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [selectedItem] = useState<string | null>(null);
  const [isItemDetailsOpen, setIsItemDetailsOpen] = useState(false);
  // const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [properties, setProperties] = useState<Array<{ id: string;[key: string]: any }>>([]);
  const [filteredProperties, setFilteredProperties] = useState<Array<{ id: string;[key: string]: any }>>([]);
  const [activeFilters, setActiveFilters] = useState<FilterType>({
    priceRange: { min: 0, max: 50000 },
    selectedTags: [],
    selectedLocation: '',
    selectedPropertyType: ''
  });
  const [showAuthOverlay, setShowAuthOverlay] = useState(false);
  const [user, setUser] = useState<FirebaseUser| null>(null);
  const [userFavorites, setUserFavorites] = useState<string[]>([]);
  const navigate = useNavigate();
  // const [isLogin, setIsLogin] = useState(true);
  // const [email, setEmail] = useState('');
  // // const [password, setPassword] = useState('');
  // const [error, setError] = useState('');
  const [error] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // const [sortBy, setSortBy] = useState('most-popular');
  const [sortBy] = useState('most-popular');

  // Set up real-time listener for properties
  useEffect(() => {
    console.log('Setting up real-time listener for properties...');
    const propertiesCollection = collection(db, 'properties');
    
    setIsLoading(true);
    // Create real-time listener
    const unsubscribe = onSnapshot(propertiesCollection, (snapshot) => {
      console.log('Received database update:', snapshot.size, 'properties');
      const propertiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('Updated properties data:', propertiesData);
      
      setProperties(propertiesData);
      setFilteredProperties(propertiesData);
      setIsLoading(false);
    }, (error) => {
      console.error('Error in real-time listener:', error);
      setIsLoading(false);
    });

    // Cleanup listener on component unmount
    return () => {
      console.log('Cleaning up real-time listener...');
      unsubscribe();
    };
  }, []); // Empty dependency array means this only runs once on mount

  // Set up auth listener and fetch user favorites
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setUser(user);
      if (user) {
        const accountDoc = await getDoc(doc(db, 'accounts', user.uid));
        if (accountDoc.exists()) {
          setUserFavorites(accountDoc.data().itemsSaved || []);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Add sorting function
  const sortProperties = (properties:any, sortType:any) => {
    switch (sortType) {
      case 'most-popular':
        return [...properties].sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
      case 'newest':
        return [...properties].sort((a, b) => b.dateAdded - a.dateAdded);
      case 'oldest':
        return [...properties].sort((a, b) => a.dateAdded - b.dateAdded);
      case 'price-low':
        return [...properties].sort((a, b) => a.propertyPrice - b.propertyPrice);
      case 'price-high':
        return [...properties].sort((a, b) => b.propertyPrice - a.propertyPrice);
      case 'top-rated':
        return [...properties].sort((a, b) => (b.ratings?.overall || 0) - (a.ratings?.overall || 0));
      default:
        return properties;
    }
  };

  // Filter properties based on search and filters
  useEffect(() => {
    let filtered = [...properties];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(property =>
        property.propertyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        property.propertyLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (property.propertyTags && Array.isArray(property.propertyTags) && property.propertyTags.some((tag:string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))) ||
        property.propertyType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (property.owner && typeof property.owner === 'string' && property.owner.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply price range filter
    filtered = filtered.filter(property =>
      property.propertyPrice >= activeFilters.priceRange.min &&
      property.propertyPrice <= activeFilters.priceRange.max
    );

    // Apply location filter
    if (activeFilters.selectedLocation) {
      filtered = filtered.filter(property =>
        property.propertyLocation === activeFilters.selectedLocation
      );
    }

    // Apply property type filter
    if (activeFilters.selectedPropertyType) {
      filtered = filtered.filter(property =>
        property.propertyType === activeFilters.selectedPropertyType
      );
    }

    // Apply tags filter
    if (activeFilters.selectedTags.length > 0) {
      filtered = filtered.filter(property =>
        activeFilters.selectedTags.every(tag => property.propertyTags.includes(tag))
      );
    }

    // Apply sorting
    filtered = sortProperties(filtered, sortBy);

    setFilteredProperties(filtered);
  }, [properties, searchQuery, activeFilters, sortBy]);

  // Handle search functionality
  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();
    
    if (!query) {
      setFilteredProperties(properties);
      return;
    }

    const filtered = properties.filter(property => {
      // Search by location
      const locationMatch = property.propertyLocation.toLowerCase().includes(query);
      
      // Search by tags
      const tagMatch = property.propertyTags && Array.isArray(property.propertyTags) && property.propertyTags.some((tag: string) => 
        tag.toLowerCase().includes(query)
      );
      
      // Search by property name
      const nameMatch = property.propertyName.toLowerCase().includes(query);
      
      // Search by property type
      const typeMatch = property.propertyType.toLowerCase().includes(query);
      
      // Search by owner name
      const ownerMatch = property.owner && typeof property.owner === 'string' && property.owner.toLowerCase().includes(query);

      return locationMatch || tagMatch || nameMatch || typeMatch || ownerMatch;
    });

    setFilteredProperties(filtered);
  }, [searchQuery, properties]);

  const handleFilterChange = (filters: FilterType) => {
    setActiveFilters(filters);
  };

  // const handleItemClick = (itemId: string) => {
  //   console.log('HomePage: Item clicked with id:', itemId);
  //   setSelectedItem(itemId);
  //   setIsItemDetailsOpen(true);
  // };

  const handleFavorite = async (e: React.MouseEvent<HTMLElement>, itemId: string, user: {uid: string}) => {
    e.stopPropagation();
    if (!user) {
      setShowAuthOverlay(true);
      return;
    }

    try {
      const accountRef = doc(db, 'accounts', user.uid);
      const accountDoc = await getDoc(accountRef);
      const currentFavorites = accountDoc.data()?.itemsSaved || [];
      const isFavorited = currentFavorites.includes(itemId);

      if (isFavorited) {
        // Remove from favorites
        await updateDoc(accountRef, {
          itemsSaved: arrayRemove(itemId)
        });
        setUserFavorites(prev => prev.filter(id => id !== itemId));
      } else {
        // Add to favorites
        await updateDoc(accountRef, {
          itemsSaved: arrayUnion(itemId)
        });
        setUserFavorites(prev => [...prev, itemId]);
      }
    } catch (error) {
      console.error('Error updating favorites:', error);
    }
  };

  interface User {
    uid: string;
  }

  const createUserDocument = async (user: User) => {
    const accountRef = doc(db, 'accounts', user.uid);
    const accountSnap = await getDoc(accountRef);

    if (!accountSnap.exists()) {
      const accountData = {
        chatMates: {},
        convoId: "",
        comments: [],
        contactNumber: "",
        dashboardId: "",
        dateJoined: serverTimestamp(),
        description: "",
        email: "",
        followerCount: 0,
        isOwner: false,
        itemsInterested: [],
        itemsSaved: [],
        profilePicUrl: "",
        rating: 0,
        socials: {
          Facebook: "",
          Instagram: "",
          X: ""
        },
        testField: "",
        username: ""
      };

      try {
        await setDoc(accountRef, accountData);
      } catch (error) {
        console.error("Error creating account document:", error);
      }
    }
  };

  const handleSuccess = () => {
    setIsSuccess(true);
    setTimeout(() => {
      setShowAuthOverlay(false);
    }, 1500);
  };

  const handleGoogleAuth = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await createUserDocument(result.user);
      handleSuccess();
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(error.message);
      } else {
        console.error("An unknown error occurred");
      }
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setShowAuthOverlay(false);
    }
  };

  return (
    <div className="homepage-container">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="logo">
          <Link to="/" onClick={() => {
            setSearchQuery('');
            setActiveFilters({
              priceRange: { min: 0, max: 50000 },
              selectedTags: [],
              selectedLocation: '',
              selectedPropertyType: ''
            });
          }}> 
            <img src={logoSvg} alt="StayEase Logo" className="logo-image" />
          </Link>
        </div>
        
        <div className="nav-links">
          <span>Properties</span>
          <span>People</span>
        </div>

        <div className="nav-right">
          <div className="language-switch">EN</div>
          <div 
            className="user-icon" 
            onClick={() => {
              if (user) {
                navigate('/account'); // Navigate to account page if user is logged in
              } else {
                setShowAuthOverlay(true); // Open the auth overlay if not logged in
              }
            }} 
            role="button"
            aria-label="Account"
          >
            {user ? (
              user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="Profile" 
                  className="user-photo" 
                />
              ) : (
                user.displayName?.[0] || user.email?.[0] || '?'
              )
            ) : (
              '👤'
            )}
          </div>
        </div>
      </nav>

      <div className="homepage-layout">
        {/* Filters Sidebar */}
        <div className="filters-sidebar">
          <div className={`search-section ${isLoading ? 'skeleton' : ''}`}>
            <input
              type="text"
              className="search-bar"
              placeholder="Search for your perfect stay..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isLoading}
            />
            <svg
              className="search-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ opacity: isLoading ? 0 : 1 }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <FilterMenu 
            onFilterChange={handleFilterChange} 
            isLoading={isLoading}
          />
        </div>

        <div className="main-content">
          {/* Properties Grid */}
          <div className="properties-grid">
            {isLoading ? (
              // Show 8 skeleton cards while loading
              [...Array(8)].map((_, index) => (
                <div key={index} className="property-card skeleton">
                  <div className="property-placeholder">
                    <div className="skeleton-image"></div>
                    <div className="property-info">
                      <div className="skeleton-text skeleton-name"></div>
                      <div className="skeleton-text skeleton-location"></div>
                      <div className="skeleton-text skeleton-type"></div>
                      <div className="skeleton-text skeleton-price"></div>
                    </div>
                  </div>
                </div>
              ))
            ) : filteredProperties.length === 0 ? (
              <div className="no-results">
                No properties found matching your search criteria
              </div>
            ) : (
              filteredProperties.map((item) => (
                <div 
                  key={item.id} 
                  className="property-card"
                  onClick={() => navigate(`/property/${item.id}`)}
                >
                  <img 
                    src={item.propertyPhotos[0]} 
                    alt={item.propertyName} 
                    className="property-image" 
                  />
                  <button
                      className="favorite-button"
                      onClick={(e) => {
                        if (user !== null) {
                          handleFavorite(e, item.id, user);
                        } else {
                          console.error('User is not logged in.');
                        }
                      }}
                    >
                      {userFavorites.includes(item.id) ? '❤️' : '🤍'}
                    </button>
                  <div className="property-info">
                    <div className="property-name">{item.propertyName}</div>
                    <div className="property-location">{item.propertyLocation}</div>
                    <div className="property-type">{item.propertyType}</div>
                    <div className="property-price">₱{(item.propertyPrice ?? item.rent ?? 0).toLocaleString()}/month</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Item Details Overlay */}
      <ItemsContext
        isOpen={isItemDetailsOpen}
        onClose={() => setIsItemDetailsOpen(false)}
        itemId={selectedItem}
      />

      {showAuthOverlay && (
        <div className="auth-overlay" onClick={handleOverlayClick}>
          <div className="auth-modal">
            {isSuccess ? (
              <div className="success-message">
                Successfully logged in!
              </div>
            ) : (
              <>
                <button className="close-button" onClick={() => setShowAuthOverlay(false)} aria-label="Close">×</button>
                <h2>Login</h2>
                {error && <div className="error-message">{error}</div>}

                <button onClick={handleGoogleAuth} className="google-button">
                  Continue with Google
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;