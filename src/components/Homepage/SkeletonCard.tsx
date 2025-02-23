import React from 'react';

const SkeletonCard: React.FC = () => {
  return (
    <div className="skeleton-card">
      <div className="skeleton-wrapper">
        <div className="skeleton-image" />
      </div>
      <div className="skeleton-content">
        <div className="skeleton-wrapper">
          <div className="skeleton-line" style={{ width: '85%', height: '20px', marginBottom: '12px' }} />
        </div>
        <div className="skeleton-wrapper">
          <div className="skeleton-line" style={{ width: '65%', height: '16px' }} />
        </div>
        <div className="skeleton-wrapper">
          <div className="skeleton-line" style={{ width: '45%', height: '16px' }} />
        </div>
        <div className="skeleton-wrapper">
          <div className="skeleton-line" style={{ width: '60%', height: '18px', marginTop: '8px' }} />
        </div>
      </div>
    </div>
  );
};

export default React.memo(SkeletonCard);
