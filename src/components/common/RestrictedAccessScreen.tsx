import React from 'react';
import { useAuth } from '../../context/AuthContext';

const RestrictedAccessScreen: React.FC = () => {
  return (
    <div style={{
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      padding: '20px',
      textAlign: 'center',
      backgroundColor: '#f8f9fa'
    }}>
      <div style={{
        maxWidth: '600px',
        padding: '30px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        backgroundColor: 'white'
      }}>
        <h1 style={{ color: '#dc3545', marginBottom: '20px' }}>Account Restricted</h1>
        <p style={{ fontSize: '18px', lineHeight: '1.6', marginBottom: '20px' }}>
          Your account has been restricted by the administrator. You currently do not have 
          access to StayEase services.
        </p>
        <p style={{ fontSize: '16px', lineHeight: '1.5' }}>
          If you believe this is an error, please contact our support team for assistance at stayease@gmail.com.
        </p>
      </div>
    </div>
  );
};

// Higher Order Component to protect routes from restricted users
export const withRestrictionCheck = (Component: React.ComponentType<any>) => {
  const WrappedComponent = (props: any) => {
    const { userStatus, loading } = useAuth();
    
    // If still loading, show nothing or a loading spinner
    if (loading) {
      return <div>Loading...</div>;
    }
    
    // If user is restricted, show the restricted access screen
    if (userStatus === 'restricted') {
      return <RestrictedAccessScreen />;
    }
    
    // Otherwise, render the original component
    return <Component {...props} />;
  };
  
  return WrappedComponent;
};

export default RestrictedAccessScreen; 