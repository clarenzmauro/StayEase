import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs, 
  where, 
  Timestamp,
  onSnapshot,
  doc,
  updateDoc,
  getDoc
} from 'firebase/firestore';
import { db } from '../../../../firebase/config';
import { useDebounce } from '../useDebounce';
import { useAuth } from '../../../../context/AuthContext';
import { v4 as uuidv4 } from 'uuid';

export type ReportStatus = 'new' | 'in_progress' | 'resolved';
export type ReportCategory = 'bug' | 'feature_request' | 'enhancement' | 'payment' | 'other';

export interface Comment {
  id: string;
  text: string;
  userId: string;
  userName: string;
  createdAt: Timestamp;
  userAvatar?: string;
  attachments?: string[];
}

export interface Report {
  id: string;
  title: string;
  description: string;
  status: ReportStatus;
  category: ReportCategory;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  userId: string;
  userName: string;
  assignedTo?: string;
  assignedToName?: string;
  comments: Comment[];
}

export interface ReportFilters {
  statusFilter: string;
  categoryFilter: string;
  dateFilter: string;
  assigneeFilter: string;
  searchQuery: string;
}

interface UseReportDataReturn {
  reports: Report[];
  loading: boolean;
  hasMore: boolean;
  filters: ReportFilters;
  setStatusFilter: (status: string) => void;
  setCategoryFilter: (category: string) => void;
  setDateFilter: (date: string) => void;
  setAssigneeFilter: (assignee: string) => void;
  setSearchQuery: (query: string) => void;
  loadMoreReports: () => Promise<void>;
  updateReportStatus: (reportId: string, newStatus: ReportStatus) => Promise<void>;
  assignReport: (reportId: string, userId: string, userName: string) => Promise<void>;
  addComment: (reportId: string, text: string) => Promise<void>;
  error: string | null;
}

