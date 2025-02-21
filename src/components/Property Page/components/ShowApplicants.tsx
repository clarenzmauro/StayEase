import React from 'react';
import ApplicantDetails from '../ApplicantDetails';
import './ShowApplicants.css';

interface ShowApplicantsProps {
  show: boolean;
  onClose: () => void;
  interestedApplicants: string[];
}

const ShowApplicants: React.FC<ShowApplicantsProps> = ({ 
  show, 
  onClose, 
  interestedApplicants 
}) => {
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
