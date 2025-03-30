import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit,
  Timestamp,
  where,
  addDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';

// Types
export interface SystemStatus {
  service: string;
  status: 'operational' | 'degraded' | 'outage';
  responseTime?: number;
  timestamp: Timestamp;
  details?: string;
}

export interface PerformanceMetric {
  metric: string;
  value: number;
  timestamp: Timestamp;
  tags?: Record<string, string>;
}

export interface SystemLog {
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  timestamp: Timestamp;
  source: string;
  details?: any;
}

// Circuit breaker implementation
class CircuitBreaker {
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private failureThreshold: number = 3,
    private resetTimeout: number = 30000 // 30 seconds
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      // Check if it's time to try again
      const now = Date.now();
      if (now - this.lastFailureTime > this.resetTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }
    
    try {
      const result = await fn();
      this.reset();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }
  
  private recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold || this.state === 'half-open') {
      this.state = 'open';
    }
  }
  
  private reset() {
    this.failureCount = 0;
    this.state = 'closed';
  }
  
  getState() {
    return this.state;
  }
}

// Service class
class SystemHealthService {
  private firebaseBreaker: CircuitBreaker;
  private mongoBreaker: CircuitBreaker;
  private apiBreaker: CircuitBreaker;
  
  constructor() {
    this.firebaseBreaker = new CircuitBreaker();
    this.mongoBreaker = new CircuitBreaker();
    this.apiBreaker = new CircuitBreaker();
  }
  
  // Check Firebase connection
  async checkFirebaseStatus(): Promise<SystemStatus> {
    try {
      const startTime = Date.now();
      await this.firebaseBreaker.execute(async () => {
        const healthCollection = collection(db, 'system_health');
        await getDocs(query(healthCollection, limit(1)));
      });
      const endTime = Date.now();
      
      const status: SystemStatus = {
        service: 'Firebase',
        status: 'operational',
        responseTime: endTime - startTime,
        timestamp: Timestamp.now()
      };
      
      // Store the status check result
      await this.storeStatusCheck(status);
      
      return status;
    } catch (error) {
      console.error('Firebase status check failed:', error);
      
      const status: SystemStatus = {
        service: 'Firebase',
        status: this.firebaseBreaker.getState() === 'open' ? 'outage' : 'degraded',
        timestamp: Timestamp.now(),
        details: error instanceof Error ? error.message : 'Unknown error'
      };
      
      // Store the failed status check
      await this.storeStatusCheck(status);
      
      return status;
    }
  }
  
  // Check MongoDB connection via API
  async checkMongoDBStatus(): Promise<SystemStatus> {
    try {
      const startTime = Date.now();
      const response = await this.mongoBreaker.execute(async () => {
        return fetch('/api/system/health/mongodb');
      });
      const endTime = Date.now();
      
      if (!response.ok) {
        throw new Error(`MongoDB health check failed with status: ${response.status}`);
      }
      
      const status: SystemStatus = {
        service: 'MongoDB',
        status: 'operational',
        responseTime: endTime - startTime,
        timestamp: Timestamp.now()
      };
      
      // Store the status check result
      await this.storeStatusCheck(status);
      
      return status;
    } catch (error) {
      console.error('MongoDB status check failed:', error);
      
      const status: SystemStatus = {
        service: 'MongoDB',
        status: this.mongoBreaker.getState() === 'open' ? 'outage' : 'degraded',
        timestamp: Timestamp.now(),
        details: error instanceof Error ? error.message : 'Unknown error'
      };
      
      // Store the failed status check
      await this.storeStatusCheck(status);
      
      return status;
    }
  }
  
  // Check API server status
  async checkAPIStatus(): Promise<SystemStatus> {
    try {
      const startTime = Date.now();
      const response = await this.apiBreaker.execute(async () => {
        return fetch('/api/system/health');
      });
      const endTime = Date.now();
      
      if (!response.ok) {
        throw new Error(`API health check failed with status: ${response.status}`);
      }
      
      const status: SystemStatus = {
        service: 'API Server',
        status: 'operational',
        responseTime: endTime - startTime,
        timestamp: Timestamp.now()
      };
      
      // Store the status check result
      await this.storeStatusCheck(status);
      
      return status;
    } catch (error) {
      console.error('API status check failed:', error);
      
      const status: SystemStatus = {
        service: 'API Server',
        status: this.apiBreaker.getState() === 'open' ? 'outage' : 'degraded',
        timestamp: Timestamp.now(),
        details: error instanceof Error ? error.message : 'Unknown error'
      };
      
      // Store the failed status check
      await this.storeStatusCheck(status);
      
      return status;
    }
  }
  
