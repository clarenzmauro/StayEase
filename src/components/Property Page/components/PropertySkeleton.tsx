const PropertySkeleton = () => {
    return (
      <>
        {/* Navbar Skeleton */}
        <div className="navbar skeleton-navbar">
          <div className="nav-left">
            <div className="skeleton-logo"></div>
          </div>
          <div className="nav-right">
            <div className="skeleton-nav-item"></div>
            <div className="skeleton-nav-item"></div>
            <div className="skeleton-user"></div>
          </div>
        </div>
  
        <div className="property-page skeleton-wrapper">
          {/* Title Skeleton */}
          <div className="skeleton-header">
            <div className="skeleton-title"></div>
          </div>
  
          {/* Image Gallery Skeleton */}
          <div className="skeleton-gallery">
            <div className="skeleton-main-image"></div>
            <div className="skeleton-small-images">
              <div className="skeleton-image"></div>
              <div className="skeleton-image"></div>
              <div className="skeleton-image"></div>
              <div className="skeleton-image"></div>
            </div>
          </div>
  
          {/* Content Skeleton */}
          <div className="skeleton-content">
            <div className="skeleton-info">
              <div className="skeleton-section">
                <div className="skeleton-text-long"></div>
                <div className="skeleton-text-medium"></div>
                <div className="skeleton-text-long"></div>
              </div>
              
              <div className="skeleton-section">
                <div className="skeleton-text-medium"></div>
                <div className="skeleton-text-long"></div>
                <div className="skeleton-text-medium"></div>
              </div>
            </div>
  
            {/* Booking Card Skeleton */}
            <div className="skeleton-booking-card">
              <div className="skeleton-price"></div>
              <div className="skeleton-details">
                <div className="skeleton-detail-row"></div>
                <div className="skeleton-detail-row"></div>
                <div className="skeleton-detail-row"></div>
              </div>
              <div className="skeleton-button"></div>
            </div>
          </div>
        </div>
      </>
    );
  };
  
  export default PropertySkeleton; 