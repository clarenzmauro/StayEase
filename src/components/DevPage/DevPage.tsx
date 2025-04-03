import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import ReportsTab from './tabs/ReportsTab';
import UsersTab from './tabs/UsersTab';
import PropertiesTab from './tabs/PropertiesTab';
import SystemTab from './tabs/SystemTab';
import './DevPage.css';
import logoSvg from '../../assets/STAY.svg';

// Email that has instant developer access
const DEVELOPER_EMAIL = 'm27oflegend@gmail.com';

// Tab definition interface for maintainability
interface TabConfig {
  id: string;
  label: string;
  component: React.ReactNode;
}

// Define state interface for better type safety
interface DevPageState {
  loading: boolean;
  authorized: boolean;
  activeTab: string;
}

const DevPage: React.FC = () => {
  const [state, setState] = useState<DevPageState>({
    loading: true,
    authorized: false,
    activeTab: 'reports'
  });

  const navigate = useNavigate();
  
  // Define tabs configuration
  const tabs: TabConfig[] = [
    { id: 'reports', label: 'Reports', component: <ReportsTab /> },
    { id: 'users', label: 'Users', component: <UsersTab /> },
    { id: 'properties', label: 'Properties', component: <PropertiesTab /> },
    { id: 'system', label: 'System', component: <SystemTab /> }
  ];

  useEffect(() => {
    const checkAuthorization = async (user: User | null) => {
      // Early return if no user
      if (!user) {
        setState(prev => ({ ...prev, loading: false, authorized: false }));
        return;
      }

      // The specified email always has developer access
      if (user.email === DEVELOPER_EMAIL) {
        setState(prev => ({ ...prev, loading: false, authorized: true }));
        return;
      }

      try {
        // Check user role in Firestore
        const userDoc = await getDoc(doc(db, 'accounts', user.uid));
        const userData = userDoc.data();
        const authorized = userDoc.exists() && 
          ['developer', 'admin'].includes(userData?.role as string);
        
        setState(prev => ({ ...prev, loading: false, authorized }));
      } catch (error) {
        console.error('Error checking authorization:', error);
        setState(prev => ({ ...prev, loading: false, authorized: false }));
      }
    };

    // Listen for auth state changes
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (!user) {
        setState(prev => ({ ...prev, authorized: false, loading: false }));
        navigate('/');
      } else {
        checkAuthorization(user);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleTabChange = (tabId: string) => {
    setState(prev => ({ ...prev, activeTab: tabId }));
  };

  // Render loading state
  if (state.loading) {
    return <div className="dev-page-loading">Loading...</div>;
  }

  // Render unauthorized state
  if (!state.authorized) {
    return (
      <div className="dev-page-unauthorized">
        <h1>Unauthorized Access</h1>
        <p>You do not have permission to access the developer dashboard.</p>
        <button onClick={() => navigate('/')}>Return to Home</button>
      </div>
    );
  }

  // Get the current active tab component
  const activeTabContent = tabs.find(tab => tab.id === state.activeTab)?.component || tabs[0].component;

  return (
    <div className="dev-page">
      <header className="dev-page-header">
        <div className="dev-page-logo" onClick={() => navigate('/')}>
          <img src={logoSvg} alt="StayEase Logo" />
        </div>
        <h1>Developer Dashboard</h1>
        <div className="dev-page-user">
          <span>{auth.currentUser?.email}</span>
          <button onClick={() => auth.signOut()}>Logout</button>
        </div>
      </header>

      <div className="dev-page-content">
        <nav className="dev-page-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={state.activeTab === tab.id ? 'active' : ''}
              onClick={() => handleTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <main className="dev-page-tab-content">
          {activeTabContent}
        </main>
      </div>
    </div>
  );
};

export default DevPage; 