  // Store status check result in Firestore
  private async storeStatusCheck(status: SystemStatus): Promise<void> {
    try {
      await addDoc(collection(db, 'system_status_checks'), status);
    } catch (error) {
      console.error('Failed to store status check:', error);
    }
  }
  
  // Get recent status checks for a service
  async getRecentStatusChecks(service: string, limit: number = 10): Promise<SystemStatus[]> {
    try {
      const statusChecksQuery = query(
        collection(db, 'system_status_checks'),
        where('service', '==', service),
        orderBy('timestamp', 'desc'),
        limit(Number(limit))
      );
      
      const snapshot = await getDocs(statusChecksQuery);
      return snapshot.docs.map(doc => doc.data() as SystemStatus);
    } catch (error) {
      console.error(`Failed to get recent status checks for ${service}:`, error);
      return [];
    }
  }
  
  // Store performance metric
  async storePerformanceMetric(metric: PerformanceMetric): Promise<void> {
    try {
      await addDoc(collection(db, 'performance_metrics'), metric);
    } catch (error) {
      console.error('Failed to store performance metric:', error);
    }
  }
  
  // Get recent performance metrics
  async getRecentPerformanceMetrics(metricName: string, limit: number = 100): Promise<PerformanceMetric[]> {
    try {
      const metricsQuery = query(
        collection(db, 'performance_metrics'),
        where('metric', '==', metricName),
        orderBy('timestamp', 'desc'),
        limit(Number(limit))
      );
      
      const snapshot = await getDocs(metricsQuery);
      return snapshot.docs.map(doc => doc.data() as PerformanceMetric);
    } catch (error) {
      console.error(`Failed to get recent performance metrics for ${metricName}:`, error);
      return [];
    }
  }
  
  // Log system event
  async logSystemEvent(log: SystemLog): Promise<void> {
    try {
      await addDoc(collection(db, 'system_logs'), log);
    } catch (error) {
      console.error('Failed to store system log:', error);
    }
  }
  
  // Get system logs with filtering
  async getSystemLogs(
    level?: 'info' | 'warning' | 'error' | 'debug',
    source?: string,
    startTime?: Date,
    endTime?: Date,
    limitCount: number = 100
  ): Promise<SystemLog[]> {
    try {
      let logsQuery = query(
        collection(db, 'system_logs'),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      
      if (level) {
        logsQuery = query(logsQuery, where('level', '==', level));
      }
      
      if (source) {
        logsQuery = query(logsQuery, where('source', '==', source));
      }
      
      if (startTime) {
        logsQuery = query(logsQuery, where('timestamp', '>=', Timestamp.fromDate(startTime)));
      }
      
      if (endTime) {
        logsQuery = query(logsQuery, where('timestamp', '<=', Timestamp.fromDate(endTime)));
      }
      
      const snapshot = await getDocs(logsQuery);
      return snapshot.docs.map(doc => doc.data() as SystemLog);
    } catch (error) {
      console.error('Failed to get system logs:', error);
      return [];
    }
  }
  
  // Client-side performance tracking
  trackClientPerformance(metricName: string, value: number, tags?: Record<string, string>): void {
    const metric: PerformanceMetric = {
      metric: metricName,
      value,
      timestamp: Timestamp.now(),
      tags
    };
    
    this.storePerformanceMetric(metric).catch(error => {
      console.error('Failed to track client performance:', error);
    });
  }
  
  // Track page load time
  trackPageLoad(pageName: string, loadTime: number): void {
    this.trackClientPerformance('page_load', loadTime, { page: pageName });
  }
  
  // Track API request time
  trackApiRequest(endpoint: string, responseTime: number, status: number): void {
    this.trackClientPerformance('api_request', responseTime, { 
      endpoint,
      status: status.toString()
    });
  }
}

// Export singleton instance
export const systemHealthService = new SystemHealthService();
export default systemHealthService;
