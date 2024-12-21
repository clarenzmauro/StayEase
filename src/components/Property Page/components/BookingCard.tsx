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

      <div className="booking-dates">
        <div>Available from: {new Date(property.availability?.seconds * 1000).toLocaleDateString()}</div>
      </div>

      <div className="guests-input">
        <div>Maximum occupants: {property.maxOccupants}</div>
      </div>

      <div className="floor-level">
        <div>Floor Level: {property.floorLevel}</div>
      </div>

      <div className="furnishing">
        <div>Furnishing: {property.furnishing}</div>
      </div>

      <div className="pet-friendly">
        <div>Pet Friendly: {property.petFriendly ? 'Yes' : 'No'}</div>
      </div>

      <div className="property-size">
        <div>Property Size: {property.propertySize}</div>
      </div>

      <button 
        className="interested-button" 
        onClick={onInterestedClick}
      >
        Interested
      </button>

      <div className="total-calculation">
        <div>Security Deposit: ₱{property.deposit}</div>
        <div>Lease Term: {property.leaseTerm} months</div>
      </div>
    </div>
  );
};

export default BookingCard;
