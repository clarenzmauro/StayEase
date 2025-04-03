import React, { useState } from 'react';
import { doc, updateDoc, arrayRemove, getDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import ApplicantDetails from '../ApplicantDetails';
import './ShowApplicants.css';

interface ShowApplicantsProps {
  show: boolean;
  onClose: () => void;
  interestedApplicants: string[];
  propertyId: string;
  setInterestedApplicants: (applicants: string[]) => void;
}

const ShowApplicants: React.FC<ShowApplicantsProps> = ({ 
  show, 
  onClose, 
  interestedApplicants,
  propertyId,
  setInterestedApplicants
}) => {
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [applicantStatuses, setApplicantStatuses] = useState<{ [key: string]: string }>({});

  // Fetch applicant statuses when component mounts
  React.useEffect(() => {
    const fetchApplicantStatuses = async () => {
      const propertyRef = doc(db, 'properties', propertyId);
      const propertyDoc = await getDoc(propertyRef);
      if (propertyDoc.exists()) {
        const propertyData = propertyDoc.data();
        setApplicantStatuses(propertyData.applicantStatuses || {});
      }
    };
    fetchApplicantStatuses();
  }, [propertyId]);

  const handleAcceptApplicant = async (applicantId: string) => {
    try {
      setLoading(prev => ({ ...prev, [applicantId]: true }));
      
      const propertyRef = doc(db, 'properties', propertyId);
      const applicantRef = doc(db, 'accounts', applicantId);

      // Get current property data
      const propertyDoc = await getDoc(propertyRef);
      if (!propertyDoc.exists()) return;
      
      // Get property name and owner for notifications
      const propertyData = propertyDoc.data();
      const propertyName = propertyData.propertyName;
      const ownerId = propertyData.ownerId;
      const maxOccupants = propertyData.maxOccupants || 1;
      const acceptedApplicants = Object.entries(propertyData.applicantStatuses || {}).filter(([_, status]) => status === 'accepted').length;

      if (!ownerId) {
        console.error('Property owner not found');
        return;
      }

      // Check if accepting this applicant would exceed max occupants
      if (acceptedApplicants >= maxOccupants) {
        alert(`Cannot accept more applicants. The property has reached its maximum occupancy of ${maxOccupants}.`);
        return;
      }

      // Update status without removing from interested applicants
      await updateDoc(propertyRef, {
        [`applicantStatuses.${applicantId}`]: 'accepted'
      });

      // Update local state
      setApplicantStatuses(prev => ({
        ...prev,
        [applicantId]: 'accepted'
      }));
      
      // Update applicant's status and add notification
      await updateDoc(applicantRef, {
        [`applicationStatuses.${propertyId}`]: 'accepted',
        notifications: arrayUnion({
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          message: `Your interest to the property ${propertyName} has been accepted! Please coordinate with the property owner and thank you for using our website!`,
          timestamp: Date.now(),
          read: false,
          type: 'application',
          propertyName: propertyName
        })
      });

      // Add notification for owner
      const ownerRef = doc(db, 'accounts', ownerId);
      await updateDoc(ownerRef, {
        notifications: arrayUnion({
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          message: `You accepted an applicant's interest to the property ${propertyName}! Please coordinate with them and thank you for using our website!`,
          timestamp: Date.now(),
          read: false,
          type: 'application',
          propertyName: propertyName
        })
      });

      // Check if this acceptance fills up the property
      const newAcceptedCount = acceptedApplicants + 1;
      if (newAcceptedCount >= maxOccupants) {
        // Disable the property
        await updateDoc(propertyRef, {
          isDisabled: true
        });

        // Notify owner about property being disabled
        await updateDoc(ownerRef, {
          notifications: arrayUnion({
            id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            message: `The property ${propertyName} has reached your set maximum occupants and is now disabled. Go to your dashboard if you want to re-enable the listing.`,
            timestamp: Date.now(),
            read: false,
            type: 'property_disabled',
            propertyName: propertyName
          })
        });
      }
      
    } catch (error) {
      console.error('Error accepting applicant:', error);
      alert('Failed to accept applicant. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, [applicantId]: false }));
    }
  };
  
  const handleRemoveAcceptance = async (applicantId: string) => {
    try {
      setLoading(prev => ({ ...prev, [applicantId]: true }));
      
      const propertyRef = doc(db, 'properties', propertyId);
      const applicantRef = doc(db, 'accounts', applicantId);

      // Get property data for notifications
      const propertyDoc = await getDoc(propertyRef);
      if (!propertyDoc.exists()) return;
      
      const propertyData = propertyDoc.data();
      const propertyName = propertyData.propertyName;

      // Update applicant status to pending
      await updateDoc(propertyRef, {
        [`applicantStatuses.${applicantId}`]: 'pending'
      });

      // Update applicant's status
      await updateDoc(applicantRef, {
        [`applicationStatuses.${propertyId}`]: 'pending',
        notifications: arrayUnion({
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          message: `Your acceptance for ${propertyName} has been removed. The owner may reconsider your application.`,
          timestamp: Date.now(),
          read: false,
          type: 'application',
          propertyName: propertyName
        })
      });

      // Update local state
      setApplicantStatuses(prev => ({
        ...prev,
        [applicantId]: 'pending'
      }));

      // Re-enable property if it was disabled due to max occupants
      const maxOccupants = propertyData.maxOccupants || 1;
      const acceptedApplicants = Object.entries(propertyData.applicantStatuses || {})
        .filter(([_, status]) => status === 'accepted').length;

      if (acceptedApplicants === maxOccupants) {
        await updateDoc(propertyRef, {
          isDisabled: false
        });
      }

    } catch (error) {
      console.error('Error removing acceptance:', error);
      alert('Failed to remove acceptance. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, [applicantId]: false }));
    }
  };

  const handleRejectApplicant = async (applicantId: string) => {
    try {
      setLoading(prev => ({ ...prev, [applicantId]: true }));
      
      const propertyRef = doc(db, 'properties', propertyId);
      const applicantRef = doc(db, 'accounts', applicantId);

      // Get current property data
      const propertyDoc = await getDoc(propertyRef);
      if (!propertyDoc.exists()) return;
      
      const propertyData = propertyDoc.data();
      const currentCount = propertyData.interestedCount || 0;
      const propertyName = propertyData.propertyName;
      const ownerId = propertyData.ownerId; // Fix: use ownerId instead of owner

      if (!ownerId) {
        console.error('Property owner not found');
        return;
      }

      // Remove from interested applicants and update status
      await updateDoc(propertyRef, {
        interestedApplicants: arrayRemove(applicantId),
        [`applicantStatuses.${applicantId}`]: 'denied',
        interestedCount: Math.max(0, currentCount - 1) // Ensure count never goes below 0
      });
      
      // Update applicant's status and add notification
      await updateDoc(applicantRef, {
        [`applicationStatuses.${propertyId}`]: 'denied',
        itemsInterested: arrayRemove(propertyId),
        notifications: arrayUnion({
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          message: `Your interest to the property ${propertyName} has been denied and so we removed it in your list of interested listings. Still interested? Send a request again!`,
          timestamp: Date.now(),
          read: false,
          type: 'application',
          propertyName: propertyName
        })
      });

      // Add notification for owner
      const ownerRef = doc(db, 'accounts', ownerId);
      await updateDoc(ownerRef, {
        notifications: arrayUnion({
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          message: `You rejected an applicant's interest on ${propertyName}`,
          timestamp: Date.now(),
          read: false,
          type: 'application',
          propertyName: propertyName
        })
      });



      // Update local state to remove the applicant
      setInterestedApplicants(interestedApplicants.filter(id => id !== applicantId));
      
    } catch (error) {
      console.error('Error rejecting applicant:', error);
      alert('Failed to reject applicant. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, [applicantId]: false }));
    }
  };
  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content applicants-modal">
        <div className="modal-header">
          <h2>Interested Applicants</h2>
          <button 
            className="close-modal-button"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="modal-body">
          {interestedApplicants && interestedApplicants.length > 0 ? (
            <ul className="interested-applicants-list">
              {interestedApplicants.map((applicantId) => (
                <li key={applicantId} className="applicant-item">
                  <ApplicantDetails applicantId={applicantId} />
                  <div className="applicant-actions">
                    {applicantStatuses[applicantId] === 'accepted' ? (
                      <>
                        <button 
                          className="remove-btn"
                          onClick={() => handleRemoveAcceptance(applicantId)}
                          disabled={loading[applicantId]}
                        >
                          Remove
                        </button>
                        <span className="status-text accepted">Accepted</span>
                      </>
                    ) : (
                      <>
                        <button 
                          className="accept-btn"
                          onClick={() => handleAcceptApplicant(applicantId)}
                          disabled={loading[applicantId]}
                        >
                          ✓
                        </button>
                        <button 
                          className="reject-btn"
                          onClick={() => handleRejectApplicant(applicantId)}
                          disabled={loading[applicantId]}
                        >
                          ✕
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p>No interested applicants for this property</p>
          )}
        </div>
      </div>
    </div>
  );
};
 
export default ShowApplicants;
