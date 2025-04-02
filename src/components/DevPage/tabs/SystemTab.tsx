import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, limit, FirestoreError } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import axios, { AxiosError } from 'axios';
import { API_URL } from '../../../config';
import './SystemTab.css';

// Types
type ServiceStatus = 'online' | 'offline' | 'degraded';

interface ServiceInfo {
  name: string;
  status: ServiceStatus;
  lastChecked: Date;
  responseTime?: number;
  error?: string;
}

interface SystemState {
  services: ServiceInfo[];
  loading: boolean;
  error: string | null;
  refreshInterval: number;
  autoRefresh: boolean;
  lastRefresh: Date;
  isRefreshing: boolean;
}

interface ApiHealthResponse {
  status: 'operational' | 'degraded' | 'offline';
  error?: string;
}

// Constants
const REFRESH_INTERVALS = [
  { value: 10, label: '10s' },
  { value: 30, label: '30s' },
  { value: 60, label: '1m' },
  { value: 300, label: '5m' }
] as const;

const INITIAL_SERVICES: ServiceInfo[] = [
  { name: 'Firebase', status: 'offline', lastChecked: new Date() },
  { name: 'MongoDB', status: 'offline', lastChecked: new Date() },
  { name: 'API Server', status: 'offline', lastChecked: new Date() }
];

