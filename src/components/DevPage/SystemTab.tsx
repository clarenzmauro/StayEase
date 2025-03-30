import React, { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import systemHealthService, { SystemStatus, PerformanceMetric, SystemLog } from '../../services/SystemHealthService';

export const SystemTab: React.FC = () => {
  const [firebaseStatus, setFirebaseStatus] = useState<SystemStatus>({ 
    service: 'Firebase', 
    status: 'operational', 
    timestamp: new Date() as any 
  });
  
  const [mongoStatus, setMongoStatus] = useState<SystemStatus>({
    service: 'MongoDB',
    status: 'operational',
    timestamp: new Date() as any
  });
  
  const [apiStatus, setApiStatus] = useState<SystemStatus>({
    service: 'API Server',
    status: 'operational',
    timestamp: new Date() as any
  });
  
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'status' | 'metrics' | 'logs'>('status');
  const [performanceData, setPerformanceData] = useState<PerformanceMetric[]>([]);
  const [logFilter, setLogFilter] = useState<{ level?: string, source?: string }>({});
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize system health monitoring
  useEffect(() => {
    const checkAllServices = async () => {
      setLoading(true);
      try {
        // Check Firebase status
        const fbStatus = await systemHealthService.checkFirebaseStatus();
        setFirebaseStatus(fbStatus);
        
        // Check MongoDB status
        const mongoDbStatus = await systemHealthService.checkMongoDBStatus();
        setMongoStatus(mongoDbStatus);
        
        // Check API status
        const apiHealthStatus = await systemHealthService.checkAPIStatus();
        setApiStatus(apiHealthStatus);
        
      } catch (error) {
        console.error('Error checking system health:', error);
      } finally {
        setLoading(false);
      }
    };
    
    // Initial check
    checkAllServices();
    
    // Set up periodic checks
    refreshTimerRef.current = setInterval(checkAllServices, 60000); // Check every minute
    
    // Clean up on unmount
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, []);

  // Fetch system logs
  useEffect(() => {
    const fetchSystemLogs = async () => {
      try {
        const response = await fetch('/api/system/logs');
        if (response.ok) {
          const logsData = await response.json();
          setLogs(logsData);
        } else {
          console.error('Failed to fetch logs:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching logs:', error);
      }
    };
    
    fetchSystemLogs();
    
    // Set up periodic log fetching
    const logInterval = setInterval(fetchSystemLogs, 30000); // Every 30 seconds
    
    return () => clearInterval(logInterval);
  }, [logFilter]);
  
  // Fetch performance metrics
  useEffect(() => {
    const fetchPerformanceMetrics = async () => {
      try {
        // In a real app, this would fetch from your API
        // For now, we'll create some sample data
        const now = new Date();
        const sampleMetrics: PerformanceMetric[] = Array.from({ length: 24 }).map((_, i) => ({
          metric: 'api_response_time',
          value: Math.random() * 100 + 50, // Random value between 50-150ms
          timestamp: new Date(now.getTime() - (23 - i) * 3600000) as any, // Last 24 hours
          tags: { endpoint: '/api/properties' }
        }));
        
        setPerformanceData(sampleMetrics);
      } catch (error) {
        console.error('Error fetching performance metrics:', error);
      }
    };
    
    fetchPerformanceMetrics();
    
    // Set up periodic metrics fetching
    const metricsInterval = setInterval(fetchPerformanceMetrics, 60000); // Every minute
    
    return () => clearInterval(metricsInterval);
  }, []);

  // Get status badge class
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'operational': return 'status-badge status-operational';
      case 'degraded': return 'status-badge status-degraded';
      case 'outage': return 'status-badge status-outage';
      default: return 'status-badge';
    }
  };

  // Format date for display
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    try {
      if (timestamp.toDate) {
        return formatDistanceToNow(timestamp.toDate(), { addSuffix: true });
      }
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  // Handle tab switching
  const handleTabChange = (tab: 'status' | 'metrics' | 'logs') => {
    setActiveTab(tab);
  };
  
  // Handle refresh button click
  const handleRefresh = async () => {
    setLoading(true);
    try {
      const fbStatus = await systemHealthService.checkFirebaseStatus();
      setFirebaseStatus(fbStatus);
      
      const mongoDbStatus = await systemHealthService.checkMongoDBStatus();
      setMongoStatus(mongoDbStatus);
      
      const apiHealthStatus = await systemHealthService.checkAPIStatus();
      setApiStatus(apiHealthStatus);
    } catch (error) {
      console.error('Error refreshing system health:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Get log level class
  const getLogLevelClass = (level: string) => {
    switch (level) {
      case 'error': return 'log-error';
      case 'warning': return 'log-warning';
      case 'debug': return 'log-debug';
      default: return 'log-info';
    }
  };

  return (
    <div className="system-tab">
      <div className="tab-header">
        <h2 className="tab-title">System Health</h2>
        <div className="tab-actions">
          <button className="btn btn-secondary" onClick={handleRefresh} disabled={loading}>
            <i className="fas fa-sync"></i> Refresh
          </button>
        </div>
      </div>
      
      <div className="tab-navigation">
        <button 
          className={`tab-nav-item ${activeTab === 'status' ? 'active' : ''}`}
          onClick={() => handleTabChange('status')}
        >
          Status
        </button>
        <button 
          className={`tab-nav-item ${activeTab === 'metrics' ? 'active' : ''}`}
          onClick={() => handleTabChange('metrics')}
        >
          Metrics
        </button>
        <button 
          className={`tab-nav-item ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => handleTabChange('logs')}
        >
          Logs
        </button>
      </div>

      {activeTab === 'status' && (
        <div className="system-status-cards">
          <div className={`status-card ${firebaseStatus.status}`}>
            <div className="status-card-header">
              <h3>Firebase</h3>
              <span className={getStatusBadgeClass(firebaseStatus.status)}>
                {firebaseStatus.status}
              </span>
            </div>
            <div className="status-card-body">
              <p>Last checked: {formatDate(firebaseStatus.timestamp)}</p>
              {firebaseStatus.responseTime && (
                <p>Response time: {firebaseStatus.responseTime}ms</p>
              )}
              {firebaseStatus.details && (
                <p className="status-details">Details: {firebaseStatus.details}</p>
              )}
            </div>
          </div>

          <div className={`status-card ${mongoStatus.status}`}>
            <div className="status-card-header">
              <h3>MongoDB</h3>
              <span className={getStatusBadgeClass(mongoStatus.status)}>
                {mongoStatus.status}
              </span>
            </div>
            <div className="status-card-body">
              <p>Last checked: {formatDate(mongoStatus.timestamp)}</p>
              {mongoStatus.responseTime && (
                <p>Response time: {mongoStatus.responseTime}ms</p>
              )}
              {mongoStatus.details && (
                <p className="status-details">Details: {mongoStatus.details}</p>
              )}
            </div>
          </div>

          <div className={`status-card ${apiStatus.status}`}>
            <div className="status-card-header">
              <h3>API Server</h3>
              <span className={getStatusBadgeClass(apiStatus.status)}>
                {apiStatus.status}
              </span>
            </div>
            <div className="status-card-body">
              <p>Last checked: {formatDate(apiStatus.timestamp)}</p>
              {apiStatus.responseTime && (
                <p>Response time: {apiStatus.responseTime}ms</p>
              )}
              {apiStatus.details && (
                <p className="status-details">Details: {apiStatus.details}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'metrics' && (
        <div className="system-metrics">
          <h3>Performance Metrics</h3>
          
          <div className="metrics-filter">
            <select className="metrics-select">
              <option value="api_response_time">API Response Time</option>
              <option value="page_load_time">Page Load Time</option>
              <option value="memory_usage">Memory Usage</option>
              <option value="cpu_usage">CPU Usage</option>
            </select>
            
            <select className="time-range-select">
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
          
          <div className="metrics-chart">
            <div className="chart-placeholder">
              <p>Chart visualization would go here</p>
              <p>This would show the selected metric over time</p>
              {/* We would use performanceData here to render the chart */}
              <p className="metrics-count">Data points: {performanceData.length}</p>
            </div>
          </div>
          
          <div className="metrics-summary">
            <div className="summary-card">
              <div className="summary-value">
                {performanceData.length > 0 
                  ? Math.round(performanceData.reduce((sum, metric) => sum + metric.value, 0) / performanceData.length) + 'ms'
                  : 'N/A'}
              </div>
              <div className="summary-label">Average</div>
            </div>
            <div className="summary-card">
              <div className="summary-value">
                {performanceData.length > 0 
                  ? Math.min(...performanceData.map(metric => metric.value)) + 'ms'
                  : 'N/A'}
              </div>
              <div className="summary-label">Min</div>
            </div>
            <div className="summary-card">
              <div className="summary-value">
                {performanceData.length > 0 
                  ? Math.max(...performanceData.map(metric => metric.value)) + 'ms'
                  : 'N/A'}
              </div>
              <div className="summary-label">Max</div>
            </div>
            <div className="summary-card">
              <div className="summary-value">
                {performanceData.length > 0 
                  ? (performanceData.sort((a, b) => a.value - b.value)[Math.floor(performanceData.length * 0.95)].value) + 'ms'
                  : 'N/A'}
              </div>
              <div className="summary-label">95th Percentile</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="system-logs">
          <h3>System Logs</h3>
          
          <div className="logs-filter">
            <select 
              className="log-level-select"
              value={logFilter.level || 'all'}
              onChange={(e) => setLogFilter({...logFilter, level: e.target.value === 'all' ? undefined : e.target.value})}
            >
              <option value="all">All Levels</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="debug">Debug</option>
            </select>
            
            <select
              className="log-source-select"
              value={logFilter.source || 'all'}
              onChange={(e) => setLogFilter({...logFilter, source: e.target.value === 'all' ? undefined : e.target.value})}
            >
              <option value="all">All Sources</option>
              <option value="server">Server</option>
              <option value="database">Database</option>
              <option value="auth">Authentication</option>
              <option value="payment">Payment</option>
            </select>
            
            <button className="btn btn-secondary" onClick={() => setLogFilter({})}>Reset Filters</button>
          </div>
          
          {loading ? (
            <div className="loading-indicator">Loading logs...</div>
          ) : (
            <div className="logs-container">
              {logs.length === 0 ? (
                <div className="empty-logs">No logs found matching your criteria</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className={`log-entry ${getLogLevelClass(log.level)}`}>
                    <div className="log-timestamp">{formatDate(log.timestamp)}</div>
                    <div className="log-level">{log.level.toUpperCase()}</div>
                    <div className="log-source">[{log.source}]</div>
                    <div className="log-message">{log.message}</div>
                    {log.details && (
                      <div className="log-details">
                        {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SystemTab;
