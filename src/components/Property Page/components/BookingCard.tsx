interface BookingCardProps {
  property: {
    rent: number;
    availability: { seconds: number };
    maxOccupants: number;
    floorLevel: string | number;
    furnishing: string;
    petFriendly: boolean;
    propertySize: string;
    deposit: number;
    leaseTerm: number;
  };
  onInterestedClick: () => void;
}

const BookingCard = ({ property, onInterestedClick }: BookingCardProps) => {
  return (
    <div className="booking-card">
      <div className="price-info">
        <span className="price">₱{property.rent}</span>
        <span className="price-period">/month</span>
      </div>

      <div className="booking-details">
        <div className="detail-row">
          <span>Available from:</span>
          <span>{new Date(property.availability?.seconds * 1000).toLocaleDateString()}</span>
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
          <span>{property.furnishing}</span>
        </div>
        <div className="detail-row">
          <span>Pet Friendly:</span>
          <span>{property.petFriendly ? 'Yes' : 'No'}</span>
        </div>
        <div className="detail-row">
          <span>Size:</span>
          <span>{property.propertySize}</span>
        </div>
      </div>

      <button className="interested-button" onClick={onInterestedClick}>
        Interested
      </button>

      <div className="total-calculation">
        <div className="detail-row">
          <span>Security Deposit:</span>
          <span>₱{property.deposit}</span>
        </div>
        <div className="detail-row">
          <span>Lease Term:</span>
          <span>{property.leaseTerm} months</span>
        </div>
      </div>
    </div>
  );
};

export default BookingCard;