export function useReportData(initialFilters?: Partial<ReportFilters>): UseReportDataReturn {
  // Access the authenticated user
  const { user } = useAuth();
  
  // State for reports and pagination
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for filters
  const [statusFilter, setStatusFilter] = useState<string>(initialFilters?.statusFilter || 'all');
  const [categoryFilter, setCategoryFilter] = useState<string>(initialFilters?.categoryFilter || 'all');
  const [dateFilter, setDateFilter] = useState<string>(initialFilters?.dateFilter || 'all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>(initialFilters?.assigneeFilter || 'all');
  const [searchQuery, setSearchQuery] = useState(initialFilters?.searchQuery || '');
  
  // Debounce search query to prevent excessive API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  
  // Fetch reports with real-time updates
  useEffect(() => {
    setLoading(true);
    
    // Build query based on filters
    let reportsQuery = query(
      collection(db, 'reports'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    
    // Apply status filter if not 'all'
    if (statusFilter !== 'all') {
      reportsQuery = query(
        collection(db, 'reports'),
        where('status', '==', statusFilter),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
    }
    
    // Apply category filter if not 'all'
    if (categoryFilter !== 'all') {
      reportsQuery = query(
        collection(db, 'reports'),
        where('category', '==', categoryFilter),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
    }
    
    // Apply both filters if both are not 'all'
    if (statusFilter !== 'all' && categoryFilter !== 'all') {
      reportsQuery = query(
        collection(db, 'reports'),
        where('status', '==', statusFilter),
        where('category', '==', categoryFilter),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
    }
    
    // Apply assignee filter if not 'all'
    if (assigneeFilter !== 'all' && assigneeFilter !== 'unassigned') {
      reportsQuery = query(
        collection(db, 'reports'),
        where('assignedTo', '==', assigneeFilter),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
    } else if (assigneeFilter === 'unassigned') {
      reportsQuery = query(
        collection(db, 'reports'),
        where('assignedTo', '==', null),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
    }
    
    // Set up real-time listener
    const unsubscribe = onSnapshot(reportsQuery, (snapshot) => {
      if (snapshot.empty) {
        setReports([]);
        setHasMore(false);
      } else {
        const fetchedReports = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Report[];
        
        // Apply search filter client-side
        const filteredReports = debouncedSearchQuery 
          ? fetchedReports.filter(report => 
              report.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
              report.description.toLowerCase().includes(debouncedSearchQuery.toLowerCase()))
          : fetchedReports;
        
        // Apply date filter client-side
        const dateFilteredReports = dateFilter !== 'all'
          ? filterReportsByDate(filteredReports, dateFilter)
          : filteredReports;
        
        setReports(dateFilteredReports);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === 10);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching reports:", error);
      setError("Failed to load reports. Please try again.");
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [statusFilter, categoryFilter, assigneeFilter, debouncedSearchQuery, dateFilter]);
  
  // Filter reports by date
  const filterReportsByDate = (reports: Report[], dateFilter: string): Report[] => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = new Date(today - 86400000).getTime(); // 24 hours in milliseconds
    const thisWeek = new Date(today - 6 * 86400000).getTime(); // 7 days ago
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    
    return reports.filter(report => {
      const reportDate = report.createdAt.toDate().getTime();
      
      switch (dateFilter) {
        case 'today':
          return reportDate >= today;
        case 'yesterday':
          return reportDate >= yesterday && reportDate < today;
        case 'thisWeek':
          return reportDate >= thisWeek;
        case 'thisMonth':
          return reportDate >= thisMonth;
        default:
          return true;
      }
    });
  };
  
  // Load more reports
  const loadMoreReports = async () => {
    if (!lastVisible || loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Build query based on filters
      let moreReportsQuery = query(
        collection(db, 'reports'),
        orderBy('createdAt', 'desc'),
        startAfter(lastVisible),
        limit(10)
      );
      
      // Apply status filter if not 'all'
      if (statusFilter !== 'all') {
        moreReportsQuery = query(
          collection(db, 'reports'),
          where('status', '==', statusFilter),
          orderBy('createdAt', 'desc'),
          startAfter(lastVisible),
          limit(10)
        );
      }
      
      // Apply category filter if not 'all'
      if (categoryFilter !== 'all') {
        moreReportsQuery = query(
          collection(db, 'reports'),
          where('category', '==', categoryFilter),
          orderBy('createdAt', 'desc'),
          startAfter(lastVisible),
          limit(10)
        );
      }
      
      // Apply both filters if both are not 'all'
      if (statusFilter !== 'all' && categoryFilter !== 'all') {
        moreReportsQuery = query(
          collection(db, 'reports'),
          where('status', '==', statusFilter),
          where('category', '==', categoryFilter),
          orderBy('createdAt', 'desc'),
          startAfter(lastVisible),
          limit(10)
        );
      }
      
      // Apply assignee filter if not 'all'
      if (assigneeFilter !== 'all' && assigneeFilter !== 'unassigned') {
        moreReportsQuery = query(
          collection(db, 'reports'),
          where('assignedTo', '==', assigneeFilter),
          orderBy('createdAt', 'desc'),
          startAfter(lastVisible),
          limit(10)
        );
      } else if (assigneeFilter === 'unassigned') {
        moreReportsQuery = query(
          collection(db, 'reports'),
          where('assignedTo', '==', null),
          orderBy('createdAt', 'desc'),
          startAfter(lastVisible),
          limit(10)
        );
      }
      
      const snapshot = await getDocs(moreReportsQuery);
      
      if (snapshot.empty) {
        setHasMore(false);
      } else {
        const moreReports = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Report[];
        
        // Apply search filter client-side
        const filteredMoreReports = debouncedSearchQuery 
          ? moreReports.filter(report => 
              report.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
              report.description.toLowerCase().includes(debouncedSearchQuery.toLowerCase()))
          : moreReports;
        
        // Apply date filter client-side
        const dateFilteredMoreReports = dateFilter !== 'all'
          ? filterReportsByDate(filteredMoreReports, dateFilter)
          : filteredMoreReports;
        
        setReports(prevReports => [...prevReports, ...dateFilteredMoreReports]);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === 10);
      }
    } catch (error) {
      console.error("Error loading more reports:", error);
      setError("Failed to load more reports. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  // Update report status
  const updateReportStatus = async (reportId: string, newStatus: ReportStatus): Promise<void> => {
    if (!user) {
      setError("You must be logged in to update report status");
      return;
    }
    
    try {
      const reportRef = doc(db, 'reports', reportId);
      
      await updateDoc(reportRef, {
        status: newStatus,
        updatedAt: Timestamp.now(),
        lastUpdatedBy: user.uid,
        lastUpdatedByName: user.displayName || 'Unknown User'
      });
      
      setError(null);
      // No need to update local state as the real-time listener will catch the change
    } catch (error) {
      console.error("Error updating report status:", error);
      setError("Failed to update status. Please try again.");
    }
  };
  
  // Assign report to a user
  const assignReport = async (reportId: string, userId: string, userName: string): Promise<void> => {
    if (!user) {
      setError("You must be logged in to assign reports");
      return;
    }
    
    try {
      const reportRef = doc(db, 'reports', reportId);
      
      await updateDoc(reportRef, {
        assignedTo: userId,
        assignedToName: userName,
        updatedAt: Timestamp.now(),
        assignedBy: user.uid,
        assignedByName: user.displayName || 'Unknown User'
      });
      
      setError(null);
      // No need to update local state as the real-time listener will catch the change
    } catch (error) {
      console.error("Error assigning report:", error);
      setError("Failed to assign report. Please try again.");
    }
  };
  
  // Add comment to report
  const addComment = async (reportId: string, text: string): Promise<void> => {
    if (!user) {
      setError("You must be logged in to add a comment");
      return;
    }

    try {
      setLoading(true);
      const reportRef = doc(db, "reports", reportId);
      const reportSnap = await getDoc(reportRef);
      
      if (!reportSnap.exists()) {
        throw new Error("Report not found");
      }
      
      const newComment: Comment = {
        id: uuidv4(),
        text,
        createdAt: Timestamp.now(),
        userId: user.uid,
        userName: user.displayName || 'Unknown User',
        userAvatar: user.photoURL || undefined,
      };
      
      const reportData = reportSnap.data();
      const updatedComments = [...(reportData.comments || []), newComment];
      
      await updateDoc(reportRef, {
        comments: updatedComments,
        updatedAt: Timestamp.now()
      });
      
      setError(null);
    } catch (error) {
      console.error("Error adding comment:", error);
      setError("Failed to add comment. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  return {
    reports,
    loading,
    hasMore,
    filters: {
      statusFilter,
      categoryFilter,
      dateFilter,
      assigneeFilter,
      searchQuery
    },
    setStatusFilter,
    setCategoryFilter,
    setDateFilter,
    setAssigneeFilter,
    setSearchQuery,
    loadMoreReports,
    updateReportStatus,
    assignReport,
    addComment,
    error
  };
} 