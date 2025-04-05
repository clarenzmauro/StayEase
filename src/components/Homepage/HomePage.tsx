import { useState, useEffect } from "react";
import { FilterMenu } from "./FilterMenu.jsx";
import { Link, useNavigate } from "react-router-dom";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase/config.js";
import { auth } from "../../firebase/config";
import {
  User as FirebaseUser,
  browserLocalPersistence,
  setPersistence,
  GoogleAuthProvider,
  signInWithPopup,
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
  toMillis: () => number;
  viewCount?: number;
  interestedCount?: number;
  propertyPhotos?: { [key: string]: { pictureUrl: string } } | string[];
  isHidden?: boolean;
  isDisabled?: boolean;
  rent?: number;
  pictureUrl?: string;
  [key: string]: any;
}

interface Notification {
  message: string;
  type: string;
  propertyName?: string;
  userName?: string;
  timestamp: number;
  read?: boolean;
}

// Add global type declaration for the search timeout
declare global {
  interface Window {
    searchTimeout?: NodeJS.Timeout;
  }
}

export function HomePage(): JSX.Element {
  const navigate = useNavigate();
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
    sortBy: "newest",
  });
  const [, setShowAuthOverlay] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [, setUserFavorites] = useState<string[]>([]);
  const [, setAuthError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileFilterVisible, setIsMobileFilterVisible] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const getImageUrl = (property: PropertyType, index = 0): string => {
    // This function uses API_URL from config, which defaults the server port to 3000, to fetch images.
    if (!property.propertyPhotos) return "";

    // Handle MongoDB-style photos (array of strings)
    if (Array.isArray(property.propertyPhotos)) {
      const photoId = property.propertyPhotos[index];
      // Use relative paths in production (API_URL will be empty string)
      // Otherwise use the full API_URL path
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

  useEffect(() => {
    const fetchNotifications = async () => {
      if (user) {
        const accountRef = doc(db, "accounts", user.uid);
        const accountDoc = await getDoc(accountRef);
        const userNotifications = accountDoc.data()?.notifications || [];
        setNotifications(userNotifications);
        
        // Calculate unread count
        const unread = userNotifications.filter((notif: Notification) => !notif.read).length;
        setUnreadCount(unread);
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
    };

    fetchNotifications();
  }, [user]);

  const markNotificationsAsRead = async () => {
    if (!user) return;

    try {
      const accountRef = doc(db, "accounts", user.uid);
      await updateDoc(accountRef, {
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

  const clearAllNotifications = async () => {
    if (!user) return;

    try {
      const accountRef = doc(db, "accounts", user.uid);
      await updateDoc(accountRef, {
        notifications: []
      });
      setNotifications([]);
      setUnreadCount(0);
      setShowNotifications(false);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

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

    // First filter out hidden and disabled properties
    filtered = filtered.filter(property => !property.isHidden && !property.isDisabled);

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
    const handleGoogleSignIn = async () => {
      try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        // User will be set by the auth state listener
      } catch (error) {
        console.error("Google sign-in error:", error);
        setAuthError(error instanceof Error ? error.message : "Authentication failed");
      }
    };

    const handleUserIconClick = () => {
      if (user) {
        navigate('/account');
      } else {
        handleGoogleSignIn();
      }
    };

    const handleBellClick = () => {
      if (!user) {
        handleGoogleSignIn();
        return;
      }
      setShowNotifications(!showNotifications);
      if (!showNotifications) {
        markNotificationsAsRead();
      }
    };

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
              sortBy: "newest",
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

        <div className="text-gray-700 flex gap-4 md:gap-6 lg:gap-8 items-center text-2xl">
          <i className="fa-regular fa-message"></i>
          <div className="relative">
            <i 
              className="fa-regular fa-bell cursor-pointer hover:text-gray-500 transition-colors"
              onClick={handleBellClick}
            ></i>
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                <div className="p-4 border-b">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Notifications</h3>
                    <button
                      onClick={clearAllNotifications}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Clear all
                    </button>
                  </div>
                </div>
                <div className="divide-y">
                  {notifications.length > 0 ? (
                    notifications.map((notification, index) => (
                      <div
                        key={index}
                        className={`p-4 hover:bg-gray-50 ${
                          !notification.read ? 'bg-blue-50' : ''
                        }`}
                      >
                        <p className="text-sm text-gray-800">{notification.message}</p>
                        <div className="mt-1 text-xs text-gray-500 flex justify-between">
                          <span>{notification.propertyName}</span>
                          <span>
                            {new Date(notification.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      No notifications
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <i 
            className="fa-regular fa-user cursor-pointer hover:text-gray-500 transition-colors"
            onClick={handleUserIconClick}
            title={user ? "My Profile" : "Sign in with Google"}
          ></i>
        </div>
      </nav>
    );
  };

  const SearchBar = () => {
    // Initialize inputValue from the current searchQuery
    const [inputValue, setInputValue] = useState(searchQuery);
    
    // Update inputValue if searchQuery changes externally
    useEffect(() => {
      setInputValue(searchQuery);
    }, [searchQuery]);
    
    // Debounce search to avoid excessive filtering while typing
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      
      // Clear any existing timeout
      if (window.searchTimeout) {
        clearTimeout(window.searchTimeout);
      }
      
      // Set a new timeout
      window.searchTimeout = setTimeout(() => {
        setSearchQuery(newValue);
      }, 500);
    };
    
    const handleClear = () => {
      setInputValue("");
      setSearchQuery("");
      if (window.searchTimeout) {
        clearTimeout(window.searchTimeout);
      }
    };
    
    return (
      <div className="relative w-full">
        <input
          className="w-full pl-10 pr-10 py-2 md:py-4 border border-gray-300 rounded-lg shadow-sm"
          type="text"
          placeholder="Search properties by name or location..."
          value={inputValue}
          onChange={handleInputChange}
        />
        <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
        
        {inputValue && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <i className="fa-solid fa-times"></i>
          </button>
        )}
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
    <div className="flex items-center gap-2 text-gray-700 text-sm font-medium p-0">
      <label htmlFor="sort">Sort by:</label>

      <select 
        id="sort" 
        className="focus:outline-none focus:ring-0"
        value={activeFilters.sortBy}
        onChange={(e) => {
          setActiveFilters(prev => ({
            ...prev,
            sortBy: e.target.value
          }));
        }}
      >
        <option value="newest">Newest</option>
        <option value="oldest">Oldest</option>
        <option value="price-low">Price: Low to High</option>
        <option value="price-high">Price: High to Low</option>
        <option value="most-popular">Most Popular</option>
        <option value="top-rated">Top Rated</option>
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
              <span className="font-bold">{filteredProperties.length}</span> results found
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