const SystemTab: React.FC = () => {
  const [state, setState] = useState<SystemState>({
    services: INITIAL_SERVICES,
    loading: true,
    error: null,
    refreshInterval: 30,
    autoRefresh: true,
    lastRefresh: new Date(),
    isRefreshing: false
  });

  // Service check wrapper with timing and error handling
  const checkService = async (name: string, checkFn: () => Promise<ServiceInfo>): Promise<ServiceInfo> => {
    try {
      const startTime = Date.now();
      const result = await checkFn();
      return {
        ...result,
        responseTime: Date.now() - startTime,
        lastChecked: new Date()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        name,
        status: 'offline',
        lastChecked: new Date(),
        error: errorMessage
      };
    }
  };

  // Service check implementations
  const checkFirebase = async (): Promise<ServiceInfo> => {
    try {
      const testCollection = collection(db, 'properties');
      const testQuery = query(testCollection, limit(1));
      await getDocs(testQuery);
      return { name: 'Firebase', status: 'online', lastChecked: new Date() };
    } catch (error) {
      const firestoreError = error as FirestoreError;
      throw new Error(`Firebase error: ${firestoreError.code || 'unknown'}`);
    }
  };

  const checkMongoDB = async (): Promise<ServiceInfo> => {
    try {
      const response = await axios.get<ApiHealthResponse>(`${API_URL}/api/system/health/mongodb`, { timeout: 5000 });
      return {
        name: 'MongoDB',
        status: response.data?.status === 'operational' ? 'online' : 'degraded',
        lastChecked: new Date(),
        error: response.data?.status !== 'operational' ? response.data?.error : undefined
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      throw new Error(`MongoDB check failed: ${axiosError.message}`);
    }
  };

  const checkAPIServer = async (): Promise<ServiceInfo> => {
    try {
      const response = await axios.get<ApiHealthResponse>(`${API_URL}/api/system/health`, { timeout: 5000 });
      return {
        name: 'API Server',
        status: response.data?.status === 'operational' ? 'online' : 'degraded',
        lastChecked: new Date(),
        error: response.data?.status !== 'operational' ? response.data?.error : undefined
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      throw new Error(`API server check failed: ${axiosError.message}`);
    }
  };

  // Check all services
  const checkAllServices = useCallback(async () => {
    setState(prev => ({ ...prev, isRefreshing: true, error: null }));
    
    try {
      const [firebaseStatus, mongoDBStatus, apiServerStatus] = await Promise.all([
        checkService('Firebase', checkFirebase),
        checkService('MongoDB', checkMongoDB),
        checkService('API Server', checkAPIServer)
      ]);
      
      setState(prev => ({
        ...prev,
        services: [firebaseStatus, mongoDBStatus, apiServerStatus],
        lastRefresh: new Date(),
        loading: false,
        isRefreshing: false
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        error: `Failed to check service status: ${errorMessage}`,
        loading: false,
        isRefreshing: false
      }));
    }
  }, []);

  // Setup effects
  useEffect(() => {
    checkAllServices();
  }, [checkAllServices]);

  useEffect(() => {
    if (!state.autoRefresh) return;
    
    const intervalId = setInterval(checkAllServices, state.refreshInterval * 1000);
    return () => clearInterval(intervalId);
  }, [state.refreshInterval, state.autoRefresh, checkAllServices]);

  // UI event handlers
  const handleIntervalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setState(prev => ({ ...prev, refreshInterval: Number(e.target.value) }));
  };

  // Helper functions
  const formatResponseTime = (ms?: number): string => ms === undefined ? 'N/A' : `${ms} ms`;

  if (state.loading) {
    return <div className="system-tab-loading">Loading system status...</div>;
  }

  return (
    <div className="system-tab">
      <div className="system-header">
        <h2>System Status</h2>
        <div className="system-controls">
          <div className="refresh-controls">
            <select 
              value={state.refreshInterval} 
              onChange={handleIntervalChange}
              disabled={!state.autoRefresh}
              className="interval-select"
            >
              {REFRESH_INTERVALS.map(({ value, label }) => (
                <option key={value} value={value}>Refresh: {label}</option>
              ))}
            </select>
            <button 
              className={`auto-refresh-btn ${state.autoRefresh ? 'active' : ''}`}
              onClick={() => setState(prev => ({ ...prev, autoRefresh: !prev.autoRefresh }))}
            >
              Auto-Refresh: {state.autoRefresh ? 'On' : 'Off'}
            </button>
          </div>
          <button 
            className="refresh-btn" 
            onClick={checkAllServices}
            disabled={state.isRefreshing}
          >
            {state.isRefreshing ? 'Refreshing...' : 'Refresh Now'}
          </button>
        </div>
      </div>
      
      {state.error && <div className="system-error">{state.error}</div>}
      
      <div className="last-updated">
        Last checked: {state.lastRefresh.toLocaleTimeString()}
      </div>
      
      <div className="services-grid">
        {state.services.map(service => (
          <div key={service.name} className={`service-card status-${service.status}`}>
            <div className="service-header">
              <h3 className="service-name">{service.name}</h3>
              <div className={`status-indicator ${service.status}`}>
                <span className="status-dot"></span>
                <span className="status-text">
                  {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                </span>
              </div>
            </div>
            
            <div className="service-details">
              <div className="detail-item">
                <span className="detail-label">Response Time:</span>
                <span className="detail-value">{formatResponseTime(service.responseTime)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Last Checked:</span>
                <span className="detail-value">{service.lastChecked.toLocaleTimeString()}</span>
              </div>
              {service.error && (
                <div className="error-message">
                  <span className="error-label">Error:</span>
                  <span className="error-text">{service.error}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="system-info">
        <h3>System Information</h3>
        <div className="info-grid">
          <div className="info-card">
            <h4>Environment</h4>
            <div className="info-detail">
              <span className="info-label">Mode:</span>
              <span className="info-value">{process.env.NODE_ENV || 'development'}</span>
            </div>
            <div className="info-detail">
              <span className="info-label">App Version:</span>
              <span className="info-value">1.0.0</span>
            </div>
          </div>
          
          <div className="info-card">
            <h4>Connection Info</h4>
            <div className="info-detail">
              <span className="info-label">API URL:</span>
              <span className="info-value">{API_URL}</span>
            </div>
            <div className="info-detail">
              <span className="info-label">Firebase Project:</span>
              <span className="info-value">StayEase</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemTab; 