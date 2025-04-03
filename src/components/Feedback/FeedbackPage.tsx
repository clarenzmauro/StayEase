import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase/config';
import { User } from 'firebase/auth';
import ReportsTab from './tabs/ReportsTab';
import RoadmapTab from './tabs/RoadmapTab';
import ChangelogTab from './tabs/ChangelogTab';
import './FeedbackPage.css';

// Tab definition interface for maintainability
interface TabConfig {
  id: string;
  label: string;
  component: React.ReactNode;
}

// Define state interface for better type safety
interface FeedbackPageState {
  loading: boolean;
  activeTab: string;
}

const FeedbackPage: React.FC = () => {
  const [state, setState] = useState<FeedbackPageState>({
    loading: true,
    activeTab: 'reports'
  });

  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  
  // Define tabs configuration
  const tabs: TabConfig[] = [
    { id: 'reports', label: 'Reports', component: <ReportsTab user={user} /> },
    { id: 'roadmap', label: 'Roadmap', component: <RoadmapTab user={user} /> },
    { id: 'changelog', label: 'Changelog', component: <ChangelogTab user={user} /> }
  ];

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = auth.onAuthStateChanged(currentUser => {
      setUser(currentUser);
      setState(prev => ({ ...prev, loading: false }));
    });

    return () => unsubscribe();
  }, []);

  const handleTabChange = (tabId: string) => {
    setState(prev => ({ ...prev, activeTab: tabId }));
  };

  // Render loading state
  if (state.loading) {
    return <div className="feedback-page-loading">Loading...</div>;
  }

  // Get the current active tab component
  const activeTabContent = tabs.find(tab => tab.id === state.activeTab)?.component || tabs[0].component;

  return (
    <div className="feedback-page">
      <header className="feedback-page-header">
        <div className="feedback-page-logo" onClick={() => navigate('/')}>
          <img src="/src/assets/STAY.svg" alt="StayEase Logo" />
        </div>
        <h1>Feedback Portal</h1>
        <div className="feedback-page-user">
          {user ? (
            <>
              <span>{user.email}</span>
              <button onClick={() => auth.signOut()}>Logout</button>
            </>
          ) : (
            <button onClick={() => navigate('/login')}>Login</button>
          )}
        </div>
      </header>

      <div className="feedback-page-content">
        <nav className="feedback-page-tabs">
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

        <main className="feedback-page-tab-content">
          {activeTabContent}
        </main>
      </div>
    </div>
  );
};

export default FeedbackPage; 