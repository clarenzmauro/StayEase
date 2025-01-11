import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

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
  const [applicant, setApplicant] = useState<Applicant | null>(null); // Use the Applicant type

  useEffect(() => {
    const fetchApplicantData = async () => {
      const applicantDoc = await getDoc(doc(db, 'accounts', applicantId));
      if (applicantDoc.exists()) {
        setApplicant(applicantDoc.data() as Applicant); // Cast the data to Applicant type
      }
    };

    fetchApplicantData();
  }, [applicantId]);

  if (!applicant) return <p>Loading...</p>;

  return (
    <div className="applicant-details">
      <img src={applicant.profilePicUrl} alt={applicant.username} className="applicant-photo" />
      <span className="applicant-name">{applicant.username}</span>
      <span className="applicant-contact">{applicant.contactNumber}</span>
      <button className="message-button">Message</button>
    </div>
  );
};

export default ApplicantDetails;