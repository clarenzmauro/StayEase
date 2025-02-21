import { useState, useEffect } from 'react';
import './HomePage.css';
import ItemsContext from './ItemsContext.jsx';
import { FilterMenu } from './FilterMenu.jsx';
import { Link, useNavigate } from 'react-router-dom';
import { collection, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, getDoc, setDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../../firebase/config.js';
import { auth } from '../../firebase/config';
import { GoogleAuthProvider, signInWithPopup, User as FirebaseUser } from 'firebase/auth';
import logoSvg from '../../assets/STAY.svg';
import ChatManager from '../Chat/ChatManager';
import ChatHistory from '../Chat/ChatHistory';
import { API_URL } from '../../config';

interface FilterType {
  priceRange: { min: number; max: number };
  selectedTags: string[];
  selectedLocation: string;
  selectedPropertyType: string;
}

interface PropertyType {
  id: string;
  propertyName: string;
  propertyLocation: string;
  propertyPrice: number;
  propertyType: string;
  propertyTags: string[];
  owner?: string;
  datePosted?: {
    toMillis: () => number;
  };
  viewCount?: number;
  interestedCount?: number;
  propertyPhotos?: { [key: string]: { pictureUrl: string } } | string[]; // Updated to handle both Firebase and MongoDB
  [key: string]: any;
}

export function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  // const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [selectedItem] = useState<string | null>(null);
  const [isItemDetailsOpen, setIsItemDetailsOpen] = useState(false);
  // const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [properties, setProperties] = useState<PropertyType[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<PropertyType[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [activeFilters, setActiveFilters] = useState<FilterType & { sortBy: string }>({
    priceRange: { min: 0, max: 1000000 },
    selectedTags: [],
    selectedLocation: '',
    selectedPropertyType: '',
    sortBy: 'most-popular'
  });
  const [showAuthOverlay, setShowAuthOverlay] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userFavorites, setUserFavorites] = useState<string[]>([]);
  const [authError, setAuthError] = useState<string>('');
  const navigate = useNavigate();
  // const [isLogin, setIsLogin] = useState(true);
  // const [email, setEmail] = useState('');
  // // const [password, setPassword] = useState('');
  // const [error, setError] = useState('');
  const [error] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // const [sortBy, setSortBy] = useState('most-popular');
  const [, setCurrentImageIndices] = useState<{ [key: string]: number }>({});
  const [imageCache, setImageCache] = useState<{ [key: string]: boolean }>({});
  const [loadingImages, setLoadingImages] = useState<{ [key: string]: boolean }>({});
  const [isMobileFilterVisible, setIsMobileFilterVisible] = useState(false);

  const getNextImage = (e: React.MouseEvent, itemId: string, direction: 'next' | 'prev') => {
    e.stopPropagation();

    const property = filteredProperties.find(p => p.id === itemId);
    if (!property?.propertyPhotos) return;

    // Handle MongoDB-style photos (array of strings)
    if (Array.isArray(property.propertyPhotos)) {
      const totalImages = property.propertyPhotos.length;
      if (totalImages <= 1) return;

      setCurrentImageIndices(prev => {
        const currentIndex = prev[itemId] || 0;
        let newIndex;
        if (direction === 'next') {
          newIndex = (currentIndex + 1) % totalImages;
        } else {
          newIndex = (currentIndex - 1 + totalImages) % totalImages;
        }

        // Set loading state
        setLoadingImages(prev => ({ ...prev, [itemId]: true }));
      
        return { ...prev, [itemId]: newIndex };
      });
      return;
    }

    // Handle Firebase-style photos (object with pictureUrl)
    const photoKeys = Object.keys(property.propertyPhotos).filter(key => key.startsWith('photo'));
    const totalImages = photoKeys.length;
    if (totalImages <= 1) return;

    setCurrentImageIndices(prev => {
      const currentIndex = prev[itemId] || 0;
      let newIndex;
      if (direction === 'next') {
        newIndex = (currentIndex + 1) % totalImages;
      } else {
        newIndex = (currentIndex - 1 + totalImages) % totalImages;
      }

      // Preload the next image in sequence
      const nextIndex = (newIndex + 1) % totalImages;
      let nextUrl: string | undefined;
      
      if (property.propertyPhotos) {
        if (Array.isArray(property.propertyPhotos)) {
          nextUrl = property.propertyPhotos[nextIndex] as string;
        } else {
          nextUrl = property.propertyPhotos[`photo${nextIndex}`]?.pictureUrl;
        }
      }

      if (nextUrl) {
        preloadImage(nextUrl);
      }

      // Set loading state
      setLoadingImages(prev => ({ ...prev, [itemId]: true }));
      return { ...prev, [itemId]: newIndex };
    });
  };

  const getImageUrl = (property: PropertyType, index: number = 0) => {
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

  const preloadImage = (url: string) => {
    if (!imageCache[url]) {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        setImageCache(prev => ({ ...prev, [url]: true }));
      };
    }
  };

  const handleImageLoad = (itemId: string) => {
    setLoadingImages(prev => ({ ...prev, [itemId]: false }));
  };

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
      })) as PropertyType[];
      console.log('Updated properties data:', propertiesData);
      
      // Extract unique tags and locations from all properties
      const allTags = new Set<string>();
      const allLocations = new Set<string>();
      propertiesData.forEach(property => {
        if (Array.isArray(property.propertyTags)) {
          property.propertyTags.forEach(tag => allTags.add(tag));
        }
        if (property.propertyLocation) {
          // Standardize location format: capitalize first letter of each word
          const formattedLocation = property.propertyLocation
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          allLocations.add(formattedLocation);
        }
      });
      
      setAvailableTags(Array.from(allTags).sort());
      setAvailableLocations(Array.from(allLocations).sort());
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

  useEffect(() => {
    // Set up persistence
    import('firebase/auth').then(({ setPersistence, browserLocalPersistence }) => {
      setPersistence(auth, browserLocalPersistence);
    });

    // Set up auth state listener
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      if (user) {
        setShowAuthOverlay(false);
        setAuthError('');
      }
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      // Configure custom parameters for mobile
      provider.setCustomParameters({
        prompt: 'select_account',
        display: 'popup'
      });
      
      // Use signInWithRedirect for mobile devices
      if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        const { signInWithRedirect } = await import('firebase/auth');
        await signInWithRedirect(auth, provider);
      } else {
        // Use popup for desktop
        await signInWithPopup(auth, provider);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setAuthError(error instanceof Error ? error.message : 'Authentication failed');
      // Keep the overlay open on error
      setShowAuthOverlay(true);
    }
  };

  // Add sorting function
  const sortProperties = (properties: PropertyType[], sortType: string) => {
    switch (sortType) {
      case 'most-popular':
        // Sort by viewCount (highest to lowest)
        return [...properties].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
      case 'newest':
        // Sort by datePosted (newest to oldest)
        return [...properties].sort((a, b) => {
          const dateA = a.datePosted?.toMillis() || 0;
          const dateB = b.datePosted?.toMillis() || 0;
          return dateB - dateA;
        });
      case 'oldest':
        // Sort by datePosted (oldest to newest)
        return [...properties].sort((a, b) => {
          const dateA = a.datePosted?.toMillis() || 0;
          const dateB = b.datePosted?.toMillis() || 0;
          return dateA - dateB;
        });
      case 'price-low':
        // Sort by propertyPrice (lowest to highest)
        return [...properties].sort((a, b) => (a.propertyPrice || 0) - (b.propertyPrice || 0));
      case 'price-high':
        // Sort by propertyPrice (highest to lowest)
        return [...properties].sort((a, b) => (b.propertyPrice || 0) - (a.propertyPrice || 0));
      case 'top-rated':
        // Sort by interestedCount (highest to lowest)
        return [...properties].sort((a, b) => (b.interestedCount || 0) - (a.interestedCount || 0));
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
      filtered = filtered.filter(property => {
        const formattedPropertyLocation = property.propertyLocation
          .toLowerCase()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        return formattedPropertyLocation === activeFilters.selectedLocation;
      });
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
        property.propertyTags && Array.isArray(property.propertyTags) &&
        activeFilters.selectedTags.every(tag => property.propertyTags.includes(tag))
      );
    }

    // Apply sorting
    filtered = sortProperties(filtered, activeFilters.sortBy);

    setFilteredProperties(filtered);
  }, [properties, searchQuery, activeFilters]);

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

  const handleFilterChange = (filters: FilterType & { sortBy: string }) => {
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
          itemsSaved: arrayRemove(itemId),
          favorites: arrayRemove(itemId)
        });
        setUserFavorites(prev => prev.filter(id => id !== itemId));
      } else {
        // Add to favorites
        await updateDoc(accountRef, {
          itemsSaved: arrayUnion(itemId),
          favorites: arrayUnion(itemId)
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
        comments: {
          commentCounter: 0, // Initialize the comment counter
      },
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

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setShowAuthOverlay(false);
    }
  };

  const handlePropertyClick = async (itemId: string) => {
    if (!auth.currentUser) {
      navigate(`/property/${itemId}`);
      return;
    }

    try {
      const userRef = doc(db, 'accounts', auth.currentUser.uid);
      const userDoc = await getDoc(userRef);
      const propertyRef = doc(db, 'properties', itemId);
      
      if (userDoc.exists()) {
        const viewedProperties = userDoc.data().viewedProperties || [];
        if (!viewedProperties.includes(itemId)) {
          await Promise.all([
            updateDoc(userRef, { viewedProperties: arrayUnion(itemId) }),
            updateDoc(propertyRef, { viewCount: increment(1) })
          ]);
        }
      } else {
        await Promise.all([
          setDoc(userRef, { viewedProperties: [itemId] }, { merge: true }),
          updateDoc(propertyRef, { viewCount: increment(1) })
        ]);
      }
    } catch (error) {
      console.error('Error updating view count:', error);
    }
    
    navigate(`/property/${itemId}`);
  };

  return (
    <div className="homepage-container">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="logo">
          <Link to="/" onClick={() => {
            setSearchQuery('');
            setActiveFilters({
              priceRange: { min: 0, max: 1000000 },
              selectedTags: [],
              selectedLocation: '',
              selectedPropertyType: '',
              sortBy: 'most-popular'
            });
          }}> 
            <img src={logoSvg} alt="StayEase Logo" className="logo-image" />
          </Link>
        </div>

        <div className="nav-right">
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

      {/* Centered Search Bar */}
      <div className="centered-search-bar">
        <div className="search-bar-container">
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
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          {/* Add Filter Icon for mobile */}
          <button 
            className="mobile-filter-button"
            onClick={() => setIsMobileFilterVisible(!isMobileFilterVisible)}
            aria-label="Toggle filters"
          >
            <svg 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <line x1="4" y1="21" x2="20" y2="21" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="3" x2="20" y2="3" />
            </svg>
          </button>
        </div>
      </div>

      <div className="homepage-layout">
        {/* Filters Sidebar */}
        <div className={`filters-sidebar ${isMobileFilterVisible ? 'mobile-visible' : ''}`}>
          <button 
            className="close-filter-button"
            onClick={() => setIsMobileFilterVisible(false)}
          >
            ×
          </button>
          <FilterMenu 
            onFilterChange={handleFilterChange} 
            isLoading={isLoading}
            availableTags={availableTags}
            availableLocations={availableLocations}
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
                  onClick={() => handlePropertyClick(item.id)}
                >
                  <div className="image-container">
                    <img 
                      src={getImageUrl(item)} 
                      alt={item.propertyName} 
                      className={`property-image ${loadingImages[item.id] ? 'loading' : ''}`}
                      onLoad={() => handleImageLoad(item.id)}
                    />
                    {loadingImages[item.id] && (
                      <div className="image-loading-overlay">
                        <div className="loading-spinner"></div>
                      </div>
                    )}
                  </div>
                  <button
                      className="favorite-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (user) {
                          handleFavorite(e, item.id, user);
                        } else {
                          setShowAuthOverlay(true);
                        }
                      }}
                    >
                      {userFavorites.includes(item.id) ? '❤️' : '🤍'}
                    </button>
                  <div className="property-info">
                    <div className="property-name">{item.propertyName}</div>
                    <div className="homepage-property-location">{item.propertyLocation}</div> {/* Updated class name */}
                    <div className="property-type">{item.propertyType}</div>
                    <div className="property-price">₱{(item.propertyPrice ?? item.rent ?? 0).toLocaleString()}/month</div>
                  </div>
                  

                  {Object.keys(item.propertyPhotos || {}).filter(key => key.startsWith('photo')).length > 1 && (
      <>

        <button 
          className="nav-button prev"
          onClick={(e) => getNextImage(e, item.id, 'prev')}
        >
          ‹
        </button>
        <button 
          className="nav-button next"
          onClick={(e) => getNextImage(e, item.id, 'next')}
        >
          ›
        </button>
      </>

    )}
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
                {authError && <div className="error-message">{authError}</div>}

                <button onClick={handleGoogleSignIn} className="google-button">
                  Continue with Google
                </button>
              </>

            )}
          </div>
        </div>
      )}

      {/* Add Chat Components when user is logged in */}
      {user && (
        <>
          <ChatHistory />
          <ChatManager />
        </>
      )}
    </div>
  );
}

export default HomePage;