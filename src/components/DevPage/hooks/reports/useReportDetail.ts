import { useState, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../firebase/config';
import { Report, ReportStatus } from './useReportData';

interface UseReportDetailReturn {
  selectedReport: Report | null;
  detailPanelOpen: boolean;
  loading: boolean;
  error: string | null;
  newComment: string;
  setNewComment: (comment: string) => void;
  openDetailPanel: (report: Report) => Promise<void>;
  closeDetailPanel: () => void;
  updateSelectedReportStatus: (status: ReportStatus) => void;
}

export function useReportDetail(): UseReportDetailReturn {
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');

  // Open detail panel for a report
  const openDetailPanel = useCallback(async (report: Report) => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch complete report data
      const reportRef = doc(db, 'reports', report.id);
      const reportDoc = await getDoc(reportRef);
      
      if (reportDoc.exists()) {
        const reportData = {
          id: reportDoc.id,
          ...reportDoc.data()
        } as Report;
        
        setSelectedReport(reportData);
        setDetailPanelOpen(true);
      } else {
        setError("Report not found. It may have been deleted.");
      }
    } catch (error) {
      console.error("Error fetching report details:", error);
      setError("Failed to load report details. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Close detail panel
  const closeDetailPanel = useCallback(() => {
    setDetailPanelOpen(false);
    setSelectedReport(null);
    setNewComment('');
  }, []);
  
  // Update selected report status (local state only)
  const updateSelectedReportStatus = useCallback((status: ReportStatus) => {
    if (selectedReport) {
      setSelectedReport({
        ...selectedReport,
        status: status
      });
    }
  }, [selectedReport]);

  return {
    selectedReport,
    detailPanelOpen,
    loading,
    error,
    newComment,
    setNewComment,
    openDetailPanel,
    closeDetailPanel,
    updateSelectedReportStatus
  };
} 