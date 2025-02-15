import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import ChatModal from '../Chat/ChatModal';

// Define the structure of the applicant data
interface Applicant {
  profilePicUrl: string;
  username: string;
  contactNumber: string;
  // Add any other fields you expect from the applicant data
}

interface ApplicantDetailsProps {
  applicantId: string; // Explicitly define the type for applicantId
}

const ApplicantDetails: React.FC<ApplicantDetailsProps> = ({ applicantId }) => {
  const [applicant, setApplicant] = useState<Applicant | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChatMinimized, setIsChatMinimized] = useState(false);

  useEffect(() => {
    const fetchApplicantData = async () => {
      const applicantDoc = await getDoc(doc(db, 'accounts', applicantId));
      if (applicantDoc.exists()) {
        setApplicant(applicantDoc.data() as Applicant);
      }
    };

    fetchApplicantData();
  }, [applicantId]);

  const handleMessageClick = () => {
    setIsChatOpen(true);
    setIsChatMinimized(false);
  };

  if (!applicant) return <p>Loading...</p>;

  return (
    <div className="applicant-details">
      <img src={applicant.profilePicUrl} alt={applicant.username} className="applicant-photo" />
      <span className="applicant-name">{applicant.username}</span>
      <span className="applicant-contact">{applicant.contactNumber}</span>
      <button className="message-button" onClick={handleMessageClick}>Message</button>

      <ChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        recipientId={applicantId}
        recipientName={applicant.username}
        recipientPhoto={applicant.profilePicUrl}
        isMinimized={isChatMinimized}
        onMinimizedChange={setIsChatMinimized}
      />
    </div>
  );
};

export default ApplicantDetails;