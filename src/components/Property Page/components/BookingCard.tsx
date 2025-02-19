import { useState, useEffect } from 'react';
import './BookingCard.css';

interface BookingCardProps {
  property: {
    propertyPrice: number;
    dateAvailability: { seconds: number };
    maxOccupants: number;
    floorLevel: string | number;
    furnishingStatus: string;
    propertySize: number;
    propertyLifestyle: string;
    propertyType: string;
    securityDeposit: number;
    leaseTerm: number;
    allowViewing: boolean;
    interestedApplicants?: string[];
  };
  onInterestedClick: () => void;
  isInterested: boolean;
}

const BookingCard = ({ property, onInterestedClick, isInterested }: BookingCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 480);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className={`booking-card ${isMobile ? 'mobile' : ''} ${isExpanded ? 'expanded' : ''}`}>
      <div className="mobile-header" onClick={() => isMobile && setIsExpanded(!isExpanded)}>
        <div className="price-info">
          <span className="price">₱{property.propertyPrice.toLocaleString()}</span>
          <span className="price-period">/month</span>
        </div>
        {isMobile && !isExpanded && (
          <button 
            className={`interested-button ${isInterested ? 'interested' : ''}`} 
            onClick={(e) => {
              e.stopPropagation();
              onInterestedClick();
            }}
          >
            {isInterested ? 'Interested' : 'Interested'}
          </button>
        )}
      </div>

      <div className="expandable-content">
        <div className="booking-details">
          <div className="detail-row">
            <span>Available from:</span>
            <span>{new Date(property.dateAvailability?.seconds * 1000).toLocaleDateString()}</span>
          </div>
          <div className="detail-row">
            <span>Max occupants:</span>
            <span>{property.maxOccupants}</span>
          </div>
          <div className="detail-row">
            <span>Floor Level:</span>
            <span>{property.floorLevel}</span>
          </div>
          <div className="detail-row">
            <span>Furnishing:</span>
            <span>{property.furnishingStatus}</span>
          </div>
          <div className="detail-row">
            <span>Lifestyle:</span>
            <span>{property.propertyLifestyle}</span>
          </div>
          <div className="detail-row">
            <span>Size:</span>
            <span>{property.propertySize} sqm</span>
          </div>
          <div className="detail-row">
            <span>Allow Viewing:</span>
            <span>{property.allowViewing ? 'Yes' : 'No'}</span>
          </div>
        </div>

        {(!isMobile || isExpanded) && (
          <button 
            className={`interested-button ${isInterested ? 'interested' : ''}`} 
            onClick={onInterestedClick}
          >
            {isInterested ? 'Interested' : 'Interested'}
          </button>
        )}
        
        <div className="total-calculation">
          <div className="detail-row">
            <span>Security Deposit:</span>
            <span>₱{property.securityDeposit.toLocaleString()}</span>
          </div>
          <div className="detail-row">
            <span>Lease Term:</span>
            <span>{property.leaseTerm} months</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingCard;