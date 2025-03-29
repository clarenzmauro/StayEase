import { useState, useEffect } from "react";
import "./HomePage.css";
import { FilterMenu } from "./FilterMenu.jsx";
import { Link } from "react-router-dom";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase/config.js";
import { auth } from "../../firebase/config";
import {
  User as FirebaseUser,
  browserLocalPersistence,
  setPersistence,
} from "firebase/auth";
import logoSvg from "../../assets/STAY.svg";
import { API_URL } from "../../config";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [properties, setProperties] = useState<PropertyType[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<PropertyType[]>(
    []
  );
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [activeFilters, setActiveFilters] = useState<
    FilterType & { sortBy: string }
  >({
    priceRange: { min: 0, max: 1000000 },
    selectedTags: [],
    selectedLocation: "",
    selectedPropertyType: "",
    sortBy: "most-popular",
  });
  const [, setShowAuthOverlay] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [, setUserFavorites] = useState<string[]>([]);
  const [, setAuthError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileFilterVisible, setIsMobileFilterVisible] = useState(false);

  const getImageUrl = (property: PropertyType, index: number = 0) => {
    if (!property.propertyPhotos) return "";

    // Handle MongoDB-style photos (array of strings)
    if (Array.isArray(property.propertyPhotos)) {
      const photoId = property.propertyPhotos[index];
      return `${API_URL}/api/property-photos/${photoId}/image`;
    }

    // Handle Firebase-style photos (object with pictureUrl)
    const photoKeys = Object.keys(property.propertyPhotos).filter((key) =>
      key.startsWith("photo")
    );
    const photoKey = photoKeys[index];
    return property.propertyPhotos[photoKey]?.pictureUrl || "";
  };

  // Set up real-time listener for properties
  useEffect(() => {
    console.log("Setting up real-time listener for properties...");
    const propertiesCollection = collection(db, "properties");

    setIsLoading(true);
    // Create real-time listener
    const unsubscribe = onSnapshot(
      propertiesCollection,
      (snapshot) => {
        console.log("Received database update:", snapshot.size, "properties");
        const propertiesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as PropertyType[];
        console.log("Updated properties data:", propertiesData);

        // Extract unique tags and locations from all properties
        const allTags = new Set<string>();
        const allLocations = new Set<string>();
        propertiesData.forEach((property) => {
          if (Array.isArray(property.propertyTags)) {
            property.propertyTags.forEach((tag) => allTags.add(tag));
          }
          if (property.propertyLocation) {
            // Standardize location format: capitalize first letter of each word
            const formattedLocation = property.propertyLocation
              .toLowerCase()
              .split(" ")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ");
            allLocations.add(formattedLocation);
          }
        });

        setAvailableTags(Array.from(allTags).sort());
        setAvailableLocations(Array.from(allLocations).sort());
        setProperties(propertiesData);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error in real-time listener:", error);
        setIsLoading(false);
      }
    );

    // Cleanup listener on component unmount
    return () => {
      console.log("Cleaning up real-time listener...");
      unsubscribe();
    };
  }, []); // Empty dependency array means this only runs once on mount

  useEffect(() => {
    let isSubscribed = true;

    const initializeAuth = async () => {
      console.log("Initializing auth...");

      try {
        // Set persistence explicitly
        await setPersistence(auth, browserLocalPersistence);
        console.log("Persistence set to browserLocal");

        // Check for stored auth state
        const currentUser = auth.currentUser;
        console.log("Current user from auth:", currentUser?.email);

        if (currentUser && isSubscribed) {
          console.log("User already signed in:", currentUser.email);
          setUser(currentUser);
          setShowAuthOverlay(false);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        if (isSubscribed) {
          setAuthError(
            error instanceof Error ? error.message : "Authentication failed"
          );
        }
      }
    };

    // Initialize auth immediately
    initializeAuth();

    // Set up auth state listener
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      console.log("Auth state changed:", user?.email);

      if (!isSubscribed) return;

      if (user) {
        try {
          console.log("User authenticated:", user.email);
          setUser(user);
          setShowAuthOverlay(false);
          setAuthError("");

          const userDoc = await getDoc(doc(db, "accounts", user.uid));
          if (!userDoc.exists()) {
            console.log("Creating user document...");
            await createUserDocument(user);
          }
        } catch (error) {
          console.error("Error handling auth state change:", error);
        }
      } else {
        console.log("User signed out");
        setUser(null);
      }
    });

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const loadUserFavorites = async () => {
      if (user) {
        try {
          const accountRef = doc(db, "accounts", user.uid);
          const accountDoc = await getDoc(accountRef);
          const favorites = accountDoc.data()?.itemsSaved || [];
          setUserFavorites(favorites);
        } catch (error) {
          console.error("Error loading user favorites:", error);
        }
      } else {
        setUserFavorites([]); // Clear favorites when user logs out
      }
    };

    loadUserFavorites();
  }, [user]); // Dependency on user ensures this runs when user logs in/out

  // Add sorting function
  const sortProperties = (properties: PropertyType[], sortType: string) => {
    switch (sortType) {
      case "most-popular":
        // Sort by viewCount (highest to lowest)
        return [...properties].sort(
          (a, b) => (b.viewCount || 0) - (a.viewCount || 0)
        );
      case "newest":
        // Sort by datePosted (newest to oldest)
        return [...properties].sort((a, b) => {
          const dateA = a.datePosted?.toMillis() || 0;
          const dateB = b.datePosted?.toMillis() || 0;
          return dateB - dateA;
        });
      case "oldest":
        // Sort by datePosted (oldest to newest)
        return [...properties].sort((a, b) => {
          const dateA = a.datePosted?.toMillis() || 0;
          const dateB = b.datePosted?.toMillis() || 0;
          return dateA - dateB;
        });
      case "price-low":
        // Sort by propertyPrice (lowest to highest)
        return [...properties].sort(
          (a, b) => (a.propertyPrice || 0) - (b.propertyPrice || 0)
        );
      case "price-high":
        // Sort by propertyPrice (highest to lowest)
        return [...properties].sort(
          (a, b) => (b.propertyPrice || 0) - (a.propertyPrice || 0)
        );
      case "top-rated":
        // Sort by interestedCount (highest to lowest)
        return [...properties].sort(
          (a, b) => (b.interestedCount || 0) - (a.interestedCount || 0)
        );
      default:
        return properties;
    }
  };

  // Filter properties based on search and filters
  useEffect(() => {
    let filtered = [...properties];

    // 1. Apply ALL filters first
    // Price range filter
    filtered = filtered.filter(
      (property) =>
        property.propertyPrice >= activeFilters.priceRange.min &&
        property.propertyPrice <= activeFilters.priceRange.max
    );

    // Location filter
    if (activeFilters.selectedLocation) {
      filtered = filtered.filter((property) => {
        const formattedPropertyLocation = property.propertyLocation
          .toLowerCase()
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
        return formattedPropertyLocation === activeFilters.selectedLocation;
      });
    }

    // Property type filter
    if (activeFilters.selectedPropertyType) {
      filtered = filtered.filter(
        (property) =>
          property.propertyType === activeFilters.selectedPropertyType
      );
    }

    // Tags filter
    if (activeFilters.selectedTags.length > 0) {
      filtered = filtered.filter(
        (property) =>
          property.propertyTags &&
          Array.isArray(property.propertyTags) &&
          activeFilters.selectedTags.every((tag) =>
            property.propertyTags.includes(tag)
          )
      );
    }

    // 2. THEN apply search filter on the already filtered properties
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (property) =>
          property.propertyName.toLowerCase().includes(query) ||
          property.propertyLocation.toLowerCase().includes(query) ||
          (property.owner &&
            typeof property.owner === "string" &&
            property.owner.toLowerCase().includes(query))
      );
    }

    // 3. Finally apply sorting
    filtered = sortProperties(filtered, activeFilters.sortBy);

    // Update filtered properties state
    setFilteredProperties(filtered);
  }, [properties, searchQuery, activeFilters]); // Dependencies for the effect

  const handleFilterChange = (filters: FilterType & { sortBy: string }) => {
    setActiveFilters(filters);
  };

  interface User {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
  }

  const createUserDocument = async (user: User) => {
    const accountRef = doc(db, "accounts", user.uid);
    const accountSnap = await getDoc(accountRef);

    if (!accountSnap.exists()) {
      const accountData = {
        chatMates: {},
        convoId: "",
        comments: {
          commentCounter: 0,
        },
        contactNumber: "",
        dashboardId: "",
        dateJoined: serverTimestamp(),
        description: "",
        email: user.email || "",
        followerCount: 0,
        isOwner: false,
        itemsInterested: [],
        itemsSaved: [],
        profilePicUrl: user.photoURL || "",
        rating: 0,
        socials: {
          Facebook: "",
          Instagram: "",
          X: "",
        },
        testField: "",
        username: user.displayName || "",
      };

      try {
        await setDoc(accountRef, accountData);
        console.log("User document created with Google profile data");
      } catch (error) {
        console.error("Error creating account document:", error);
      }
    }
  };

  const NavBar = () => {
    return (
      <nav className="flex justify-between">
        <Link
          to="/"
          onClick={() => {
            setSearchQuery("");
            setActiveFilters({
              priceRange: { min: 0, max: 1000000 },
              selectedTags: [],
              selectedLocation: "",
              selectedPropertyType: "",
              sortBy: "most-popular",
            });
          }}
        >
          <img
            className="h-10 md:h-12 xl:h-14"
            src={logoSvg}
            alt="StayEase logo"
          />
        </Link>

        <div className="hidden xl:block w-1/2">
          <SearchBar />
        </div>

        {/* TODO: conditional display (sign in and other buttons) */}
        {/* <button className="flex items-center justify-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg shadow-md hover:bg-gray-100 transition text-sm font-bold">
          <img
            className="h-6"
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/768px-Google_%22G%22_logo.svg.png"
            alt=""
          />
          <div>
            <span>Sign in</span>
            <span className="hidden md:inline-block">&nbsp;with Google</span>
          </div>
        </button> */}

        <div className="text-gray-700 flex gap-4 md:gap-6 lg:gap-8 items-center text-2xl">
          <i className="fa-regular fa-message"></i>
          <i className="fa-regular fa-bell"></i>
          <i className="fa-regular fa-user"></i>
        </div>
      </nav>
    );
  };

  const SearchBar = () => {
    // TODO: Search bar function
    return (
      <div className="relative w-full">
        <input
          className="w-full pl-10 pr-4 py-2 md:py-4 border border-gray-300 rounded-lg shadow-sm"
          type="text"
          placeholder="Search..."
        />
        <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
      </div>
    );
  };

  const Filter = () => {
    return (
      <button
        className="font-semibold whitespace-nowrap text-gray-700"
        type="button"
        onClick={() => setIsMobileFilterVisible(!isMobileFilterVisible)}
      >
        <i className="fa-solid fa-filter me-2"></i>Filter
      </button>
    );
  };

  const SortByDropdown = () => (
    // TODO: Sort function
    <div className="flex items-center gap-2 text-gray-700 text-sm font-medium p-0">
      <label htmlFor="sort">Sort by:</label>

      <select id="sort" className="focus:outline-none focus:ring-0">
        <option value="price-asc">Low to High</option>
        <option value="price-desc">High to Low</option>
        <option value="name-asc">A - Z</option>
        <option value="name-desc">Z - A</option>
        <option value="newest">Newest</option>
        <option value="oldest">Oldest</option>
      </select>
    </div>
  );

  return (
    <>
      <header className="p-4 md:px-10 md:py-6 xl:px-16 xl:py-8 sticky top-0 bg-white w-full">
        <NavBar />

        <div className="flex justify-between items-center gap-4 mt-4 xl:hidden">
          <SearchBar />
          <Filter />
        </div>
      </header>

      {isMobileFilterVisible && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsMobileFilterVisible(false)} // Close when clicking the backdrop
        />
      )}

      <section
        className={`fixed top-0 left-0 h-full w-10/12 md:w-1/2 bg-white shadow-lg transition-transform duration-300 ${
          isMobileFilterVisible ? "translate-x-0" : "-translate-x-full"
        } z-50`}
      >
        <FilterMenu
          onFilterChange={handleFilterChange}
          isLoading={isLoading}
          availableTags={availableTags}
          availableLocations={availableLocations}
          properties={properties}
        />
      </section>

      <div className="flex p-4 md:px-10 xl:px-16 bg-gray-50">
        <div className="hidden xl:inline-block xl:w-1/4 me-4">
          <FilterMenu
            onFilterChange={handleFilterChange}
            isLoading={isLoading}
            availableTags={availableTags}
            availableLocations={availableLocations}
            properties={properties}
          />
        </div>

        <main className="xl:w-3/4">
          <div className="flex justify-between items-center">
            <p className="text-lg font-medium text-gray-700">
              {/* TODO: count results */}
              <span className="font-bold">XX</span> results found
            </p>

            <SortByDropdown />
          </div>

          {filteredProperties.length === 0 ? (
            <div className="text-center text-gray-500 mt-4">
              No properties found matching your search criteria.
            </div>
          ) : (
            <section className="gap-2 md:gap-3 xl:gap-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 mt-4">
              {filteredProperties.map((property) => (
                <Link 
                  to={`/property/${property.id}`} 
                  key={property.id} 
                  className="bg-white rounded-b-lg hover:shadow-md transition-shadow duration-300 cursor-pointer"
                >
                  <img
                    className="aspect-square object-cover rounded-t-xl"
                    src={getImageUrl(property)}
                    alt={property.propertyName}
                  />

                  <div className="text-[9px] md:text-[10px] p-2 md:p-3">
                    <p className="text-xs md:text-sm font-bold truncate">
                      {property.propertyName}
                    </p>

                    <p className="truncate-multiline">
                      <i className="fa-solid fa-location-dot me-1 hidden"></i>
                      {property.propertyLocation}
                    </p>

                    <div className="pt-1 flex justify-between items-center">
                      <div className="flex">
                        <p className="me-2">
                          {/* TODO: Display ratings */}
                          <i className="fa-solid fa-star text-yellow-300 me-1"></i>
                          5.0
                        </p>
                      </div>

                      <p>
                        <span className="text-xs md:text-sm font-bold truncate">
                          ₱
                          {(
                            property.propertyPrice ??
                            property.rent ??
                            0
                          ).toLocaleString()}
                        </span>
                        /month
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </section>
          )}
        </main>
      </div>
    </>
  );
}

export default HomePage;

/*
<div className="homepage-container">
  ----------------------------------------------------------Navigation Bar
  <nav className={`navbar ${isLoading ? 'skeleton' : ''}`}>
    <div className={`nav-right ${isLoading ? 'skeleton' : ''}`}>
      <div
        className={`user-icon ${isLoading ? 'skeleton' : ''}`}
        onClick={() => {
          if (!isLoading) {
            if (user) {
              navigate('/account');
            } else {
              setShowAuthOverlay(true);
            }
          }
        }}
        role={isLoading ? undefined : "button"}
        aria-label={isLoading ? "Loading" : "Account"}
      >
        {!isLoading && (
          user ? (
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
          )
        )}
      </div>
    </div>
  </nav>

  ---------------------------------------------------------Centered Search Bar
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
          // Add Filter Icon for mobile
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
        // Filters Sidebar
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
        properties={properties}
      />
    </div>

    <div className="main-content">
          // Properties Grid
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
          filteredProperties.map((property) => (
            <div
              key={property.id}
              className="property-card"
              onClick={() => handlePropertyClick(property.id)}
            >
              <div className="image-container">
                {isNewProperty(property.datePosted) && (
                  <div className="new-tag">New</div>
                )}
                <img
                  src={getImageUrl(property)}
                  alt={property.propertyName}
                  className={`property-image ${loadingImages[property.id] ? 'loading' : ''}`}
                  onLoad={() => handleImageLoad(property.id)}
                />
                {loadingImages[property.id] && (
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
                    handleFavorite(e, property.id, user);
                  } else {
                    setShowAuthOverlay(true);
                  }
                }}
              >
                {userFavorites.includes(property.id) ? '❤️' : '🤍'}
              </button>
              <div className="property-info">
                <div className="property-name">{property.propertyName}</div>
                    // Updated class name
                <div className="homepage-property-location">{property.propertyLocation}</div>
                <div className="property-type">{property.propertyType}</div>
                <div className="property-price">₱{(property.propertyPrice ?? property.rent ?? 0).toLocaleString()}/month</div>
              </div>


              {Object.keys(property.propertyPhotos || {}).filter(key => key.startsWith('photo')).length > 1 && (
                <>

                  <button
                    className="nav-button prev"
                    onClick={(e) => getNextImage(e, property.id, 'prev')}
                  >
                    ‹
                  </button>
                  <button
                    className="nav-button next"
                    onClick={(e) => getNextImage(e, property.id, 'next')}
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

      // Item Details Overlay
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

      // Add Chat Components when user is logged in
  {user && (
    <>
      <ChatHistory />
      <ChatManager />
    </>
  )}
</div>
*/
