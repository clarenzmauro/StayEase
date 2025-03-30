import React, { useState } from 'react';
import ReportsTab from './ReportsTab';
import UsersTab from './UsersTab';
import PropertiesTab from './PropertiesTab';
import SystemTab from './SystemTab';
import './DevPage.css';

type TabType = 'reports' | 'users' | 'properties' | 'system';

export const DevPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('reports');

  return (
    <div className="dev-page-container">
      <div className="dev-sidebar">
        <h2 className="dev-title">Developer Dashboard</h2>
        <nav className="dev-nav">
          <button 
            className={`dev-nav-item ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            <i className="fas fa-flag"></i> Reports
          </button>
          <button 
            className={`dev-nav-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <i className="fas fa-users"></i> Users
          </button>
          <button 
            className={`dev-nav-item ${activeTab === 'properties' ? 'active' : ''}`}
            onClick={() => setActiveTab('properties')}
          >
            <i className="fas fa-home"></i> Properties
          </button>
          <button 
            className={`dev-nav-item ${activeTab === 'system' ? 'active' : ''}`}
            onClick={() => setActiveTab('system')}
          >
            <i className="fas fa-server"></i> System
          </button>
        </nav>
      </div>

      <div className="dev-content">
        {activeTab === 'reports' && <ReportsTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'properties' && <PropertiesTab />}
        {activeTab === 'system' && <SystemTab />}
      </div>
    </div>
  );
};

export default DevPage;
